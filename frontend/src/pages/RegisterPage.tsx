import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  MapPin, 
  Users, 
  Info, 
  ArrowRight, 
  Calendar,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { District, Constituency } from '../types';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [districts, setDistricts] = useState<District[]>([]);
  const [constituencies, setConstituencies] = useState<Constituency[]>([]);

  // Stepper state
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);

  // Form fields matching image #2
  const [formData, setFormData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: 'Select',
    parents_name: '',
    id_proof_type: 'Aadhaar Card',
    id_proof_number: '',
    email: '',
    mobile_number: '',
    password: '',
    district: '',
    constituency: '',
    address: '',
    pin_code: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ageWarning, setAgeWarning] = useState<string | null>(null);
  const [registeredEpic, setRegisteredEpic] = useState<string | null>(null);

  useEffect(() => {
    apiRequest('/elections/districts/')
      .then((data) => setDistricts(data.results || data || []))
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (formData.district) {
      apiRequest(`/elections/constituencies/?district_id=${formData.district}`)
        .then((data) => setConstituencies(data.results || data || []))
        .catch((err) => console.error(err));
    } else {
      setConstituencies([]);
    }
  }, [formData.district]);

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dob = e.target.value;
    setFormData(prev => ({ ...prev, date_of_birth: dob }));

    if (dob) {
      const birthDate = new Date(dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        setAgeWarning(`Must be 18 years or above on the qualifying date. (Calculated age: ${age})`);
      } else {
        setAgeWarning(null);
      }
    }
  };

  const handleNext = () => {
    setError(null);
    if (activeStep === 1) {
      if (!formData.full_name.trim() || !formData.date_of_birth) {
        setError("Please enter your full legal name and date of birth.");
        return;
      }
      if (ageWarning) {
        setError("Ineligible: Minimum voting age is 18 years.");
        return;
      }
    }
    if (activeStep === 2) {
      if (!formData.email.trim() || !formData.mobile_number.trim()) {
        setError("Please provide your email address and mobile number.");
        return;
      }
    }
    if (activeStep === 3) {
      if (!formData.district || !formData.constituency) {
        setError("Please select your District and Assembly Constituency.");
        return;
      }
    }
    setActiveStep(prev => Math.min(prev + 1, 4) as any);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await apiRequest('/voters/register/', {
        method: 'POST',
        body: JSON.stringify({
          full_name: formData.full_name,
          date_of_birth: formData.date_of_birth,
          voter_id_number: formData.id_proof_number || undefined,
          email: formData.email.toLowerCase(),
          password: formData.password || undefined,
          mobile_number: formData.mobile_number,
          district: parseInt(formData.district),
          constituency: parseInt(formData.constituency),
          address: formData.address || 'Address provided during enrollment',
          pin_code: formData.pin_code || '600001',
          state: 1
        })
      });

      setRegisteredEpic(res.voter_id_number || 'ENROLLED');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check inputs or contact support.');
    } finally {
      setSubmitting(false);
    }
  };

  if (registeredEpic) {
    return (
      <div className="max-w-md mx-auto py-16 px-4 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#15803D] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#102A56]">Registration Submitted</h1>
        <p className="text-xs text-[#64748B]">
          Your application has been received with reference <b className="font-mono text-[#102A56]">{registeredEpic}</b>.
        </p>
        <div className="pt-2">
          <Link to="/login" className="px-6 py-2.5 bg-[#2563EB] text-white text-xs font-bold rounded-lg inline-block">
            Proceed to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1340px] mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      
      {/* Title */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#102A56] tracking-tight">
          Voter Registration
        </h1>
        <p className="text-xs text-[#64748B]">
          Apply to register as a voter. Only eligible citizens can register.
        </p>
      </div>

      {/* 4-Step Stepper (Exact visual style from Screenshot #2) */}
      <div className="flex items-center justify-center max-w-3xl mx-auto py-2">
        <div className="w-full flex items-center justify-between relative">
          
          {/* Connector bar */}
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-[#E2E8F0] -z-0" />

          {/* Step 1 */}
          <div className="flex flex-col items-center relative z-10 space-y-1.5 cursor-pointer" onClick={() => setActiveStep(1)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              activeStep === 1 
                ? 'bg-[#2563EB] text-white ring-4 ring-blue-100' 
                : activeStep > 1 
                ? 'bg-[#15803D] text-white' 
                : 'bg-white border-2 border-[#CBD5E1] text-[#64748B]'
            }`}>
              1
            </div>
            <span className={`text-[11px] font-semibold ${activeStep === 1 ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
              Personal Details
            </span>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center relative z-10 space-y-1.5 cursor-pointer" onClick={() => activeStep >= 2 && setActiveStep(2)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              activeStep === 2 
                ? 'bg-[#2563EB] text-white ring-4 ring-blue-100' 
                : activeStep > 2 
                ? 'bg-[#15803D] text-white' 
                : 'bg-white border-2 border-[#CBD5E1] text-[#64748B]'
            }`}>
              2
            </div>
            <span className={`text-[11px] font-semibold ${activeStep === 2 ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
              Contact Details
            </span>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center relative z-10 space-y-1.5 cursor-pointer" onClick={() => activeStep >= 3 && setActiveStep(3)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              activeStep === 3 
                ? 'bg-[#2563EB] text-white ring-4 ring-blue-100' 
                : activeStep > 3 
                ? 'bg-[#15803D] text-white' 
                : 'bg-white border-2 border-[#CBD5E1] text-[#64748B]'
            }`}>
              3
            </div>
            <span className={`text-[11px] font-semibold ${activeStep === 3 ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
              Electoral Details
            </span>
          </div>

          {/* Step 4 */}
          <div className="flex flex-col items-center relative z-10 space-y-1.5 cursor-pointer" onClick={() => activeStep >= 4 && setActiveStep(4)}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition ${
              activeStep === 4 
                ? 'bg-[#2563EB] text-white ring-4 ring-blue-100' 
                : 'bg-white border-2 border-[#CBD5E1] text-[#64748B]'
            }`}>
              4
            </div>
            <span className={`text-[11px] font-semibold ${activeStep === 4 ? 'text-[#2563EB]' : 'text-[#64748B]'}`}>
              Verify & Submit
            </span>
          </div>

        </div>
      </div>

      {/* Main 2-Column Grid: Form Left, Eligibility Criteria Card Right (Screenshot #2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Card (8 Columns) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E2E8F0] p-6 sm:p-8 shadow-xs space-y-5">
          
          {error && (
            <div className="flex items-center gap-2 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {ageWarning && (
            <div className="flex items-center gap-2 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{ageWarning}</span>
            </div>
          )}

          {/* STEP 1: Personal Information (Matches Screenshot #2 layout) */}
          {activeStep === 1 && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-[#102A56] pb-1">
                Personal Information
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    Full Name (as per ID proof) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Enter full name"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date_of_birth}
                    onChange={handleDobChange}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1.5">
                  Gender *
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  <option value="Select">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Third Gender">Third Gender</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1.5">
                  Father's / Mother's Name *
                </label>
                <input
                  type="text"
                  value={formData.parents_name}
                  onChange={(e) => setFormData({ ...formData, parents_name: e.target.value })}
                  placeholder="Enter name"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    ID Proof Type *
                  </label>
                  <select
                    value={formData.id_proof_type}
                    onChange={(e) => setFormData({ ...formData, id_proof_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="Aadhaar Card">Aadhaar Card</option>
                    <option value="PAN Card">PAN Card</option>
                    <option value="Passport">Passport</option>
                    <option value="Driving License">Driving License</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    ID Proof Number *
                  </label>
                  <input
                    type="text"
                    value={formData.id_proof_number}
                    onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value.toUpperCase() })}
                    placeholder="Enter ID number"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Contact Details */}
          {activeStep === 2 && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-[#102A56] pb-1">
                Contact Details & Security
              </h2>

              <div>
                <label className="block font-semibold text-[#172033] mb-1.5">
                  Email Address * (Used for OTP dispatch)
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1.5">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={formData.mobile_number}
                  onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '') })}
                  placeholder="10-digit mobile number"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172033] mb-1.5">
                  Optional Account Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave empty for passwordless OTP verification"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>
            </div>
          )}

          {/* STEP 3: Electoral Details */}
          {activeStep === 3 && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-[#102A56] pb-1">
                Electoral Constituency
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    District *
                  </label>
                  <select
                    required
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value, constituency: '' })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="">Select District</option>
                    {districts.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    Assembly Constituency *
                  </label>
                  <select
                    required
                    disabled={!formData.district}
                    value={formData.constituency}
                    onChange={(e) => setFormData({ ...formData, constituency: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB] disabled:opacity-50"
                  >
                    <option value="">Select Constituency</option>
                    {constituencies.map((con) => (
                      <option key={con.id} value={con.id}>AC-{con.id}: {con.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    Permanent Address
                  </label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Door No, Street Name, Town"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs resize-none focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#172033] mb-1.5">
                    Postal PIN Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={formData.pin_code}
                    onChange={(e) => setFormData({ ...formData, pin_code: e.target.value.replace(/\D/g, '') })}
                    placeholder="e.g. 620005"
                    className="w-full px-3.5 py-2.5 bg-white border border-[#CBD5E1] rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review and Submit */}
          {activeStep === 4 && (
            <div className="space-y-4 text-xs">
              <h2 className="text-sm font-bold text-[#102A56] pb-1">
                Verify Application Details
              </h2>

              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-[#64748B]">Full Legal Name:</span>
                  <span className="font-bold text-[#102A56]">{formData.full_name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-[#64748B]">Date of Birth:</span>
                  <span className="font-semibold text-[#172033]">{formData.date_of_birth}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-[#64748B]">Email Address:</span>
                  <span className="font-semibold text-[#172033]">{formData.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-[#64748B]">Mobile Number:</span>
                  <span className="font-semibold text-[#172033]">{formData.mobile_number}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#64748B]">Constituency:</span>
                  <span className="font-bold text-[#2563EB]">
                    {constituencies.find(c => c.id.toString() === formData.constituency)?.name || 'Selected'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Buttons Footer */}
          <div className="pt-4 flex items-center justify-between">
            {activeStep > 1 ? (
              <button
                type="button"
                onClick={() => setActiveStep(prev => Math.max(prev - 1, 1) as any)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-[#172033] text-xs font-semibold rounded-lg transition"
              >
                Back
              </button>
            ) : <div />}

            {activeStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5"
              >
                <span>Next</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-6 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <span>{submitting ? 'Submitting...' : 'Submit Application'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Eligibility Criteria Side Card (Exact replica of Screenshot #2) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E2E8F0] p-6 shadow-xs space-y-4 text-xs">
          <h3 className="font-extrabold text-[#102A56] text-sm">
            Eligibility Criteria
          </h3>

          <div className="space-y-4 pt-1">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-[#172033] leading-snug">
                Must be 18 years or above on the qualifying date
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-[#172033] leading-snug">
                Must be a resident of Tamil Nadu
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-[#172033] leading-snug">
                Must belong to the selected constituency
              </p>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="w-3.5 h-3.5" />
              </div>
              <p className="text-xs text-[#172033] leading-snug">
                One person can register only once
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
