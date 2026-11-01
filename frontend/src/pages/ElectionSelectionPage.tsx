import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Vote, Calendar, Clock, CheckCircle2, AlertCircle, ArrowRight, BarChart3, Filter } from 'lucide-react';
import { apiRequest } from '../api/client';
import { Election } from '../types';
import { useAuth } from '../context/AuthContext';

export const ElectionSelectionPage: React.FC = () => {
  const { user, voterProfile } = useAuth();
  const [elections, setElections] = useState<Election[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/elections/elections/')
      .then((data) => setElections(data.results || data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const visibleElections = selectedYear === 'all'
    ? elections
    : elections.filter((election) => String(election.year) === selectedYear);

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-200 mb-2">
            <Vote className="w-4 h-4 text-brand-600" />
            <span>Official Ballot Selection</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Elections & Assembly Cycles
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            {voterProfile?.constituency_name ? (
              <>Your registered constituency: <b className="text-slate-800">AC-{voterProfile.constituency_id}: {voterProfile.constituency_name}</b> ({voterProfile.district_name})</>
            ) : (
              'Select an active election cycle to access your constituency candidate ballot.'
            )}
          </p>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs shadow-sm">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Cycle Year:</span>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
          >
            <option value="all">All Cycles</option>
            {[...new Set(elections.map((election) => election.year))]
              .sort((a, b) => b - a)
              .map((year) => <option key={year} value={year}>{year} Election Cycle</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-slate-400 text-xs">
          Loading active election registries...
        </div>
      ) : visibleElections.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-xs">
          No election cycles registered for this year filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleElections.map((elec) => {
            const isActive = elec.status === 'ACTIVE';
            const canVoteNow = isActive && elec.is_currently_open;
            const isEnded = elec.status === 'ENDED' || elec.status === 'RESULTS_PUBLISHED';

            return (
              <div
                key={elec.id}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-6"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      ID: #{elec.id}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isActive ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      elec.status === 'UPCOMING' ? 'bg-sky-100 text-sky-800' :
                      elec.status === 'RESULTS_PUBLISHED' ? 'bg-purple-100 text-purple-800' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>}
                      {elec.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">
                    {elec.name}
                  </h3>

                  <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Year: <b>{elec.year}</b> • Scope: {elec.scope}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        Window: {new Date(elec.start_time).toLocaleDateString()} to {new Date(elec.end_time).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                  {canVoteNow ? (
                    voterProfile?.status === 'APPROVED' ? (
                      <Link
                        to={`/voter/ballot/${elec.id}`}
                        className="flex-1 text-center py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                      >
                        <Vote className="w-4 h-4" />
                        <span>Open Candidate Ballot</span>
                      </Link>
                    ) : (
                      <div className="flex-1 text-center py-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl">
                        {voterProfile?.status === 'REJECTED'
                          ? 'Voter application rejected — contact election support'
                          : voterProfile
                            ? 'Awaiting Admin Approval to Vote'
                            : user?.role === 'VOTER'
                              ? 'Complete voter registration and approval to vote'
                              : 'Voting requires a separate approved voter account'}
                      </div>
                    )
                  ) : isEnded ? (
                    <Link
                      to={`/results?election_id=${elec.id}`}
                      className="flex-1 text-center py-2.5 bg-[#102A56] hover:bg-[#0C2042] text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-1.5"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>View Certified Results</span>
                    </Link>
                  ) : isActive ? (
                    <div className="flex-1 text-center py-2.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-xl">
                      Election is outside its voting window
                    </div>
                  ) : (
                    <button
                      disabled
                      className="flex-1 text-center py-2.5 bg-slate-100 text-slate-400 text-xs font-semibold rounded-xl cursor-not-allowed"
                    >
                      Voting Not Yet Open
                    </button>
                  )}

                  <Link
                    to={`/explorer?election_id=${elec.id}`}
                    className="px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl transition"
                    title="Inspect transactions"
                  >
                    Explorer
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
