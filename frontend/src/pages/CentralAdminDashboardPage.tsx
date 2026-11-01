import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Sliders, 
  Vote, 
  Users, 
  Building2, 
  BarChart3, 
  Layers, 
  ShieldCheck, 
  RefreshCw, 
  ChevronDown, 
  LogOut,
  Calendar,
  CheckCircle2,
  Clock,
  Plus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { GovernmentEmblem } from '../components/GovernmentEmblem';

export const CentralAdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState<any[]>([]);
  const [registeredVotersCount, setRegisteredVotersCount] = useState(0);
  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshDashboard = async () => {
    setLoading(true);
    setLoadError(null);
    const [electionResult, voterResult, pendingResult] = await Promise.allSettled([
      apiRequest('/elections/elections/'),
      apiRequest('/voters/admin/list/?page_size=200'),
      apiRequest('/voters/admin/list/?status=PENDING&page_size=200'),
    ]);
    if (electionResult.status === 'fulfilled') setElections(electionResult.value.results || electionResult.value || []);
    else setLoadError(electionResult.reason?.message || 'Could not load elections.');
    if (voterResult.status === 'fulfilled') setRegisteredVotersCount(voterResult.value.count ?? (voterResult.value.results || voterResult.value || []).length);
    else setLoadError((current) => current || voterResult.reason?.message || 'Could not load voter applications.');
    if (pendingResult.status === 'fulfilled') setPendingAppsCount(pendingResult.value.count ?? (pendingResult.value.results || pendingResult.value || []).length);
    else setLoadError((current) => current || pendingResult.reason?.message || 'Could not load pending applications.');
    setLoading(false);
  };

  useEffect(() => { void refreshDashboard(); }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const activeElectionsCount = elections.filter((e: any) => e.status === 'ACTIVE' && e.is_currently_open).length;
  const publishedResultsCount = elections.filter((e: any) => e.status === 'RESULTS_PUBLISHED').length;

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col md:flex-row">
      
      {/* 1. Admin Sidebar (Matching Screenshot #6) */}
      <aside className="w-full md:w-60 bg-[#102A56] text-white flex-shrink-0 flex flex-col justify-between p-4 space-y-6">
        <div className="space-y-6">
          
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-4 border-b border-slate-700/60">
            <GovernmentEmblem className="w-8 h-8" />
            <span className="text-base font-extrabold tracking-tight text-white">
              LightVote
            </span>
          </div>

          {/* Admin Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            <Link
              to="/admin/central"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#2563EB] text-white shadow-xs transition"
            >
              <Sliders className="w-4 h-4" />
              <span>Overview</span>
            </Link>

            <Link
              to="/admin/elections"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <Vote className="w-4 h-4" />
              <span>Elections</span>
            </Link>

            <Link
              to="/admin/voters"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <Users className="w-4 h-4" />
              <span>Voter Applications</span>
            </Link>

            <Link
              to="/admin/candidates"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <Building2 className="w-4 h-4" />
              <span>Candidate Roster</span>
            </Link>

            <Link
              to="/admin/parties"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <Layers className="w-4 h-4" />
              <span>Party Management</span>
            </Link>

            <Link
              to="/admin/accounts"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Administrator Accounts</span>
            </Link>

            <Link
              to="/results"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Results & Reports</span>
            </Link>

            <Link
              to="/explorer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Public Ledger Explorer</span>
            </Link>

            <Link
              to="/about"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <Sliders className="w-4 h-4" />
              <span>About the Platform</span>
            </Link>
          </nav>
        </div>

        {/* Logout at bottom */}
        <div className="pt-4 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-rose-300 hover:bg-[#0C2042] transition text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* 2. Admin Main Body */}
      <main className="flex-1 flex flex-col">
        
        {/* Top Header Bar */}
        <div className="h-16 bg-white border-b border-[#E2E8F0] px-6 sm:px-8 flex items-center justify-between">
          <div className="text-xs font-semibold text-[#64748B] hidden sm:block">
            Election Commission Administration
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button onClick={() => void refreshDashboard()} disabled={loading} aria-label="Refresh dashboard" className="p-2 text-[#64748B] hover:text-[#102A56] hover:bg-slate-100 rounded-full transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Admin Avatar Badge matching image #6 */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-extrabold text-[#102A56]">
                A
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#102A56] block leading-none">Admin</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">Central Administrator</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </div>
          </div>
        </div>

        {/* Dashboard Workspace Area */}
        <div className="p-6 sm:p-8 space-y-6 max-w-5xl">
          
          {/* Header Title + Current Date/Time */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-2xl font-black text-[#102A56] tracking-tight">
                Overview
              </h1>
              <p className="text-xs text-[#64748B]">
                Manage elections, voters and system operations.
              </p>
            </div>
            <div className="text-right text-[11px] font-mono text-[#64748B]">
              {new Date().toLocaleString()}
            </div>
          </div>
          {loadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadError}</p>}

          {/* 4 Overview Metric Cards (Matching Screenshot #6) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Registered Voters */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B] font-medium">Registered Voters</span>
                <Users className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-black text-[#102A56]">
                {loading ? '—' : registeredVotersCount}
              </div>
            </div>

            {/* Card 2: Pending Applications */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B] font-medium">Pending Applications</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-[#102A56]">
                {loading ? '—' : pendingAppsCount}
              </div>
            </div>

            {/* Card 3: Active Elections */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B] font-medium">Active Elections</span>
                <Calendar className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-[#102A56]">
                {loading ? '—' : activeElectionsCount}
              </div>
            </div>

            {/* Card 4: Published Results */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[#64748B] font-medium">Published Results</span>
                <BarChart3 className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-[#102A56]">
                {loading ? '—' : publishedResultsCount}
              </div>
            </div>

          </div>

          {/* Recent Activities Section (Matching Screenshot #6) */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-5 border-b border-[#E2E8F0]">
              <h2 className="text-sm font-bold text-[#102A56]">Election Registry</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-slate-50/70 text-[#64748B] text-[11px]">
                    <th className="px-5 py-3 font-semibold">Election</th>
                    <th className="px-5 py-3 font-semibold">Year</th>
                    <th className="px-5 py-3 font-semibold">Voting Window</th>
                    <th className="px-5 py-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {elections.slice(0, 6).map((election: any) => <tr key={election.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-3 font-semibold text-[#102A56]">{election.name}</td>
                    <td className="px-5 py-3">{election.year}</td>
                    <td className="px-5 py-3">{new Date(election.start_time).toLocaleDateString()} – {new Date(election.end_time).toLocaleDateString()}</td>
                    <td className="px-5 py-3">{election.status}</td>
                  </tr>)}
                  {!loading && elections.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-xs text-[#64748B]">No elections have been created.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>

    </div>
  );
};
