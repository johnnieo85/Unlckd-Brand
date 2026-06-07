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
      container: 'w-8 h-8 rounded-lg',
      icon: 'w-5 h-5',
      text: 'text-base'
    },
    md: {
      container: 'w-10 h-10 rounded-lg',
      icon: 'w-6 h-6',
      text: 'text-2xl'
    },
    lg: {
      container: 'w-12 h-12 rounded-xl',
      icon: 'w-8 h-8',
      text: 'text-3xl'
    }
  };

  return (
    <div 
      className={cn("flex items-center gap-3 cursor-pointer group", className)}
      onClick={onClick}
    >
      <div className={cn(
        sizeClasses[size].container,
        "bg-brand-primary flex items-center justify-center shadow-lg shadow-brand-primary/20 group-hover:scale-105 transition-transform print:bg-black print:text-white",
        iconClassName
      )}>
        <Activity className={cn(sizeClasses[size].icon, "text-brand-dark print:text-white")} />
      </div>
      <span className={cn(
        "font-display font-bold tracking-tight uppercase group-hover:text-brand-primary transition-colors print:text-black",
        sizeClasses[size].text,
        textClassName
      )}>
        UNLCKD <span className="text-brand-primary">Pro</span>
      </span>
    </div>
  );
};
