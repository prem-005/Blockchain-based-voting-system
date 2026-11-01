import React, { useState, useEffect } from 'react';
import { Users, Search, CheckCircle2, XCircle, Clock, Filter, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { AdminLayout } from '../components/AdminLayout';

export const VoterManagementPage: React.FC = () => {
  const { user } = useAuth();
  const [voters, setVoters] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedVoter, setSelectedVoter] = useState<any | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const fetchVoters = async () => {
    setLoading(true);
    let url = '/voters/admin/list/';
    const params = new URLSearchParams();
    if (statusFilter !== 'ALL') params.append('status', statusFilter);
    if (searchQuery.trim()) params.append('search', searchQuery.trim());
    if (params.toString()) url += `?${params.toString()}`;

    try {
      const data = await apiRequest(url);
      setVoters(data.results || data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVoters();
  }, [statusFilter]);

  const handleReviewAction = async (voterId: number, action: 'APPROVE' | 'REJECT') => {
    try {
      await apiRequest(`/voters/admin/${voterId}/review/`, {
        method: 'POST',
        body: JSON.stringify({ action, rejection_reason: action === 'REJECT' ? 'Eligibility documentation incomplete.' : '' })
      });
      fetchVoters();
      if (selectedVoter?.id === voterId) {
        setSelectedVoter(null);
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    }
  };

  const handleDeleteVoter = async (voterId: number, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently remove voter "${name}" from the electoral roll?`)) {
      return;
    }
    try {
      await apiRequest(`/voters/admin/${voterId}/review/`, {
        method: 'DELETE',
      });
      fetchVoters();
      if (selectedVoter?.id === voterId) {
        setSelectedVoter(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove voter.');
    }
  };

  const openAuditLogs = async (voter: any) => {
    setSelectedVoter(voter);
    try {
      const logs = await apiRequest(`/voters/admin/${voter.id}/audit-logs/`);
      setAuditLogs(logs.results || logs || []);
    } catch {
      setAuditLogs([]);
    }
  };

  return (
    <AdminLayout
      title="Electoral Roll & Voter Verification"
      subtitle="Review voter applications, verify legal eligibility, and audit registration decisions."
    >
      <div className="space-y-6">
        
        {/* Search & Filters */}
        <div className="bg-white p-4 rounded-2xl border border-civic-border shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative min-w-[220px] flex-1">
              <Search className="w-3.5 h-3.5 text-civic-muted absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, or EPIC..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchVoters()}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-civic-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-civic-blue"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-civic-muted font-semibold">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-civic-border rounded-xl px-3 py-1.5 font-bold text-civic-navy focus:outline-none focus:ring-2 focus:ring-civic-blue"
              >
                <option value="ALL">All Application States</option>
                <option value="PENDING">Pending Review</option>
                <option value="APPROVED">Approved / Enrolled</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <button
            onClick={fetchVoters}
            className="px-4 py-1.5 bg-civic-blue hover:bg-civic-blue-hover text-white font-semibold rounded-xl transition"
          >
            Apply Filters
          </button>
        </div>

        {/* Voters Table */}
        <div className="bg-white rounded-2xl border border-civic-border shadow-xs overflow-hidden">
          <div className="p-5 border-b border-civic-border flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-civic-navy">Electoral Applications Roster</h2>
              <p className="text-xs text-civic-muted">Showing {voters.length} elector record(s)</p>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-xs text-civic-muted">Loading voter applications...</div>
          ) : voters.length === 0 ? (
            <div className="p-10 text-center text-xs text-civic-muted">No voter records found matching criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-civic-border bg-slate-50 text-civic-muted uppercase text-[10px]">
                    <th className="px-5 py-3 font-semibold">EPIC Ref</th>
                    <th className="px-4 py-3 font-semibold">Voter Name</th>
                    <th className="px-4 py-3 font-semibold">Constituency</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Submitted</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {voters.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition">
                      <td className="px-5 py-3.5 font-mono font-bold text-civic-navy">{v.voter_id_number}</td>
                      <td className="px-4 py-3.5">
                        <span className="font-bold text-civic-navy block">{v.full_name}</span>
                        <span className="text-civic-muted text-[11px]">{v.email}</span>
                      </td>
                      <td className="px-4 py-3.5 text-civic-muted">
                        AC-{v.constituency_id}: {v.constituency_name}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          v.status === 'APPROVED'
                            ? 'bg-civic-green-soft text-civic-green'
                            : v.status === 'PENDING'
                            ? 'bg-civic-warning-soft text-civic-warning'
                            : 'bg-civic-error-soft text-civic-error'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-civic-muted">
                        {new Date(v.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {v.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleReviewAction(v.id, 'APPROVE')}
                                className="px-2.5 py-1 bg-civic-green-soft hover:bg-emerald-200 text-civic-green font-bold text-[10px] rounded-lg transition"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReviewAction(v.id, 'REJECT')}
                                className="px-2.5 py-1 bg-civic-error-soft hover:bg-rose-200 text-civic-error font-bold text-[10px] rounded-lg transition"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openAuditLogs(v)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-civic-navy font-semibold text-[10px] rounded-lg transition"
                          >
                            Audit Trail
                          </button>
                          <button
                            onClick={() => handleDeleteVoter(v.id, v.full_name)}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Remove Voter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Audit Logs Modal */}
        {selectedVoter && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-civic-border">
              <div className="flex justify-between items-center pb-2 border-b border-civic-border">
                <h3 className="text-base font-bold text-civic-navy">
                  Application Audit Trail: {selectedVoter.full_name}
                </h3>
                <button onClick={() => setSelectedVoter(null)} className="text-civic-muted hover:text-civic-navy">✕</button>
              </div>

              {auditLogs.length === 0 ? (
                <p className="text-xs text-civic-muted py-4 text-center">No administrative status alterations recorded.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {auditLogs.map((log: any) => (
                    <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-civic-border/60 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-civic-navy">
                        <span>Action: {log.action}</span>
                        <span className="text-[10px] text-civic-muted">{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] text-civic-muted">By: {log.performed_by_email || 'System'}</p>
                      {log.notes && <p className="text-[11px] text-civic-text italic">{log.notes}</p>}
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setSelectedVoter(null)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-civic-navy font-semibold rounded-xl text-xs"
              >
                Close Audit View
              </button>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
};
