import React from 'react';
import clsx from 'clsx';

interface ProgressBarProps {
  value: number;        // 0–100
  className?: string;
  /** Any background token/utility, defaults to the brand fill. */
  color?: string;
  /** Height utility, e.g. 'h-1.5' | 'h-2.5'. */
  height?: string;
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  className,
  color,
  height = 'h-1.5',
  animate = true,
}) => (
  <div className={clsx('ua-progress', height, className)}>
    <div
      className={clsx('ua-progress__fill', height, color, !animate && 'transition-none')}
      style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
    />
  </div>
);
