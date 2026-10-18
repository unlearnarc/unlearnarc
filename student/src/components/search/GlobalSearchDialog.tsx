import React, { useEffect, useCallback } from 'react';
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
   • `enabled` is wired to `open` so search requests never fire while the
     dialog is closed (avoids stale results and wasted network calls).
   • The results list is height-capped so the modal never overflows the
     viewport — prevents the "blank page / can't exit" state that happened
     when a large result set blew the panel beyond the screen height.
   • Backdrop click, Escape key, and the footer hint all close the dialog.
   • `document.body.style.overflow` is locked while open and reliably restored.
   ============================================================================= */

interface Props {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearchDialog: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();

  // Stable close handler so the effect dep array stays tight.
  const close = useCallback(() => onClose(), [onClose]);

  // Lock body scroll and register Escape while the dialog is mounted.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, close]);

  if (!open) return null;

  const handleSelect = (item: SearchResultItem) => {
    const to = SEARCH_TYPES[item.type].to(item);
    close();
    if (to) navigate(to);
  };

  return createPortal(
    /* ── Backdrop ─────────────────────────────────────────────────────────── */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global search"
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[10vh] pb-8 bg-navy-950/40 backdrop-blur-sm animate-fade-in"
      onClick={close}
    >
      {/* ── Panel ─────────────────────────────────────────────────────────── */}
      <div
        className="w-full max-w-2xl rounded-[16px] bg-surface border border-border shadow-2xl p-4 animate-scale-in flex flex-col max-h-[80vh]"
        onClick={e => e.stopPropagation()}
      >
        {/*
          Pass `enabled={open}` so search requests only fire while the dialog
          is actually visible. `minChars={2}` prevents single-character blasts
          that can return enormous result sets and freeze rendering.
        */}
        <SearchPanel
          autoFocus
          onSelect={handleSelect}
          enabled={open}
          minChars={2}
        />

        {/* ── Keyboard hint footer ──────────────────────────────────────── */}
        <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-text-muted shrink-0">
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">↑</kbd>{' '}
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">↓</kbd> to navigate,{' '}
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">↵</kbd> to open
          </span>
          <span>
            <kbd className="px-1.5 py-0.5 rounded border border-border bg-surface-soft">esc</kbd> to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
};
