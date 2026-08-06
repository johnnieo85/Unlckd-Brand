import React from 'react';
import { cn } from '../lib/utils';

interface UnitToggleProps<T extends string> {
  unitA: T;
  unitB: T;
  labelA?: string;
  labelB?: string;
  value: T;
  onChange: (newValue: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function UnitToggle<T extends string>({
  unitA,
  unitB,
  labelA,
  labelB,
  value,
  onChange,
  className,
  size = 'md'
}: UnitToggleProps<T>) {
  const isA = value === unitA;

  return (
    <div className={cn("inline-flex items-center gap-1 p-0.5 rounded-full bg-black/60 border border-white/10 select-none", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(unitA);
        }}
        className={cn(
          "rounded-full font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer",
          size === 'sm' ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-xs",
          isA
            ? "bg-emerald-500 text-brand-dark shadow-md shadow-emerald-500/20 font-black"
            : "text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
        )}
      >
        {labelA || unitA.toUpperCase()}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(unitB);
        }}
        className={cn(
          "rounded-full font-mono font-black uppercase tracking-wider transition-all duration-200 cursor-pointer",
          size === 'sm' ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-xs",
          !isA
            ? "bg-emerald-500 text-brand-dark shadow-md shadow-emerald-500/20 font-black"
            : "text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
        )}
      >
        {labelB || unitB.toUpperCase()}
      </button>
    </div>
  );
}
