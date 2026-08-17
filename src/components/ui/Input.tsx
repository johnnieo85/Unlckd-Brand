import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            "w-full bg-[#111111] border border-[#292929] rounded-[4px] px-3.5 py-2.5 text-sm text-white placeholder:text-[#6C6C6C] transition-colors focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[10px] text-[#6C6C6C]">{hint}</p>}
        {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "w-full bg-[#111111] border border-[#292929] rounded-[4px] px-3.5 py-2.5 text-sm text-white placeholder:text-[#6C6C6C] transition-colors focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 disabled:opacity-40 disabled:cursor-not-allowed",
            error && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-[10px] text-[#6C6C6C]">{hint}</p>}
        {error && <p className="text-[11px] text-red-400 mt-1">{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

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
          <div className="w-4 h-4 border border-[#292929] bg-[#111111] rounded-[3px] group-hover:border-[#555] peer-checked:border-brand-primary peer-checked:bg-brand-primary transition-colors" />
          <svg
            className="absolute w-2.5 h-2.5 text-black opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none stroke-[3]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-xs font-semibold text-[#A1A1A1] group-hover:text-white transition-colors uppercase tracking-wider">{label}</span>
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, options, ...props }, ref) => {
    return (
      <div className="space-y-1.5 w-full">
        {label && (
          <label className="block text-[11px] font-bold uppercase tracking-wider text-[#A1A1A1]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          className={cn(
            "w-full bg-[#111111] border border-[#292929] rounded-[4px] px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary/30 transition-colors appearance-none",
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-[#111111] text-white">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
);

Select.displayName = 'Select';

