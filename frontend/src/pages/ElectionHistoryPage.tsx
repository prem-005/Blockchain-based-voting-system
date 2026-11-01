import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, Calendar, CheckCircle2, ShieldCheck, ArrowRight, BarChart3, Layers } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Election } from '../types';

export const ElectionHistoryPage: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/elections/elections/')
      .then((data) => setElections(data.results || data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-200">
          <History className="w-4 h-4 text-brand-600" />
          <span>Multi-Year Protocol Isolation</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Election Archives & Historical Cycles
        </h1>
        <p className="text-slate-500 text-xs">
          Permanent on-chain isolation across election years (2026, 2027, and future cycles).
        </p>
      </div>

      {/* Multi-Year Architecture Notice */}
      <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-accent-600" />
          <span>Cryptographic Cycle Partitioning Principles</span>
        </h2>
        <p className="text-slate-600 text-xs leading-relaxed">
          The LightVote protocol strictly isolates each election cycle in both off-chain relational databases 
          and Solidity smart contracts (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded">ElectionManager.sol</code>).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">✓ Zero Cross-Year Pollution</span>
            <p className="text-slate-500 text-[11px]">
              When the 2027 election begins, it starts strictly with zero votes. Previous 2026 election tallies and receipts are preserved without modification.
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="font-bold text-slate-900 block">✓ Future Participation Rights</span>
            <p className="text-slate-500 text-[11px]">
              Voters who cast ballots in 2026 are fully eligible to vote in 2027. Nullifier uniqueness is scoped strictly per election ID (<code className="font-mono">hasVotedNullifier[electionId][nullifier]</code>).
            </p>
          </div>
        </div>
      </div>

      {/* Timeline of Election Cycles */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">Historical & Future Cycles</h2>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading election archives...</div>
        ) : (
          <div className="space-y-4">
            {elections.map((elec) => (
              <div
                key={elec.id}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
                      YEAR {elec.year}
                    </span>
                    <span className="text-xs font-mono font-semibold text-slate-400">
                      ID: #{elec.id}
                    </span>
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">
                      • {elec.status.replace('_', ' ')}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">{elec.name}</h3>
                  <p className="text-xs text-slate-500">
                    Window: {new Date(elec.start_time).toLocaleDateString()} — {new Date(elec.end_time).toLocaleDateString()} • Scope: {elec.scope}
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Link
                    to={`/results?election_id=${elec.id}`}
                    className="flex-1 sm:flex-none text-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>View Results</span>
                  </Link>

                  <Link
                    to={`/explorer?election_id=${elec.id}`}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                  >
                    Ledger
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
