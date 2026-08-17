import React from 'react';
import { cn } from '../../lib/utils';
export { Badge } from './Badge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outline' | 'subtle';
}

export const Card = ({ 
  className, 
  variant = 'default',
  children, 
  onClick, 
  id,
  ...props
}: CardProps) => {
  const variants = {
    // Default surface: Subtle background, clean border, no heavy glow
    default: 'bg-[#111111] border border-[#292929]',
    // Elevated: Slightly lighter for floating modules
    elevated: 'bg-[#171717] border border-[#292929]',
    // Outline: Transparent with clean border
    outline: 'bg-transparent border border-[#292929]',
    // Subtle: Minimal background without border
    subtle: 'bg-[#111111]',
  };

  return (
    <div 
      id={id}
      className={cn(
        "rounded-[6px] overflow-hidden text-white transition-colors",
        variants[variant],
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
};

