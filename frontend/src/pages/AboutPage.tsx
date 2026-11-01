import React from 'react';
import { ShieldCheck, Lock, Database, Cpu, AlertTriangle, Layers, Key, CheckCircle } from 'lucide-react';

export const AboutPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto py-10 space-y-12">
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-50 text-brand-700 text-xs font-semibold rounded-full border border-brand-200">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-600" /> Academic Research & Architecture
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          About LightVote Protocol
        </h1>
        <p className="text-slate-600 text-base leading-relaxed">
          LightVote is an electronic voting research prototype. Its current public-chain vote call exposes the selected candidate in transaction calldata, so it does not provide secret ballots against chain observers.
        </p>
      </div>

      {/* The Core Privacy Dilemma */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
          <AlertTriangle className="w-5 h-5" />
          <span>The Blockchain Ballot Secrecy Paradox</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Why Raw Blockchain Is Not Anonymous</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          In naive blockchain voting schemes, voters use wallet addresses to cast transactions containing candidate selections. 
          However, public blockchains are pseudo-anonymous, not anonymous. If voter registration links real-world identity 
          (name, Aadhaar, EPIC voter ID) to a wallet address, any observer can track on-chain transactions and permanently discover 
          how each citizen voted. This directly violates the constitutional principle of the secret ballot.
        </p>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900">LightVote Privacy Strategy:</p>
          <ul className="list-disc list-inside space-y-1 text-slate-600">
            <li><b>Off-chain identity registry:</b> Names, email addresses, mobile numbers, and voter IDs remain in Django and are not included in transaction calldata.</li>
            <li><b>Nullifier enforcement:</b> The contract stores an election-scoped nullifier to reject repeat submissions. The current implementation also associates the wallet with the voter workflow.</li>
            <li><b>Candidate choice is public:</b> <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">castVote</code> includes the candidate ID as public transaction calldata. Omitting it from the event does not hide it; wallet linkage can further identify the voter.</li>
            <li><b>Results visibility:</b> Candidate tallies are gated by contract publication, but this does not make individual ballot choices confidential.</li>
          </ul>
        </div>
      </section>

      {/* Architecture & Component Breakdown */}
      <section className="space-y-6">
        <h2 className="text-2xl font-bold text-slate-900">System Architecture</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center font-bold">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Off-Chain Relational Registry</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Implemented in Python 3.14 & Django REST Framework. Manages legal voter registration, 18+ age verification, 
              cryptographic 6-digit email OTP dispatch, and administrative role boundaries (Central Admin and District Admins).
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-xl bg-accent-50 text-accent-700 flex items-center justify-center font-bold">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">On-Chain Smart Contracts</h3>
            <p className="text-slate-600 text-xs leading-relaxed">
              Written in Solidity 0.8.24 Cancun EVM with OpenZeppelin AccessControl. Coordinates election lifecycles (2026, 2027), 
              enforces strict start/end timestamps, validates constituency candidate boundaries, and prevents duplicate voting.
            </p>
          </div>
        </div>
      </section>

      {/* Authoritative Dataset Attribution */}
      <section className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-3">
        <h2 className="text-xl font-bold text-slate-900">Tamil Nadu Districts & Assembly Constituencies Dataset</h2>
        <p className="text-slate-600 text-sm leading-relaxed">
          LightVote incorporates the authoritative delimitation dataset for the State of Tamil Nadu:
        </p>
        <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
          <li><b>Source:</b> Delimitation of Parliamentary and Assembly Constituencies Order, 2008 & Election Commission of India (ECI).</li>
          <li><b>Scope:</b> All 38 Revenue Districts of Tamil Nadu (from Ariyalur to Virudhunagar) and 234 Assembly Constituencies.</li>
          <li><b>Key Focus:</b> Tiruchirappalli District (ID 29), featuring Manachanallur (AC-141), Srirangam (AC-139), Lalgudi (AC-144), etc.</li>
          <li><b>Integrity:</b> Candidates and voters are strictly partitioned by their authorized constituency. Cross-constituency voting is blocked at the smart contract level.</li>
        </ul>
      </section>

      {/* Academic Disclaimer */}
      <section className="bg-slate-100 rounded-2xl p-6 border border-slate-300 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <ShieldCheck className="w-4 h-4 text-brand-600" />
          <span>Academic Research Disclaimer</span>
        </div>
        <p>
          LightVote is developed as an advanced academic research prototype to evaluate privacy-preserving 
          electronic voting architectures. While it demonstrates state-of-the-art cryptographic nullifier 
          mechanisms and decoupled identity verification, real-world governmental deployment requires formal 
          cryptographic proofs, side-channel attack analysis, specialized hardware security modules (HSMs), 
          and legal audit certifications.
        </p>
      </section>
    </div>
  );
};
