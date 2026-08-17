import React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  withArrow?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', withArrow = false, children, ...props }, ref) => {
    const variants = {
      // Primary: High contrast, restrained athletic styling, UNLCKD green, black bold text
      primary: 'bg-brand-primary text-black hover:bg-brand-accent font-bold tracking-wider uppercase border border-brand-primary/20 shadow-none',
      // Secondary: Subtle elevated surface with crisp border
      secondary: 'bg-[#171717] text-white hover:bg-[#222222] border border-[#292929] font-semibold tracking-wide uppercase',
      // Outline: Transparent background with precision border
      outline: 'bg-transparent border border-[#292929] text-[#A1A1A1] hover:text-white hover:border-[#444444] hover:bg-[#111111] font-semibold tracking-wide uppercase',
      // Ghost: Minimalist surface
      ghost: 'bg-transparent text-[#A1A1A1] hover:text-white hover:bg-[#171717] font-semibold tracking-wide',
      // Destructive: Subtle red warning
      destructive: 'bg-[#2a1215] text-[#ff6b6b] hover:bg-[#3a171b] border border-[#4a181d] font-semibold tracking-wide uppercase',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs rounded-[4px] gap-1.5',
      md: 'px-5 py-2.5 text-xs sm:text-sm rounded-[4px] gap-2',
      lg: 'px-7 py-3.5 text-sm sm:text-base rounded-[6px] gap-2.5',
      icon: 'p-2 rounded-[4px]',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center transition-colors select-none cursor-pointer active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand-primary',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
        {withArrow && <ArrowRight className="w-3.5 h-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />}
      </button>
    );
  }
);

Button.displayName = 'Button';

