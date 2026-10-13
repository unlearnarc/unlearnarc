import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { SearchPanel } from './SearchPanel';
import { SEARCH_TYPES } from './config';
import type { SearchResultItem } from './types';

/* =============================================================================
   GlobalSearchDialog — a command-palette style overlay launched from the
   TopBar (or ⌘K / Ctrl-K). Reuses the shared <SearchPanel/> with no type lock
   so it searches across everything, and routes to the selected result.
   ============================================================================= */

interface Props {
  open: boolean;
  onClose: () => void;
}

export const GlobalSearchDialog: React.FC<Props> = ({ open, onClose }) => {
  const navigate = useNavigate();

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleSelect = (item: SearchResultItem) => {
    const to = SEARCH_TYPES[item.type].to(item);
    onClose();
    if (to) navigate(to);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center px-4 pt-[12vh] bg-navy-950/40 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-[16px] bg-surface border border-border shadow-2xl p-4 animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <SearchPanel autoFocus onSelect={handleSelect} />
        <div className="mt-3 flex items-center justify-between px-1 text-[11px] text-text-muted">
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
