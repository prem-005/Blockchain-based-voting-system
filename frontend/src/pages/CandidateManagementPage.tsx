import React, { useState, useEffect, useRef } from 'react';
import {
  Vote, Plus, Pencil, Trash2, CheckCircle2, XCircle,
  AlertCircle, Save, X, Search, Upload, User as UserIcon
} from 'lucide-react';
import { ethers } from 'ethers';
import { apiRequest } from '../api/client';
import { useWeb3 } from '../context/Web3Context';
import { Candidate, Election, Party, District, Constituency } from '../types';
import { apiOrigin } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import contractsConfig from '../contracts/contracts.json';

const EXPECTED_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || (contractsConfig as any).chainId || 11155111);

const API_BASE = apiOrigin;

const EMPTY_FORM = {
  name: '',
  party: '',
  election: 0,
  district: 0,
  constituency: 0,
  affidavit_summary: '',
  is_active: true,
};

type ModalMode = 'add' | 'edit';

export const CandidateManagementPage: React.FC = () => {
  const { getContract, account, chainId } = useWeb3();
  const { user } = useAuth();
  const assignedDistrictId = user?.role === 'DISTRICT_ADMIN' ? user.assigned_district_id ?? null : null;

  /* ── data ── */
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [elections, setElections] = useState<Election[]>([]);
  const [parties, setParties] = useState<Party[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);
  const allowedDistricts = assignedDistrictId == null ? districts : districts.filter((district) => district.id === assignedDistrictId);

  /* ── filters ── */
  const [selectedElection, setSelectedElection] = useState<string>('');
  const [selectedConstituency, setSelectedConstituency] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  /* ── ui ── */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  /* ── modal ── */
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  /* ── photo upload ── */
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  /* ── fetch helpers ── */
  const fetchCandidates = async () => {
    setLoading(true);
    let url = `/candidates/candidates/?election_id=${selectedElection}`;
    if (selectedConstituency) url += `&constituency_id=${selectedConstituency}`;
    if (assignedDistrictId != null) url += `&district_id=${assignedDistrictId}`;
    try {
      const data = await apiRequest(url);
      setCandidates(data.results || data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([
      apiRequest('/elections/elections/'),
      apiRequest('/candidates/parties/'),
      apiRequest('/elections/districts/'),
    ]).then(([electionData, partyData, districtData]) => {
      const loadedElections = electionData.results || electionData || [];
      const loadedDistricts = districtData.results || districtData || [];
      setElections(loadedElections);
      setParties(partyData.results || partyData || []);
      setDistricts(loadedDistricts);
      if (loadedElections.length) setSelectedElection(String(loadedElections[0].id));
      setFormData((current) => ({
        ...current,
        election: loadedElections[0]?.id || 0,
        district: assignedDistrictId ?? loadedDistricts[0]?.id ?? 0,
      }));
    }).catch((e: any) => setError(e.message || 'Could not load candidate form data.'));
  }, []);

  useEffect(() => { fetchCandidates(); }, [selectedElection, selectedConstituency, assignedDistrictId]);

  // reload constituencies when district changes in form
  useEffect(() => {
    if (!formData.district) return;
    apiRequest(`/elections/constituencies/?district_id=${formData.district}`)
      .then(d => setConstituencies(d.results || d || []));
  }, [formData.district]);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  /* ── photo helpers ── */
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPhotoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearPhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = '';
  };

  const getCandidatePhotoUrl = (c: Candidate): string | null => {
    if (c.photo) {
      if (c.photo.startsWith('http')) return c.photo;
      return `${API_BASE}/media/${c.photo}`;
    }
    if (c.photo_url) return c.photo_url;
    return null;
  };

  /* ── open add modal ── */
  const openAdd = () => {
    setFormData({
      ...EMPTY_FORM,
      election: Number(selectedElection) || elections[0]?.id || 0,
      district: assignedDistrictId ?? districts[0]?.id ?? 0,
      constituency: 0,
    });
    clearPhoto();
    setModalMode('add');
    setEditingId(null);
    setError(null);
    setShowModal(true);
  };

  /* ── open edit modal ── */
  const openEdit = (c: Candidate) => {
    setFormData({
      name: c.name,
      party: c.party?.toString() ?? '',
      election: c.election as number,
      district: c.district as number,
      constituency: c.constituency as number,
      affidavit_summary: c.affidavit_summary || '',
      is_active: c.is_active,
    });
    clearPhoto();
    const existingPhoto = getCandidatePhotoUrl(c);
    if (existingPhoto) setPhotoPreview(existingPhoto);
    setModalMode('edit');
    setEditingId(c.id);
    setError(null);
    setShowModal(true);
  };

  /* ── save (add / edit) ── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    let confirmedRegistrationTx: string | null = null;
    try {
      if (modalMode === 'add') {
        const expectedChainId = EXPECTED_CHAIN_ID;
        if (!account || chainId !== expectedChainId) throw new Error(`Connect an administrator wallet on chain ${expectedChainId} before registering a candidate.`);
        const candRef = ethers.keccak256(
          ethers.toUtf8Bytes(formData.name + formData.election + Date.now())
        );

        const lightVote = getContract('LightVote', true);
        if (!lightVote) throw new Error('LightVote contract is unavailable for the connected network.');
        const partyObj = parties.find(p => p.id.toString() === formData.party);
        if (!partyObj) throw new Error('Select a valid registered party.');

        // Enforce that each party can nominate at most ONE candidate per constituency per election
        const duplicatePartyCandidate = candidates.find(c => 
          Number(c.election) === Number(formData.election) &&
          Number(c.constituency) === Number(formData.constituency) &&
          (Number(c.party) === Number(formData.party) || Number(c.party_details?.id) === Number(formData.party)) &&
          c.is_active
        );
        if (duplicatePartyCandidate) {
          throw new Error(`The party '${partyObj.name} (${partyObj.abbreviation})' already has a nominated candidate (${duplicatePartyCandidate.name}) in this constituency.`);
        }

        // Enforce unique candidate name in this constituency
        const duplicateNameCandidate = candidates.find(c =>
          Number(c.election) === Number(formData.election) &&
          Number(c.constituency) === Number(formData.constituency) &&
          c.name.trim().toLowerCase() === formData.name.trim().toLowerCase()
        );
        if (duplicateNameCandidate) {
          throw new Error(`A candidate named '${formData.name}' is already registered in this constituency.`);
        }

        const tx = await lightVote.registerCandidate(
          BigInt(formData.election),
          BigInt(formData.district),
          BigInt(formData.constituency),
          candRef,
          formData.name,
          partyObj.abbreviation
        );
        const rec = await tx.wait();
        if (!rec || rec.status !== 1) throw new Error('Candidate registration did not confirm on-chain.');
        const registrationEvent = rec.logs
          .map((log: any) => { try { return lightVote.interface.parseLog(log); } catch { return null; } })
          .find((event: any) => event?.name === 'CandidateRegistered');
        if (!registrationEvent) throw new Error(`Registration confirmed (${rec.hash}), but CandidateRegistered event was missing.`);
        confirmedRegistrationTx = rec.hash;

        // Build FormData for multipart upload
        const fd = new FormData();
        fd.append('name', formData.name);
        fd.append('party', formData.party);
        fd.append('election', formData.election.toString());
        fd.append('district', formData.district.toString());
        fd.append('constituency', formData.constituency.toString());
        fd.append('affidavit_summary', formData.affidavit_summary);
        fd.append('is_active', formData.is_active.toString());
        fd.append('registration_tx_hash', confirmedRegistrationTx);
        if (photoFile) fd.append('photo', photoFile);

        await apiRequest('/candidates/candidates/', {
          method: 'POST',
          body: fd,
        });
        flash('Candidate nominated successfully.');
      } else {
        const candidate = candidates.find((item) => item.id === editingId);
        if (!candidate) throw new Error('Candidate record is no longer available. Refresh and try again.');
        if (candidate.is_active !== formData.is_active) {
          const expectedChainId = EXPECTED_CHAIN_ID;
          if (!account || chainId !== expectedChainId) throw new Error(`Connect an administrator wallet on chain ${expectedChainId} to change ballot status.`);
          const lightVote = getContract('LightVote', true);
          if (!lightVote || !candidate.candidate_id) throw new Error('Candidate is missing its verified on-chain ID.');
          const tx = await lightVote.setCandidateActive(BigInt(candidate.candidate_id), formData.is_active);
          const receipt = await tx.wait();
          if (!receipt || receipt.status !== 1) throw new Error('Candidate status change did not confirm on-chain.');
        }
        // Edit — only update mutable fields (not on-chain data)
        const fd = new FormData();
        fd.append('name', formData.name);
        if (formData.party) fd.append('party', formData.party);
        fd.append('affidavit_summary', formData.affidavit_summary);
        fd.append('is_active', formData.is_active.toString());
        if (photoFile) fd.append('photo', photoFile);

        await apiRequest(`/candidates/candidates/${editingId}/`, {
          method: 'PATCH',
          body: fd,
        });
        flash('Candidate record updated.');
      }

      setShowModal(false);
      fetchCandidates();
    } catch (err: any) {
      setError(confirmedRegistrationTx
        ? `Candidate was registered on-chain (${confirmedRegistrationTx}), but the API did not save its record: ${err.message || 'Operation failed.'}`
        : (err.message || 'Operation failed.'));
    } finally {
      setSaving(false);
    }
  };

  /* ── delete ── */
  const handleDelete = async (id: number) => {
    try {
      const candidate = candidates.find((item) => item.id === id);
      if (!candidate?.candidate_id) throw new Error('Candidate does not have a verified on-chain ID.');
      const expectedChainId = EXPECTED_CHAIN_ID;
      if (!account || chainId !== expectedChainId) throw new Error(`Connect an administrator wallet on chain ${expectedChainId} to withdraw a candidate.`);
      const lightVote = getContract('LightVote', true);
      if (!lightVote) throw new Error('LightVote contract is unavailable.');
      const tx = await lightVote.setCandidateActive(BigInt(candidate.candidate_id), false);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error('Candidate withdrawal did not confirm on-chain.');
      await apiRequest(`/candidates/candidates/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: false }),
      });
      setDeleteConfirmId(null);
      flash('Candidate withdrawn from the ballot; the record remains available for audit.');
      fetchCandidates();
    } catch (err: any) {
      setError(err.message || 'Delete failed.');
    }
  };

  /* ── toggle active ── */
  const toggleActive = async (c: Candidate) => {
    try {
      const expectedChainId = EXPECTED_CHAIN_ID;
      if (!account || chainId !== expectedChainId) throw new Error(`Connect an administrator wallet on chain ${expectedChainId} to change ballot status.`);
      if (!c.candidate_id) throw new Error('Candidate does not have a verified on-chain ID.');
      const lightVote = getContract('LightVote', true);
      if (!lightVote) throw new Error('LightVote contract is unavailable.');
      const tx = await lightVote.setCandidateActive(BigInt(c.candidate_id), !c.is_active);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error('Candidate status change did not confirm on-chain.');
      await apiRequest(`/candidates/candidates/${c.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !c.is_active }),
      });
      flash(`Candidate ${c.is_active ? 'withdrawn from' : 'restored to'} ballot.`);
      fetchCandidates();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    }
  };

  /* ── local search filter ── */
  const filtered = candidates.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.party_details?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  /* ── render ── */
  return (
    <div className="max-w-7xl mx-auto py-10 px-4 space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent-50 text-accent-700 text-xs font-semibold rounded-full border border-accent-200 mb-2">
            <Vote className="w-4 h-4 text-accent-600" />
            <span>Candidate Enrollment & Ballots</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Candidate Nomination & Scoping
          </h1>
          <p className="text-slate-500 text-xs">
            Register, edit, and manage candidates scoped to Assembly Constituencies.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Nominate Candidate</span>
        </button>
      </div>

      {/* Global alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {error && !showModal && (
        <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Election:</span>
          <select
            value={selectedElection}
            onChange={(e) => setSelectedElection(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {elections.map((e) => (
              <option key={e.id} value={e.id}>{e.year} — {e.name?.slice(0, 30)}...</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold">Constituency:</span>
          <select
            value={selectedConstituency}
            onChange={(e) => setSelectedConstituency(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Constituencies</option>
            {constituencies.map((c) => (
              <option key={c.id} value={c.id}>AC-{c.id}: {c.name}</option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
          <input
            type="text"
            placeholder="Search name or party..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <span className="ml-auto text-slate-400 font-mono">{filtered.length} candidate{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Candidates Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">Loading candidate roster...</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 m-4 rounded-2xl border border-dashed border-slate-200">
            No candidates match the current filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-400 uppercase text-[10px]">
                  <th className="px-6 py-3 font-semibold">Ballot #</th>
                  <th className="px-4 py-3 font-semibold">Photo</th>
                  <th className="px-4 py-3 font-semibold">Candidate Name</th>
                  <th className="px-4 py-3 font-semibold">Political Party</th>
                  <th className="px-4 py-3 font-semibold">Constituency</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">On-Chain Ref</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => {
                  const photoUrl = getCandidatePhotoUrl(c);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3.5 font-mono font-bold text-brand-700">
                        #{c.candidate_id || c.id}
                      </td>
                      <td className="px-4 py-3.5">
                        {photoUrl ? (
                          <img
                            src={photoUrl}
                            alt={c.name}
                            className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-sm"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                            <UserIcon className="w-5 h-5 text-slate-400" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900">{c.name}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          {c.party_details?.color_hex && (
                            <span
                              className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 border border-slate-300"
                              style={{ backgroundColor: c.party_details.color_hex }}
                            />
                          )}
                          <span className="font-semibold text-slate-700">
                            {c.party_details?.name ?? 'Independent'}{' '}
                            {c.party_details?.abbreviation ? `(${c.party_details.abbreviation})` : ''}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">
                        AC-{c.constituency}: {c.constituency_name}
                        <span className="text-slate-400"> · {c.district_name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={() => toggleActive(c)}
                          title="Click to toggle ballot status"
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                            c.is_active
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {c.is_active
                            ? <><CheckCircle2 className="w-3 h-3" /> Active</>
                            : <><XCircle className="w-3 h-3" /> Withdrawn</>}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[10px] text-slate-400">
                        {c.candidate_ref ? `${c.candidate_ref.slice(0, 12)}…` : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(c)}
                            title="Edit candidate"
                            className="p-1.5 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(c.id)}
                            title="Delete candidate"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {modalMode === 'add'
                  ? <><Plus className="w-5 h-5 text-brand-600" /> Nominate New Candidate</>
                  : <><Pencil className="w-5 h-5 text-brand-600" /> Edit Candidate Record</>}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {modalMode === 'edit' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
                ⚠️ On-chain data (constituency, election, blockchain ref) cannot be changed after nomination. Only name, party, photo, affidavit, and ballot status are editable.
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">

              {/* Photo Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Candidate Photo</label>
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  <div className="relative">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Photo preview"
                        className="w-20 h-20 rounded-2xl object-cover border-2 border-brand-200 shadow-sm"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                        <UserIcon className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    {photoPreview && (
                      <button
                        type="button"
                        onClick={clearPhoto}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="candidate-photo-input"
                    />
                    <label
                      htmlFor="candidate-photo-input"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 transition"
                    >
                      <Upload className="w-4 h-4" />
                      {photoPreview ? 'Change Photo' : 'Upload Photo'}
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">JPG, PNG or WebP. Max 5MB.</p>
                  </div>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Candidate Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full legal name as per Aadhaar"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {/* Party */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Party Affiliation *</label>
                <select
                  required
                  value={formData.party}
                  onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">-- Select Party --</option>
                  {parties.map((p) => {
                    const isNominated = modalMode === 'add' && Boolean(formData.constituency) && candidates.some(c =>
                      Number(c.election) === Number(formData.election) &&
                      Number(c.constituency) === Number(formData.constituency) &&
                      (Number(c.party) === p.id || Number(c.party_details?.id) === p.id) &&
                      c.is_active
                    );
                    return (
                      <option key={p.id} value={p.id} disabled={isNominated}>
                        {p.name} ({p.abbreviation}) {isNominated ? '— [Already Nominated in this Constituency]' : ''}
                      </option>
                    );
                  })}
                </select>
                {modalMode === 'add' && Boolean(formData.party) && Boolean(formData.constituency) && candidates.some(c =>
                  Number(c.election) === Number(formData.election) &&
                  Number(c.constituency) === Number(formData.constituency) &&
                  (Number(c.party) === Number(formData.party) || Number(c.party_details?.id) === Number(formData.party)) &&
                  c.is_active
                ) && (
                  <p className="mt-1.5 text-xs text-rose-600 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    This party already has an active nominee in this constituency for this election. Choose another party or constituency.
                  </p>
                )}
              </div>

              {/* District + Constituency (only editable on ADD) */}
              {modalMode === 'add' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Election *</label>
                    <select
                      value={formData.election}
                      onChange={(e) => setFormData({ ...formData, election: parseInt(e.target.value) })}
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      {elections.map((el) => (
                        <option key={el.id} value={el.id}>{el.year} — {el.name?.slice(0, 40)}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">District *</label>
                      <select
                        value={formData.district}
                        disabled={assignedDistrictId != null}
                        onChange={(e) => setFormData({ ...formData, district: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {allowedDistricts.map((d) => (
                          <option key={d.id} value={d.id}>{d.id}. {d.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Constituency *</label>
                      <select
                        value={formData.constituency}
                        onChange={(e) => setFormData({ ...formData, constituency: parseInt(e.target.value) })}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                      >
                        {constituencies.map((con) => (
                          <option key={con.id} value={con.id}>AC-{con.id}: {con.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Affidavit */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Affidavit Summary</label>
                <textarea
                  rows={3}
                  value={formData.affidavit_summary}
                  onChange={(e) => setFormData({ ...formData, affidavit_summary: e.target.value })}
                  placeholder="Official educational qualifications and criminal history disclosure (Form 26)"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Active toggle */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  id="cand_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                />
                <label htmlFor="cand_active" className="font-semibold text-slate-700 cursor-pointer select-none">
                  Active on Ballot (uncheck to mark as Withdrawn)
                </label>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-bold rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : modalMode === 'add' ? 'Confirm Nomination' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-rose-200">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Remove Candidate?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  This removes the candidate's backend record. On-chain data remains immutable. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Remove Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
