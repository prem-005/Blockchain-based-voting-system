import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, 
  MapPin, 
  Calendar, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Clock, 
  XCircle, 
  CheckCircle2, 
  Wallet, 
  ArrowLeft,
  Building,
  FileCheck
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export const VoterProfilePage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest('/voters/profile/')
      .then((data) => {
        setProfile(data);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load voter profile.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center">
        <div className="w-8 h-8 border-3 border-[#102A56] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-[#64748B]">Loading your official voter profile...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
          <XCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#102A56]">No Profile Found</h2>
        <p className="text-xs text-[#64748B]">{error || 'Please register or log in with your verified voter account.'}</p>
        <Link to="/register" className="px-5 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-lg inline-block">
          Register as Voter
        </Link>
      </div>
    );
  }

  const isApproved = profile.status === 'APPROVED';
  const isRejected = profile.status === 'REJECTED';

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
      
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          to="/voter/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#102A56] transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
          isApproved 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
            : isRejected
            ? 'bg-rose-50 text-rose-700 border border-rose-200'
            : 'bg-amber-50 text-amber-700 border border-amber-200'
        }`}>
          {isApproved && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
          {isRejected && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
          {!isApproved && !isRejected && <Clock className="w-3.5 h-3.5 text-amber-600" />}
          <span>{profile.status === 'APPROVED' ? t('dashboard.status_approved') : profile.status === 'REJECTED' ? t('dashboard.status_rejected') : t('dashboard.status_pending')}</span>
        </span>
      </div>

      {/* Main Official Profile Card */}
      <div className="bg-white rounded-2xl border border-[#CBD5E1] shadow-xs overflow-hidden">
        
        {/* Navy Header Strip */}
        <div className="bg-[#102A56] text-white p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/20 flex items-center justify-center text-white text-xl font-black">
              {profile.full_name?.slice(0, 2).toUpperCase() || 'VT'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">{profile.full_name}</h1>
              <p className="text-xs text-blue-200 font-mono mt-0.5">EPIC: {profile.voter_id_number || 'ENROLLED'}</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[11px] text-blue-200 uppercase tracking-wider block font-semibold">Assembly Constituency</span>
            <span className="text-sm font-bold text-white block">
              AC-{profile.constituency}: {profile.constituency_name}
            </span>
            <span className="text-xs text-blue-200 block">{profile.district_name} District</span>
          </div>
        </div>

        {/* Detailed Attribute Grid */}
        <div className="p-6 sm:p-8 space-y-6">
          <h2 className="text-sm font-bold text-[#102A56] pb-2 border-b border-[#E2E8F0] flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#2563EB]" />
            <span>{t('profile.title')}</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-xs">
            
            <div className="space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
                {t('profile.dob')}
              </span>
              <p className="font-bold text-[#172033] text-sm">{profile.date_of_birth}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                <Mail className="w-3.5 h-3.5 text-[#64748B]" />
                {t('profile.email')}
              </span>
              <p className="font-bold text-[#172033] text-sm break-all">{profile.email}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                <Phone className="w-3.5 h-3.5 text-[#64748B]" />
                {t('profile.mobile')}
              </span>
              <p className="font-bold text-[#172033] text-sm font-mono">{profile.mobile_number}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                <Building className="w-3.5 h-3.5 text-[#64748B]" />
                {t('profile.district')}
              </span>
              <p className="font-bold text-[#172033] text-sm">{profile.district_name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                {t('profile.constituency')}
              </span>
              <p className="font-bold text-[#2563EB] text-sm">AC-{profile.constituency}: {profile.constituency_name}</p>
            </div>

            <div className="space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-[#64748B]" />
                {t('profile.status')}
              </span>
              <p className="font-bold text-[#172033] text-sm capitalize">{profile.status.toLowerCase()}</p>
            </div>

            <div className="sm:col-span-2 space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                <MapPin className="w-3.5 h-3.5 text-[#64748B]" />
                {t('profile.address')}
              </span>
              <p className="font-semibold text-[#172033] leading-relaxed">
                {profile.address || 'Address registered with electoral roll'}
              </p>
            </div>

            <div className="space-y-1">
              <span className="text-[#64748B] flex items-center gap-1.5 font-medium">
                {t('profile.pincode')}
              </span>
              <p className="font-bold text-[#172033] text-sm font-mono">{profile.pin_code || '600001'}</p>
            </div>
          </div>

          {/* Rejection notice if applicable */}
          {isRejected && profile.rejection_reason && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-rose-800">Reason for Rejection:</span>
              <p className="text-rose-700 leading-relaxed">{profile.rejection_reason}</p>
            </div>
          )}

          {/* Pending info note */}
          {!isApproved && !isRejected && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-xs">
              <span className="font-bold text-amber-800">Admin Approval Notice:</span>
              <p className="text-amber-700 leading-relaxed">
                {t('dashboard.pending_msg')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
