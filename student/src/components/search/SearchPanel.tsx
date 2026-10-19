import React, { useMemo, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Search, X, Loader2 } from 'lucide-react';
import type { SearchParams } from '../../api/endpoints';
import { useGlobalSearch } from './useGlobalSearch';
import { SearchResultRow } from './SearchResultRow';
import { SEARCH_TYPES, SEARCH_TYPE_ORDER } from './config';
import type { SearchResultItem, SearchTypeKey } from './types';

/* =============================================================================
   SearchPanel — the shared, reusable search surface used everywhere.

   It owns the input, the type-filter chips, the results list, keyboard
   navigation and empty/loading states. It does NOT own routing — the parent
   supplies `onSelect` (GlobalSearch navigates; a page can preview instead).

   Scoping a page's search is as simple as passing `lockedTypes` (hides chips
   and restricts results) and `baseParams` (extra filters like company/level).
   ============================================================================= */

export interface SearchPanelProps {
  /** Placeholder for the input. */
  placeholder?: string;
  /** Restrict search to these types only (page-scoped). Omit = search all. */
  lockedTypes?: SearchTypeKey[];
  /** Extra filters merged into every request (level, company, status...). */
  baseParams?: Omit<SearchParams, 'q' | 'types'>;
  /** Called when a result is chosen. */
  onSelect: (item: SearchResultItem) => void;
  /** Autofocus the input on mount. */
  autoFocus?: boolean;
  /** Render as a compact inline box (page search) vs. the full overlay list. */
  variant?: 'overlay' | 'inline';
  /** Controlled initial term. */
  initialTerm?: string;
  /** Fired on every keystroke so a parent can sync URL state if desired. */
  onTermChange?: (term: string) => void;
  /**
   * When true, the results/chips area is hidden entirely until the user has
   * typed something — no empty "type to search" placeholder is shown. The
   * results box only appears once there is an active query. Ideal for inline
   * page search where a resting empty panel would be noise.
   */
  hideWhenEmpty?: boolean;
  /**
   * Master switch — set false to pause all search requests (e.g. when the
   * parent dialog/panel is closed or unmounted). Defaults to true.
   */
  enabled?: boolean;
  /**
   * Minimum characters before a search fires. Defaults to 2 for overlay,
   * 1 for inline.
   */
  minChars?: number;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  placeholder = 'Search courses, topics, skills, companies…',
  lockedTypes,
  baseParams,
  onSelect,
  autoFocus,
  variant = 'overlay',
  initialTerm = '',
  onTermChange,
  hideWhenEmpty = false,
  enabled = true,
  minChars,
}) => {
  const [term, setTerm] = useState(initialTerm);
  const [activeChip, setActiveChip] = useState<SearchTypeKey | 'ALL'>('ALL');
  const [cursor, setCursor] = useState(0);
  // For the inline variant we render results as a floating dropdown. It opens
  // when the input is focused *and* there is an active query, and dismisses on
  // outside-click / Escape / selection.
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Which types to send to the backend:
  //   • page-scoped (lockedTypes) always wins and restricts to that slice
  //   • otherwise the user's chip selection (or all)
  const effectiveTypes = useMemo<SearchTypeKey[] | undefined>(() => {
    if (lockedTypes?.length) {
      return activeChip === 'ALL' ? lockedTypes : [activeChip];
    }
    return activeChip === 'ALL' ? undefined : [activeChip];
  }, [lockedTypes, activeChip]);

  // Effective min chars: caller-supplied > variant default (overlay=2, inline=1)
  const effectiveMinChars = minChars ?? (variant === 'overlay' ? 2 : 1);

  const { data, isFetching, isError, active } = useGlobalSearch({
    term,
    baseParams: { ...baseParams, types: effectiveTypes },
    // overlay uses a longer debounce to avoid hammering on rapid keystrokes
    debounceMs: variant === 'overlay' ? 350 : 250,
    minChars: effectiveMinChars,
    enabled,
  });

  // Flat, relevance-ranked list for the overlay (or restricted to active chip).
  const items = useMemo<SearchResultItem[]>(() => {
    if (!data) return [];
    if (activeChip !== 'ALL') {
      return data.groups.find(g => g.type === activeChip)?.items ?? [];
    }
    return data.flat?.length
      ? data.flat
      : data.groups.flatMap(g => g.items).sort((a, b) => b.score - a.score);
  }, [data, activeChip]);

  // Reset keyboard cursor whenever the result set changes.
  useEffect(() => { setCursor(0); }, [items.length, activeChip, term]);

  // The inline search renders its results as an absolute floating overlay.
  const floating = variant === 'inline';

  // Dismiss the floating dropdown on outside-click (overlay variant manages its
  // own lifecycle via the dialog, so this only runs for the inline/floating one).
  useEffect(() => {
    if (!floating || !open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [floating, open]);

  const handleTerm = (v: string) => {
    setTerm(v);
    onTermChange?.(v);
    if (floating) setOpen(true);
  };

  const handleSelect = (item: SearchResultItem) => {
    if (floating) setOpen(false);
    onSelect(item);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, items.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === 'Enter' && items[cursor]) { e.preventDefault(); handleSelect(items[cursor]); }
    else if (e.key === 'Escape' && floating) { setOpen(false); }
  };

  // Chips: when page-scoped, only show locked types; otherwise show all.
  const chipTypes = lockedTypes?.length ? lockedTypes : SEARCH_TYPE_ORDER;

  const groupCount = (t: SearchTypeKey) =>
    data?.groups.find(g => g.type === t)?.totalHits ?? 0;

  // Whether there is an active query to show results for. When `hideWhenEmpty`
  // is set, the resting empty state is suppressed entirely — chips and the
  // "type to search" placeholder only appear once the user has typed.
  const hasQuery = term.trim().length > 0;
  const suppressResting = hideWhenEmpty && !hasQuery;

  // Whether the floating results overlay should be shown right now.
  const showFloating = floating && open && active && (!hideWhenEmpty || hasQuery);

  return (
    <div
      ref={rootRef}
      className={clsx(
        'flex flex-col',
        // overlay: min-h-0 + flex-1 so the panel can fill the dialog box and
        // the results list can scroll inside it without expanding the container.
        floating ? 'relative' : (variant === 'overlay' ? 'min-h-0 flex-1' : 'gap-3'),
      )}
    >
      {/* Input */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          autoFocus={autoFocus}
          value={term}
          onChange={e => handleTerm(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => { if (floating && active) setOpen(true); }}
          placeholder={placeholder}
          role={floating ? 'combobox' : undefined}
          aria-expanded={floating ? showFloating : undefined}
          aria-controls={floating ? 'search-floating-results' : undefined}
          className="input pl-10 pr-9 h-11 text-sm"
        />
        {isFetching ? (
          <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted animate-spin" />
        ) : term ? (
          <button
            onClick={() => handleTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-text-primary"
            aria-label="Clear"
          >
            <X size={15} />
          </button>
        ) : null}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          FLOATING (inline) variant — chips + results live inside an absolutely
          positioned dropdown that overlays the page, anchored under the input.
          It only mounts when there's an active query and the panel is open. */}
      {floating ? (
        showFloating && (
          <div
            id="search-floating-results"
            role="listbox"
            className="absolute left-0 right-0 top-full z-40 mt-2 rounded-[14px] border border-border bg-surface shadow-hover animate-scale-in origin-top overflow-hidden"
          >
            {/* Chips */}
            {chipTypes.length > 1 && (
              <div className="flex gap-1.5 flex-wrap px-3 pt-3 pb-1 border-b border-border/60">
                <Chip active={activeChip === 'ALL'} label="All" onClick={() => setActiveChip('ALL')} />
                {chipTypes.map(t => (
                  <Chip
                    key={t}
                    active={activeChip === t}
                    label={SEARCH_TYPES[t].plural}
                    count={groupCount(t)}
                    onClick={() => setActiveChip(t)}
                  />
                ))}
              </div>
            )}

            {/* Results */}
            <div className="max-h-[min(60vh,420px)] overflow-y-auto p-1 space-y-0.5">
              {isError ? (
                <p role="alert" className="px-3 py-8 text-center text-sm text-text-muted">Unable to search. Please try again.</p>
              ) : isFetching && items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-text-muted">Searching…</p>
              ) : items.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-text-muted">
                  No results for “{term}”.
                </p>
              ) : (
                items.map((item, i) => (
                  <SearchResultRow
                    key={`${item.type}-${item.id}`}
                    item={item}
                    term={term}
                    active={i === cursor}
                    onMouseEnter={() => setCursor(i)}
                    onSelect={handleSelect}
                  />
                ))
              )}
            </div>

            {/* Footer meta */}
            {data && items.length > 0 && (
              <p className="px-3 py-1.5 text-[11px] text-text-muted border-t border-border/60">
                {data.totalHits} result{data.totalHits !== 1 ? 's' : ''} · {data.tookMs} ms
              </p>
            )}
          </div>
        )
      ) : (
        suppressResting ? null : (
        <>
          {/* OVERLAY variant — chips + results in normal document flow. */}
          {chipTypes.length > 1 && (
            <div className="flex gap-1.5 flex-wrap mt-3">
              <Chip active={activeChip === 'ALL'} label="All" onClick={() => setActiveChip('ALL')} />
              {chipTypes.map(t => (
                <Chip
                  key={t}
                  active={activeChip === t}
                  label={SEARCH_TYPES[t].plural}
                  count={groupCount(t)}
                  onClick={() => setActiveChip(t)}
                />
              ))}
            </div>
          )}

          {/*
            flex-1 + min-h-0: the list takes all remaining height inside the
            flex-col dialog panel, but NEVER expands the panel beyond its own
            max-height. overflow-y-auto then makes this the scroll container.
            This is the correct fix for the "blank page / can't exit" bug —
            the content scrolls *inside* the bounded panel instead of pushing
            the panel off-screen.
          */}
          <div className="mt-3 space-y-0.5 flex-1 min-h-0 overflow-y-auto">
            {!active ? (
              <p className="px-3 py-8 text-center text-sm text-text-muted">
                Type to search across {lockedTypes?.length ? 'this section' : 'everything'}.
              </p>
            ) : isError ? (
              <p role="alert" className="px-3 py-8 text-center text-sm text-text-muted">Unable to search. Please try again.</p>
            ) : isFetching && items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-text-muted">Searching…</p>
            ) : items.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-text-muted">
                No results for “{term}”.
              </p>
            ) : (
              items.map((item, i) => (
                <SearchResultRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  term={term}
                  active={i === cursor}
                  onMouseEnter={() => setCursor(i)}
                  onSelect={handleSelect}
                />
              ))
            )}
          </div>

          {data && items.length > 0 && (
            <p className="mt-2 px-1 text-[11px] text-text-muted">
              {data.totalHits} result{data.totalHits !== 1 ? 's' : ''} · {data.tookMs} ms
            </p>
          )}
        </>
        )
      )}
    </div>
  );
};

const Chip: React.FC<{
  active: boolean; label: string; count?: number; onClick: () => void;
}> = ({ active, label, count, onClick }) => (
  <button
    onClick={onClick}
    className={clsx(
      'px-2.5 py-1 rounded-full text-xs font-medium border transition inline-flex items-center gap-1.5',
      active
        ? 'bg-primary-500 text-white border-primary-500'
        : 'bg-surface text-text-secondary border-border hover:border-primary-500 hover:text-primary-500',
    )}
  >
    {label}
    {count !== undefined && count > 0 && (
      <span className={clsx(
        'text-[10px] px-1 rounded-full',
        active ? 'bg-white/25' : 'bg-surface-soft text-text-muted',
      )}>
        {count}
      </span>
    )}
  </button>
);
