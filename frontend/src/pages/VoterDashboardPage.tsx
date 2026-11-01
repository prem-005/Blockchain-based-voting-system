import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  MapPin, 
  Calendar, 
  Vote, 
  FileText, 
  RefreshCw, 
  LogOut, 
  User, 
  Sliders,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { Election } from '../types';
import { GovernmentEmblem } from '../components/GovernmentEmblem';

export const VoterDashboardPage: React.FC = () => {
  const { user, voterProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [elections, setElections] = useState<Election[]>([]);
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshDashboard = async () => {
    setLoading(true);
    setLoadError(null);
    const [profileResult, electionResult] = await Promise.allSettled([
      apiRequest('/voters/profile/'),
      apiRequest('/elections/elections/'),
    ]);
    if (profileResult.status === 'fulfilled') setProfileData(profileResult.value);
    else setLoadError(profileResult.reason?.message || 'Could not load voter profile.');
    if (electionResult.status === 'fulfilled') setElections(electionResult.value.results || electionResult.value || []);
    else setLoadError((current) => current || electionResult.reason?.message || 'Could not load elections.');
    setLoading(false);
  };

  useEffect(() => { void refreshDashboard(); }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const activeElection = elections.find(e => e.status === 'ACTIVE' && e.is_currently_open)
    || elections.find(e => e.status === 'UPCOMING' || (e.status === 'ACTIVE' && !e.is_currently_open))
    || elections[0];
  const electorName = profileData?.full_name || user?.first_name || user?.email || 'Voter';
  const firstName = electorName.split(' ')[0] || 'Voter';
  const constituencyName = profileData?.constituency_name || 'Not set';
  const voterApproved = (profileData?.status || voterProfile?.status) === 'APPROVED';
  const canVoteNow = voterApproved && Boolean(activeElection?.is_currently_open);

  return (
    <div className="min-h-screen bg-[#F5F7FB] flex flex-col md:flex-row">
      
      {/* Navy Blue Sidebar (Matching screenshot #3) */}
      <aside className="w-full md:w-60 bg-[#102A56] text-white flex-shrink-0 flex flex-col justify-between p-4 space-y-6">
        <div className="space-y-6">
          {/* Logo brand */}
          <div className="flex items-center gap-2.5 px-2 pt-1 pb-4 border-b border-slate-700/60">
            <GovernmentEmblem className="w-8 h-8" />
            <span className="text-base font-extrabold tracking-tight text-white">
              LightVote
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-xs font-semibold">
            <Link
              to="/voter/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#2563EB] text-white shadow-xs transition"
            >
              <Sliders className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/voter/elections"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <Vote className="w-4 h-4" />
              <span>Elections</span>
            </Link>

            <Link
              to="/voter/dashboard"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>My Voting Status</span>
            </Link>

            <Link
              to="/verify-receipt"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <FileText className="w-4 h-4" />
              <span>Verify Receipt</span>
            </Link>

            <Link
              to="/voter/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:bg-[#0C2042] hover:text-white transition"
            >
              <User className="w-4 h-4" />
              <span>My Profile</span>
            </Link>
          </nav>
        </div>

        {/* Logout button at bottom of sidebar */}
        <div className="pt-4 border-t border-slate-700/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-300 hover:bg-[#0C2042] transition text-xs font-semibold"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        
        {/* Top Header Bar with Notification Bell & Avatar */}
        <div className="h-16 bg-white border-b border-[#E2E8F0] px-6 sm:px-8 flex items-center justify-between">
          <div className="text-xs font-semibold text-[#64748B] hidden sm:block">
            Electoral Citizen Workspace
          </div>

          <div className="flex items-center gap-4 ml-auto">
            <button onClick={() => void refreshDashboard()} disabled={loading} aria-label="Refresh dashboard" className="p-2 text-[#64748B] hover:text-[#102A56] hover:bg-slate-100 rounded-full transition disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Profile Avatar Badge matching image */}
            <div className="flex items-center gap-2.5 pl-3 border-l border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-xs font-extrabold text-[#102A56]">
                PV
              </div>
              <div className="text-left">
                <span className="text-xs font-bold text-[#102A56] block leading-none">{electorName}</span>
                <span className="text-[10px] text-[#64748B] block mt-0.5">Voter</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </div>
          </div>
        </div>

        {/* Dashboard Body */}
        <div className="p-6 sm:p-8 space-y-6 max-w-5xl">
          
          {/* Welcome Text */}
          <div className="space-y-0.5">
            <h1 className="text-2xl font-black text-[#102A56] tracking-tight">
              Welcome, {firstName}
            </h1>
            <p className="text-xs text-[#64748B]">
              Manage your voting activities and stay updated.
            </p>
          </div>
          {loadError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadError}</p>}

          {/* 3 Metric Status Cards (Matching Status Dynamically) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Card 1: Voter Status */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                profileData?.status === 'APPROVED' ? 'bg-emerald-50 text-[#15803D]' : profileData?.status === 'REJECTED' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
              }`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#64748B] block">Voter Status</span>
                <span className={`text-sm font-bold block ${
                  profileData?.status === 'APPROVED' ? 'text-[#15803D]' : profileData?.status === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'
                }`}>
                  {profileData?.status === 'APPROVED' ? 'Approved' : profileData?.status === 'REJECTED' ? 'Rejected' : profileData ? 'Pending Review' : 'No voter profile'}
                </span>
              </div>
            </div>

            {/* Card 2: Constituency */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#64748B] block">Constituency</span>
                <span className="text-sm font-bold text-[#102A56] block">{constituencyName}</span>
              </div>
            </div>

            {/* Card 3: Eligible for Voting */}
            <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs flex items-center gap-3.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                profileData?.status === 'APPROVED' ? 'bg-emerald-50 text-[#15803D]' : 'bg-slate-100 text-slate-400'
              }`}>
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-[#64748B] block">Eligible for Voting</span>
                <span className={`text-sm font-bold block ${
                  profileData?.status === 'APPROVED' ? 'text-[#102A56]' : 'text-slate-500'
                }`}>
                  {voterApproved ? 'Yes' : profileData ? 'No (Pending Approval)' : 'No voter profile'}
                </span>
              </div>
            </div>

          </div>

          {/* Active Election Box (Matching Screenshot #3) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#102A56]">Active Election</h2>
              <Link to="/voter/elections" className="text-xs font-semibold text-[#2563EB] hover:underline">
                View Details
              </Link>
            </div>

            {activeElection && (
              <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-extrabold text-[#102A56]">
                      {activeElection.name}
                    </h3>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${activeElection.is_currently_open ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-amber-50 text-amber-800'}`}>
                      {activeElection.is_currently_open ? 'Voting Open' : activeElection.status === 'UPCOMING' ? 'Upcoming' : activeElection.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] flex-shrink-0 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-[#172033] block">
                          {new Date(activeElection.start_time).toLocaleString()} – {new Date(activeElection.end_time).toLocaleString()}
                        </span>
                        <span className="text-[11px] text-[#64748B] block">Voting Period</span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] flex-shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="font-bold text-[#172033] block">{constituencyName}</span>
                        <span className="text-[11px] text-[#64748B] block">Eligible Area</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {canVoteNow ? (
                    <Link
                      to={`/voter/ballot/${activeElection.id}`}
                      className="px-7 py-2.5 bg-[#102A56] hover:bg-[#0C2042] text-white text-xs font-bold rounded-lg shadow-xs transition inline-block text-center w-full sm:w-auto"
                    >
                      Cast Vote
                    </Link>
                  ) : !voterApproved ? (
                    <div className="text-right">
                      <span className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg inline-block text-center">
                        {profileData ? 'Awaiting Admin Approval' : 'Voter profile required'}
                      </span>
                    </div>
                  ) : <span className="px-4 py-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg inline-block text-center">Voting window is closed</span>}
                </div>
              </div>
            )}
          </div>

        </div>
      </main>

    </div>
  );
};
