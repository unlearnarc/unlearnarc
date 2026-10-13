import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Search, X, BookOpen, Layers } from 'lucide-react';
import clsx from 'clsx';
import { useEntityOptions } from './useEntityOptions';
import type { LinkRef } from './types';

/* =============================================================================
   LinkPicker — lets the user attach a productivity item to a course / domain.

   Renders the currently-linked entity as a removable chip. Clicking "Link"
   opens an inline, searchable list of courses & domains. Pure-controlled: the
   parent owns the `value` and receives changes via `onChange`.
   ============================================================================= */

interface LinkPickerProps {
  value?: LinkRef;
  onChange: (link?: LinkRef) => void;
  className?: string;
}

export const LinkPicker: React.FC<LinkPickerProps> = ({ value, onChange, className }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { options, isLoading } = useEntityOptions();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
    return list.slice(0, 40);
  }, [options, query]);

  if (value) {
    return (
      <div className={clsx('flex items-center gap-2', className)}>
        <span className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-full bg-primary-50 text-primary-600 text-xs font-medium">
          {value.kind === 'DOMAIN' ? <Layers size={12} /> : <BookOpen size={12} />}
          <span className="truncate">{value.label}</span>
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="shrink-0 hover:text-primary-700"
            aria-label={t('productivity.link.remove')}
          >
            <X size={12} />
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className={clsx('relative', className)}>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary-500 transition"
        >
          <Link2 size={13} />
          {t('productivity.link.add')}
        </button>
      ) : (
        <div className="rounded-[10px] border border-border bg-surface shadow-[var(--ua-shadow-hover)] overflow-hidden">
          <div className="flex items-center gap-2 px-2.5 h-9 border-b border-border">
            <Search size={14} className="text-text-muted shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('productivity.link.searchPlaceholder')}
              className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
            />
            <button
              type="button"
              onClick={() => { setOpen(false); setQuery(''); }}
              className="text-text-muted hover:text-text-secondary"
              aria-label={t('common.close', { defaultValue: 'Close' })}
            >
              <X size={14} />
            </button>
          </div>
          <ul className="max-h-48 overflow-y-auto py-1">
            {isLoading && (
              <li className="px-3 py-2 text-xs text-text-muted">{t('common.loading')}</li>
            )}
            {!isLoading && filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-text-muted">{t('productivity.link.noResults')}</li>
            )}
            {filtered.map((o) => (
              <li key={`${o.kind}-${o.id}`}>
                <button
                  type="button"
                  onClick={() => {
                    onChange({ kind: o.kind, id: o.id, label: o.label });
                    setOpen(false);
                    setQuery('');
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm text-text-secondary hover:bg-surface-soft transition"
                >
                  {o.kind === 'DOMAIN' ? (
                    <Layers size={13} className="text-text-muted shrink-0" />
                  ) : (
                    <BookOpen size={13} className="text-text-muted shrink-0" />
                  )}
                  <span className="truncate">{o.label}</span>
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-text-muted">
                    {t(`productivity.link.kind.${o.kind}`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

/** Compact read-only chip for showing an item's link in lists. */
export const LinkBadge: React.FC<{ link: LinkRef; className?: string }> = ({ link, className }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-soft text-text-muted text-[11px] font-medium max-w-[10rem]',
      className,
    )}
  >
    {link.kind === 'DOMAIN' ? <Layers size={10} /> : <BookOpen size={10} />}
    <span className="truncate">{link.label}</span>
  </span>
);
