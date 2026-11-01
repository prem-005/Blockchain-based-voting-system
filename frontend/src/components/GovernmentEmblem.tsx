import React from 'react';

export const GovernmentEmblem: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => {
  return (
    <div className={`${className} flex-shrink-0 flex items-center justify-center`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xs" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Outer Circular Seal Rim */}
        <circle cx="50" cy="50" r="47" stroke="#102A56" strokeWidth="2.5" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="43" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="2 2" fill="none" />
        
        {/* Gopuram / Temple Tower Silhouette (Tamil Nadu Emblem Hallmark) */}
        <path d="M43 72 L57 72 L55 35 L45 35 Z" fill="#102A56" />
        {/* Tiers of Gopuram */}
        <line x1="41" y1="65" x2="59" y2="65" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="42" y1="56" x2="58" y2="56" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="43" y1="47" x2="57" y2="47" stroke="#FFFFFF" strokeWidth="1" />
        <line x1="44" y1="40" x2="56" y2="40" stroke="#FFFFFF" strokeWidth="1" />
        
        {/* Kalasam finials at crest */}
        <circle cx="47" cy="33" r="1.5" fill="#102A56" />
        <circle cx="50" cy="31" r="2" fill="#D97706" />
        <circle cx="53" cy="33" r="1.5" fill="#102A56" />
        
        {/* Ashoka Chakra & Lions Base Motif */}
        <path d="M30 76 L70 76 L68 82 L32 82 Z" fill="#D97706" />
        <circle cx="50" cy="79" r="2.5" fill="#FFFFFF" stroke="#102A56" strokeWidth="0.8" />
        
        {/* Laurel Wreath Border */}
        <path d="M22 65 C18 48 24 32 38 22" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M78 65 C82 48 76 32 62 22" stroke="#15803D" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    </div>
  );
};
