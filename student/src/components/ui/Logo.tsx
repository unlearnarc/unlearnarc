import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import logoUrl from '../../assets/logo.jpeg';

/* =============================================================================
   Logo — the single, shared UnlearnArc brand mark.

   Use this everywhere the logo/wordmark appears (sidebar, top bars, landing
   nav/footer, login panels) so the brand stays consistent and updating the
   image only requires swapping one asset.

   Props
   -----
   • to           — when set, wraps the logo in a <Link> (e.g. "/" ).
   • showWordmark — render the "UnlearnArc" text next to the mark (default true).
   • size         — mark size preset: 'sm' | 'md' | 'lg'.
   • onDark       — use light wordmark text for dark/charcoal backgrounds.
   • className    — extra classes on the outer element.
   ============================================================================= */

type LogoSize = 'sm' | 'md' | 'lg';

interface LogoProps {
  to?: string;
  showWordmark?: boolean;
  size?: LogoSize;
  onDark?: boolean;
  className?: string;
  onClick?: () => void;
}

const MARK_SIZE: Record<LogoSize, string> = {
  sm: 'w-7 h-7 rounded-lg',
  md: 'w-8 h-8 rounded-lg',
  lg: 'w-10 h-10 rounded-xl',
};

const TEXT_SIZE: Record<LogoSize, string> = {
  sm: 'text-[15px]',
  md: 'text-[17px]',
  lg: 'text-lg',
};

export const Logo: React.FC<LogoProps> = ({
  to,
  showWordmark = true,
  size = 'md',
  onDark = false,
  className,
  onClick,
}) => {
  const content = (
    <span dir="ltr" className={clsx('flex items-center gap-2.5 min-w-0 ua-force-ltr', className)}>
      <img
        src={logoUrl}
        alt="UnlearnArc"
        className={clsx(MARK_SIZE[size], 'object-cover shrink-0')}
      />
      {showWordmark && (
        <span
          className={clsx(
            TEXT_SIZE[size],
            'font-bold tracking-tight truncate',
            onDark ? 'text-white' : 'text-text-primary',
          )}
        >
          UnlearnArc
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} onClick={onClick} className="min-w-0">
        {content}
      </Link>
    );
  }
  return content;
};
