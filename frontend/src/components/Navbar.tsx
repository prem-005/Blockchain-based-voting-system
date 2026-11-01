import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { GovernmentEmblem } from './GovernmentEmblem';
import { WalletButton } from './WalletButton';
import { 
  Menu, 
  X, 
  ChevronDown, 
  Globe, 
  LogIn, 
  LogOut,
  Sliders,
  UserCheck,
  User
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const navLinkClass = (path: string) => `
    relative py-5 px-3 text-[13px] font-medium transition-colors whitespace-nowrap
    ${isActive(path)
      ? 'text-[#102A56] font-bold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-[#102A56]'
      : 'text-[#64748B] hover:text-[#102A56]'}
  `;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] shadow-xs">
      <div className="max-w-[1340px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Official Emblem + Logo & Wordmark */}
          <Link to="/" className="flex items-center gap-3 focus:outline-none">
            <GovernmentEmblem className="w-10 h-10" />
            <div className="flex flex-col">
              <span className="text-[17px] font-extrabold tracking-tight text-[#102A56] leading-none">
                LightVote
              </span>
              <span className="text-[10px] tracking-normal text-[#64748B] font-medium mt-0.5">
                Electronic Voting System
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden lg:flex items-center gap-1 h-full">
            <Link to="/" className={navLinkClass('/')}>{t('nav.home')}</Link>
            <Link to="/voter/elections" className={navLinkClass('/voter/elections')}>{t('nav.elections')}</Link>
            <Link to="/register" className={navLinkClass('/register')}>{t('nav.voter_registration')}</Link>
            <Link to="/verify-receipt" className={navLinkClass('/verify-receipt')}>{t('nav.verify_receipt')}</Link>
            <Link to="/about" className={navLinkClass('/about')}>{t('nav.election_info')}</Link>
            <Link to="/help" className={navLinkClass('/help')}>{t('nav.help')}</Link>
          </nav>

          {/* Controls: Language Selector & Login */}
          <div className="hidden lg:flex items-center gap-3">
            <WalletButton />
            {/* Language Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:border-slate-300 rounded-lg text-xs font-semibold text-[#172033] shadow-xs transition"
              >
                <Globe className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>{language === 'ta' ? 'தமிழ்' : 'English'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
              </button>

              {langOpen && (
                <div 
                  className="absolute right-0 mt-1 w-32 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1 z-50 text-xs font-medium"
                  onMouseLeave={() => setLangOpen(false)}
                >
                  <button
                    onClick={() => { setLanguage('en'); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${language === 'en' ? 'font-bold text-[#2563EB]' : 'text-[#172033]'}`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => { setLanguage('ta'); setLangOpen(false); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 ${language === 'ta' ? 'font-bold text-[#2563EB]' : 'text-[#172033]'}`}
                  >
                    தமிழ் (Tamil)
                  </button>
                </div>
              )}
            </div>

            {/* Login / Dashboard Profile CTA */}
            {user ? (
              <div className="flex items-center gap-2">
                {user.role === 'CENTRAL_ADMIN' || user.role === 'DISTRICT_ADMIN' ? (
                  <Link
                    to={user.role === 'CENTRAL_ADMIN' ? '/admin/central' : '/admin/district'}
                    className="px-4 py-1.5 bg-[#102A56] hover:bg-[#0C2042] text-white text-xs font-bold rounded-lg shadow-xs transition"
                  >
                    {t('nav.admin_console')}
                  </Link>
                ) : (
                  <div className="flex items-center gap-2">
                    <Link
                      to="/voter/dashboard"
                      className="px-4 py-1.5 bg-[#102A56] hover:bg-[#0C2042] text-white text-xs font-bold rounded-lg shadow-xs transition"
                    >
                      {t('nav.voter_portal')}
                    </Link>
                    <Link
                      to="/voter/profile"
                      className="p-1.5 text-[#64748B] hover:text-[#102A56] hover:bg-slate-100 rounded-lg transition"
                      title={t('nav.profile')}
                    >
                      <User className="w-4 h-4" />
                    </Link>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="p-1.5 text-[#64748B] hover:text-rose-600 rounded-lg transition"
                  title={t('nav.logout')}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="px-5 py-1.5 bg-[#102A56] hover:bg-[#0C2042] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <span>{t('nav.login')}</span>
              </Link>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg text-[#64748B] hover:text-[#102A56] hover:bg-slate-100"
              aria-label="Toggle navigation menu"
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="lg:hidden border-t border-[#E2E8F0] bg-white px-4 pt-2 pb-6 space-y-1">
          <div className="px-3 py-2">
            <WalletButton />
          </div>
          <Link to="/" onClick={() => setIsOpen(false)} className="block py-2 px-3 text-sm font-medium text-[#172033] rounded-lg hover:bg-slate-50">Home</Link>
          <Link to="/voter/elections" onClick={() => setIsOpen(false)} className="block py-2 px-3 text-sm font-medium text-[#172033] rounded-lg hover:bg-slate-50">Elections</Link>
          <Link to="/register" onClick={() => setIsOpen(false)} className="block py-2 px-3 text-sm font-medium text-[#172033] rounded-lg hover:bg-slate-50">Voter Registration</Link>
          <Link to="/verify-receipt" onClick={() => setIsOpen(false)} className="block py-2 px-3 text-sm font-medium text-[#172033] rounded-lg hover:bg-slate-50">Verify Receipt</Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className="block py-2 px-3 text-sm font-medium text-[#172033] rounded-lg hover:bg-slate-50">Election Info</Link>
          <Link to="/help" onClick={() => setIsOpen(false)} className="block py-2 px-3 text-sm font-medium text-[#172033] rounded-lg hover:bg-slate-50">Help & Support</Link>

          <div className="flex items-center gap-2 px-3 py-2 text-xs">
            <Globe className="w-4 h-4 text-[#2563EB]" />
            <button type="button" onClick={() => setLanguage('en')} className={language === 'en' ? 'font-bold text-[#102A56]' : 'text-slate-500'}>English</button>
            <span className="text-slate-300">|</span>
            <button type="button" onClick={() => setLanguage('ta')} className={language === 'ta' ? 'font-bold text-[#102A56]' : 'text-slate-500'}>தமிழ்</button>
          </div>
          
          <div className="pt-3 border-t border-[#E2E8F0] flex flex-col gap-2">
            {user ? (
              <>
                <Link to={user.role === 'CENTRAL_ADMIN' ? '/admin/central' : user.role === 'DISTRICT_ADMIN' ? '/admin/district' : '/voter/dashboard'} onClick={() => setIsOpen(false)} className="py-2 px-3 text-sm font-bold text-white bg-[#102A56] rounded-lg text-center">
                  {user.role === 'CENTRAL_ADMIN' || user.role === 'DISTRICT_ADMIN' ? 'Admin Console' : 'Open Voter Portal'}
                </Link>
                {user.role === 'VOTER' && <Link to="/voter/profile" onClick={() => setIsOpen(false)} className="py-2 px-3 text-sm font-medium text-[#102A56] rounded-lg text-center">My Profile</Link>}
                <button onClick={handleLogout} className="py-2 px-3 text-sm font-medium text-rose-600 rounded-lg text-left">
                  Sign Out
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsOpen(false)} className="py-2 px-3 text-sm font-bold text-white bg-[#102A56] rounded-lg text-center">
                Login
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
