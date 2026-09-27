import React from 'react';
import pnpIcon from '../assets/pnp_icon_transparent.png';

interface BrandLogoBadgeProps {
  logoUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BrandLogoBadge: React.FC<BrandLogoBadgeProps> = ({
  logoUrl,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-16 w-16 rounded-2xl',
    md: 'h-20 w-20 rounded-2xl',
    lg: 'h-28 w-28 rounded-3xl',
    xl: 'h-32 w-32 rounded-3xl',
  }[size];

  const activeLogo = logoUrl || pnpIcon;

  return (
    <div
      className={`${sizeClasses} bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 p-1.5 flex items-center justify-center shadow-lg shadow-red-500/20 text-white shrink-0 ring-1 ring-white/15 hover:ring-red-500/40 transition-all ${className}`}
    >
      <img
        src={activeLogo}
        alt="PNP Tech Traders Logo"
        className="h-full w-full object-contain filter drop-shadow"
      />
    </div>
  );
};
