import React, { useState, useEffect } from 'react';
import { Sliders, Play, Square, CheckCircle2, Archive, Clock, ShieldCheck, Plus, XCircle } from 'lucide-react';
import { apiRequest } from '../api/client';
import { apiRequestAllPages } from '../services/apiClient';
import { useWeb3 } from '../context/Web3Context';
import { Constituency, Election } from '../types';

export const ElectionControlPage: React.FC = () => {
  const { getContract, account, chainId } = useWeb3();
  const [elections, setElections] = useState<Election[]>([]);
  const [legacyElectionIds, setLegacyElectionIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [syncingRootsFor, setSyncingRootsFor] = useState<number | null>(null);
  const [chainAdmin, setChainAdmin] = useState<boolean | null>(null);
  const [removalConfirmation, setRemovalConfirmation] = useState<{ electionId: number; electionName: string; legacy: boolean } | null>(null);
  const [removalBusy, setRemovalBusy] = useState(false);
  const [states, setStates] = useState<any[]>([]);
  const [stateConstituencies, setStateConstituencies] = useState<Constituency[]>([]);
  const [constituenciesLoading, setConstituenciesLoading] = useState(false);
  const [constituencySearch, setConstituencySearch] = useState('');
  const [newElection, setNewElection] = useState({
    name: '', year: new Date().getFullYear(), scope: 'STATE_ASSEMBLY', state: '', constituency_ids: [] as number[],
    start_date: '', start_hour: '12', start_minute: '00', start_period: 'AM',
    end_date: '', end_hour: '12', end_minute: '00', end_period: 'AM',
  });

  const fetchElections = async () => {
    try {
      const data = await apiRequest('/elections/elections/');
      const list: Election[] = data.results || data || [];
      setElections(list);
      const manager = getContract('ElectionManager', false);
      if (manager) {
        const onChainIds = new Set((await manager.getAllElectionIds()).map((id: bigint) => Number(id)));
        setLegacyElectionIds(list.filter((election) => !onChainIds.has(election.id)).map((election) => election.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveLegacyElection = (electionId: number) => {
    const election = elections.find((item) => item.id === electionId);
    if (election) setRemovalConfirmation({ electionId, electionName: election.name, legacy: true });
  };

  const removeLegacyElection = async (electionId: number) => {
    try {
      await apiRequest(`/elections/elections/${electionId}/`, { method: 'DELETE' });
      setStatusMsg(`Election #${electionId} was removed from the app database. Older chain history, if any, remains unchanged.`);
      await fetchElections();
    } catch (err: any) {
      setStatusMsg(`Election could not be removed: ${friendlyError(err)}`);
    }
  };

  useEffect(() => {
    fetchElections();
    apiRequest('/elections/states/').then((data) => setStates(data.results || data || [])).catch(console.error);
  }, []);

  useEffect(() => {
    setStateConstituencies([]);
    setNewElection((current) => ({ ...current, constituency_ids: [] }));
    if (newElection.scope !== 'BY_ELECTION' || !newElection.state) return;
    let active = true;
    setConstituenciesLoading(true);
    apiRequest(`/elections/constituencies/?state_id=${newElection.state}`)
      .then((data) => { if (active) setStateConstituencies(data.results || data || []); })
      .catch((error: any) => { if (active) setStatusMsg(`Could not load constituencies: ${friendlyError(error)}`); })
      .finally(() => { if (active) setConstituenciesLoading(false); });
    return () => { active = false; };
  }, [newElection.scope, newElection.state]);

  const visibleStateConstituencies = stateConstituencies.filter((item) =>
    `${item.name} ${item.id} ${item.district_name}`.toLowerCase().includes(constituencySearch.trim().toLowerCase())
  );

  const toggleElectionConstituency = (id: number) => {
    setNewElection((current) => ({
      ...current,
      constituency_ids: current.constituency_ids.includes(id)
        ? current.constituency_ids.filter((selectedId) => selectedId !== id)
        : [...current.constituency_ids, id],
    }));
  };

  const makeLocalDateTime = (date: string, hour: string, minute: string, period: string): Date | null => {
    if (!date) return null;
    const [year, month, day] = date.split('-').map(Number);
    const hour12 = Number(hour) % 12;
    const hour24 = hour12 + (period === 'PM' ? 12 : 0);
    const value = new Date(year, month - 1, day, hour24, Number(minute));
    return Number.isNaN(value.getTime()) ? null : value;
  };

  useEffect(() => {
    let active = true;
    const checkAdminRole = async () => {
      if (!account || !chainId) {
        setChainAdmin(null);
        return;
      }
      try {
        const manager = getContract('ElectionManager', false);
        if (!manager) throw new Error('ElectionManager is unavailable on this network.');
        const role = await manager.CENTRAL_ADMIN_ROLE();
        const hasRole = await manager.hasRole(role, account);
        if (active) setChainAdmin(Boolean(hasRole));
      } catch {
        if (active) setChainAdmin(false);
      }
    };
    void checkAdminRole();
    return () => { active = false; };
  }, [account, chainId, getContract]);

  const friendlyError = (error: any) => {
    const detail = `${error?.shortMessage || ''} ${error?.reason || ''} ${error?.message || ''}`;
    if (/caller is not central admin/i.test(detail)) {
      return 'This MetaMask account is not a Central Admin on the connected chain. Switch to the deployer wallet (0x98E76942DCD6F00682D5Ddd4101495320B21B25B) on Sepolia and try again.';
    }
    if (/user rejected|action_rejected/i.test(detail)) return 'The wallet request was rejected.';
    return (error?.shortMessage || error?.reason || error?.message || 'Operation failed.').split('\n')[0].slice(0, 240);
  };

  const ensureChainAdmin = async (manager: any) => {
    if (!account) throw new Error('Connect the Central Admin wallet in MetaMask.');
    const role = await manager.CENTRAL_ADMIN_ROLE();
    if (!(await manager.hasRole(role, account))) {
      throw new Error('This MetaMask account is not a Central Admin on the connected chain.');
    }
  };

  const handleCreateElection = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const manager = getContract('ElectionManager', true);
      if (!manager || !account) throw new Error('Connect the Central Admin wallet on the configured chain.');
      await ensureChainAdmin(manager);
      if (!newElection.state || !newElection.start_date || !newElection.end_date) throw new Error('Complete all election fields.');
      if (newElection.scope === 'BY_ELECTION' && newElection.constituency_ids.length === 0) {
        throw new Error('Select at least one constituency for a by-election.');
      }
      const start = makeLocalDateTime(newElection.start_date, newElection.start_hour, newElection.start_minute, newElection.start_period);
      const end = makeLocalDateTime(newElection.end_date, newElection.end_hour, newElection.end_minute, newElection.end_period);
      if (!start || !end) throw new Error('Enter valid election start and end dates and times.');
      const onChainIds = await manager.getAllElectionIds();
      const persistedIds = elections.map((election) => election.id);
      const deployedIds = onChainIds.map((id: bigint) => Number(id));
      const electionId = Math.max(0, ...persistedIds, ...deployedIds) + 1;
      if (!Number.isSafeInteger(electionId)) throw new Error('Could not allocate a safe election ID.');
      const state = states.find((item) => String(item.id) === newElection.state);
      if (!state) throw new Error('Select a valid state.');
      if (end <= start) throw new Error('End time must be after start time.');
      const tx = await manager.createElection(BigInt(electionId), newElection.name, newElection.year, state.name, BigInt(Math.floor(start.getTime() / 1000)), BigInt(Math.floor(end.getTime() / 1000)));
      const receipt = await tx.wait();
      await apiRequest('/elections/elections/', { method: 'POST', body: JSON.stringify({
        id: electionId,
        name: newElection.name,
        year: newElection.year,
        scope: newElection.scope,
        state: Number(newElection.state),
        constituency_ids: newElection.constituency_ids,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        creation_tx_hash: receipt.hash,
      }) });
      setStatusMsg(`Election #${electionId} created and reconciled with the blockchain.`);
      setNewElection({
        name: '', year: new Date().getFullYear(), scope: 'STATE_ASSEMBLY', state: '', constituency_ids: [],
        start_date: '', start_hour: '12', start_minute: '00', start_period: 'AM',
        end_date: '', end_hour: '12', end_minute: '00', end_period: 'AM',
      });
      await fetchElections();
    } catch (err: any) {
      setStatusMsg(`Election creation failed: ${friendlyError(err)}`);
    }
  };

  const handleReconcileChainElections = async () => {
    setStatusMsg('Checking confirmed elections on the connected chain...');
    try {
      const manager = getContract('ElectionManager', false);
      if (!manager) throw new Error('ElectionManager is unavailable on the configured network.');
      const [chainIds, events] = await Promise.all([
        manager.getAllElectionIds(),
        manager.queryFilter(manager.filters.ElectionCreated(), 0, 'latest'),
      ]);
      const knownIds = new Set(elections.map((election) => election.id));
      const eventById = new Map(events.map((log: any) => [Number(log.args.electionId), log]));
      let synced = 0;

      for (const rawId of chainIds) {
        const id = Number(rawId);
        if (knownIds.has(id)) {
          await apiRequest(`/elections/elections/${id}/sync-from-chain/`, { method: 'POST' });
          synced += 1;
          continue;
        }
        const event: any = eventById.get(id);
        if (!event) continue;
        const chainElection = await manager.elections(BigInt(id));
        const stateName = chainElection.state ?? chainElection[3];
        const state = states.find((item) => item.name === stateName);
        if (!state) throw new Error(`State "${stateName}" for on-chain election #${id} is not in the backend catalog.`);
        const startTimestamp = Number(chainElection.startTime ?? chainElection[4]);
        const endTimestamp = Number(chainElection.endTime ?? chainElection[5]);
        await apiRequest('/elections/elections/', {
          method: 'POST',
          body: JSON.stringify({
            id,
            name: chainElection.name ?? chainElection[1],
            year: Number(chainElection.year ?? chainElection[2]),
            scope: 'STATE_ASSEMBLY',
            state: state.id,
            start_time: new Date(startTimestamp * 1000).toISOString(),
            end_time: new Date(endTimestamp * 1000).toISOString(),
            creation_tx_hash: event.transactionHash,
          }),
        });
        knownIds.add(id);
        synced += 1;
      }

      await fetchElections();
      setStatusMsg(synced ? `Synced ${synced} confirmed on-chain election(s) to the backend.` : 'All confirmed on-chain elections are already in the backend.');
    } catch (err: any) {
      setStatusMsg(`Election sync failed: ${friendlyError(err)}`);
    }
  };

  const handleAction = async (electionId: number, action: 'START' | 'STOP' | 'PUBLISH_RESULTS' | 'ARCHIVE' | 'CANCEL', confirmed = false) => {
    if (action === 'CANCEL' && !confirmed) {
      const election = elections.find((item) => item.id === electionId);
      if (election) setRemovalConfirmation({ electionId, electionName: election.name, legacy: false });
      return;
    }
    setStatusMsg(`Executing ${action} on blockchain & backend...`);
    try {
      const electionManager = getContract('ElectionManager', true);
      if (!electionManager) throw new Error('ElectionManager is unavailable on this network.');
      await ensureChainAdmin(electionManager);
      let txHash = null;

      if (electionManager && account) {
        if (action === 'START') {
          const tx = await electionManager.startElection(BigInt(electionId));
          const rec = await tx.wait();
          txHash = rec.hash;
        } else if (action === 'STOP') {
          const tx = await electionManager.stopElection(BigInt(electionId));
          const rec = await tx.wait();
          txHash = rec.hash;
        } else if (action === 'PUBLISH_RESULTS') {
          const electionResults = getContract('ElectionResults', true);
          if (!electionResults) throw new Error('Election Results contract is unavailable.');

          const candidates = await apiRequestAllPages<any>(`/candidates/candidates/?election_id=${electionId}`);
          if (candidates.some((candidate: any) => !candidate.candidate_id)) {
            throw new Error('Every candidate must have a blockchain candidate ID before results can be published. Reconcile missing candidate records first.');
          }
          const candidateIds = candidates.map((candidate: any) => Number(candidate.candidate_id));
          if (candidateIds.length === 0 || candidateIds.some((id: number) => !Number.isSafeInteger(id) || id <= 0) || new Set(candidateIds).size !== candidateIds.length) {
            throw new Error('The election candidate list contains missing or duplicate blockchain candidate IDs. Reconcile the records before publishing results.');
          }
          const lightVote = getContract('LightVote', false);
          if (!lightVote) throw new Error('LightVote is unavailable on the connected network.');
          for (let offset = 0; offset < candidates.length; offset += 20) {
            const batch = candidates.slice(offset, offset + 20);
            const chainCandidates = await Promise.all(batch.map((candidate: any) =>
              lightVote.getCandidate(BigInt(candidate.candidate_id))
            ));
            const mismatched = batch.some((candidate: any, index: number) => {
              const chainCandidate = chainCandidates[index];
              return Number(chainCandidate[0]) !== Number(candidate.candidate_id) ||
                Number(chainCandidate[4]) !== electionId ||
                Number(chainCandidate[5]) !== Number(candidate.district) ||
                Number(chainCandidate[6]) !== Number(candidate.constituency) ||
                String(chainCandidate[2]).trim() !== String(candidate.name).trim() ||
                String(chainCandidate[3]).toLowerCase() !== String(candidate.party_details?.abbreviation || '').toLowerCase();
            });
            if (mismatched) {
              throw new Error('A candidate record does not match its on-chain identity. Reconcile the candidate roster before publishing results.');
            }
          }

          const tx = await electionResults.publishResults(
            BigInt(electionId),
            candidateIds.map((id: number) => BigInt(id)),
            `0x${'0'.repeat(64)}`
          );
          const rec = await tx.wait();
          txHash = rec.hash;
        } else if (action === 'ARCHIVE') {
          const tx = await electionManager.archiveElection(BigInt(electionId));
          const rec = await tx.wait();
          txHash = rec.hash;
        } else if (action === 'CANCEL') {
          const tx = await electionManager.cancelElection(BigInt(electionId));
          const rec = await tx.wait();
          txHash = rec.hash;
        }
      } else {
        throw new Error('Connect an authorized administrator wallet to publish election changes on-chain.');
      }

      await apiRequest(`/elections/elections/${electionId}/status-control/`, {
        method: 'POST',
        body: JSON.stringify({ action, tx_hash: txHash })
      });

      setStatusMsg(`Success: Election #${electionId} status transitioned to ${action}.`);
      fetchElections();
    } catch (err: any) {
      setStatusMsg(`Error: ${friendlyError(err)}`);
    }
  };

  const confirmRemoval = async () => {
    if (!removalConfirmation) return;
    setRemovalBusy(true);
    try {
      if (removalConfirmation.legacy) await removeLegacyElection(removalConfirmation.electionId);
      else await handleAction(removalConfirmation.electionId, 'CANCEL', true);
    } finally {
      setRemovalBusy(false);
      setRemovalConfirmation(null);
    }
  };

  const handleSyncEligibilityRoots = async (electionId: number) => {
    setSyncingRootsFor(electionId);
    setStatusMsg('Loading approved voter commitments...');
    try {
      const eligibility = getContract('VoterEligibility', true);
      if (!eligibility || !account) throw new Error('Connect the Central Admin wallet on the configured chain.');
      await ensureChainAdmin(getContract('ElectionManager', true));
      const data = await apiRequest(`/voters/admin/eligibility-roots/?election_id=${electionId}`);
      const roots = data.roots || [];
      if (!roots.length) throw new Error('There are no constituencies in the election state catalog to synchronize.');

      let updatedCount = 0;
      for (const root of roots) {
        const electionKey = BigInt(electionId);
        const constituencyKey = BigInt(root.constituency_id);
        const currentRoot = await eligibility.constituencyMerkleRoots(electionKey, constituencyKey);
        if (String(currentRoot).toLowerCase() === String(root.merkle_root).toLowerCase()) continue;
        const tx = await eligibility.setConstituencyMerkleRoot(
          electionKey,
          constituencyKey,
          root.merkle_root
        );
        await tx.wait();
        updatedCount += 1;
      }
      setStatusMsg(`Updated ${updatedCount} of ${roots.length} eligibility roots for election #${electionId}; unchanged roots were skipped.`);
    } catch (err: any) {
      setStatusMsg(`Eligibility root sync failed: ${friendlyError(err)}`);
    } finally {
      setSyncingRootsFor(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-full mb-2">
          <Sliders className="w-4 h-4 text-accent-400" />
          <span>Election Lifecycle State Machine</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Election Control & Timestamp Enforcement
        </h1>
        <p className="text-slate-500 text-xs">
          Strictly controls election voting windows, immediate administrative closures, and results publication.
        </p>
      </div>

      {statusMsg && (
        <div className="p-4 bg-slate-900 text-white rounded-2xl text-xs flex items-start justify-between gap-4">
          <span className="min-w-0 break-words whitespace-normal">{statusMsg}</span>
          <button onClick={() => setStatusMsg(null)} className="text-slate-400 font-bold ml-4">✕</button>
        </div>
      )}

      {/* State Transitions Notice */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm text-xs space-y-2">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-600" />
          <span>Lifecycle State Transitions</span>
        </h3>
        <p className="text-slate-600 leading-relaxed text-[11px]">
          Smart contracts enforce that votes are only accepted when state is <code className="bg-slate-100 px-1 py-0.5 rounded font-mono font-bold">ACTIVE</code> and current block timestamp is within the start/end window. 
          Authorized Central Administrators can stop or cancel an election. Cancelled elections remain in the on-chain audit history.
        </p>
      </div>

      {/* Elections Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        {chainAdmin === false && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p>The connected wallet {account ? `${account.slice(0, 8)}…${account.slice(-4)}` : ''} does not have the Central Admin contract role. Your LightVote admin login does not grant blockchain permissions.</p>
            <p className="mt-1">Click <b>Change wallet</b> in the header and select the contract deployer account that has the Central Admin role. Ensure your MetaMask is set to the <b>Sepolia</b> network.</p>
          </div>
        )}
        {account && chainAdmin === null && <div className="text-xs text-slate-500">Checking the connected wallet’s Central Admin role…</div>}
        {chainAdmin === true && (
          <button type="button" onClick={handleReconcileChainElections} className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold">
            Sync elections from active chain
          </button>
        )}
        <form onSubmit={handleCreateElection} className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <input required value={newElection.name} onChange={(e) => setNewElection({ ...newElection, name: e.target.value })} placeholder="Election name" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
          <input required type="number" value={newElection.year} onChange={(e) => setNewElection({ ...newElection, year: Number(e.target.value) })} placeholder="Year" className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
          <select required value={newElection.state} onChange={(e) => setNewElection({ ...newElection, state: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs"><option value="">Select state</option>{states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}</select>
          <select value={newElection.scope} onChange={(e) => setNewElection({ ...newElection, scope: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs"><option value="STATE_ASSEMBLY">State Assembly · all constituencies</option><option value="PARLIAMENTARY">Parliamentary</option><option value="BY_ELECTION">By-election · selected constituencies</option></select>
          {newElection.scope === 'BY_ELECTION' && (
            <section className="md:col-span-3 rounded-xl border border-slate-200 bg-white p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-slate-800">By-election constituencies</p>
                  <p className="text-[11px] text-slate-500">Choose one or more from the selected state. {newElection.constituency_ids.length} selected.</p>
                </div>
                <input
                  type="search"
                  value={constituencySearch}
                  onChange={(event) => setConstituencySearch(event.target.value)}
                  placeholder="Search constituency or district"
                  className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                  disabled={!newElection.state}
                />
              </div>
              <div className="max-h-44 overflow-y-auto rounded-lg border border-slate-100 divide-y divide-slate-100">
                {constituenciesLoading ? (
                  <p className="p-3 text-xs text-slate-500">Loading constituencies…</p>
                ) : !newElection.state ? (
                  <p className="p-3 text-xs text-slate-500">Select a state to load its constituency catalog.</p>
                ) : visibleStateConstituencies.length === 0 ? (
                  <p className="p-3 text-xs text-slate-500">No matching constituencies are available in the catalog.</p>
                ) : visibleStateConstituencies.map((constituency) => (
                  <label key={constituency.id} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-xs hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={newElection.constituency_ids.includes(constituency.id)}
                      onChange={() => toggleElectionConstituency(constituency.id)}
                      className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="font-medium text-slate-800">AC-{constituency.id}: {constituency.name}</span>
                    <span className="text-slate-500">{constituency.district_name}</span>
                  </label>
                ))}
              </div>
              <p className="text-[10px] text-amber-700">The list reflects constituencies currently loaded in the election catalog.</p>
            </section>
          )}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">Start date and time</label>
            <input required type="date" value={newElection.start_date} onChange={(e) => setNewElection({ ...newElection, start_date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
            <div className="grid grid-cols-3 gap-1.5">
              <select aria-label="Start hour" value={newElection.start_hour} onChange={(e) => setNewElection({ ...newElection, start_hour: e.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-xs">{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select>
              <select aria-label="Start minute" value={newElection.start_minute} onChange={(e) => setNewElection({ ...newElection, start_minute: e.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-xs">{Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => <option key={minute} value={minute}>{minute}</option>)}</select>
              <select aria-label="Start AM or PM" value={newElection.start_period} onChange={(e) => setNewElection({ ...newElection, start_period: e.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-xs"><option value="AM">AM</option><option value="PM">PM</option></select>
            </div>
            <p className="text-[10px] text-slate-500">Hour : minute · AM/PM</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">End date and time</label>
            <input required type="date" value={newElection.end_date} onChange={(e) => setNewElection({ ...newElection, end_date: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs" />
            <div className="grid grid-cols-3 gap-1.5">
              <select aria-label="End hour" value={newElection.end_hour} onChange={(e) => setNewElection({ ...newElection, end_hour: e.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-xs">{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, '0')).map((hour) => <option key={hour} value={hour}>{hour}</option>)}</select>
              <select aria-label="End minute" value={newElection.end_minute} onChange={(e) => setNewElection({ ...newElection, end_minute: e.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-xs">{Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map((minute) => <option key={minute} value={minute}>{minute}</option>)}</select>
              <select aria-label="End AM or PM" value={newElection.end_period} onChange={(e) => setNewElection({ ...newElection, end_period: e.target.value })} className="min-w-0 rounded-xl border border-slate-200 px-2 py-2 text-xs"><option value="AM">AM</option><option value="PM">PM</option></select>
            </div>
            <p className="text-[10px] text-slate-500">Hour : minute · AM/PM</p>
          </div>
          <button disabled={chainAdmin !== true} className="md:col-span-3 justify-self-end px-4 py-2 bg-brand-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"><Plus className="w-4 h-4" /> Create on chain and save</button>
        </form>
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading election states...</div>
        ) : (
          <div className="space-y-4">
            {elections.map((elec) => (
              <div key={elec.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="mono font-bold text-brand-700 text-xs">#{elec.id}</span>
                    <span className="text-xs font-semibold text-slate-500">• Year {elec.year}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      elec.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                      elec.status === 'UPCOMING' ? 'bg-sky-100 text-sky-800' :
                      elec.status === 'RESULTS_PUBLISHED' ? 'bg-purple-100 text-purple-800' :
                      'bg-slate-200 text-slate-700'
                    }`}>
                      {elec.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">{elec.name}</h3>
                  <p className="text-[11px] text-slate-400">
                    {elec.scope === 'BY_ELECTION' && elec.constituency_ids?.length
                      ? `By-election · ${elec.constituency_ids.map((id) => `AC-${id}`).join(', ')}`
                      : `${elec.scope === 'PARLIAMENTARY' ? 'Parliamentary' : 'Statewide'} scope`} · Window: {new Date(elec.start_time).toLocaleString()} to {new Date(elec.end_time).toLocaleString()}
                  </p>
                  {legacyElectionIds.includes(elec.id) && (
                    <p className="text-[11px] text-amber-700">This record belongs to an older contract deployment and cannot be started here. Create a new election to use the active contract.</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {legacyElectionIds.includes(elec.id) && (
                    <button
                      onClick={() => handleRemoveLegacyElection(elec.id)}
                      disabled={chainAdmin !== true}
                      className="px-3.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Remove from app
                    </button>
                  )}
                  {!legacyElectionIds.includes(elec.id) && elec.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleSyncEligibilityRoots(elec.id)}
                      disabled={chainAdmin !== true || syncingRootsFor === elec.id}
                      className="px-3.5 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {syncingRootsFor === elec.id ? 'Publishing Roots...' : 'Sync Eligibility Roots'}
                    </button>
                  )}
                  {!legacyElectionIds.includes(elec.id) && elec.status === 'UPCOMING' && (
                    <>
                      <button
                        onClick={() => handleAction(elec.id, 'START')}
                        disabled={chainAdmin !== true}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-3.5 h-3.5" /> Start Voting
                      </button>
                      <button
                        onClick={() => handleAction(elec.id, 'CANCEL')}
                        disabled={chainAdmin !== true}
                        className="px-3.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Remove
                      </button>
                    </>
                  )}
                  {!legacyElectionIds.includes(elec.id) && elec.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => handleAction(elec.id, 'STOP')}
                        disabled={chainAdmin !== true}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Square className="w-3.5 h-3.5" /> Stop Voting
                      </button>
                      <button
                        onClick={() => handleAction(elec.id, 'CANCEL')}
                        disabled={chainAdmin !== true}
                        className="px-3.5 py-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Remove
                      </button>
                    </>
                  )}
                  {!legacyElectionIds.includes(elec.id) && elec.status === 'ENDED' && (
                    <button
                      onClick={() => handleAction(elec.id, 'PUBLISH_RESULTS')}
                      disabled={chainAdmin !== true}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Publish Results
                    </button>
                  )}
                  {!legacyElectionIds.includes(elec.id) && elec.status === 'RESULTS_PUBLISHED' && (
                    <button
                      onClick={() => handleAction(elec.id, 'ARCHIVE')}
                      disabled={chainAdmin !== true}
                      className="px-3.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Archive className="w-3.5 h-3.5" /> Archive
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {removalConfirmation && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => { if (event.target === event.currentTarget && !removalBusy) setRemovalConfirmation(null); }}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="remove-election-title" className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-full bg-rose-100 p-2 text-rose-700"><XCircle className="h-5 w-5" /></div>
              <div>
                <h2 id="remove-election-title" className="text-lg font-bold text-slate-900">
                  {removalConfirmation.legacy ? 'Remove election from app?' : 'Cancel this election?'}
                </h2>
                <p className="mt-1 text-sm font-semibold text-slate-700">#{removalConfirmation.electionId} · {removalConfirmation.electionName}</p>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              {removalConfirmation.legacy
                ? 'This removes the legacy election record from the LightVote database only. It cannot erase transactions from its previous blockchain deployment.'
                : 'This permanently cancels the election on the active blockchain, stops it from accepting votes, and keeps the cancellation in the audit history. This cannot be undone.'}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" disabled={removalBusy} onClick={() => setRemovalConfirmation(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">Keep election</button>
              <button type="button" disabled={removalBusy} onClick={confirmRemoval} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-bold text-white hover:bg-rose-800 disabled:opacity-50">
                {removalBusy ? 'Processing…' : removalConfirmation.legacy ? 'Remove from app' : 'Confirm cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
