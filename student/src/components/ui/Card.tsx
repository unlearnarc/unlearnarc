import React from 'react';
import clsx from 'clsx';

/* =============================================================================
   Card — generic surface primitive.
   Wraps the token-driven `.ua-card` class and optionally renders as a RouterLink
   or anchor via the `as` escape hatch. Use `interactive` for the hover-lift.
   ============================================================================= */

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Larger radius variant for hero / profile surfaces. */
  size?: 'md' | 'lg';
  /** Adds the hover lift + shadow used by clickable cards. */
  interactive?: boolean;
  /** Removes the default shadow. */
  flat?: boolean;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  size = 'md',
  interactive = false,
  flat = false,
  className,
  children,
  ...rest
}) => (
  <div
    className={clsx(
      size === 'lg' ? 'ua-card--lg' : 'ua-card',
      flat && 'ua-card--flat',
      interactive && 'hover:-translate-y-1 transition-all duration-200 cursor-pointer',
      className
    )}
    {...rest}
  >
    {children}
  </div>
);
