import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileSearch, ShieldCheck, Download, Lock, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { VoteReceipt } from '../types';
import { receiptService } from '../services/receiptService';

export const RetrieveReceiptPage: React.FC = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState<VoteReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualQuery, setManualQuery] = useState('');

  useEffect(() => {
    if (user) {
      setLoading(true);
      apiRequest('/receipts/my-receipts/')
        .then((data) => setReceipts(data.results || data || []))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-200">
          <FileSearch className="w-4 h-4 text-brand-600" />
          <span>Receipt Recovery Workflow</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Retrieve Verification Receipt
        </h1>
        <p className="text-slate-500 text-xs">
          Recover your cryptographic vote receipt if you did not save it immediately after voting.
        </p>
      </div>

      {/* Privacy Regulation Notice */}
      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
        <Lock className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Privacy Protection Policy</p>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            In compliance with election security standards, vote receipts <b>cannot</b> be retrieved through public search 
            using a voter's legal name, voter ID, email, or mobile number. Receipts are securely linked to your 
            private authenticated session.
          </p>
        </div>
      </div>

      {user ? (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              Receipts for Authenticated Account ({user.email})
            </h2>
            <span className="text-xs font-medium text-slate-400">Total: {receipts.length}</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs">Loading your receipts...</div>
          ) : receipts.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs space-y-2">
              <p>No vote transactions found for this account.</p>
              <Link to="/voter/elections" className="text-brand-600 font-bold hover:underline inline-block">
                View Active Elections →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {receipts.map((r) => (
                <div key={r.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <span className="mono text-xs font-bold text-brand-700 block">
                      Ref: {r.receipt_ref}
                    </span>
                    <p className="text-xs font-medium text-slate-800">
                      {r.election_name} ({r.election_year}) • AC-{r.constituency}: {r.constituency_name}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Tx: {r.tx_hash.slice(0, 18)}... • {r.block_number == null ? r.chain_status || 'Not verified' : `Block #${r.block_number}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/verify-receipt?q=${encodeURIComponent(r.tx_hash)}`}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-accent-600" /> Verify
                    </Link>

                    <a
                      href={receiptService.getDownloadPdfUrl(r.receipt_ref)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign In to Retrieve Your Receipts</h2>
          <p className="text-slate-500 text-xs max-w-md mx-auto">
            Please log into your registered voter account to view and download all past receipts associated with your ballots.
          </p>
          <Link
            to="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            <span>Proceed to Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};
