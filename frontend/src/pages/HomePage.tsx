import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Vote, 
  FileCheck, 
  ArrowRight, 
  Calendar, 
  MapPin, 
  ChevronRight
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { Election } from '../types';

export const HomePage: React.FC = () => {
  const [elections, setElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest('/elections/elections/')
      .then((data) => setElections(data.results || data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const activeElection = elections.find(e => e.status === 'ACTIVE' && e.is_currently_open)
    || elections.find(e => e.status === 'UPCOMING' || (e.status === 'ACTIVE' && !e.is_currently_open))
    || elections[0];

  return (
    <div className="space-y-10 py-6 max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* 1. Hero Banner with Exact Image Aspect Ratio (1024x431) - No Zoom / No Cropping */}
      <section className="relative overflow-hidden rounded-2xl border border-[#CBD5E1] shadow-xs aspect-[1024/431] w-full flex items-center bg-[#E0EFFE]">
        
        {/* Full Image Layer used as-is with original proportions */}
        <img
          src="/images/lightvote-hero.png"
          alt="Tamil Nadu Government Landmark"
          className="absolute inset-0 w-full h-full object-fill pointer-events-none select-none"
        />

        {/* Subtle soft gradient fade on the far left so headline stays legible without obscuring flag or map */}
        <div 
          className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 via-35% to-transparent pointer-events-none z-1"
          aria-hidden="true"
        />

        {/* State Election Badge - Top Right */}
        <div className="absolute top-3 right-4 sm:top-5 sm:right-6 text-right z-10 hidden sm:block">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/90 backdrop-blur-xs rounded-lg border border-[#CBD5E1] shadow-xs text-xs font-bold text-[#102A56]">
            <span>🇮🇳</span>
            <span>Tamil Nadu Assembly Election 2027</span>
          </div>
        </div>

        {/* Hero Content Left Aligned */}
        <div className="relative z-10 max-w-lg p-5 sm:p-8 md:p-10 lg:p-12 space-y-2 sm:space-y-4">
          <h1 className="text-xl sm:text-3xl md:text-4xl lg:text-[42px] font-black text-[#102A56] tracking-tight leading-[1.12]">
            Secure Voting <br />
            for a Stronger <br />
            Tamil Nadu
          </h1>

          <p className="text-[#334155] text-[11px] sm:text-xs md:text-sm font-semibold leading-relaxed max-w-xs sm:max-w-sm">
            A transparent, accessible and privacy-focused electronic voting platform.
          </p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              to="/voter/elections"
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-[#102A56] hover:bg-[#0C2042] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-2"
            >
              <span>View Elections</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              to="/register"
              className="px-4 sm:px-6 py-2 sm:py-2.5 bg-white hover:bg-slate-50 text-[#102A56] text-xs font-bold rounded-lg border border-[#CBD5E1] shadow-xs transition"
            >
              Register to Vote
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Four Quick Service Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Voter Registration */}
        <Link
          to="/register"
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#102A56]/40 hover:shadow-sm transition group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#102A56] text-sm group-hover:text-[#2563EB] transition">
              Voter Registration
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Apply online and check your status
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Card 2: Election Information */}
        <Link
          to="/about"
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#102A56]/40 hover:shadow-sm transition group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#102A56] text-sm group-hover:text-[#2563EB] transition">
              Election Information
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              View schedule, constituencies and guidelines
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Card 3: Cast Your Vote */}
        <Link
          to={activeElection ? `/voter/ballot/${activeElection.id}` : '/voter/elections'}
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#102A56]/40 hover:shadow-sm transition group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#15803D] flex items-center justify-center">
              <Vote className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#102A56] text-sm group-hover:text-[#15803D] transition">
              Cast Your Vote
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Vote securely when election is live
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#15803D] group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Card 4: Verify Receipt */}
        <Link
          to="/verify-receipt"
          className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs hover:border-[#102A56]/40 hover:shadow-sm transition group flex flex-col justify-between space-y-3"
        >
          <div className="space-y-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-[#102A56] text-sm group-hover:text-indigo-600 transition">
              Verify Receipt
            </h3>
            <p className="text-xs text-[#64748B] leading-relaxed">
              Verify your voting receipt or transaction
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <ArrowRight className="w-3.5 h-3.5 text-[#64748B] group-hover:text-indigo-600 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>
      </section>

      {/* 3. Current Election Panel */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-[#102A56]">Current Election</h2>
          <Link to="/voter/elections" className="text-xs font-bold text-[#2563EB] hover:underline flex items-center gap-1">
            <span>View All Elections</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {activeElection ? (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-3 flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-extrabold text-[#102A56]">
                  {activeElection.name}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#DCFCE7] text-[#15803D]">
                  {activeElection.is_currently_open ? 'Voting Open' : activeElection.status === 'ACTIVE' ? 'Outside Voting Window' : activeElection.status}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1 text-xs">
                {/* Voting Period */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] flex-shrink-0 mt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Voting Period</span>
                    <span className="font-bold text-[#172033] block">
                      {new Date(activeElection.start_time).toLocaleDateString()} – {new Date(activeElection.end_time).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Eligible Voters */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] flex-shrink-0 mt-0.5">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Eligible Voters</span>
                    <span className="font-bold text-[#172033] block">18 years and above</span>
                  </div>
                </div>

                {/* Constituencies */}
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 border border-[#E2E8F0] flex items-center justify-center text-[#64748B] flex-shrink-0 mt-0.5">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#64748B] block">Constituencies</span>
                    <span className="font-bold text-[#172033] block">
                      {activeElection.scope === 'BY_ELECTION' ? 'By-election constituency' : activeElection.scope === 'PARLIAMENTARY' ? 'Tamil Nadu parliamentary constituencies' : 'All 234 Constituencies'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* View Details Action Button */}
            <div className="flex-shrink-0">
              <Link
                to="/voter/elections"
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-xs transition inline-block text-center w-full sm:w-auto"
              >
                View Details
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-8 text-center text-xs text-[#64748B]">
            No election currently open.
          </div>
        )}
      </section>

    </div>
  );
};
