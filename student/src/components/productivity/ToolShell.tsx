import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, HardDrive } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

/* =============================================================================
   ToolShell — full-screen overlay shell every productivity tool opens into.

   • Rendered through a portal so it escapes the layout's transform/overflow and
     covers the entire viewport (including the sidebar / bottom dock).
   • Respects the safe-area inset and locks body scroll while open.
   • Esc closes. A sticky translucent header carries the tool icon, title and a
     close button; the body scrolls independently.
   • Fully theme-token driven (bg-background / surface / border) so it re-skins
     automatically with light/dark and is RTL-safe (uses logical spacing).
   ============================================================================= */

interface ToolShellProps {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: LucideIcon;
  /** Optional element rendered on the trailing side of the header. */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}

export const ToolShell: React.FC<ToolShellProps> = ({
  open,
  onClose,
  title,
  icon: Icon,
  headerAction,
  children,
}) => {
  const { t } = useTranslation();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-background animate-[ua-fade_.15s_ease-out]"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header
        className="sticky top-0 z-10 flex items-center gap-3 h-14 px-4 sm:px-6 bg-surface/90 backdrop-blur border-b border-border"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <span className="w-8 h-8 rounded-[10px] bg-primary-50 flex items-center justify-center text-primary-500 shrink-0">
          <Icon size={18} />
        </span>
        <h2 className="text-base font-semibold text-text-primary truncate flex-1">{title}</h2>
        <span
          className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary bg-surface-soft rounded-full px-2.5 py-1 shrink-0"
          title={t('productivity.storageHintTip')}
        >
          <HardDrive size={12} className="opacity-70" />
          {t('productivity.storageHint')}
        </span>
        {headerAction}
        <button
          onClick={onClose}
          className="p-2 -mr-1 rounded-[8px] text-text-secondary hover:bg-surface-soft transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </header>

      <div
        className={clsx('flex-1 overflow-y-auto')}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
