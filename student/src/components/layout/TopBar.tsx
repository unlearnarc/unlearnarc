import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { GlobalSearchDialog } from '../search/GlobalSearchDialog';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';

/* =============================================================================
   TopBar — a slim sticky header rendered by AppLayout across every page.

   Its primary job is to host the GLOBAL search trigger. Clicking it (or
   pressing ⌘K / Ctrl-K anywhere) opens the command-palette style
   <GlobalSearchDialog/>, which searches across all resource types.

   The language selector switches bundled static interface translations.

   Pages that need their own scoped search (e.g. ExplorePage, Interviews) embed
   <SearchPanel/> directly with their own filters — this bar is only the global
   entry point.
   ============================================================================= */

export const TopBar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  // Global ⌘K / Ctrl-K shortcut.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(v => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      <header className="hidden lg:flex sticky top-0 z-30 items-center gap-3 h-14 px-4 sm:px-6 bg-surface border-b border-border">
        {/* Left spacer balances the right-hand controls so the search stays centered */}
        <div className="flex-1" />

        <button
          onClick={() => setOpen(true)}
          className="group flex items-center gap-2.5 w-full max-w-md h-9 px-3 rounded-[10px] border border-border bg-surface-soft text-text-muted hover:border-primary-300 hover:bg-surface transition"
        >
          <Search size={16} className="shrink-0" />
          <span className="text-sm flex-1 text-left">{t('common.search')}</span>
          <kbd className="text-[11px] font-medium px-1.5 py-0.5 rounded border border-border bg-surface text-text-muted group-hover:border-primary-200">
            ⌘K
          </kbd>
        </button>

        <div className="flex-1 flex justify-end items-center gap-2">
          <LanguageSwitcher />
        </div>
      </header>

      <GlobalSearchDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
};
