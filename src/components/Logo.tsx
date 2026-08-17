import React from 'react';
import { cn } from '../lib/utils';

export interface LogoProps {
  className?: string;
  imgClassName?: string;
  textClassName?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  alt?: string;
  showSubtitle?: boolean;
  subtitle?: string;
}

export const LOGO_ASSET_URL = 'https://unlckdprotrainer.com/assets/unlckd-pro-logo.png';

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  imgClassName,
  textClassName,
  onClick,
  size = 'md',
  alt = 'UNLCKD PRO',
  showSubtitle = true,
  subtitle = 'Pro Trainer'
}) => {
  // Responsive scaling:
  // Mobile: ~115–140px wide
  // Desktop: ~150–180px wide
  const sizeClasses = {
    sm: 'w-[105px] sm:w-[120px] lg:w-[135px]',
    md: 'w-[115px] sm:w-[135px] md:w-[150px] lg:w-[165px]',
    lg: 'w-[130px] sm:w-[150px] md:w-[170px] lg:w-[185px]'
  };

  const subtitleClasses = {
    sm: 'text-[11px] sm:text-xs',
    md: 'text-xs sm:text-sm',
    lg: 'text-sm sm:text-base'
  };

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none bg-transparent border-0 outline-none shadow-none p-0 m-0 group", 
        className
      )}
      onClick={onClick}
    >
      <img
        src="https://unlckdprotrainer.com/assets/unlckd-pro-logo.png"
        alt={alt}
        loading="eager"
        decoding="async"
        // @ts-ignore
        fetchPriority="high"
        className={cn(
          sizeClasses[size],
          "h-auto max-h-8 sm:max-h-10 md:max-h-11 object-contain bg-transparent border-0 outline-none shadow-none transition-transform duration-150 group-hover:opacity-95 active:scale-[0.99]",
          imgClassName
        )}
        style={{
          background: 'transparent',
          border: 'none',
          boxShadow: 'none'
        }}
      />
      {showSubtitle && (
        <div className="flex items-center pl-2 sm:pl-2.5 border-l border-[#292929]">
          <span className={cn(
            "font-display font-bold uppercase tracking-wider text-[#D1D1D1] group-hover:text-brand-primary transition-colors whitespace-nowrap",
            subtitleClasses[size],
            textClassName
          )}>
            {subtitle}
          </span>
        </div>
      )}
    </div>
  );
};
