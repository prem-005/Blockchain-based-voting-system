import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Users, Vote, CheckCircle2, XCircle, Clock, ShieldCheck, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { Candidate } from '../types';

export const DistrictAdminDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [districtVoters, setDistrictVoters] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const districtId = user?.assigned_district_id ?? null;
  const districtLabel = districtId == null ? 'No district assigned' : `District #${districtId}`;

  const fetchDistrictData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const vData = await apiRequest(`/voters/admin/list/`);
      setDistrictVoters(vData.results || vData || []);

      if (districtId == null) {
        setCandidates([]);
      } else {
        const cData = await apiRequest(`/candidates/candidates/?district_id=${districtId}`);
        setCandidates(cData.results || cData || []);
      }
    } catch (e) {
      console.error(e);
      setLoadError((e as Error).message || 'Could not load district data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDistrictData();
  }, [districtId]);

  const handleReview = async (voterId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      await apiRequest(`/voters/admin/${voterId}/review/`, {
        method: 'POST',
        body: JSON.stringify({ action, rejection_reason: action === 'REJECT' ? 'Documentation unverified.' : '' })
      });
      setReviewMsg(`Voter #${voterId} successfully ${action.toLowerCase()}d.`);
      fetchDistrictData();
    } catch (e: any) {
      alert(e.message || "Failed to update voter status.");
    }
  };

  const pendingVoters = districtVoters.filter(v => v.status === 'PENDING');

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-200 mb-2">
          <Building2 className="w-4 h-4 text-brand-600" />
          <span>District Returning Officer (DRO) Portal</span>
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          District Electoral Administration
        </h1>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-slate-500 text-xs">
            Assigned District: <b className="text-slate-900">{districtLabel}</b> • State of Tamil Nadu
          </p>
          <button type="button" onClick={() => void fetchDistrictData()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh data
          </button>
        </div>
      </div>

      {loadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadError}</p>}

      {reviewMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between">
          <span>{reviewMsg}</span>
          <button onClick={() => setReviewMsg(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* District KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase">District Registered Voters</span>
          <p className="text-2xl font-extrabold text-slate-900 mono">{districtVoters.length}</p>
          <span className="text-[11px] text-slate-400">Within your assigned district</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase">Applications Pending Review</span>
          <p className="text-2xl font-extrabold text-amber-600 mono">{pendingVoters.length}</p>
          <span className="text-[11px] text-slate-400">Requires officer verification</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-slate-400 text-xs font-semibold uppercase">Enrolled Candidates</span>
          <p className="text-2xl font-extrabold text-brand-700 mono">{candidates.length}</p>
          <Link to="/admin/candidates" className="text-[11px] text-brand-600 font-semibold hover:underline block">
            View Candidate Roster →
          </Link>
        </div>
      </div>

      {/* Pending Applications Review Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Pending Voter Applications ({pendingVoters.length})
          </h2>
          <span className="text-xs text-slate-400">Scoped to {districtLabel}</span>
        </div>

        {pendingVoters.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            No voter applications pending review in this district.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px]">
                  <th className="pb-3 font-semibold">Voter ID (EPIC)</th>
                  <th className="pb-3 font-semibold">Full Name</th>
                  <th className="pb-3 font-semibold">Assembly Constituency</th>
                  <th className="pb-3 font-semibold">DOB / Age</th>
                  <th className="pb-3 font-semibold">Submission Date</th>
                  <th className="pb-3 font-semibold text-right">Officer Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingVoters.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50">
                    <td className="py-3 font-mono font-bold text-slate-900">
                      {v.voter_id_number}
                    </td>
                    <td className="py-3 font-semibold text-slate-800">
                      {v.full_name} <br />
                      <span className="text-[10px] text-slate-400">{v.email}</span>
                    </td>
                    <td className="py-3 text-slate-700">
                      AC-{v.constituency}: {v.constituency_name}
                    </td>
                    <td className="py-3 text-slate-600">
                      {v.date_of_birth}
                    </td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {new Date(v.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 text-right space-x-2">
                      <button
                        onClick={() => handleReview(v.id, 'APPROVE')}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold shadow-sm"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(v.id, 'REJECT')}
                        className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow-sm"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
