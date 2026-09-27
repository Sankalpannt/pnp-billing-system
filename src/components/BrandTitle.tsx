import React from 'react';

interface BrandTitleProps {
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  isPrintFriendly?: boolean;
  className?: string;
  showAccentBar?: boolean;
}

export const BrandTitle: React.FC<BrandTitleProps> = ({
  name = 'PNP TECH TRADERS',
  size = 'md',
  isPrintFriendly = false,
  className = '',
  showAccentBar = false,
}) => {
  const brandName = (name || 'PNP TECH TRADERS').trim();

  // Size styling map (+2 steps bigger across all tiers)
  const sizeClasses = {
    xs: 'text-sm sm:text-base',
    sm: 'text-base sm:text-lg',
    md: 'text-lg sm:text-xl md:text-2xl',
    lg: 'text-xl sm:text-2xl md:text-3xl',
    xl: 'text-2xl sm:text-3xl md:text-4xl',
    '2xl': 'text-3xl sm:text-4xl md:text-5xl',
  }[size];

  const upper = brandName.toUpperCase();

  // If the brand name starts with PNP, split into fiery red (PNP TECH) and electric blue (TRADERS)
  if (upper.startsWith('PNP')) {
    let pnpTechPart = '';
    let tradersPart = '';

    if (upper.startsWith('PNP TECH')) {
      pnpTechPart = brandName.slice(0, 8); // 'PNP TECH'
      tradersPart = brandName.slice(8).trim(); // 'TRADERS' or remainder
    } else {
      const parts = brandName.split(/\s+/);
      if (parts.length >= 2 && parts[1].toUpperCase() === 'TECH') {
        pnpTechPart = `${parts[0]} ${parts[1]}`;
        tradersPart = parts.slice(2).join(' ');
      } else {
        pnpTechPart = parts[0];
        tradersPart = parts.slice(1).join(' ');
      }
    }

    return (
      <span className={`inline-flex flex-col ${className}`}>
        <span className={`font-black tracking-wide ${sizeClasses} inline-flex flex-wrap items-center gap-1.5 sm:gap-2 leading-tight select-none`}>
          {/* Red Gradient for PNP TECH */}
          <span
            className={`font-black tracking-wider ${
              isPrintFriendly
                ? 'text-red-600 bg-gradient-to-r from-red-600 via-rose-600 to-red-500 bg-clip-text text-transparent print:text-red-600 print:bg-none'
                : 'text-red-500 bg-gradient-to-r from-red-500 via-rose-500 to-red-400 bg-clip-text text-transparent drop-shadow-[0_1px_3px_rgba(239,68,68,0.35)]'
            }`}
          >
            {pnpTechPart}
          </span>
          {/* Blue Gradient for TRADERS */}
          {tradersPart && (
            <span
              className={`font-black tracking-wide ${
                isPrintFriendly
                  ? 'text-blue-600 bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent print:text-blue-600 print:bg-none'
                  : 'text-sky-400 bg-gradient-to-r from-blue-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent drop-shadow-[0_1px_3px_rgba(59,130,246,0.35)]'
              }`}
            >
              {tradersPart}
            </span>
          )}
        </span>
        {showAccentBar && (
          <span className="h-[2.5px] w-full max-w-[200px] bg-gradient-to-r from-red-600 via-rose-500 to-blue-600 rounded-full my-1.5 print:bg-gradient-to-r block" />
        )}
      </span>
    );
  }

  // Fallback for custom company names: rich red-to-blue mix gradient
  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className={`font-black tracking-wide ${sizeClasses} leading-tight select-none`}>
        <span
          className={`font-black ${
            isPrintFriendly
              ? 'text-red-600 bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 bg-clip-text text-transparent print:text-red-600 print:bg-none'
              : 'bg-gradient-to-r from-red-500 via-purple-400 to-blue-400 bg-clip-text text-transparent drop-shadow-[0_1px_3px_rgba(239,68,68,0.25)]'
          }`}
        >
          {brandName}
        </span>
      </span>
      {showAccentBar && (
        <span className="h-[2.5px] w-full max-w-[200px] bg-gradient-to-r from-red-600 via-purple-600 to-blue-600 rounded-full my-1.5 print:bg-gradient-to-r block" />
      )}
    </span>
  );
};
