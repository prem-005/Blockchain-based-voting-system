import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Sliders, 
  Vote, 
  Users, 
  Building2, 
  BarChart3, 
  LogOut, 
  Shield, 
  Layers,
  FileText
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title, subtitle }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isCurrent = (path: string) => location.pathname === path;

  const linkClass = (path: string) => `
    flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors
    ${isCurrent(path) 
      ? 'bg-civic-blue text-white shadow-xs' 
      : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
  `;

  return (
    <div className="min-h-screen bg-civic-bg flex flex-col md:flex-row">
      {/* Desktop Persistent Admin Sidebar */}
      <aside className="w-full md:w-64 bg-civic-navy text-white flex-shrink-0 border-r border-slate-700/60 p-4 space-y-6">
        <div className="space-y-1 pb-4 border-b border-slate-700/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-civic-blue flex items-center justify-center font-bold text-xs">
              EC
            </div>
            <span className="font-bold text-sm tracking-tight text-white">Election Commission</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            {user?.role === 'CENTRAL_ADMIN' ? 'Central Administration' : 'District Administration'}
          </span>
        </div>

        <nav className="space-y-1">
          <Link to={user?.role === 'CENTRAL_ADMIN' ? '/admin/central' : '/admin/district'} className={linkClass(user?.role === 'CENTRAL_ADMIN' ? '/admin/central' : '/admin/district')}>
            <Sliders className="w-4 h-4" />
            <span>Overview</span>
          </Link>

          <Link to="/admin/elections" className={linkClass('/admin/elections')}>
            <Vote className="w-4 h-4" />
            <span>Elections</span>
          </Link>

          <Link to="/admin/voters" className={linkClass('/admin/voters')}>
            <Users className="w-4 h-4" />
            <span>Voter Applications</span>
          </Link>

          <Link to="/admin/candidates" className={linkClass('/admin/candidates')}>
            <Building2 className="w-4 h-4" />
            <span>Candidates & Ballots</span>
          </Link>

          {user?.role === 'CENTRAL_ADMIN' && (
            <Link to="/admin/parties" className={linkClass('/admin/parties')}>
              <Layers className="w-4 h-4" />
              <span>Political Parties</span>
            </Link>
          )}

          <Link to="/results" className={linkClass('/results')}>
            <BarChart3 className="w-4 h-4" />
            <span>Results & Reports</span>
          </Link>

          <Link to="/explorer" className={linkClass('/explorer')}>
            <Shield className="w-4 h-4" />
            <span>Ledger Audit Logs</span>
          </Link>
        </nav>

        <div className="pt-6 border-t border-slate-700/60 space-y-2">
          <div className="px-3 py-1 text-[11px] text-slate-400">
            Signed in as <b className="text-white block truncate">{user?.email}</b>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-slate-800 rounded-xl text-xs font-semibold transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 p-6 sm:p-10 space-y-6 max-w-7xl">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-civic-navy tracking-tight">{title}</h1>
          <p className="text-xs text-civic-muted">{subtitle}</p>
        </div>

        <div>
          {children}
        </div>
      </div>
    </div>
  );
};
