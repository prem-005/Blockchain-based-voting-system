import React from 'react';
import { apiOrigin } from '../services/apiClient';

const API_BASE = apiOrigin;

interface PartySymbolProps {
  symbolName?: string;
  abbreviation?: string;
  symbolImage?: string;
  symbolUrl?: string;
  className?: string;
}

export const PartySymbol: React.FC<PartySymbolProps> = ({
  symbolName = '',
  abbreviation = '',
  symbolImage,
  symbolUrl,
  className = 'w-10 h-10',
}) => {
  // 1. If an uploaded symbol image exists, display it
  const imageSrc = symbolImage
    ? symbolImage.startsWith('http')
      ? symbolImage
      : `${API_BASE}/media/${symbolImage}`
    : symbolUrl || null;

  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={symbolName || abbreviation || 'Party Symbol'}
        className={`${className} object-contain`}
      />
    );
  }

  const norm = (abbreviation || symbolName).toUpperCase();

  // TVK (Tamilaga Vettri Kazhagam) or similar
  if (norm.includes('TVK')) {
    return (
      <div className={`${className} bg-red-600 rounded flex flex-col items-center justify-center text-yellow-300 font-extrabold text-[10px] border border-yellow-400 p-0.5 leading-tight text-center`}>
        <span>TVK</span>
      </div>
    );
  }

  if (norm.includes('DMK') || norm.includes('SUN')) {
    // Rising Sun
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#FFFDF0" rx="6" />
        {/* Sun rays */}
        <path d="M50 48 L50 15 M50 48 L25 22 M50 48 L75 22 M50 48 L12 36 M50 48 L88 36 M50 48 L8 50 M50 48 L92 50" stroke="#DC2626" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 48 L37 18 M50 48 L63 18 M50 48 L18 28 M50 48 L82 28" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        {/* Sun disk */}
        <circle cx="50" cy="50" r="16" fill="#F59E0B" stroke="#DC2626" strokeWidth="2" />
        {/* Mountains */}
        <path d="M2 75 L28 46 L50 68 L76 44 L98 75 Z" fill="#1E293B" />
        <path d="M0 75 L100 75 L100 95 L0 95 Z" fill="#0F172A" />
      </svg>
    );
  }

  if (norm.includes('AIADMK') || norm.includes('LEAF') || norm.includes('LEAVES')) {
    // Two Leaves
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#F0FDF4" rx="6" />
        {/* Left leaf */}
        <path d="M50 78 C30 75 16 55 22 32 C38 32 48 50 50 78 Z" fill="#16A34A" stroke="#14532D" strokeWidth="2" />
        <path d="M25 45 C35 52 44 64 50 78" stroke="#86EFAC" strokeWidth="1.5" strokeLinecap="round" />
        {/* Right leaf */}
        <path d="M50 78 C70 75 84 55 78 32 C62 32 52 50 50 78 Z" fill="#15803D" stroke="#14532D" strokeWidth="2" />
        <path d="M75 45 C65 52 56 64 50 78" stroke="#86EFAC" strokeWidth="1.5" strokeLinecap="round" />
        {/* Central stem */}
        <path d="M50 75 L50 92" stroke="#14532D" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (norm.includes('BJP') || norm.includes('LOTUS')) {
    // Lotus
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#FFF7ED" rx="6" />
        {/* Central Petal */}
        <path d="M50 20 C42 35 44 55 50 68 C56 55 58 35 50 20 Z" fill="#EA580C" stroke="#9A3412" strokeWidth="1.5" />
        {/* Inner Left Petal */}
        <path d="M50 68 C35 60 28 42 34 28 C42 40 47 54 50 68 Z" fill="#F97316" stroke="#9A3412" strokeWidth="1.5" />
        {/* Inner Right Petal */}
        <path d="M50 68 C65 60 72 42 66 28 C58 40 53 54 50 68 Z" fill="#F97316" stroke="#9A3412" strokeWidth="1.5" />
        {/* Outer Left Petal */}
        <path d="M50 68 C30 68 18 54 22 40 C32 48 42 60 50 68 Z" fill="#FB923C" stroke="#9A3412" strokeWidth="1.5" />
        {/* Outer Right Petal */}
        <path d="M50 68 C70 68 82 54 78 40 C68 48 58 60 50 68 Z" fill="#FB923C" stroke="#9A3412" strokeWidth="1.5" />
        {/* Lotus Base / Leaves */}
        <path d="M26 72 C38 80 62 80 74 72 C64 85 36 85 26 72 Z" fill="#15803D" stroke="#14532D" strokeWidth="1.5" />
        <path d="M50 82 L50 92" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (norm.includes('NTK') || norm.includes('FARMER') || norm.includes('SUGARCANE')) {
    // Sugarcane Farmer
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#FEFCE8" rx="6" />
        {/* Sugarcane stalks */}
        <path d="M40 90 L40 22 C40 18 36 12 30 10" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
        <path d="M60 90 L60 22 C60 18 64 12 70 10" stroke="#15803D" strokeWidth="3" strokeLinecap="round" />
        {/* Sugarcane joints */}
        <line x1="37" y1="35" x2="43" y2="35" stroke="#854D0E" strokeWidth="2" />
        <line x1="37" y1="52" x2="43" y2="52" stroke="#854D0E" strokeWidth="2" />
        <line x1="37" y1="69" x2="43" y2="69" stroke="#854D0E" strokeWidth="2" />
        <line x1="57" y1="35" x2="63" y2="35" stroke="#854D0E" strokeWidth="2" />
        <line x1="57" y1="52" x2="63" y2="52" stroke="#854D0E" strokeWidth="2" />
        <line x1="57" y1="69" x2="63" y2="69" stroke="#854D0E" strokeWidth="2" />
        {/* Leaves at top */}
        <path d="M40 22 C48 16 56 18 60 22" stroke="#16A34A" strokeWidth="2" />
        <path d="M38 18 C30 14 24 18 20 22" stroke="#16A34A" strokeWidth="2" />
        {/* Farmer figure silhouette */}
        <circle cx="50" cy="42" r="7" fill="#854D0E" />
        <path d="M42 58 C42 50 58 50 58 58 L58 84 L42 84 Z" fill="#854D0E" />
      </svg>
    );
  }

  if (norm.includes('INC') || norm.includes('HAND')) {
    // Open Hand
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#EFF6FF" rx="6" />
        {/* Palm & 5 Fingers */}
        <path
          d="M32 78 L32 50 C32 46 25 46 25 54 L25 60 L24 60 C20 60 16 55 20 48 L28 32 C30 28 36 29 36 34 L36 24 C36 19 43 19 43 24 L43 20 C43 15 50 15 50 20 L50 24 C50 19 57 19 57 24 L57 32 C57 28 64 28 64 34 L64 54 C64 66 58 78 50 78 Z"
          fill="#2563EB"
          stroke="#1E40AF"
          strokeWidth="2"
        />
        <line x1="38" y1="52" x2="38" y2="64" stroke="#DBEAFE" strokeWidth="1.5" />
        <line x1="45" y1="48" x2="45" y2="64" stroke="#DBEAFE" strokeWidth="1.5" />
        <line x1="52" y1="50" x2="52" y2="64" stroke="#DBEAFE" strokeWidth="1.5" />
      </svg>
    );
  }

  if (norm.includes('NOTA') || norm.includes('NONE')) {
    // NOTA Symbol (Electronic Ballot cross)
    return (
      <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" fill="#F8FAFC" rx="6" stroke="#94A3B8" strokeWidth="2" />
        <rect x="20" y="25" width="60" height="50" rx="3" stroke="#0F172A" strokeWidth="3" fill="#FFFFFF" />
        <line x1="28" y1="35" x2="72" y2="65" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
        <line x1="72" y1="35" x2="28" y2="65" stroke="#DC2626" strokeWidth="5" strokeLinecap="round" />
        <text x="50" y="88" textAnchor="middle" fontSize="11" fontWeight="bold" fill="#0F172A" fontFamily="sans-serif">
          NOTA
        </text>
      </svg>
    );
  }

  // Fallback generic seal
  return (
    <div className={`${className} bg-slate-100 rounded-lg flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-300`}>
      {abbreviation || 'IND'}
    </div>
  );
};
