import React from 'react';
import { cn } from '../../lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && <label className="text-sm font-medium text-gray-400">{label}</label>}
        <input
          ref={ref}
          className={cn(
            "w-full bg-brand-surface border border-gray-800 rounded-lg px-4 py-2.5 text-base text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, ...props }, ref) => {
    return (
      <label className={cn("flex items-center gap-3 cursor-pointer group select-none", className)}>
        <div className="relative flex items-center justify-center">
          <input
            type="checkbox"
            ref={ref}
            className="peer sr-only"
            {...props}
          />
          <div className="w-5 h-5 border-2 border-gray-800 rounded group-hover:border-brand-primary/50 peer-checked:border-brand-primary peer-checked:bg-brand-primary transition-all" />
          <svg
            className="absolute w-3 h-3 text-brand-dark opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="4"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition-colors uppercase tracking-widest">{label}</span>
      </label>
    );
  }
);

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && <label className="text-sm font-medium text-gray-400">{label}</label>}
        <select
          ref={ref}
          className={cn(
            "w-full bg-brand-surface border border-gray-800 rounded-lg px-4 py-2.5 text-base text-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all appearance-none",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);
