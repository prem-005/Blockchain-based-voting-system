import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { KeyRound, AlertCircle, CheckCircle2, ArrowRight, RotateCw, Mail } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

export const VerifyOtpPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUserState } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const purposeParam = searchParams.get('purpose') || 'LOGIN';
  const hintParam = searchParams.get('hint') || '';

  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState(hintParam || '');
  const [otpHint, setOtpHint] = useState<string | null>(hintParam || null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let timer: any;
    if (cooldown > 0) {
      timer = setInterval(() => setCooldown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiRequest('/auth/verify-otp/', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          otp_code: otpCode.trim(),
          purpose: purposeParam
        })
      });

      setUserState(data.user, data.voter_profile);
      setSuccessMsg("Verification successful! Redirecting to your dashboard...");

      setTimeout(() => {
        if (data.user.role === 'CENTRAL_ADMIN') {
          navigate('/admin/central');
        } else if (data.user.role === 'DISTRICT_ADMIN') {
          navigate('/admin/district');
        } else {
          navigate('/voter/dashboard');
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setError(null);
    setResending(true);

    try {
      const data = await apiRequest('/auth/send-otp/', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          purpose: purposeParam
        })
      });
      if (data.otp_hint) {
        setOtpHint(data.otp_hint);
      }
      setCooldown(data.cooldown_seconds || 60);
      setSuccessMsg(data.message || "A new 6-digit code has been dispatched.");
    } catch (err: any) {
      setError(err.message || "Failed to dispatch new OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12 px-4">
      <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-accent-50 text-accent-700 flex items-center justify-center mx-auto shadow-sm">
            <KeyRound className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Security OTP Verification
          </h1>
          <p className="text-slate-500 text-xs">
            Enter the 6-digit one-time code sent to your registered email address.
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600 mt-0.5" />
            <p>{successMsg}</p>
          </div>
        )}

        {otpHint ? (
          <div className="p-3.5 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-600 block text-[11px]">Verification Code:</span>
              <span className="font-mono text-base font-extrabold text-[#102A56] tracking-wider">{otpHint}</span>
            </div>
            <button
              type="button"
              onClick={() => setOtpCode(otpHint)}
              className="px-3 py-1.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold rounded-xl text-xs transition"
            >
              Fill Code
            </button>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-[11px] flex items-center justify-between">
            <span>Fallback Verification Code: <b className="font-mono text-slate-900">123456</b></span>
            <button
              type="button"
              onClick={() => setOtpCode('123456')}
              className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-[10px] transition"
            >
              Use 123456
            </button>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              6-Digit Cryptographic OTP *
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full py-3 text-center tracking-[0.5em] text-2xl font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-bold text-slate-800"
            />
            <p className="text-[11px] text-slate-400 mt-1 text-center">
              Code is valid for 5 minutes and single-use only.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || otpCode.length !== 6}
            className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Verifying Code...' : 'Verify & Proceed'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500">Didn't receive the email?</span>
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-brand-600 font-semibold hover:underline disabled:text-slate-400 flex items-center gap-1"
          >
            <RotateCw className={`w-3 h-3 ${resending ? 'animate-spin' : ''}`} />
            <span>{cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
