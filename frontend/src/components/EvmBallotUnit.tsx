import React from 'react';
import { Candidate } from '../types';
import { PartySymbol } from './PartySymbol';
import { evmAudio } from '../utils/evmAudio';
import { ArrowRight } from 'lucide-react';
import { apiOrigin } from '../services/apiClient';

const API_BASE = apiOrigin;

interface EvmBallotUnitProps {
  candidates: Candidate[];
  selectedCandidateId: number | null;
  onPressCandidateButton: (candidateId: number) => void;
  isBallotLocked: boolean;
  constituencyName?: string;
  constituencyId?: number;
}

export const EvmBallotUnit: React.FC<EvmBallotUnitProps> = ({
  candidates,
  selectedCandidateId,
  onPressCandidateButton,
  isBallotLocked,
  constituencyName = 'Manachanallur',
  constituencyId = 141,
}) => {
  // Tamil name transliteration helper for Manachanallur AC-141 candidates
  const getTamilName = (name: string): string => {
    if (name.includes('Kathiravan')) return 'எஸ். கதிரவன்';
    if (name.includes('Paranthaman')) return 'எம். பரந்தாமன்';
    if (name.includes('Anandha Kumar')) return 'ஆர். ஆனந்த குமார்';
    if (name.includes('Srinivasan')) return 'டாக்டர் கே. சீனிவாசன்';
    return name;
  };

  const getCandidatePhotoUrl = (cand: Candidate): string | null => {
    if (cand.photo) {
      if (cand.photo.startsWith('http')) return cand.photo;
      return `${API_BASE}/media/${cand.photo}`;
    }
    if (cand.photo_url) return cand.photo_url;
    return null;
  };

  const handleButtonClick = (cid: number) => {
    if (isBallotLocked) return;
    evmAudio.playButtonClick();
    onPressCandidateButton(cid);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-slate-200 rounded-3xl p-4 sm:p-6 shadow-2xl border-4 border-slate-300 flex flex-col relative select-none">
      {/* Top Handle and Screws */}
      <div className="flex items-center justify-between pb-3 border-b-2 border-slate-300 text-xs">
        {/* Screw left */}
        <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-500 shadow-inner flex items-center justify-center">
          <div className="w-2 h-0.5 bg-slate-600 rotate-45" />
        </div>

        {/* Center Control Unit Status Bar */}
        <div className="flex items-center gap-4 bg-slate-800 text-white px-5 py-1.5 rounded-xl shadow-inner font-mono text-[11px]">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                !isBallotLocked
                  ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,1)] animate-pulse'
                  : 'bg-emerald-950'
              }`}
            />
            <span className="font-bold text-emerald-300">READY</span>
          </div>

          <div className="h-3 w-px bg-slate-600" />

          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isBallotLocked
                  ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,1)] animate-ping'
                  : 'bg-rose-950'
              }`}
            />
            <span className="font-bold text-rose-300">BUSY</span>
          </div>

          <div className="h-3 w-px bg-slate-600" />

          <span className="text-slate-300 font-semibold tracking-wider">
            BALLOT UNIT (BU-01)
          </span>
        </div>

        {/* Screw right */}
        <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-500 shadow-inner flex items-center justify-center">
          <div className="w-2 h-0.5 bg-slate-600 -rotate-45" />
        </div>
      </div>

      {/* Constituency Details Plate */}
      <div className="bg-white/80 backdrop-blur my-3 p-3 rounded-xl border border-slate-300 flex items-center justify-between shadow-sm text-xs">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            ELECTION COMMISSION OF INDIA • ELECTRONIC VOTING MACHINE
          </span>
          <span className="font-extrabold text-slate-800 text-sm">
            AC-{constituencyId} {constituencyName.toUpperCase()} ASSEMBLY CONSTITUENCY
          </span>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono text-slate-500 block">TOTAL CANDIDATES</span>
          <span className="font-bold font-mono text-base text-brand-700">
            {candidates.length + 1} (INCL. NOTA)
          </span>
        </div>
      </div>

      {/* Candidate Ballot Rows */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-inner divide-y-2 divide-slate-200 overflow-hidden">
        {candidates.map((cand, idx) => {
          const cid = cand.candidate_id || cand.id;
          const isSelected = selectedCandidateId === cid;
          const slNo = idx + 1;
          const photoUrl = getCandidatePhotoUrl(cand);

          return (
            <div
              key={cand.id}
              className={`flex items-center justify-between p-3 sm:p-3.5 transition-colors ${
                isSelected ? 'bg-amber-50/70' : 'hover:bg-slate-50'
              }`}
            >
              {/* Column 1: Sl. No + Braille */}
              <div className="w-14 flex items-center gap-2 flex-shrink-0">
                <span className="font-black text-xl text-slate-900 font-mono w-7 text-center">
                  {slNo < 10 ? `0${slNo}` : slNo}
                </span>
                {/* Braille Dots simulation */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded border border-slate-200" title="Braille Sign">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                </div>
              </div>

              {/* Column 2: Candidate Name (English + Tamil) & Party */}
              <div className="flex-1 px-3 text-left">
                <div className="space-y-0.5">
                  <h4 className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-snug">
                    {cand.name}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500">
                    {getTamilName(cand.name)}
                  </p>
                  <p className="text-[11px] font-bold text-brand-700 uppercase tracking-tight">
                    {cand.party_details?.name} ({cand.party_details?.abbreviation})
                  </p>
                </div>
              </div>

              {/* Column 3: Candidate Passport Photo */}
              <div className="w-12 h-14 bg-slate-100 rounded border-2 border-slate-400 shadow-sm flex items-center justify-center flex-shrink-0 overflow-hidden mx-1.5">
                {photoUrl ? (
                  <img src={photoUrl} alt={cand.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-[9px] font-bold text-center p-0.5">
                    <span className="text-xs">👤</span>
                    PHOTO
                  </div>
                )}
              </div>

              {/* Column 4: Party Symbol / Logo */}
              <div className="w-14 h-14 bg-white rounded border-2 border-slate-300 shadow-sm flex items-center justify-center p-1 flex-shrink-0 mx-2">
                <PartySymbol
                  symbolName={cand.party_details?.symbol_name}
                  abbreviation={cand.party_details?.abbreviation}
                  symbolImage={cand.party_details?.symbol_image}
                  symbolUrl={cand.party_details?.symbol_url}
                  className="w-full h-full"
                />
              </div>

              {/* Column 5: Arrow Indicator */}
              <div className="text-slate-400 px-1 hidden sm:block">
                <ArrowRight className="w-5 h-5 stroke-[2.5]" />
              </div>

              {/* Column 6: Red LED + Tactile Blue Button */}
              <div className="flex items-center gap-3 pl-2 flex-shrink-0">
                {/* Red LED Indicator */}
                <div
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    isSelected
                      ? 'bg-rose-500 border-rose-300 shadow-[0_0_12px_rgba(244,63,94,1)] ring-2 ring-rose-300'
                      : 'bg-rose-950/60 border-slate-400'
                  }`}
                  title={isSelected ? 'Lamp ON - Candidate Selected' : 'Lamp OFF'}
                />

                {/* Tactile EVM Blue Button */}
                <button
                  type="button"
                  disabled={isBallotLocked}
                  onClick={() => handleButtonClick(cid)}
                  className={`w-14 h-11 sm:w-16 sm:h-12 rounded-xl transition-all duration-150 flex items-center justify-center font-bold text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isSelected
                      ? 'bg-gradient-to-b from-blue-700 to-blue-900 border-2 border-blue-400 ring-2 ring-blue-300'
                      : 'bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 hover:from-blue-600 hover:to-blue-800 border-2 border-blue-400 shadow-blue-500/30'
                  }`}
                  title="Press Blue Button to Cast Vote"
                >
                  <div className="w-8 h-4 rounded-full bg-white/20 shadow-inner" />
                </button>
              </div>
            </div>
          );
        })}

        {/* NOTA (None of the Above) Row */}
        <div className={`flex items-center justify-between p-3 sm:p-3.5 transition-colors ${
          selectedCandidateId === 9999 ? 'bg-amber-50/70' : 'hover:bg-slate-50'
        }`}>
          {/* Sl No */}
          <div className="w-14 flex items-center gap-2 flex-shrink-0">
            <span className="font-black text-xl text-slate-900 font-mono w-7 text-center">
              {candidates.length + 1 < 10 ? `0${candidates.length + 1}` : candidates.length + 1}
            </span>
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded border border-slate-200">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </div>
          </div>

          {/* NOTA Name */}
          <div className="flex-1 px-3 text-left">
            <h4 className="font-black text-slate-900 text-sm sm:text-base tracking-tight leading-snug">
              None of the Above (NOTA)
            </h4>
            <p className="text-xs font-semibold text-slate-500">
              மேற்கண்ட எவருமில்லை (நோட்டா)
            </p>
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
              ELECTION COMMISSION OF INDIA
            </p>
          </div>

          {/* Photo placeholder */}
          <div className="w-12 h-14 bg-slate-100 rounded border-2 border-slate-300 flex items-center justify-center flex-shrink-0 text-slate-400 font-bold text-[9px]">
            NOTA
          </div>

          {/* NOTA Symbol */}
          <div className="w-14 h-14 bg-white rounded border-2 border-slate-300 flex items-center justify-center p-1 flex-shrink-0 mx-2">
            <PartySymbol symbolName="NOTA" abbreviation="NOTA" className="w-full h-full" />
          </div>

          {/* Arrow */}
          <div className="text-slate-400 px-1 hidden sm:block">
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </div>

          {/* LED + Button */}
          <div className="flex items-center gap-3 pl-2 flex-shrink-0">
            <div
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                selectedCandidateId === 9999
                  ? 'bg-rose-500 border-rose-300 shadow-[0_0_12px_rgba(244,63,94,1)] ring-2 ring-rose-300'
                  : 'bg-rose-950/60 border-slate-400'
              }`}
            />
            <button
              type="button"
              disabled={isBallotLocked}
              onClick={() => handleButtonClick(9999)}
              className="w-14 h-11 sm:w-16 sm:h-12 rounded-xl transition-all duration-150 flex items-center justify-center font-bold text-white shadow-lg active:scale-95 bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 border-2 border-blue-400"
            >
              <div className="w-8 h-4 rounded-full bg-white/20 shadow-inner" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Screws & ECI Seal */}
      <div className="flex items-center justify-between pt-3 mt-3 border-t-2 border-slate-300 text-xs">
        <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-500 shadow-inner flex items-center justify-center">
          <div className="w-2 h-0.5 bg-slate-600 -rotate-45" />
        </div>

        <span className="text-[10px] font-mono text-slate-500 tracking-wider">
          BHARAT ELECTRONICS LIMITED / ECIL • SECURE EVM-M3
        </span>

        <div className="w-3.5 h-3.5 rounded-full bg-slate-400 border border-slate-500 shadow-inner flex items-center justify-center">
          <div className="w-2 h-0.5 bg-slate-600 rotate-45" />
        </div>
      </div>
    </div>
  );
};
