import React from 'react';
import clsx from 'clsx';

/* =============================================================================
   InitialsBadge — circular initials chip used everywhere a learner identity is
   shown (podium, ranking list, "your standing" card). Deliberately NO avatar
   images: we only ever render the first letter of the trimmed name.

   Fallback rules (per spec):
     • trim leading/trailing whitespace before extracting the initial
     • empty / missing name → neutral "?"
     • always uppercase, always centered
   ============================================================================= */

export type InitialsSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface InitialsBadgeProps {
  /** Full learner name; only the first letter is used. */
  name?: string | null;
  size?: InitialsSize;
  /** Visual tone — brand blue (default) or cyan accent. */
  tone?: 'blue' | 'cyan';
  /** Extra ring / emphasis colour (e.g. gold for #1). */
  ringClassName?: string;
  className?: string;
}

/** First letter of a (trimmed) name, uppercased; "?" when unavailable. */
export const initialOf = (name?: string | null): string => {
  const first = (name ?? '').trim().charAt(0);
  return first ? first.toUpperCase() : '?';
};

const SIZES: Record<InitialsSize, string> = {
  xs: 'w-7 h-7 text-xs',
  sm: 'w-9 h-9 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-20 h-20 text-2xl',
};

const TONES: Record<NonNullable<InitialsBadgeProps['tone']>, string> = {
  blue: 'bg-gradient-to-br from-primary-500 to-primary-700 text-white',
  cyan: 'bg-gradient-to-br from-accent-cyan to-primary-500 text-white',
};

export const InitialsBadge: React.FC<InitialsBadgeProps> = ({
  name,
  size = 'sm',
  tone = 'blue',
  ringClassName,
  className,
}) => (
  <div
    aria-hidden="true"
    className={clsx(
      'rounded-full flex items-center justify-center font-bold select-none shrink-0',
      SIZES[size],
      TONES[tone],
      ringClassName,
      className,
    )}
  >
    {initialOf(name)}
  </div>
);
