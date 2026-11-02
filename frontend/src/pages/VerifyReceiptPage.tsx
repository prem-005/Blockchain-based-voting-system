import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle, 
  Info,
  ExternalLink,
  Lock,
  Layers,
  Calendar,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { VoteReceipt } from '../types';

export const VerifyReceiptPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runVerification = async (searchRef: string) => {
    if (!searchRef.trim()) return;

    setError(null);
    setLoading(true);
    setVerificationResult(null);

    try {
      const data = await apiRequest(`/receipts/verify/${encodeURIComponent(searchRef.trim())}/`);
      setVerificationResult(data);
    } catch (err: any) {
      if (err?.data && err.data.receipt) {
        // Backend returned status 409 with receipt data (e.g. NOT_ON_CURRENT_CHAIN)
        setVerificationResult(err.data);
      } else {
        const errorMsg = err?.data?.message || err?.message || "Failed to verify transaction on blockchain.";
        setError(errorMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      runVerification(initialQuery);
    }
  }, [initialQuery]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    runVerification(query);
  };

  const status = verificationResult?.status || 'NOT_FOUND';
  const receipt: VoteReceipt | undefined = verificationResult?.receipt;
  const isChainMismatch = status === 'NOT_ON_CURRENT_CHAIN';
  const isConfirmed = status === 'CONFIRMED' || status === 'VERIFIED_SUCCESSFUL';

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 space-y-6">
      
      {/* Title & Description */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-black text-[#102A56] tracking-tight">
          Verify Your Voting Receipt
        </h1>
        <p className="text-xs text-[#64748B]">
          Enter your receipt reference or transaction hash to verify your vote.
        </p>
      </div>

      {/* Input & Blue Verify Button in one row */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter receipt reference / transaction hash"
          className="flex-1 px-4 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs font-mono text-[#172033] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-xs transition flex-shrink-0 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Verifying...' : 'Verify'}
        </button>
      </form>

      {/* Blue "Important" Guidance Box */}
      <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-[#172033] space-y-2">
        <div className="flex items-center gap-1.5 font-bold text-[#102A56]">
          <Info className="w-4 h-4 text-[#2563EB]" />
          <span>Important</span>
        </div>
        <ul className="space-y-1.5 text-[11px] text-[#64748B] pl-5 list-disc leading-relaxed">
          <li>You can verify the status of your vote without revealing your identity.</li>
          <li>Only use the receipt provided after successful voting.</li>
          <li>If the transaction is pending, please try again after some time.</li>
        </ul>
      </div>

      {/* Generic Error state */}
      {error && !verificationResult && (
        <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Verification Result Card if query matches */}
      {verificationResult && (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              {isConfirmed ? (
                <CheckCircle2 className="w-5 h-5 text-[#15803D]" />
              ) : isChainMismatch ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <Clock className="w-5 h-5 text-amber-600" />
              )}
              <span className="font-bold text-sm text-[#102A56]">
                {isConfirmed 
                  ? 'Vote Successfully Verified on Ledger' 
                  : isChainMismatch 
                  ? 'Archived Vote Receipt Record' 
                  : status}
              </span>
            </div>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
              isConfirmed 
                ? 'bg-[#DCFCE7] text-[#15803D]' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              {status}
            </span>
          </div>

          {/* Warning banner for previous chain reset */}
          {isChainMismatch && (
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1">
              <p className="font-bold">Archived Receipt from a Previous Session</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                This receipt exists in the LightVote verified ledger (Block #{receipt?.block_number}), but could not be re-verified on the current Sepolia chain configuration. This can happen if the transaction was recorded during an earlier deployment. If you just cast a ballot, please verify your latest transaction hash instead.
              </p>
            </div>
          )}

          {/* Receipt details */}
          {receipt && (
            <div className="space-y-2.5 text-xs text-[#172033]">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Receipt Reference:</span>
                <span className="font-mono font-bold text-[#102A56] text-[11px] truncate max-w-[280px]" title={receipt.receipt_ref}>
                  {receipt.receipt_ref}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Transaction Hash:</span>
                <span className="font-mono text-[11px] text-slate-700 truncate max-w-[280px]" title={receipt.tx_hash}>
                  {receipt.tx_hash}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Election:</span>
                <span className="font-bold text-[#102A56]">{receipt.election_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Constituency:</span>
                <span className="font-semibold">{receipt.constituency_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-[#64748B]">Block Number:</span>
                <span className="font-mono font-bold">#{receipt.block_number}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-[#64748B]">Recorded At:</span>
                <span className="text-[#64748B]">{new Date(receipt.timestamp).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
};
