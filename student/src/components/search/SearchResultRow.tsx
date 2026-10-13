import React from 'react';
import clsx from 'clsx';
import { SEARCH_TYPES } from './config';
import type { SearchResultItem } from './types';

/* =============================================================================
   SearchResultRow — renders one search hit as a clickable row. Type-agnostic:
   it reads icon/accent/label from the SEARCH_TYPES registry so every resource
   kind is presented consistently.
   ============================================================================= */

interface Props {
  item: SearchResultItem;
  /** Highlighted (keyboard-nav) state. */
  active?: boolean;
  onSelect: (item: SearchResultItem) => void;
  onMouseEnter?: () => void;
}

/** Wrap occurrences of `term` in the text with a highlight span. */
function highlight(text: string, term: string): React.ReactNode {
  if (!term) return text;
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary-100 text-primary-600 rounded px-0.5">
        {text.slice(idx, idx + term.length)}
      </mark>
      {text.slice(idx + term.length)}
    </>
  );
}

export const SearchResultRow: React.FC<Props & { term?: string }> = ({
  item, active, onSelect, onMouseEnter, term = '',
}) => {
  const cfg = SEARCH_TYPES[item.type];
  const Icon = cfg.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      onMouseEnter={onMouseEnter}
      className={clsx(
        'w-full flex items-start gap-3 px-3 py-2.5 rounded-[10px] text-left transition',
        active ? 'bg-surface-soft' : 'hover:bg-surface-soft',
      )}
    >
      <span className={clsx('mt-0.5 shrink-0', cfg.accent)}>
        <Icon size={17} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-primary truncate">
            {highlight(item.title, term)}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted shrink-0">
            {cfg.label}
          </span>
        </span>
        {item.subtitle && (
          <span className="block text-xs text-text-secondary truncate">
            {item.subtitle}
          </span>
        )}
        {item.snippet && (
          <span className="block text-xs text-text-muted truncate mt-0.5">
            {item.snippet}
          </span>
        )}
      </span>
    </button>
  );
};
