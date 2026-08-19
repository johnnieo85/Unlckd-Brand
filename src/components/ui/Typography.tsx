import React from 'react';
import { cn } from '../../lib/utils';

interface TypographyProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div' | 'p' | 'span';
}

/**
 * Hero / Page Statement Headline
 * Scale: 48–72px desktop (32–48px mobile)
 * Font: Barlow Condensed, uppercase, athletic tracking
 */
export const DisplayHeading: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h1',
  ...props 
}) => {
  return (
    <Component 
      className={cn(
        "font-display font-extrabold uppercase tracking-tight text-white text-3xl sm:text-5xl lg:text-6xl leading-[0.95]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * Section Heading
 * Scale: 24–32px
 * Font: Barlow Condensed, uppercase, bold
 */
export const SectionHeading: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2',
  ...props 
}) => {
  return (
    <Component 
      className={cn(
        "font-display font-bold uppercase tracking-normal text-white text-xl sm:text-2xl lg:text-3xl leading-none",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * Content Heading
 * Scale: 16–20px
 * Font: Inter / Sans, font-bold
 */
export const ContentHeading: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h3',
  ...props 
}) => {
  return (
    <Component 
      className={cn(
        "font-sans font-bold text-white text-base sm:text-lg leading-snug",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
};

/**
 * Primary Metric Display
 * Scale: 40–64px
 * Font: Barlow Condensed, tabular nums, high impact
 */
export const MetricDisplay: React.FC<{
  value: React.ReactNode;
  unit?: React.ReactNode;
  label?: React.ReactNode;
  className?: string;
}> = ({ value, unit, label, className }) => {
  return (
    <div className={cn("flex flex-col w-full", className)}>
      {label && (
        <div className="w-full">
          {typeof label === 'string' ? (
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#6C6C6C] mb-0.5 block">
              {label}
            </span>
          ) : (
            label
          )}
        </div>
      )}
      <div className="flex items-baseline gap-1.5 min-w-0">
        <span className="font-display font-black text-white text-3xl sm:text-4xl lg:text-5xl tracking-tight tabular-nums leading-none shrink-0">
          {value}
        </span>
        {unit && (
          <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#A1A1A1] truncate">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

/**
 * Metadata / Micro Label
 * Scale: 10–12px uppercase with increased letter spacing
 */
export const MetadataLabel: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({
  children,
  className,
  ...props
}) => {
  return (
    <span
      className={cn(
        "text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-[#6C6C6C] select-none",
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

/**
 * Horizontal Divider
 * Restrained #292929 line for clean separation instead of nesting cards
 */
export const Divider: React.FC<React.HTMLAttributes<HTMLHRElement>> = ({
  className,
  ...props
}) => {
  return (
    <hr
      className={cn("border-0 border-t border-[#292929] my-6 sm:my-8", className)}
      {...props}
    />
  );
};
