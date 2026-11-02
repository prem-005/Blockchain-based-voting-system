import React, { useState, useEffect } from 'react';
import { Sliders, Play, Square, CheckCircle2, Archive, Clock, ShieldCheck, Plus, XCircle } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useWeb3 } from '../context/Web3Context';
import { Election } from '../types';

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
  const [newElection, setNewElection] = useState({ name: '', year: new Date().getFullYear(), scope: 'STATE_ASSEMBLY', state: '', start_time: '', end_time: '' });

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
      return 'This MetaMask account is not a Central Admin on the connected chain. Switch accounts and try again. For the local Hardhat deployment, the deployer account is 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266.';
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
      if (!newElection.state || !newElection.start_time || !newElection.end_time) throw new Error('Complete all election fields.');
      const onChainIds = await manager.getAllElectionIds();
      const persistedIds = elections.map((election) => election.id);
      const deployedIds = onChainIds.map((id: bigint) => Number(id));
      const electionId = Math.max(0, ...persistedIds, ...deployedIds) + 1;
      if (!Number.isSafeInteger(electionId)) throw new Error('Could not allocate a safe election ID.');
      const state = states.find((item) => String(item.id) === newElection.state);
      if (!state) throw new Error('Select a valid state.');
      const start = new Date(newElection.start_time);
      const end = new Date(newElection.end_time);
      if (end <= start) throw new Error('End time must be after start time.');
      const tx = await manager.createElection(BigInt(electionId), newElection.name, newElection.year, state.name, BigInt(Math.floor(start.getTime() / 1000)), BigInt(Math.floor(end.getTime() / 1000)));
      const receipt = await tx.wait();
      await apiRequest('/elections/elections/', { method: 'POST', body: JSON.stringify({ id: electionId, ...newElection, state: Number(newElection.state), start_time: start.toISOString(), end_time: end.toISOString(), creation_tx_hash: receipt.hash }) });
      setStatusMsg(`Election #${electionId} created and reconciled with the blockchain.`);
      setNewElection({ name: '', year: new Date().getFullYear(), scope: 'STATE_ASSEMBLY', state: '', start_time: '', end_time: '' });
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

          const candidateData = await apiRequest(`/candidates/candidates/?election_id=${electionId}`);
          const candidates = candidateData.results || candidateData || [];
          const candidateIds = candidates
            .map((candidate: any) => Number(candidate.candidate_id || candidate.id))
            .filter((id: number) => Number.isSafeInteger(id) && id > 0);
          if (candidateIds.length === 0) {
            throw new Error('No candidate IDs are registered for this election.');
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
      if (!roots.length) throw new Error('There are no approved, email-verified voters to publish yet.');

      for (const root of roots) {
        const tx = await eligibility.setConstituencyMerkleRoot(
          BigInt(electionId),
          BigInt(root.constituency_id),
          root.merkle_root
        );
        await tx.wait();
      }
      setStatusMsg(`Published ${roots.length} eligibility root(s) for election #${electionId}.`);
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
          <select value={newElection.scope} onChange={(e) => setNewElection({ ...newElection, scope: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs"><option value="STATE_ASSEMBLY">State Assembly</option><option value="PARLIAMENTARY">Parliamentary</option><option value="BY_ELECTION">By-election</option></select>
          <input required type="datetime-local" value={newElection.start_time} onChange={(e) => setNewElection({ ...newElection, start_time: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
          <input required type="datetime-local" value={newElection.end_time} onChange={(e) => setNewElection({ ...newElection, end_time: e.target.value })} className="rounded-xl border border-slate-200 px-3 py-2 text-xs" />
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
                    Window: {new Date(elec.start_time).toLocaleString()} to {new Date(elec.end_time).toLocaleString()}
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
