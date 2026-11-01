import React, { useState, useEffect, useRef } from 'react';
import { Building2, Plus, Pencil, Trash2, CheckCircle2, XCircle, AlertCircle, Save, X, Upload, Image as ImageIcon } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Party } from '../types';
import { apiOrigin } from '../services/apiClient';

const API_BASE = apiOrigin;

const EMPTY_FORM = {
  name: '',
  abbreviation: '',
  symbol_name: '',
  color_hex: '#1E40AF',
  is_active: true,
};

type ModalMode = 'add' | 'edit';

export const PartyManagementPage: React.FC = () => {
  const [parties, setParties] = useState<Party[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  /* ── Logo upload ── */
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  /* ── Data ── */
  const fetchParties = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/candidates/parties/');
      setParties(data.results || data || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load parties.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchParties(); }, []);

  const flash = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  /* ── Logo helpers ── */
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const getPartyLogoUrl = (p: Party): string | null => {
    if (p.symbol_image) {
      if (p.symbol_image.startsWith('http')) return p.symbol_image;
      return `${API_BASE}/media/${p.symbol_image}`;
    }
    if (p.symbol_url) return p.symbol_url;
    return null;
  };

  /* ── Open modals ── */
  const openAdd = () => {
    setFormData({ ...EMPTY_FORM });
    clearLogo();
    setModalMode('add');
    setEditingId(null);
    setError(null);
    setShowModal(true);
  };

  const openEdit = (p: Party) => {
    setFormData({
      name: p.name,
      abbreviation: p.abbreviation,
      symbol_name: p.symbol_name,
      color_hex: p.color_hex,
      is_active: p.is_active,
    });
    clearLogo();
    const existingLogo = getPartyLogoUrl(p);
    if (existingLogo) setLogoPreview(existingLogo);
    setModalMode('edit');
    setEditingId(p.id);
    setError(null);
    setShowModal(true);
  };

  /* ── Save (add / edit) ── */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      fd.append('abbreviation', formData.abbreviation);
      fd.append('symbol_name', formData.symbol_name);
      fd.append('color_hex', formData.color_hex);
      fd.append('is_active', formData.is_active.toString());
      if (logoFile) fd.append('symbol_image', logoFile);

      if (modalMode === 'add') {
        await apiRequest('/candidates/parties/', {
          method: 'POST',
          body: fd,
        });
        flash('Party registered successfully.');
      } else {
        await apiRequest(`/candidates/parties/${editingId}/`, {
          method: 'PATCH',
          body: fd,
        });
        flash('Party details updated successfully.');
      }
      setShowModal(false);
      fetchParties();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSaving(false);
    }
  };

  /* ── Delete ── */
  const handleDelete = async (id: number) => {
    try {
      await apiRequest(`/candidates/parties/${id}/`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      flash('Party removed.');
      fetchParties();
    } catch (err: any) {
      setError(err.message || 'Delete failed.');
    }
  };

  /* ── Toggle active ── */
  const toggleActive = async (p: Party) => {
    try {
      await apiRequest(`/candidates/parties/${p.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !p.is_active }),
      });
      flash(`Party ${p.is_active ? 'deactivated' : 'activated'}.`);
      fetchParties();
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-xs font-semibold rounded-full border border-purple-200 mb-2">
            <Building2 className="w-4 h-4 text-purple-600" />
            <span>Political Parties Commission</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Recognized Political Parties
          </h1>
          <p className="text-slate-500 text-xs">
            Manage officially recognized parties, reserved election symbols, logos, and brand colors.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Political Party</span>
        </button>
      </div>

      {/* ── Global alerts ── */}
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

      {/* ── Parties Grid ── */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-xs">Loading political parties...</div>
      ) : parties.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          No parties registered yet. Click "Add Political Party" to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {parties.map((p) => {
            const logoUrl = getPartyLogoUrl(p);
            return (
              <div key={p.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 relative group">

                {/* Logo / Color swatch + abbrev + status */}
                <div className="flex items-center justify-between">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${p.name} logo`}
                      className="w-14 h-14 rounded-xl object-contain border border-slate-200 shadow-sm bg-white p-1"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-white font-extrabold text-sm shadow-sm"
                      style={{ backgroundColor: p.color_hex }}
                    >
                      {p.abbreviation}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(p)}
                      title={p.is_active ? 'Deactivate party' : 'Activate party'}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition ${
                        p.is_active
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {p.is_active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {p.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>

                {/* Party info */}
                <div>
                  <h3 className="font-bold text-slate-900 text-base">{p.name}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <b className="text-slate-700">{p.abbreviation}</b> · Symbol: <b className="text-slate-700">{p.symbol_name}</b>
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                  <span>
                    Color: <code className="font-mono text-slate-700 font-bold">{p.color_hex}</code>
                    <span className="inline-block w-3 h-3 rounded-full ml-1 border border-slate-300 align-middle" style={{ backgroundColor: p.color_hex }} />
                  </span>
                  {logoUrl && (
                    <span className="text-emerald-600 font-semibold text-[10px]">✓ Logo</span>
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => openEdit(p)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-semibold rounded-xl transition border border-brand-200"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(p.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-xl transition border border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {modalMode === 'add' ? <Plus className="w-5 h-5 text-brand-600" /> : <Pencil className="w-5 h-5 text-brand-600" />}
                {modalMode === 'add' ? 'Add Political Party' : 'Edit Party Details'}
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

            <form onSubmit={handleSave} className="space-y-4 text-xs">

              {/* Logo Upload */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Party Logo / Symbol Image</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-20 h-20 rounded-2xl object-contain border-2 border-purple-200 shadow-sm bg-white p-1"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      </div>
                    )}
                    {logoPreview && (
                      <button
                        type="button"
                        onClick={clearLogo}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md hover:bg-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="flex-1">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                      id="party-logo-input"
                    />
                    <label
                      htmlFor="party-logo-input"
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 font-semibold cursor-pointer hover:bg-slate-100 transition"
                    >
                      <Upload className="w-4 h-4" />
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </label>
                    <p className="text-[10px] text-slate-400 mt-1">JPG, PNG, SVG or WebP. Max 5MB.</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Party Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Dravida Munnetra Kazhagam"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Abbreviation *</label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={formData.abbreviation}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                    placeholder="DMK"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl uppercase font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Color *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.color_hex}
                      onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                      className="w-10 h-10 p-1 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color_hex}
                      onChange={(e) => setFormData({ ...formData, color_hex: e.target.value })}
                      maxLength={7}
                      className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reserved Election Symbol *</label>
                <input
                  type="text"
                  required
                  value={formData.symbol_name}
                  onChange={(e) => setFormData({ ...formData, symbol_name: e.target.value })}
                  placeholder="e.g. Rising Sun, Two Leaves, Lotus"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <input
                  id="party_active"
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 accent-brand-600 cursor-pointer"
                />
                <label htmlFor="party_active" className="font-semibold text-slate-700 cursor-pointer select-none">
                  Mark as Active (eligible to field candidates)
                </label>
              </div>

              {/* Live preview */}
              {formData.name && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Preview logo"
                      className="w-10 h-10 rounded-lg object-contain border border-slate-200 bg-white p-0.5"
                    />
                  ) : (
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-extrabold shadow"
                      style={{ backgroundColor: formData.color_hex }}
                    >
                      {formData.abbreviation || '?'}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{formData.name}</p>
                    <p className="text-xs text-slate-400">{formData.symbol_name || 'Symbol TBD'}</p>
                  </div>
                </div>
              )}

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
                  {saving ? 'Saving...' : modalMode === 'add' ? 'Save Party' : 'Update Party'}
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
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Confirm Party Deletion</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  This will permanently remove the party record. Candidates linked to this party will lose their affiliation.
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
                Delete Party
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
