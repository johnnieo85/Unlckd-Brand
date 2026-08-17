import React from 'react';
import { Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  iconClassName,
  textClassName, 
  onClick,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: {
      container: 'w-7 h-7 rounded-[3px]',
      icon: 'w-4 h-4',
      text: 'text-lg'
    },
    md: {
      container: 'w-9 h-9 rounded-[4px]',
      icon: 'w-5 h-5',
      text: 'text-2xl'
    },
    lg: {
      container: 'w-11 h-11 rounded-[4px]',
      icon: 'w-6 h-6',
      text: 'text-3xl'
    }
  };

  return (
    <div 
      className={cn("flex items-center gap-2.5 cursor-pointer group select-none", className)}
      onClick={onClick}
    >
      <div className={cn(
        sizeClasses[size].container,
        "bg-brand-primary flex items-center justify-center transition-transform group-hover:scale-102 print:bg-black print:text-white",
        iconClassName
      )}>
        <Activity className={cn(sizeClasses[size].icon, "text-black print:text-white stroke-[2.5]")} />
      </div>
      <span className={cn(
        "font-display font-extrabold tracking-normal uppercase transition-colors print:text-black leading-none",
        sizeClasses[size].text,
        textClassName
      )}>
        UNLCKD <span className="text-brand-primary">PRO</span>
      </span>
    </div>
  );
};

