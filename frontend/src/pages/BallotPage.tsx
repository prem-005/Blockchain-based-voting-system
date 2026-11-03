import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  ArrowRight,
  Calendar, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  Lock,
  User as UserIcon
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useWeb3 } from '../context/Web3Context';
import { Candidate, Election } from '../types';
import { PartySymbol } from '../components/PartySymbol';
import { apiOrigin } from '../services/apiClient';
import contractsConfig from '../contracts/contracts.json';

const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || (contractsConfig as any).chainId || 11155111);

const API_BASE = apiOrigin;

export const BallotPage: React.FC = () => {
  const { electionId } = useParams<{ electionId: string }>();
  const navigate = useNavigate();
  const { user, voterProfile } = useAuth();
  const { account, isConnected, connectWallet, getContract, chainId, switchNetwork, signer } = useWeb3();

  const [election, setElection] = useState<Election | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [constituencyId, setConstituencyId] = useState<number | null>(voterProfile?.constituency_id || null);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'preparing' | 'wallet' | 'chain' | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [walletMismatch, setWalletMismatch] = useState(false);
  const [bindingWallet, setBindingWallet] = useState(false);
  const [hasAlreadyVoted, setHasAlreadyVoted] = useState(false);
  const [existingReceiptTx, setExistingReceiptTx] = useState<string | null>(null);
  const voteSubmissionLock = useRef(false);

  useEffect(() => {
    if (voterProfile?.constituency_id) {
      setConstituencyId(voterProfile.constituency_id);
    }
  }, [voterProfile]);  useEffect(() => {
    if (!electionId || !constituencyId) return;

    setLoading(true);
    setHasAlreadyVoted(false);
    setExistingReceiptTx(null);
    apiRequest(`/elections/elections/${electionId}/`)
      .then((data) => setElection(data))
      .catch((err) => setError(err.message || 'Could not load election details.'));

    apiRequest(`/candidates/candidates/?election_id=${electionId}&constituency_id=${constituencyId}&active_only=true`)
      .then((data) => {
        setCandidates(data.results || data || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));

    apiRequest('/receipts/my-receipts/')
      .then((data) => {
        const myReceipts = data.results || data || [];
        const match = myReceipts.find((r: any) => r.election === parseInt(electionId));
        if (match) {
          setHasAlreadyVoted(true);
          setExistingReceiptTx(match.tx_hash);
        }
      })
      .catch((err) => console.warn(err));
  }, [electionId, constituencyId]);

  const handleSelectCandidate = (cid: number) => {
    if (submitting) return;
    setSelectedCandidateId(cid);
    setError(null);
    setNotice(null);
  };

  const handleReviewClick = () => {
    if (submitting || voteSubmissionLock.current) return;
    if (!selectedCandidateId) {
      setError("Please select one candidate to cast your vote.");
      return;
    }
    setShowConfirmModal(true);
  };

  const handleBindConnectedWallet = async () => {
    if (!account || !signer || !electionId || bindingWallet) return;
    setBindingWallet(true);
    setError(null);
    setNotice(null);
    try {
      const challenge = await apiRequest('/voters/wallet-binding/challenge/', {
        method: 'POST',
        body: JSON.stringify({ wallet_address: account, election_id: Number(electionId) }),
      });
      const signature = await signer.signMessage(challenge.message);
      const result = await apiRequest('/voters/wallet-binding/confirm/', {
        method: 'POST',
        body: JSON.stringify({ challenge: challenge.challenge, signature }),
      });
      setWalletMismatch(false);
      setNotice(result.message || 'Wallet linked. Review and confirm your vote again.');
    } catch (err: any) {
      const detail = err?.shortMessage || err?.message || 'Wallet verification failed.';
      if (err?.code === 4001 || err?.code === 'ACTION_REJECTED' || /user rejected|request rejected/i.test(detail)) {
        setError('Wallet verification was cancelled in MetaMask. Your voter profile was not changed.');
      } else {
        setError(detail);
      }
    } finally {
      setBindingWallet(false);
    }
  };

  const handleConfirmVote = async () => {
    if (!selectedCandidateId || !electionId || voteSubmissionLock.current) return;
    voteSubmissionLock.current = true;
    setShowConfirmModal(false);
    setSubmitting(true);
    setSubmitStatus('preparing');
    setError(null);
    setNotice(null);

    try {
      if (!isConnected || !account) throw new Error('Connect your registered voting wallet before casting a ballot.');
      const expectedChainId = EXPECTED_CHAIN_ID;
      if (chainId !== expectedChainId) throw new Error(`Switch MetaMask to the configured voting network (chain ${expectedChainId}).`);
      const lightVoteContract = getContract('LightVote', true);
      if (!lightVoteContract) throw new Error('Voting contract configuration is unavailable for this network.');

      const credential = await apiRequest('/voters/ballot-credential/', {
        method: 'POST',
        body: JSON.stringify({
          election_id: Number(electionId),
          candidate_id: selectedCandidateId,
          wallet_address: account,
        })
      });

      setSubmitStatus('wallet');
      const tx = await lightVoteContract.castVote(
        BigInt(electionId),
        BigInt(credential.constituency_id),
        BigInt(selectedCandidateId),
        credential.nullifier_hash,
        credential.merkle_proof
      );
      setSubmitStatus('chain');
      const chainReceipt = await tx.wait();
      if (!chainReceipt || chainReceipt.status !== 1) throw new Error('The blockchain transaction did not confirm successfully.');

      const savedReceipt = await apiRequest('/receipts/record/', {
        method: 'POST',
        body: JSON.stringify({
          election: Number(electionId),
          constituency: Number(credential.constituency_id),
          tx_hash: chainReceipt.hash,
          nullifier_hash: credential.nullifier_hash,
        })
      });

      setHasAlreadyVoted(true);
      navigate(`/voter/receipt/${savedReceipt.tx_hash}`);
    } catch (err: any) {
      const detail = err?.shortMessage || err?.reason || err?.message || '';
      if (err?.data?.wallet_mismatch) {
        setWalletMismatch(true);
        setError('This voter profile is linked to a different MetaMask wallet. Switch to that wallet, or verify and link this account before voting.');
      } else if (err?.code === 4001 || err?.code === 'ACTION_REJECTED' || /user rejected|request rejected/i.test(detail)) {
        setError('The MetaMask request was cancelled. No vote was cast. Select Review & Confirm to try again.');
      } else if (err?.code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(detail)) {
        setError('This wallet needs more Sepolia ETH to pay the vote transaction fee. Add Sepolia test ETH, then try again.');
      } else {
        setError(detail || 'Failed to submit ballot.');
      }
    } finally {
      voteSubmissionLock.current = false;
      setSubmitting(false);
      setSubmitStatus(null);
    }
  };

  const selectedCandidate = candidates.find(c => (c.candidate_id || c.id) === selectedCandidateId);

  const getCandidatePhotoUrl = (cand: Candidate): string | null => {
    if (cand.photo) {
      if (cand.photo.startsWith('http')) return cand.photo;
      return `${API_BASE}/media/${cand.photo}`;
    }
    if (cand.photo_url) return cand.photo_url;
    return null;
  };

  const isVoterPending = voterProfile?.status !== 'APPROVED';

  // Wait for voter profile to load before proceeding
  if (!voterProfile && loading) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center">
        <div className="w-8 h-8 border-3 border-[#102A56] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-[#64748B]">Loading voter profile...</p>
      </div>
    );
  }

  if (isVoterPending && user?.role === 'VOTER') {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#102A56]">Awaiting Administrative Approval</h2>
        <p className="text-xs text-[#64748B] leading-relaxed">
          Your voter registration is currently <b>{voterProfile?.status || 'PENDING'}</b> review by the District Electoral Officer. Once an administrator verifies and approves your eligibility, you will be able to access the ballot paper.
        </p>
        <div className="pt-2">
          <Link to="/voter/dashboard" className="px-5 py-2 bg-[#102A56] text-white text-xs font-bold rounded-lg inline-block">
            Back to Voter Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (hasAlreadyVoted) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#15803D] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-[#102A56]">Ballot Already Cast</h2>
        <p className="text-xs text-[#64748B]">
          Your cryptographic nullifier has already been recorded for this election. One vote per citizen is strictly enforced.
        </p>
        <div className="pt-2">
          {existingReceiptTx ? (
            <Link to={`/voter/receipt/${existingReceiptTx}`} className="px-5 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-lg inline-block">
              View Receipt
            </Link>
          ) : (
            <Link to="/voter/dashboard" className="px-5 py-2 bg-[#102A56] text-white text-xs font-bold rounded-lg inline-block">
              Voter Dashboard
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 space-y-6">
      
      {/* Back to Elections Link */}
      <Link
        to="/voter/elections"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#102A56] transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to Elections</span>
      </Link>

      {/* Election Header Card (Screenshot #4) */}
      <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold text-[#102A56]">
            {election?.name || (loading ? 'Loading election…' : 'Election details unavailable')}
          </h1>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${election?.status === 'ACTIVE' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-slate-100 text-slate-600'}`}>
            {election?.status || 'Unknown status'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-2.5 pt-2">
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block">Voting Period</span>
              <span className="font-bold text-[#172033] block">
                {election ? `${new Date(election.start_time).toLocaleDateString()} – ${new Date(election.end_time).toLocaleDateString()}` : 'Unavailable'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 pt-2">
            <div className="w-7 h-7 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B]">
              <MapPin className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-[11px] text-[#64748B] block">Your Constituency</span>
              <span className="font-bold text-[#172033] block">
                {candidates[0]?.constituency_name || (voterProfile?.constituency_name ? `${voterProfile.constituency_name} (AC-${voterProfile.constituency_id})` : 'Unavailable')}
              </span>
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#2563EB] font-semibold flex items-center gap-1.5 pt-1">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Select one candidate to cast your vote.</span>
        </div>
      </div>

      {error && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          {walletMismatch && account && (
            <button
              onClick={handleBindConnectedWallet}
              disabled={bindingWallet || !signer}
              className="px-3 py-2 rounded-lg bg-white border border-rose-300 font-bold text-rose-800 disabled:opacity-50"
            >
              {bindingWallet ? 'Verify in MetaMask...' : 'Verify and link this wallet'}
            </button>
          )}
        </div>
      )}

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs" role="status">
          {notice}
        </div>
      )}

      {submitting && submitStatus && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs" role="status" aria-live="polite">
          <RotateCw className="w-4 h-4 flex-shrink-0 animate-spin" />
          <span>
            {submitStatus === 'preparing' && 'Preparing your ballot. Please wait...'}
            {submitStatus === 'wallet' && 'Approve the vote transaction in MetaMask. The vote is not submitted until you confirm it.'}
            {submitStatus === 'chain' && 'MetaMask approved the transaction. Waiting for Sepolia to confirm your vote...'}
          </span>
        </div>
      )}

      {/* Candidates List (Matching Screenshot #4) */}
      <div className="space-y-3">
        <h2 className="text-sm font-extrabold text-[#102A56]">Candidates</h2>

        <div className="bg-white rounded-2xl border border-[#E2E8F0] divide-y divide-[#E2E8F0] shadow-xs overflow-hidden">
          {candidates.map((cand) => {
            const cid = cand.candidate_id || cand.id;
            const isSelected = selectedCandidateId === cid;
            const photoUrl = getCandidatePhotoUrl(cand);

            return (
              <div
                key={cand.id}
                onClick={() => handleSelectCandidate(cid)}
                className={`p-4 flex items-center justify-between gap-4 cursor-pointer transition ${
                  isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'
                }`}
              >
                {/* Radio Circle + Party Logo + Candidate Info */}
                <div className="flex items-center gap-3.5">
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[#2563EB] bg-[#2563EB]' : 'border-[#CBD5E1]'
                  }`}>
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>

                  {/* Party Symbol (36x36) */}
                  <div className="w-9 h-9 rounded-lg border border-[#E2E8F0] bg-white flex items-center justify-center p-0.5 flex-shrink-0">
                    <PartySymbol
                      symbolName={cand.party_details?.symbol_name}
                      abbreviation={cand.party_details?.abbreviation}
                      symbolImage={cand.party_details?.symbol_image}
                      symbolUrl={cand.party_details?.symbol_url}
                      className="w-full h-full"
                    />
                  </div>

                  <div>
                    <h3 className="font-extrabold text-sm text-[#102A56]">{cand.name}</h3>
                    <p className="text-[11px] text-[#64748B] font-medium">
                      {cand.party_details?.name || 'Independent'}
                    </p>
                  </div>
                </div>

                {/* Candidate Photo (Right side avatar as in screenshot #4) */}
                <div className="w-9 h-9 rounded-lg bg-slate-100 border border-[#E2E8F0] flex items-center justify-center overflow-hidden flex-shrink-0">
                  {photoUrl ? (
                    <img src={photoUrl} alt={cand.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Footer (Cancel & Review & Confirm buttons) */}
      <div className="flex items-center justify-between pt-2">
        <Link
          to="/voter/elections"
          className="px-6 py-2.5 bg-white border border-[#CBD5E1] hover:bg-slate-50 text-[#172033] text-xs font-semibold rounded-lg shadow-xs transition"
        >
          Cancel
        </Link>

        <button
          onClick={handleReviewClick}
          disabled={!selectedCandidateId || submitting}
          className="px-6 py-2.5 bg-[#102A56] hover:bg-[#0C2042] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
        >
          <span>
            {!submitting && 'Review & Confirm'}
            {submitting && submitStatus === 'preparing' && 'Preparing Vote...'}
            {submitting && submitStatus === 'wallet' && 'Approve in MetaMask...'}
            {submitting && submitStatus === 'chain' && 'Confirming Vote...'}
          </span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Review & Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-[#E2E8F0]">
            <h3 className="text-base font-bold text-[#102A56]">Confirm Your Ballot Choice</h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              You are about to cast your vote for:
            </p>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center p-0.5">
                <PartySymbol
                  symbolName={selectedCandidate?.party_details?.symbol_name}
                  abbreviation={selectedCandidate?.party_details?.abbreviation}
                  className="w-full h-full"
                />
              </div>
              <div>
                <p className="font-bold text-xs text-[#102A56]">{selectedCandidate?.name}</p>
                <p className="text-[11px] text-[#64748B]">{selectedCandidate?.party_details?.name}</p>
              </div>
            </div>

            <p className="text-[11px] text-[#64748B]">
              This vote is recorded on a public blockchain. The selected candidate ID is visible in transaction data, so this prototype does not provide ballot secrecy.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] text-xs font-semibold rounded-lg"
              >
                Change Choice
              </button>
              <button
                onClick={handleConfirmVote}
                disabled={submitting}
                className="flex-1 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Confirm & Cast'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
