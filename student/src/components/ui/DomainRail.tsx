import React from 'react';
import clsx from 'clsx';
import { Globe, ChevronRight, Compass } from 'lucide-react';
import type { Domain } from '../../types';

/* =============================================================================
   DomainRail — a richer, visually distinct domains sidebar for the Explore page.

   Unlike the generic `Sidebar` (plain text rows), each domain here is a proper
   tile: a coloured initial avatar, the domain name, and an active-state accent
   bar on the left. It reads as a curated navigation rail rather than a list of
   divs — sticky on desktop so it stays in view while the catalog scrolls.
   ============================================================================= */

/** Rotating accent palette (bg + text) for the domain avatars. */
const ACCENTS = [
  { dot: 'bg-primary-500',     soft: 'bg-primary-50 text-primary-500',       bar: 'bg-primary-500' },
  { dot: 'bg-success',         soft: 'bg-success-soft text-success',         bar: 'bg-success' },
  { dot: 'bg-achievement',     soft: 'bg-achievement-soft text-achievement', bar: 'bg-achievement' },
  { dot: 'bg-warning',         soft: 'bg-warning-soft text-warning',         bar: 'bg-warning' },
  { dot: 'bg-danger',          soft: 'bg-danger-soft text-danger',           bar: 'bg-danger' },
];

interface DomainRailProps {
  domains: Domain[];
  /** Selected domain id ('' = All Domains). */
  activeId: string;
  onSelect: (id: string) => void;
  /** Loading placeholder count. */
  loading?: boolean;
  className?: string;
  /**
   * When true, renders only the inner list (no `.card` chrome, no sticky
   * wrapper). Use this when embedding the rail inside an existing card/column
   * that already owns the border, padding and scroll — e.g. the Explore page's
   * filter column. Defaults to false (standalone card rail).
   */
  bare?: boolean;
}

export const DomainRail: React.FC<DomainRailProps> = ({
  domains,
  activeId,
  onSelect,
  loading = false,
  className,
  bare = false,
}) => {
  const body = (
    <>
      {/* Rail header */}
      <div className="flex items-center gap-2 px-2 pt-1 pb-3">
        <Compass size={15} className="text-primary-500" aria-hidden="true" />
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Domains
        </p>
        <span className="ml-auto text-[11px] font-medium text-text-muted">
          {domains.length}
        </span>
      </div>

      <nav className="space-y-1" aria-label="Filter by domain">
        {/* All Domains */}
        <RailButton
          active={!activeId}
          label="All Domains"
          onClick={() => onSelect('')}
          leading={
            <span className="w-8 h-8 rounded-lg bg-surface-soft flex items-center justify-center shrink-0">
              <Globe size={15} className="text-text-secondary" aria-hidden="true" />
            </span>
          }
          barClass="bg-text-primary"
        />

        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-2 py-2">
              <span className="w-8 h-8 rounded-lg ua-skeleton shrink-0" />
              <span className="h-3 rounded ua-skeleton flex-1" style={{ maxWidth: `${60 + ((i * 13) % 30)}%` }} />
            </div>
          ))
        ) : (
          domains.map((d, i) => {
            const a = ACCENTS[i % ACCENTS.length];
            return (
              <RailButton
                key={d.id}
                active={activeId === d.id}
                label={d.name}
                onClick={() => onSelect(d.id)}
                barClass={a.bar}
                leading={
                  <span
                    className={clsx(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
                      a.soft,
                    )}
                  >
                    {d.name[0]?.toUpperCase()}
                  </span>
                }
              />
            );
          })
        )}
      </nav>
    </>
  );

  // Bare mode: list only, host column supplies chrome + scroll.
  if (bare) {
    return <div className={clsx(className)}>{body}</div>;
  }

  return (
    <aside className={clsx('lg:w-64 shrink-0', className)}>
      <div className="card p-3 lg:sticky lg:top-4">{body}</div>
    </aside>
  );
};

const RailButton: React.FC<{
  active: boolean;
  label: string;
  leading: React.ReactNode;
  barClass: string;
  onClick: () => void;
}> = ({ active, label, leading, barClass, onClick }) => (
  <button
    onClick={onClick}
    aria-current={active ? 'true' : undefined}
    title={label}
    className={clsx(
      'group relative w-full text-left flex items-center gap-2.5 pl-2.5 pr-2 py-2 rounded-[10px] transition-all duration-200',
      active ? 'bg-primary-50' : 'hover:bg-surface-soft',
    )}
  >
    {/* Active accent bar */}
    <span
      className={clsx(
        'absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full transition-all duration-200',
        barClass,
        active ? 'h-6 opacity-100' : 'h-0 opacity-0 group-hover:h-4 group-hover:opacity-40',
      )}
      aria-hidden="true"
    />
    {leading}
    <span
      className={clsx(
        'flex-1 min-w-0 truncate text-sm transition-colors',
        active ? 'font-semibold text-primary-500' : 'text-text-secondary group-hover:text-text-primary',
      )}
    >
      {label}
    </span>
    <ChevronRight
      size={15}
      aria-hidden="true"
      className={clsx(
        'shrink-0 transition-all duration-200',
        active
          ? 'text-primary-500 opacity-100'
          : 'text-text-muted opacity-0 -translate-x-1 group-hover:opacity-60 group-hover:translate-x-0',
      )}
    />
  </button>
);
