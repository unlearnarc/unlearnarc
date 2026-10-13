import React from 'react';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';

/* =============================================================================
   Sidebar — reusable filter / navigation rail used across Explore, Tests, etc.
   Token-driven, works as a card-style aside on any page.
   ============================================================================= */

export interface SidebarItem {
  id: string;
  label: string;
  /** Optional leading icon component. */
  icon?: LucideIcon;
  /** Optional single-character avatar (used when no icon is supplied). */
  initial?: string;
  /** Tailwind text/colour utility for the initial/icon, e.g. 'text-success'. */
  accent?: string;
}

interface SidebarProps {
  /** Small uppercase heading shown above the list. */
  title?: string;
  items: SidebarItem[];
  /** Currently selected item id (''/undefined = none / "all"). */
  activeId?: string;
  onSelect: (id: string) => void;
  /** Optional "All …" entry rendered at the top. */
  allOption?: { label: string; icon?: LucideIcon };
  className?: string;
}

const ACCENTS = [
  'text-primary-500',
  'text-success',
  'text-achievement',
  'text-warning',
  'text-danger',
];

export const Sidebar: React.FC<SidebarProps> = ({
  title,
  items,
  activeId = '',
  onSelect,
  allOption,
  className,
}) => (
  <aside className={clsx('lg:w-56 shrink-0', className)}>
    <div className="card p-4">
      {title && (
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
          {title}
        </p>
      )}
      <div className="space-y-1">
        {allOption && (
          <SidebarButton
            active={!activeId}
            icon={allOption.icon}
            label={allOption.label}
            onClick={() => onSelect('')}
          />
        )}
        {items.map((item, i) => (
          <SidebarButton
            key={item.id}
            active={activeId === item.id}
            icon={item.icon}
            initial={item.initial ?? item.label[0]?.toUpperCase()}
            accent={item.accent ?? ACCENTS[i % ACCENTS.length]}
            label={item.label}
            onClick={() => onSelect(item.id)}
          />
        ))}
      </div>
    </div>
  </aside>
);

const SidebarButton: React.FC<{
  active: boolean;
  label: string;
  icon?: LucideIcon;
  initial?: string;
  accent?: string;
  onClick: () => void;
}> = ({ active, label, icon: Icon, initial, accent, onClick }) => (
  <button
    onClick={onClick}
    className={clsx(
      'w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-sm transition',
      active
        ? 'bg-primary-50 text-primary-500 font-medium'
        : 'text-text-secondary hover:bg-surface-soft'
    )}
  >
    {Icon ? (
      <Icon size={14} />
    ) : (
      <span className={clsx('text-xs font-bold w-4 text-center', !active && accent)}>
        {initial}
      </span>
    )}
    <span className="truncate">{label}</span>
  </button>
);
