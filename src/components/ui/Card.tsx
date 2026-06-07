import React from 'react';
import { cn } from '../../lib/utils';

export const Card = ({ className, children, onClick, id }: { className?: string; children: React.ReactNode; onClick?: () => void; id?: string }) => (
  <div 
    id={id}
    className={cn("bg-brand-surface border border-gray-800 rounded-xl overflow-hidden", className)}
    onClick={onClick}
  >
    {children}
  </div>
);

export const Badge = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary border border-brand-primary/20", className)}>
    {children}
  </span>
);
