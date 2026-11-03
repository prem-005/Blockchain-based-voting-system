import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  BarChart3, 
  Trophy, 
  CheckCircle2, 
  ArrowRight,
  ShieldCheck,
  Building,
  Printer,
  FileCheck2,
  Lock,
  ExternalLink,
  Users,
  Vote,
  RefreshCw,
  Search,
  Filter,
  X,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { apiRequestAllPages } from '../services/apiClient';
import { useWeb3 } from '../context/Web3Context';
import { Election, Candidate } from '../types';
import { GovernmentEmblem } from '../components/GovernmentEmblem';
import { PartySymbol } from '../components/PartySymbol';
import contractsConfig from '../contracts/contracts.json';

export const ResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedElectionId, setSelectedElectionId] = useState<string>(searchParams.get('election_id') || '');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidateTallies, setCandidateTallies] = useState<Record<number, number>>({});
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [onChainVotes, setOnChainVotes] = useState<number>(0);
  const [ledgerReceiptCount, setLedgerReceiptCount] = useState<number>(0);
  const [onChainPublished, setOnChainPublished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [officialCertHash, setOfficialCertHash] = useState<string>('');

  // Filtering & Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedParty, setSelectedParty] = useState<string>('ALL');
  const [selectedConstituency, setSelectedConstituency] = useState<string>('ALL');

  const { getContract } = useWeb3();

  useEffect(() => {
    let active = true;
    const refreshElections = async () => {
      try {
        const data = await apiRequest('/elections/elections/');
        if (!active) return;
        const list: Election[] = data.results || data || [];
        setElections(list);
        if (list.length > 0) {
          setSelectedElectionId((current) =>
            searchParams.get('election_id') && list.some((election) => election.id.toString() === searchParams.get('election_id'))
              ? searchParams.get('election_id')!
              : list.some((election) => election.id.toString() === current) ? current : list[0].id.toString()
          );
        }
      } catch (err) {
        console.error('Could not refresh elections:', err);
      }
    };

    void refreshElections();
    const interval = window.setInterval(refreshElections, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [searchParams]);

  useEffect(() => {
    if (!selectedElectionId) return;

    let active = true;
    let candidatesForElection: Candidate[] = [];
    let refreshing = false;
    setLoading(true);
    setCandidates([]);
    setCandidateTallies({});
    setTotalVotes(0);
    setOnChainVotes(0);
    setLedgerReceiptCount(0);
    setOnChainPublished(false);
    setOfficialCertHash('');

    const refreshTallies = async () => {
      if (refreshing) return;
      refreshing = true;
      setIsRefreshing(true);
      try {
        const lightVote = getContract('LightVote', false);
        const electionResults = getContract('ElectionResults', false);
        const electionId = BigInt(selectedElectionId);
        const [total, officialResult, ledgerData] = await Promise.all([
          lightVote ? lightVote.totalElectionVotes(electionId) : Promise.resolve(0n),
          electionResults?.getOfficialResult(electionId).catch(() => null) ?? null,
          apiRequest(`/explorer/transactions/?election_id=${selectedElectionId}`).catch(() => null),
        ]);
        if (!active) return;
        const chainTotal = Number(total);
        const verifiedReceiptCount = Array.isArray(ledgerData?.transactions)
          ? ledgerData.transactions.filter((receipt: any) => receipt.chain_status === 'CONFIRMED').length
          : 0;
        setOnChainVotes(chainTotal);
        setLedgerReceiptCount(verifiedReceiptCount);
        setTotalVotes(chainTotal);
        
        const published = Boolean(officialResult && officialResult[0]);
        setOnChainPublished(published);
        if (published && officialResult) {
          const certHash = officialResult.resultsMerkleRoot || officialResult[3];
          const normalizedRoot = typeof certHash === 'string' ? certHash : '';
          setOfficialCertHash(/^0x0{64}$/i.test(normalizedRoot) ? '' : normalizedRoot);
        }

        if (published && candidatesForElection.length > 0 && electionResults) {
          const entries = await Promise.all(candidatesForElection.map(async (candidate) => {
            const candidateId = candidate.candidate_id || candidate.id;
            try {
              const votes = await electionResults.getOfficialCandidateVotes(electionId, BigInt(candidateId));
              return [candidateId, Number(votes)] as const;
            } catch {
              return [candidateId, 0] as const;
            }
          }));
          if (active) setCandidateTallies(Object.fromEntries(entries));
        } else if (active) {
          setCandidateTallies({});
        }
      } catch (contractErr) {
        console.warn('Could not refresh on-chain results:', contractErr);
      } finally {
        refreshing = false;
        if (active) {
          setLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    apiRequestAllPages<Candidate>(`/candidates/candidates/?election_id=${selectedElectionId}`)
      .then((candData) => {
        if (!active) return;
        candidatesForElection = candData;
        setCandidates(candidatesForElection);
        void refreshTallies();
      })
      .catch((err) => {
        console.error('Could not load election candidates:', err);
        if (active) setLoading(false);
      });

    const interval = window.setInterval(() => void refreshTallies(), 5000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [selectedElectionId]);

  const currentElection = elections.find(e => e.id.toString() === selectedElectionId) || elections[0];
  const isPublished = onChainPublished;

  // Extract distinct parties & constituencies for filtering
  const distinctParties = useMemo(() => {
    const map = new Map<string, string>();
    candidates.forEach((cand) => {
      const code = cand.party_details?.abbreviation || 'IND';
      const name = cand.party_details?.name || 'Independent';
      if (!map.has(code)) {
        map.set(code, name);
      }
    });
    return Array.from(map.entries()).map(([code, name]) => ({ code, name }));
  }, [candidates]);

  const distinctConstituencies = useMemo(() => {
    const map = new Map<number, string>();
    candidates.forEach((cand) => {
      const cid = cand.constituency;
      const cname = cand.constituency_name || `AC-${cid}`;
      if (!map.has(cid)) {
        map.set(cid, cname);
      }
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([id, name]) => ({ id, name }));
  }, [candidates]);

  // Global ranked candidates (before search filtering, for accurate leader & overall rank)
  const allSortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => {
      const aVotes = candidateTallies[a.candidate_id || a.id] || 0;
      const bVotes = candidateTallies[b.candidate_id || b.id] || 0;
      return bVotes - aVotes;
    });
  }, [candidates, candidateTallies]);

  // Overall Frontrunner / Winner
  const leadingCandidate = allSortedCandidates[0];
  const runnerUp = allSortedCandidates[1];
  const leadVotes = leadingCandidate ? (candidateTallies[leadingCandidate.candidate_id || leadingCandidate.id] || 0) : 0;
  const runnerUpVotes = runnerUp ? (candidateTallies[runnerUp.candidate_id || runnerUp.id] || 0) : 0;
  const victoryMargin = Math.max(0, leadVotes - runnerUpVotes);

  // Filtered candidates list based on search and filters
  const filteredCandidates = useMemo(() => {
    return allSortedCandidates.filter((cand) => {
      // 1. Text search
      const query = searchQuery.trim().toLowerCase();
      const matchText = !query || 
        cand.name.toLowerCase().includes(query) ||
        (cand.party_details?.name && cand.party_details.name.toLowerCase().includes(query)) ||
        (cand.party_details?.abbreviation && cand.party_details.abbreviation.toLowerCase().includes(query)) ||
        (cand.constituency_name && cand.constituency_name.toLowerCase().includes(query)) ||
        `ac-${cand.constituency}`.includes(query);

      // 2. Party filter
      const partyCode = cand.party_details?.abbreviation || 'IND';
      const matchParty = selectedParty === 'ALL' || partyCode === selectedParty;

      // 3. Constituency filter
      const matchConstituency = selectedConstituency === 'ALL' || cand.constituency.toString() === selectedConstituency;

      return matchText && matchParty && matchConstituency;
    });
  }, [allSortedCandidates, searchQuery, selectedParty, selectedConstituency]);

  const hasActiveFilters = searchQuery.trim() !== '' || selectedParty !== 'ALL' || selectedConstituency !== 'ALL';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedParty('ALL');
    setSelectedConstituency('ALL');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 space-y-8">
      {/* Top Banner / EC Certification Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-indigo-900/60 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <GovernmentEmblem className="w-16 h-16 drop-shadow-md bg-white/10 p-2 rounded-2xl border border-white/20 backdrop-blur-sm" />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Election Commission Certified
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-400/20 text-indigo-300 border border-indigo-400/30">
                  EVM Smart Contract Architecture
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                Election Results & Certified Tally
                {isRefreshing && (
                  <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin inline-block" />
                )}
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm mt-0.5">
                Official tabulation recorded on-chain with cryptographic nullifiers.
              </p>
            </div>
          </div>

          {/* Action buttons & selector */}
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Cycle Selector */}
            <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur border border-slate-700/80 px-3.5 py-2 rounded-xl text-xs text-white">
              <span className="text-slate-400 font-medium">Cycle:</span>
              <select
                value={selectedElectionId}
                onChange={(e) => setSelectedElectionId(e.target.value)}
                className="font-bold text-indigo-200 bg-transparent focus:outline-none cursor-pointer"
              >
                {elections.map((elec) => (
                  <option key={elec.id} value={elec.id} className="bg-slate-900 text-white">
                    {elec.year} — {elec.name.slice(0, 32)}...
                  </option>
                ))}
              </select>
            </div>

            {/* Print / Export Certificate */}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all shadow-sm active:scale-95 cursor-pointer"
              title="Print Official Gazette Certificate"
            >
              <Printer className="w-4 h-4 text-amber-300" />
              <span>Print Certificate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Votes */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Ballots Cast</span>
            <Vote className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 font-mono">
              {totalVotes.toLocaleString()}
            </p>
            <p className={`text-[11px] font-medium mt-1 ${ledgerReceiptCount === onChainVotes ? 'text-emerald-600' : 'text-amber-600'}`}>
              {ledgerReceiptCount === onChainVotes
                ? '✓ Receipt ledger synchronised'
                : `${ledgerReceiptCount.toLocaleString()} saved receipts`}
            </p>
          </div>
        </div>

        {/* Publication & Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Certification Status</span>
            <ShieldCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              {isPublished ? (
                <span className="text-purple-700 font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-purple-600" /> Gazetted & Certified
                </span>
              ) : currentElection?.status === 'ACTIVE' ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Voting In Progress
                </span>
              ) : (
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Awaiting Certification
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {isPublished ? 'Validated via ElectionResults.sol' : 'Votes sealed until official gazette'}
            </p>
          </div>
        </div>

        {/* Total Candidates Contesting */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Contesting Candidates</span>
            <Users className="w-4 h-4 text-brand-600" />
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900 font-mono">
              {candidates.length}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Across all recognized political parties
            </p>
          </div>
        </div>

        {/* Jurisdiction / Assembly */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Jurisdiction</span>
            <Building className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">
              Tamil Nadu State
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Constituency Segments AC-1 to AC-234
            </p>
          </div>
        </div>
      </div>

      {/* Leading Candidate / Certified Winner Showcase */}
      {isPublished && leadingCandidate && totalVotes > 0 && (
        <div className="bg-gradient-to-br from-amber-500/10 via-purple-500/5 to-indigo-500/10 rounded-3xl p-6 sm:p-8 border-2 border-amber-300 shadow-md relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center bg-white shadow-md border-2 border-amber-300 flex-shrink-0 p-2">
                <PartySymbol
                  abbreviation={leadingCandidate.party_details?.abbreviation}
                  symbolName={leadingCandidate.party_details?.name}
                  symbolUrl={leadingCandidate.party_details?.symbol_url}
                  className="w-12 h-12"
                />
              </div>

              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-900 rounded-full text-xs font-black border border-amber-400/40">
                  <Trophy className="w-3.5 h-3.5 text-amber-600" />
                  <span>DECLARED ELECTED / LEADING</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
                  {leadingCandidate.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 font-medium">
                  {leadingCandidate.party_details?.name} ({leadingCandidate.party_details?.abbreviation}) • AC-{leadingCandidate.constituency}: {leadingCandidate.constituency_name}
                </p>
                {victoryMargin > 0 && runnerUp && (
                  <p className="text-[11px] text-emerald-700 font-bold">
                    Margin of Victory: +{victoryMargin.toLocaleString()} votes ahead of {runnerUp.name} ({runnerUp.party_details?.abbreviation})
                  </p>
                )}
              </div>
            </div>

            {/* Score pill */}
            <div className="bg-white/90 backdrop-blur rounded-2xl p-4 sm:p-5 border border-amber-200 shadow-sm text-right min-w-[200px]">
              <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider block">Official Votes Secured</span>
              <p className="text-3xl sm:text-4xl font-black font-mono text-indigo-950">
                {leadVotes.toLocaleString()}
              </p>
              <div className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {totalVotes > 0 ? `${((leadVotes / totalVotes) * 100).toFixed(1)}% of total vote share` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Breakdown & Interactive Search/Filter Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Candidate Vote Tabulation & Standings
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Candidate totals are read from the on-chain result snapshot after publication.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-semibold border border-slate-200">
            Cycle Year: <b>{currentElection?.year || '2026'}</b>
          </span>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-slate-50/90 border border-slate-200/80 rounded-2xl p-4 space-y-3">
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search candidate by name, party, or constituency..."
                className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 placeholder-slate-400 font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Party Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 font-medium whitespace-nowrap">Party:</span>
              <select
                value={selectedParty}
                onChange={(e) => setSelectedParty(e.target.value)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-2"
              >
                <option value="ALL">All Parties ({candidates.length})</option>
                {distinctParties.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Constituency Filter Dropdown */}
            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <span className="text-slate-500 font-medium whitespace-nowrap">Constituency:</span>
              <select
                value={selectedConstituency}
                onChange={(e) => setSelectedConstituency(e.target.value)}
                className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer pr-2"
              >
                <option value="ALL">All Segments</option>
                {distinctConstituencies.map((c) => (
                  <option key={c.id} value={c.id.toString()}>
                    AC-{c.id}: {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Reset Filters */}
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Result Count and Active Filters Feedback */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
            <span>
              Showing <b>{filteredCandidates.length}</b> of {candidates.length} candidate{candidates.length !== 1 ? 's' : ''}
            </span>
            {hasActiveFilters && (
              <span className="text-indigo-600 font-semibold">
                Filters active
              </span>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
            <p className="text-slate-500 text-xs font-medium">Querying EVM smart contract and eligibility tallies...</p>
          </div>
        ) : candidates.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            {totalVotes > 0
              ? `${totalVotes.toLocaleString()} on-chain votes are recorded, but candidate records are being indexed.`
              : 'No candidate nominations found for this election cycle.'}
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div className="py-12 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
            <Search className="w-7 h-7 text-slate-400 mx-auto" />
            <p className="text-slate-600 text-xs font-bold">No candidates matching your filter criteria</p>
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-xs text-indigo-600 font-bold bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors"
            >
              Clear Search & Filters
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {!isPublished && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5 flex items-start gap-3">
                <Lock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 space-y-1">
                  <p className="font-bold text-sm text-amber-950">Ballot Tabulations Are Sealed</p>
                  <p className="text-amber-800 leading-relaxed">
                    Under Election Commission protocols, aggregate candidate votes remain sealed and locked until voting formally concludes and the Election Commissioner certifies the ledger on-chain.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              {filteredCandidates.map((cand) => {
                // Find true overall rank among all candidates
                const trueOverallRank = allSortedCandidates.findIndex(c => c.id === cand.id) + 1;
                const cid = cand.candidate_id || cand.id;
                const votes = isPublished ? candidateTallies[cid] || 0 : null;
                const pct = totalVotes > 0 && votes !== null ? (votes / totalVotes) * 100 : 0;
                const isWinner = isPublished && trueOverallRank === 1 && (votes || 0) > 0;

                return (
                  <div 
                    key={cand.id} 
                    className={`p-4 rounded-2xl border transition-all ${
                      isWinner 
                        ? 'bg-amber-50/50 border-amber-300 shadow-sm ring-1 ring-amber-300' 
                        : 'bg-slate-50 hover:bg-slate-100/80 border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Left: Rank, Avatar/Symbol, Info */}
                      <div className="flex items-center gap-3.5">
                        <span 
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isWinner ? 'bg-amber-400 text-slate-900 shadow-xs' : 'bg-slate-200 text-slate-700'
                          }`}
                          title={`Overall Rank: #${trueOverallRank}`}
                        >
                          {trueOverallRank}
                        </span>

                        <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-xs border border-slate-200 p-1 flex-shrink-0">
                          <PartySymbol
                            abbreviation={cand.party_details?.abbreviation}
                            symbolName={cand.party_details?.name}
                            symbolUrl={cand.party_details?.symbol_url}
                            className="w-8 h-8"
                          />
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                              {cand.name}
                            </h3>
                            {isWinner && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                                Winner
                              </span>
                            )}
                          </div>
                          <p className="text-slate-500 text-xs font-medium">
                            {cand.party_details?.name} ({cand.party_details?.abbreviation || 'IND'}) • AC-{cand.constituency}: {cand.constituency_name}
                          </p>
                        </div>
                      </div>

                      {/* Right: Votes and Percentage */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                        <span className="font-mono font-black text-slate-900 text-base sm:text-lg">
                          {isPublished ? `${votes?.toLocaleString()} votes` : 'Sealed'}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          {isPublished ? `${pct.toFixed(1)}% vote share` : 'Awaiting certification'}
                        </span>
                      </div>
                    </div>

                    {/* Progress / Bar Graph */}
                    <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden mt-3">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                          width: `${isPublished ? Math.max(1.5, pct) : 0}%`,
                          backgroundColor: cand.party_details?.color_hex || '#4F46E5'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Official Certificate & On-Chain Audit Badge */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-3 text-slate-900 font-black text-lg">
          <FileCheck2 className="w-5 h-5 text-emerald-600" />
          <h3>Cryptographic Audit & Gazette Verification</h3>
        </div>
        <p className="text-slate-600 text-xs leading-relaxed">
          The on-chain nullifier blocks repeat use of the same credential. Candidate choices remain visible in public transaction calldata, so the current protocol does not provide ballot secrecy. The result commitment is shown only when a nonzero root was published.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-slate-50 p-4 rounded-2xl border border-slate-200">
          <div>
            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Contract Address</span>
            <span className="text-slate-800 font-semibold break-all">{(contractsConfig as any).LightVote?.address || 'Not configured'}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] font-sans font-bold uppercase">Certification Root Hash</span>
            <span className="text-slate-800 font-semibold break-all">
              {officialCertHash || 'No nonzero results commitment was published.'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 text-xs">
        <Link
          to="/history"
          className="text-brand-600 hover:text-brand-700 font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>Compare Previous Multi-Year Election Cycles</span>
        </Link>

        <Link
          to="/explorer"
          className="text-slate-600 hover:text-slate-900 font-bold inline-flex items-center gap-1.5 transition-colors"
        >
          <span>Open Blockchain Ledger Explorer</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};
