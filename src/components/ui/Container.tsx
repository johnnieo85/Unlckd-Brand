import React from 'react';
import { cn } from '../../lib/utils';

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  size = 'lg',
  className,
  ...props
}) => {
  const sizes = {
    sm: 'max-w-3xl',
    md: 'max-w-5xl',
    lg: 'max-w-7xl',
    xl: 'max-w-screen-2xl',
    full: 'max-w-full',
  };

  return (
    <div
      className={cn(
        "w-full mx-auto px-4 sm:px-6 lg:px-8",
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  withBorder?: boolean;
}

export const Section: React.FC<SectionProps> = ({
  children,
  spacing = 'lg',
  withBorder = false,
  className,
  ...props
}) => {
  const spacings = {
    sm: 'py-6 sm:py-8',
    md: 'py-8 sm:py-12',
    lg: 'py-12 sm:py-16',
    xl: 'py-16 sm:py-24',
  };

  return (
    <section
      className={cn(
        spacings[spacing],
        withBorder && "border-b border-[#292929]",
        className
      )}
      {...props}
    >
      {children}
    </section>
  );
};
