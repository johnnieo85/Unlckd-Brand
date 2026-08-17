import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'pro' | 'active' | 'neutral' | 'warning' | 'danger' | 'coach';
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'neutral', 
  className, 
  ...props 
}) => {
  const variants = {
    // Pro/Success: Active green token
    pro: 'bg-[#00DFA2]/10 text-[#00DFA2] border-[#00DFA2]/30',
    active: 'bg-[#00DFA2]/10 text-[#00DFA2] border-[#00DFA2]/30',
    // Neutral/Tag: Precision gray token
    neutral: 'bg-[#171717] text-[#A1A1A1] border-[#292929]',
    // Warning/Tier: Amber token
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    // Danger/Restricted: Red token
    danger: 'bg-red-500/10 text-red-400 border-red-500/30',
    // Coach/Specialty: Purple token
    coach: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
  };

  return (
    <span 
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-[3px] text-[10px] font-bold uppercase tracking-wider border select-none font-sans",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
