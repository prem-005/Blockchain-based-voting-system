import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  CheckCircle2, 
  FileText, 
  ShieldCheck, 
  Download, 
  Search, 
  ExternalLink, 
  Lock, 
  Calendar,
  Layers,
  ArrowRight,
  Sparkles,
  Award
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { receiptService } from '../services/receiptService';
import { VoteReceipt } from '../types';

export const VoteReceiptPage: React.FC = () => {
  const { txHash } = useParams<{ txHash: string }>();
  const [receipt, setReceipt] = useState<VoteReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!txHash) return;

    setLoading(true);
    setError(null);
    apiRequest(`/receipts/verify/${encodeURIComponent(txHash)}/`)
      .then((data) => {
        if (data.status !== 'VERIFIED_SUCCESSFUL' || !data.receipt) throw new Error(data.message || 'This transaction is not verified on the current chain.');
        setReceipt(data.receipt);
      })
      .catch((err) => setError(err.message || 'Could not verify this vote receipt.'))
      .finally(() => setLoading(false));
  }, [txHash]);

  if (loading) return <div className="max-w-3xl mx-auto py-20 px-4 text-center text-sm text-slate-500">Verifying transaction on the configured chain…</div>;
  if (error || !receipt) return (
    <div className="max-w-xl mx-auto py-20 px-4 text-center space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Receipt not verified</h1>
      <p className="text-sm text-rose-700">{error || 'No verified receipt is available for this transaction.'}</p>
      <Link to={`/verify-receipt?q=${encodeURIComponent(txHash || '')}`} className="text-sm font-semibold text-brand-700 hover:underline">Open receipt verification</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8 select-none">
      {/* Real-Life Official Voting Badge Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-4 text-center relative overflow-hidden">
        {/* Background decorative watermark */}
        <div className="absolute -right-8 -bottom-8 opacity-10 text-9xl font-black font-mono pointer-events-none">
          VOTED
        </div>

        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center mx-auto shadow-inner border border-white/30">
          <CheckCircle2 className="w-10 h-10 text-white" />
        </div>
        
        <div className="space-y-1">
          <span className="text-[10px] uppercase tracking-widest font-extrabold bg-white/20 px-3 py-1 rounded-full text-emerald-100">
            DEMOCRATIC FRANCHISE EXERCISED
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            You Have Successfully Voted!
          </h1>
        </div>

        <p className="text-emerald-100 text-sm max-w-lg mx-auto leading-relaxed">
          Your electronic ballot has been cryptographically confirmed by the smart contract and permanently committed to the distributed ledger.
        </p>

        {/* Indelible Ink Confirmation Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-900/60 backdrop-blur border border-purple-400/40 rounded-full text-xs font-semibold text-purple-200">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse" />
          <span>Transaction confirmed on the configured blockchain</span>
        </div>
      </div>

      {/* Official VVPAT Certificate Slip */}
      <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-md space-y-6 relative overflow-hidden">
        {/* Official Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div>
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-wider block">
              ELECTION COMMISSION OF INDIA • FORM 17V
            </span>
            <h2 className="text-lg font-black text-slate-900">
              Official Cryptographic Vote Verification Slip
            </h2>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span>On-Chain Verified</span>
          </span>
        </div>

        {/* Certificate Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 sm:col-span-2">
            <span className="text-slate-400 block mb-1 font-mono text-[10px] uppercase">
              VVPAT Anonymous Receipt Hash Reference
            </span>
            <span className="mono font-bold text-brand-700 text-sm break-all">
              {receipt.receipt_ref}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block mb-1">Election Cycle</span>
            <span className="font-bold text-slate-900 text-sm">
              {receipt.election_name} ({receipt.election_year})
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block mb-1">Electoral Constituency</span>
            <span className="font-bold text-slate-900 text-sm">
              AC-{receipt.constituency}: {receipt.constituency_name} ({receipt.district_name})
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 sm:col-span-2">
            <span className="text-slate-400 block mb-1 font-mono text-[10px] uppercase">
              Blockchain Transaction Hash
            </span>
            <span className="mono font-semibold text-slate-800 break-all text-xs">
              {txHash}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block mb-1">Block Number</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              #{receipt.block_number}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <span className="text-slate-400 block mb-1">Gas Units Used</span>
            <span className="font-mono font-bold text-slate-900 text-sm">
              {receipt.gas_used ? `${receipt.gas_used.toLocaleString()} units` : 'Not reported'}
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 sm:col-span-2">
            <span className="text-slate-400 block mb-1 font-mono text-[10px] uppercase">
              Cryptographic Nullifier Token
            </span>
            <span className="mono text-[11px] text-slate-600 break-all">
              {receipt.nullifier_hash}
            </span>
          </div>
        </div>

        {/* Prototype privacy limitation */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <Lock className="w-4 h-4 text-emerald-700" />
            <span>Public-chain privacy limitation</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            This receipt omits the candidate ID, but the submitted transaction exposes it in public calldata. Do not use this prototype for a real election.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <a
              href={receiptService.getDownloadPdfUrl(receipt.receipt_ref)}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Official PDF Receipt</span>
            </a>

            <Link
              to={`/verify-receipt?q=${encodeURIComponent(txHash || '')}`}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
            >
              <ShieldCheck className="w-4 h-4 text-accent-600" />
              <span>Verify On-Chain</span>
            </Link>
          </div>

          <Link
            to={`/explorer/transactions/${txHash}`}
            className="flex items-center gap-1 text-xs text-brand-600 hover:underline font-semibold"
          >
            <span>View in Block Explorer</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};
