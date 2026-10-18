import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { SearchPanel } from './SearchPanel';
import { SEARCH_TYPES } from './config';
import type { SearchResultItem } from './types';

/* =============================================================================
   GlobalSearchDialog — a command-palette style overlay launched from the
   TopBar (or ⌘K / Ctrl-K). Reuses the shared <SearchPanel/> with no type lock
   so it searches across everything, and routes to the selected result.

   Key behaviours
   ─────────────
   • The dialog is ALWAYS mounted (never null) — only hidden via aria-hidden
     and pointer-events-none. This keeps the input unmounted/cleared correctly
     while avoiding the remount-on-every-open flash.
   • `enabled` is wired to `open` so search requests only fire while visible.
   • The panel uses a proper flex-column overflow chain so the results list
     can never push the box beyond the viewport — the root cause of the
     blank page / can't-exit bug.
   • Backdrop click, Escape key, and the footer hint all close the dialog.
   • `document.body.style.overflow` is locked while open and reliably restored.
   ============================================================================= */

interface Props {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearchDialog: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();
  // Track a stable key so SearchPanel fully resets (term, cursor) on each open.
  const [sessionKey, setSessionKey] = useState(0);
  const prevOpen = useRef(false);

  const close = useCallback(() => onClose(), [onClose]);

  // On each fresh open: bump session key so SearchPanel resets, lock scroll.
  useEffect(() => {
    if (open && !prevOpen.current) {
      setSessionKey(k => k + 1);
    }
    prevOpen.current = open;

    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  const handleSelect = (item: SearchResultItem) => {
    const to = SEARCH_TYPES[item.type].to(item);
    close();
    if (to) navigate(to);
  };

  // Keep the portal in the DOM at all times so React doesn't tear down state
  // abruptly, but hide it visually and from assistive tech when closed.
  return createPortal(
    /* ── Backdrop ─────────────────────────────────────────────────────────── */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      aria-hidden={!open}
      // Visibility is toggled via opacity + pointer-events instead of
      // conditional rendering — this avoids the input-reset flash and lets
      // CSS transitions play correctly in both directions.
      className={`fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] pb-[10vh] bg-navy-950/40 backdrop-blur-sm transition-opacity duration-150 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      onClick={close}
    >
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      {/*
        Critical layout chain that prevents the blank-page overflow:
          backdrop  → flex column, full height (pt/pb give breathing room)
          panel     → flex column, max-h constrains the box
          SearchPanel → flex column, min-h-0, flex-1 (shrinks to fit)
          results list (inside SearchPanel) → flex-1 min-h-0 overflow-y-auto

        Every flex child that must scroll declares min-h-0 so the browser
        honours the parent's max-height instead of expanding to content size.
      */}
      <div
        className={`w-full max-w-2xl rounded-[16px] bg-surface border border-border shadow-2xl flex flex-col overflow-hidden transition-transform duration-150 ${open ? 'scale-100' : 'scale-95'}`}
        style={{ maxHeight: 'min(80vh, 640px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Inner padding wrapper — flex-col, min-h-0 so children can scroll */}
        <div className="flex flex-col min-h-0 flex-1 p-4 gap-0">
          {/*
            key={sessionKey} resets the SearchPanel (clears term + cursor)
            on every fresh dialog open without a full unmount/remount.
            enabled={open} prevents search requests when the dialog is hidden.
            minChars={2} stops single-keystroke blasts returning huge payloads.
          */}
          <SearchPanel
            key={sessionKey}
            autoFocus={open}
            onSelect={handleSelect}
            enabled={open}
            minChars={2}
          />
        </div>

        {/* ── Keyboard hint footer ──────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between px-5 py-2.5 border-t border-border text-[11px] text-text-muted bg-surface">
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">↑</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">↓</kbd> navigate,{' '}
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">↵</kbd> open
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">esc</kbd> close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
};
