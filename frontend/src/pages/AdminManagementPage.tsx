import React, { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Shield, UserPlus, Users } from 'lucide-react';
import { AdminLayout } from '../components/AdminLayout';
import { apiRequest } from '../api/client';
import { District } from '../types';
import { useAuth } from '../context/AuthContext';

type AdminAccount = {
  id: number;
  email: string;
  first_name: string;
  role: 'CENTRAL_ADMIN' | 'DISTRICT_ADMIN';
  assigned_district_id: number | null;
  district_name: string | null;
  is_active: boolean;
  is_verified: boolean;
  is_bootstrap_admin: boolean;
};

export const AdminManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AdminAccount['role']>('DISTRICT_ADMIN');
  const [districtId, setDistrictId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [adminData, districtData] = await Promise.all([
        apiRequest<AdminAccount[] | { results: AdminAccount[] }>('/auth/admins/'),
        apiRequest<District[] | { results: District[] }>('/elections/districts/'),
      ]);
      setAdmins(Array.isArray(adminData) ? adminData : adminData.results);
      setDistricts(Array.isArray(districtData) ? districtData : districtData.results);
    } catch (err: any) {
      setError(err.message || 'Could not load administrator accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const createAdmin = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiRequest('/auth/admins/', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          role,
          assigned_district_id: role === 'DISTRICT_ADMIN' ? Number(districtId) : null,
        }),
      });
      setEmail('');
      setSuccess('Administrator account created. The account holder must verify their email with an OTP before signing in.');
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not create administrator account.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (admin: AdminAccount) => {
    setError(null);
    setSuccess(null);
    try {
      await apiRequest(`/auth/admins/${admin.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !admin.is_active }),
      });
      setSuccess(`${admin.email} ${admin.is_active ? 'deactivated' : 'reactivated'}.`);
      await load();
    } catch (err: any) {
      setError(err.message || 'Could not update administrator account.');
    }
  };

  return (
    <AdminLayout title="Administrator Accounts" subtitle="Provision and manage central and district administrator access.">
      <div className="space-y-6">
        {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>}
        {success && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{success}</div>}

        <form onSubmit={createAdmin} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-4">
          <label className="text-xs font-semibold text-slate-700">Email
            <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="admin@example.org" />
          </label>
          <label className="text-xs font-semibold text-slate-700">Role
            <select value={role} onChange={(event) => setRole(event.target.value as AdminAccount['role'])} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="DISTRICT_ADMIN">District Administrator</option>
              <option value="CENTRAL_ADMIN">Central Administrator</option>
            </select>
          </label>
          {role === 'DISTRICT_ADMIN' && <label className="text-xs font-semibold text-slate-700">Assigned district
            <select required value={districtId} onChange={(event) => setDistrictId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <option value="">Select district</option>
              {districts.map((district) => <option key={district.id} value={district.id}>{district.name}</option>)}
            </select>
          </label>}
          <button disabled={saving} className="self-end inline-flex items-center justify-center gap-2 rounded-lg bg-[#102A56] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
            <UserPlus className="h-4 w-4" /> {saving ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="flex items-center gap-2 font-bold text-slate-900"><Users className="h-4 w-4 text-blue-600" /> Authorized administrators</h2>
            <button type="button" onClick={() => void load()} disabled={loading} aria-label="Refresh administrators" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading administrator accounts…</p> : admins.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No administrator accounts found.</p> : (
            <div className="divide-y divide-slate-100">
              {admins.map((admin) => <div key={admin.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div>
                  <p className="font-semibold text-slate-900">{admin.email}</p>
                  <p className="mt-1 text-xs text-slate-500">{admin.role === 'DISTRICT_ADMIN' ? `District Administrator · ${admin.district_name || `District #${admin.assigned_district_id}`}` : 'Central Administrator'}</p>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-slate-500">{admin.is_verified ? <CheckCircle2 className="h-3 w-3 text-emerald-600" /> : <Shield className="h-3 w-3 text-amber-600" />}{admin.is_verified ? 'Email verified' : 'Email verification required'} · {admin.is_active ? 'Active' : 'Inactive'}</p>
                </div>
                <button type="button" disabled={admin.is_bootstrap_admin || admin.id === user?.id} onClick={() => void toggleActive(admin)} className={`rounded-lg border px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${admin.is_active ? 'border-rose-200 text-rose-700 hover:bg-rose-50' : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                  {admin.is_bootstrap_admin ? 'Bootstrap account' : admin.id === user?.id ? 'Current account' : admin.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
              </div>)}
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
};
