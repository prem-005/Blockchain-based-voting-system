import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUserState } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: password || undefined })
      });

      if (data.requires_otp) {
        navigate(`/verify-otp?email=${encodeURIComponent(email.trim().toLowerCase())}&purpose=LOGIN${data.otp_hint ? `&hint=${encodeURIComponent(data.otp_hint)}` : ''}`);
      } else if (data.user) {
        setUserState(data.user);
        if (data.user.role === 'CENTRAL_ADMIN') {
          navigate('/admin/central');
        } else if (data.user.role === 'DISTRICT_ADMIN') {
          navigate('/admin/district');
        } else {
          navigate('/voter/dashboard');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials or request an OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4 sm:px-6">
      <div className="bg-white rounded-2xl p-8 border border-civic-border shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-11 h-11 rounded-xl bg-civic-navy text-white flex items-center justify-center mx-auto shadow-xs">
            <LogIn className="w-5 h-5 text-civic-blue-soft" />
          </div>
          <h1 className="text-2xl font-bold text-civic-navy tracking-tight">
            Account Authentication
          </h1>
          <p className="text-civic-muted text-xs leading-relaxed">
            Sign in as a registered voter or authorized election administrator.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-civic-error-soft border border-rose-200 rounded-xl text-civic-error text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-civic-navy mb-1.5">
              Registered Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-civic-muted absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voter@example.org or admin email"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-civic-border rounded-xl text-xs text-civic-text focus:outline-none focus:ring-2 focus:ring-civic-blue focus:bg-white"
              />
            </div>
            <p className="text-[11px] text-civic-muted mt-1">
              Voters without passwords will automatically receive a secure one-time verification code (OTP).
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-civic-navy">
                Password (Administrator / Optional for Voters)
              </label>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-civic-muted absolute left-3.5 top-3" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for passwordless OTP login"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-civic-border rounded-xl text-xs text-civic-text focus:outline-none focus:ring-2 focus:ring-civic-blue focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-civic-blue hover:bg-civic-blue-hover text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In to Account'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-civic-border text-center space-y-2 text-xs">
          <p className="text-civic-muted">
            New citizen elector without an account?
          </p>
          <Link
            to="/register"
            className="inline-block font-semibold text-civic-blue hover:underline"
          >
            Register on the Electoral Roll →
          </Link>
        </div>
      </div>
    </div>
  );
};
