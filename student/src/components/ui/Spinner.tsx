import React from 'react';
import clsx from 'clsx';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sz = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size];
  return (
    <div
      className={clsx(
        sz,
        'rounded-full border-2 border-border border-t-primary-500 animate-spin',
        className
      )}
    />
  );
};

export const PageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <Spinner size="lg" />
      <p className="ua-text-muted text-sm font-medium">Loading…</p>
    </div>
  </div>
);
