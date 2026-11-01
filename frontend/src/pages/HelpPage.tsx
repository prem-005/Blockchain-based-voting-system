import React from 'react';
import { Link } from 'react-router-dom';
import { 
  HelpCircle, 
  ShieldCheck, 
  FileText, 
  PhoneCall, 
  Mail, 
  MapPin, 
  ExternalLink, 
  ArrowRight,
  Vote,
  Clock,
  Lock,
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const HelpPage: React.FC = () => {
  const { t } = useLanguage();

  const faqs = [
    {
      q: t('help.q1'),
      a: t('help.a1'),
    },
    {
      q: t('help.q2'),
      a: t('help.a2'),
    },
    {
      q: t('help.q3'),
      a: t('help.a3'),
    },
    {
      q: t('help.q4'),
      a: t('help.a4'),
    },
    {
      q: 'What should I do if my voter application is rejected?',
      a: 'If your application is rejected, log in and view your Voter Profile to see the rejection remarks provided by the District Administrator. You may submit a new application with verified supporting identity details.',
    },
    {
      q: 'Can a candidate or administrator see who I voted for?',
      a: 'The current prototype does not hide candidate choices: castVote includes a candidate ID in public transaction calldata. Do not use it for a real election. A private voting protocol must be implemented and independently reviewed first.',
    }
  ];

  return (
    <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10">
      
      {/* Page Title */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#2563EB] text-xs font-bold rounded-lg border border-blue-200">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Electoral Support Services</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-[#102A56] tracking-tight">
          {t('help.title')}
        </h1>
        <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-2xl">
          {t('help.subtitle')}
        </p>
      </div>

      {/* Official Help Contacts Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <PhoneCall className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-[#102A56] text-sm">Voter Helpline</h3>
          <p className="text-xs text-[#64748B]">Toll-Free National Helpline</p>
          <p className="text-lg font-black text-[#2563EB]">1950</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#15803D] flex items-center justify-center">
            <Mail className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-[#102A56] text-sm">Email Support</h3>
          <p className="text-xs text-[#64748B]">Tamil Nadu Election Commission</p>
          <p className="text-xs font-bold text-[#102A56] pt-1">support@lightvote.org</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0] shadow-xs space-y-2">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-[#102A56] text-sm">Help Desk Hours</h3>
          <p className="text-xs text-[#64748B]">Operational During Elections</p>
          <p className="text-xs font-bold text-[#102A56] pt-1">Mon - Sat: 9:00 AM - 6:00 PM</p>
        </div>
      </div>

      {/* Frequently Asked Questions */}
      <section className="bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-6">
        <h2 className="text-lg font-extrabold text-[#102A56] border-b border-[#E2E8F0] pb-3">
          Frequently Asked Questions (FAQ)
        </h2>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-[#102A56] flex items-start gap-2">
                <span className="text-[#2563EB] font-black">{idx + 1}.</span>
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-[#475569] leading-relaxed pl-5">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Action Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-[#102A56] text-white rounded-2xl">
        <div className="space-y-1">
          <h3 className="text-sm font-bold">Ready to participate?</h3>
          <p className="text-xs text-blue-200">Register as a voter or view current active elections.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/register"
            className="px-4 py-2 bg-white text-[#102A56] hover:bg-slate-100 text-xs font-bold rounded-lg transition"
          >
            Register to Vote
          </Link>
          <Link
            to="/voter/elections"
            className="px-4 py-2 bg-[#2563EB] text-white hover:bg-[#1D4ED8] text-xs font-bold rounded-lg transition"
          >
            View Elections
          </Link>
        </div>
      </div>

    </div>
  );
};
