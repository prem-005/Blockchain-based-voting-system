import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  Search, 
  Layers, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  ExternalLink,
  Filter,
  ArrowRight
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { VoteReceipt } from '../types';
import { Election } from '../types';

export const ExplorerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [blocks, setBlocks] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<VoteReceipt[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('election_id') || '');
  const [selectedElectionFilter, setSelectedElectionFilter] = useState(searchParams.get('election_id') || 'all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/elections/elections/')
      .then((data) => setElections(data.results || data || []))
      .catch((err) => console.error(err));

    // 1. Fetch latest blocks
    apiRequest('/explorer/blocks/')
      .then((data) => setBlocks(data.blocks || []))
      .catch((err) => console.error(err));

    // 2. Fetch transactions
    let txUrl = '/explorer/transactions/';
    if (selectedElectionFilter !== 'all') {
      txUrl += `?election_id=${selectedElectionFilter}`;
    }

    apiRequest(txUrl)
      .then((data) => setTransactions(data.transactions || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [selectedElectionFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchQuery.startsWith('0x') && searchQuery.length === 66) {
      window.location.href = `/verify-receipt?q=${encodeURIComponent(searchQuery.trim())}`;
    } else {
      setSelectedElectionFilter(searchQuery.trim());
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 space-y-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-200 mb-2">
            <Layers className="w-4 h-4 text-brand-600" />
            <span>Public Ledger Explorer</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            LightVote Blockchain Explorer
          </h1>
          <p className="text-slate-500 text-xs">
            Live EVM blocks, transaction records, and cryptographic nullifier verifications.
          </p>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tx Hash (0x...) or Election ID"
            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono w-full md:w-72 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            Search
          </button>
        </form>
      </div>

      {/* Latest Blocks Carousel/Grid */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Layers className="w-5 h-5 text-brand-600" />
          <span>Latest Mined Blocks</span>
        </h2>

        {blocks.length === 0 ? (
          <div className="p-6 bg-white rounded-2xl border border-slate-200 text-center text-xs text-slate-400">
            Connecting to local Hardhat node (http://127.0.0.1:8545)...
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {blocks.slice(0, 4).map((b) => (
              <div key={b.number} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-brand-700 text-sm">#{b.number}</span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(b.timestamp * 1000).toLocaleTimeString()}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Txs:</span>
                    <span className="font-semibold text-slate-800">{b.transaction_count}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Gas:</span>
                    <span className="font-mono text-slate-800">{b.gas_used.toLocaleString()}</span>
                  </div>
                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 block truncate font-mono" title={b.hash}>
                      {b.hash.slice(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirmed Vote Transactions */}
      <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-accent-600" />
              <span>Confirmed Voting Transactions</span>
            </h2>
            <p className="text-slate-400 text-xs">
              Every ballot generates a public transaction record on LightVote.sol. The transaction calldata reveals the selected candidate ID.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-medium">Filter by Cycle:</span>
            <select
              value={selectedElectionFilter}
              onChange={(e) => setSelectedElectionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-none"
            >
              <option value="all">All Cycles</option>
              {elections.map((election) => (
                <option key={election.id} value={election.id}>{election.year} — {election.name} (#{election.id})</option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading transaction ledger...</div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-xs">
            No voting transactions recorded yet. Cast your vote to see it recorded live!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                  <th className="pb-3 font-semibold">Tx Hash</th>
                  <th className="pb-3 font-semibold">Block</th>
                  <th className="pb-3 font-semibold">Election / Constituency</th>
                  <th className="pb-3 font-semibold">Anonymous Nullifier Hash</th>
                  <th className="pb-3 font-semibold">Gas</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono font-semibold text-brand-700">
                      <Link to={`/verify-receipt?q=${encodeURIComponent(tx.tx_hash)}`} className="hover:underline">
                        {tx.tx_hash.slice(0, 14)}...
                      </Link>
                    </td>
                    <td className="py-3 font-mono text-slate-700 font-semibold">
                      {tx.block_number == null ? 'Not verified' : `#${tx.block_number}`}
                    </td>
                    <td className="py-3 text-slate-800">
                      <span className="font-bold">{tx.election_name}</span> <br />
                      <span className="text-[11px] text-slate-500">AC-{tx.constituency}: {tx.constituency_name}</span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-slate-500">
                      {tx.nullifier_hash ? `${tx.nullifier_hash.slice(0, 14)}...` : '0x...'}
                    </td>
                    <td className="py-3 font-mono text-slate-600">
                      {tx.gas_used ? tx.gas_used.toLocaleString() : 'Not recorded'}
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${tx.chain_status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        <CheckCircle2 className={`w-3 h-3 ${tx.chain_status === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'}`} /> {tx.chain_status || 'Not verified'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/verify-receipt?q=${encodeURIComponent(tx.tx_hash)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-accent-600" /> Verify
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
