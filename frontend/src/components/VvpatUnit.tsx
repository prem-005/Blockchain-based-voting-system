import React, { useEffect, useState } from 'react';
import { PartySymbol } from './PartySymbol';
import { evmAudio } from '../utils/evmAudio';
import { Scissors, CheckCircle, Shield, Eye } from 'lucide-react';

interface VvpatUnitProps {
  isAuditing: boolean;
  candidateNumber: number | null;
  candidateName: string | null;
  partyName: string | null;
  partyAbbreviation?: string;
  symbolName?: string;
  symbolImage?: string;
  symbolUrl?: string;
  constituencyName?: string;
  onAuditComplete: () => void;
}

export const VvpatUnit: React.FC<VvpatUnitProps> = ({
  isAuditing,
  candidateNumber,
  candidateName,
  partyName,
  partyAbbreviation,
  symbolName,
  symbolImage,
  symbolUrl,
  constituencyName = 'Manachanallur (AC-141)',
  onAuditComplete,
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(7);
  const [slipState, setSlipState] = useState<'idle' | 'printing' | 'visible' | 'cutting' | 'dropped'>('idle');

  useEffect(() => {
    if (!isAuditing) {
      setSlipState('idle');
      setSecondsRemaining(7);
      return;
    }

    // Phase 1: Start printing
    setSlipState('printing');
    evmAudio.playVvpatPrinting();

    // After 0.6s print animation, slip is fully visible
    const printTimer = setTimeout(() => {
      setSlipState('visible');
      // Play the iconic EVM confirmation beep as soon as the slip becomes visible!
      evmAudio.playEvmLongBeep();
    }, 600);

    // 7-second countdown
    let timerCount = 7;
    setSecondsRemaining(7);
    const interval = setInterval(() => {
      timerCount -= 1;
      setSecondsRemaining(timerCount);
      if (timerCount <= 0) {
        clearInterval(interval);
        // Phase 2: Cut paper
        setSlipState('cutting');
        evmAudio.playPaperCut();

        // Phase 3: Drop into sealed box
        setTimeout(() => {
          setSlipState('dropped');
          setTimeout(() => {
            onAuditComplete();
          }, 800);
        }, 600);
      }
    }, 1000);

    return () => {
      clearTimeout(printTimer);
      clearInterval(interval);
    };
  }, [isAuditing]);

  return (
    <div className="w-full max-w-xs mx-auto bg-slate-800 rounded-2xl p-4 shadow-2xl border-4 border-slate-700 text-white flex flex-col items-center">
      {/* VVPAT Top Header */}
      <div className="w-full flex items-center justify-between pb-2 border-b border-slate-700 text-[10px] font-mono tracking-wider text-slate-300">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold text-slate-100">VVPAT UNIT M3</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${isAuditing ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
          <span className="text-[9px] uppercase font-bold text-slate-300">
            {isAuditing ? 'AUDITING SLIP' : 'STANDBY'}
          </span>
        </div>
      </div>

      {/* Transparent Glass Viewing Window */}
      <div className="relative w-full h-72 my-3 rounded-xl bg-slate-950 border-4 border-slate-600 shadow-inner overflow-hidden flex flex-col justify-start items-center p-3">
        {/* Glass reflection gradient */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10 pointer-events-none z-20" />

        {/* Backlight Lamp */}
        <div
          className={`absolute inset-0 transition-opacity duration-500 pointer-events-none z-10 ${
            isAuditing ? 'bg-amber-100/20 shadow-[inset_0_0_40px_rgba(251,191,36,0.3)]' : 'bg-black/60'
          }`}
        />

        {/* Paper Slip */}
        {isAuditing && candidateNumber !== null ? (
          <div
            className={`w-11/12 bg-white text-slate-900 rounded-sm p-3 shadow-lg border border-slate-300 transition-all duration-700 relative z-15 ${
              slipState === 'printing'
                ? '-translate-y-full opacity-60'
                : slipState === 'visible'
                ? 'translate-y-0 opacity-100'
                : slipState === 'cutting'
                ? 'translate-y-2 opacity-90 scale-98'
                : 'translate-y-48 opacity-0'
            }`}
          >
            {/* Top Perforation / Tear line */}
            <div className="w-full border-b border-dashed border-slate-400 pb-1 mb-2 text-center">
              <span className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase block">
                ★ ECI VVPAT AUDIT SLIP ★
              </span>
              <span className="text-[7px] text-slate-400 block font-mono">
                {constituencyName}
              </span>
            </div>

            {/* Slip Content: 3 Columns (Serial, Name, Symbol) */}
            <div className="flex items-center justify-between gap-2 py-1">
              {/* Column 1: Candidate Serial No */}
              <div className="w-8 h-8 rounded border-2 border-slate-900 flex items-center justify-center font-black text-sm font-mono bg-slate-100 text-slate-900 flex-shrink-0">
                {candidateNumber < 10 ? `0${candidateNumber}` : candidateNumber}
              </div>

              {/* Column 2: Candidate Name & Party */}
              <div className="flex-1 text-left px-1">
                <p className="font-extrabold text-xs text-slate-950 uppercase tracking-tight leading-tight line-clamp-2">
                  {candidateName}
                </p>
                <p className="text-[9px] font-semibold text-slate-600 truncate mt-0.5">
                  {partyName}
                </p>
              </div>

              {/* Column 3: Party Symbol */}
              <div className="w-10 h-10 border border-slate-300 p-0.5 rounded bg-white flex items-center justify-center flex-shrink-0 grayscale contrast-150">
                <PartySymbol
                  symbolName={symbolName}
                  abbreviation={partyAbbreviation}
                  symbolImage={symbolImage}
                  symbolUrl={symbolUrl}
                  className="w-full h-full"
                />
              </div>
            </div>

            {/* Bottom Barcode / Hash verification */}
            <div className="mt-2 pt-1 border-t border-slate-200 text-center">
              <div className="flex justify-center gap-0.5 h-3 my-0.5 opacity-70">
                {[...Array(24)].map((_, i) => (
                  <span
                    key={i}
                    className={`h-full ${i % 3 === 0 ? 'w-1 bg-black' : i % 2 === 0 ? 'w-0.5 bg-black' : 'w-0.5 bg-transparent'}`}
                  />
                ))}
              </div>
              <span className="text-[6.5px] font-mono text-slate-400 block tracking-tight">
                SECURE THERMAL AUDIT TOKEN
              </span>
            </div>

            {/* Cut indicator line when cutting */}
            {slipState === 'cutting' && (
              <div className="absolute -top-2 left-0 right-0 flex items-center justify-center text-rose-600 animate-pulse">
                <Scissors className="w-4 h-4" />
                <div className="w-full border-t-2 border-dashed border-rose-500" />
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 space-y-2 z-15">
            <Eye className="w-8 h-8 text-slate-600 stroke-[1.5]" />
            <span className="text-[10px] font-mono uppercase text-slate-400 px-4">
              Window will display printed slip for 7 seconds after button press
            </span>
          </div>
        )}
      </div>

      {/* 7-Second Inspection Timer & Status */}
      <div className="w-full bg-slate-900 rounded-xl p-2.5 border border-slate-700 text-center space-y-1">
        {isAuditing ? (
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono mb-1">
              <span className="text-amber-300 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                VERIFYING SLIP
              </span>
              <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-600">
                {secondsRemaining}s remaining
              </span>
            </div>
            {/* Countdown progress bar */}
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-amber-400 h-full transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(secondsRemaining / 7) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-400 font-mono">
            SEALED DROP COMPARTMENT: <span className="text-emerald-400 font-bold">READY</span>
          </div>
        )}
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-2 text-[8px] text-slate-400 font-mono text-center tracking-tight">
        ECI M3 SPEC • 7-SEC VISUAL AUDIT WINDOW
      </div>
    </div>
  );
};
