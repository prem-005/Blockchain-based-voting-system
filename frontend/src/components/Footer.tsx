import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Vote, ExternalLink, Lock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-civic-navy text-slate-300 text-xs border-t border-slate-700/50 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-civic-blue flex items-center justify-center text-white font-bold text-sm">
                <Vote className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">
                LightVote Civic Election Platform
              </span>
            </div>
            <p className="text-slate-400 max-w-md leading-relaxed text-xs">
              An electronic voting research prototype with chain-backed transaction verification. The current vote calldata exposes candidate choices and does not provide ballot secrecy.
            </p>
            <div className="flex items-center gap-4 text-emerald-400 font-medium text-xs pt-1">
              <span className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5" /> Ballot confidentiality not provided
              </span>
              <span className="flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" /> Independent Receipt Verification
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Voter Services</h4>
            <ul className="space-y-2">
              <li><Link to="/register" className="hover:text-white transition">Register to Vote</Link></li>
              <li><Link to="/voter/elections" className="hover:text-white transition">Active Elections</Link></li>
              <li><Link to="/voter/dashboard" className="hover:text-white transition">My Voter Status</Link></li>
              <li><Link to="/verify-receipt" className="hover:text-white transition">Verify Voting Receipt</Link></li>
              <li><Link to="/results" className="hover:text-white transition">Official Results</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Information & Audit</h4>
            <ul className="space-y-2">
              <li><Link to="/about" className="hover:text-white transition">Election Information</Link></li>
              <li><Link to="/history" className="hover:text-white transition">Election Archive</Link></li>
              <li><Link to="/explorer" className="hover:text-white transition">Audit Ledger Explorer</Link></li>
              <li><Link to="/research" className="hover:text-white transition">System Performance & Benchmarks</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-700/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-400 text-[11px]">
          <p>
            © 2026 LightVote. An accessible, secure civic technology election platform.
          </p>
          <div className="flex items-center gap-4">
            <span>Research prototype</span>
            <span>•</span>
            <span>Candidate IDs are public in vote calldata</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
