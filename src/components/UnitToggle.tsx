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
    <div className={cn("inline-flex items-center p-0.5 rounded-[4px] bg-[#080808] border border-[#292929] select-none", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChange(unitA);
        }}
        className={cn(
          "rounded-[3px] font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer",
          size === 'sm' ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-xs",
          isA
            ? "bg-brand-primary text-black font-extrabold"
            : "text-[#A1A1A1] hover:text-white"
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
          "rounded-[3px] font-sans font-bold uppercase tracking-wider transition-colors cursor-pointer",
          size === 'sm' ? "px-2 py-0.5 text-[9px]" : "px-3 py-1 text-xs",
          !isA
            ? "bg-brand-primary text-black font-extrabold"
            : "text-[#A1A1A1] hover:text-white"
        )}
      >
        {labelB || unitB.toUpperCase()}
      </button>
    </div>
  );
}
