import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, LoaderCircle, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import './searchable-select.css';

interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  id: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder: string;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  disabled?: boolean;
}

/** Editable, single-selection combobox. Typing filters labels, not the saved value. */
export function SearchableSelect({ id, value, options, onChange, placeholder, loading = false,
  error = false, onRetry, disabled = false }: SearchableSelectProps) {
  const { t } = useTranslation();
  const uid = useId();
  const listId = `${uid}-list`;
  const hintId = `${uid}-hint`;
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const selected = options.find(option => option.value === value);
  const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
  const words = normalize(query.trim()).split(/\s+/);
  const filtered = options.filter(option => words.every(word => normalize(option.label).includes(word)));
  const visible = loading || error ? [] : filtered;
  const activeIndex = Math.min(active, visible.length - 1);

  const close = () => { setOpen(false); setQuery(''); setActive(0); };
  const choose = (option: SelectOption) => { onChange(option.value); close(); };
  const expand = () => { setQuery(''); setActive(0); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false); setQuery(''); setActive(0);
      }
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      document.getElementById(`${uid}-option-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex, query, uid]);

  return <div ref={root} className="searchable-select" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
  }}>
    <div className="searchable-select-control" data-open={open}>
      <Search size={17} aria-hidden="true" />
      <input ref={input} id={id} role="combobox" type="text" autoComplete="off" spellCheck={false}
        disabled={disabled} placeholder={placeholder} value={open ? query : selected?.label ?? ''}
        aria-expanded={open} aria-controls={open ? listId : undefined} aria-autocomplete="list"
        aria-describedby={open ? hintId : undefined} aria-busy={loading}
        aria-activedescendant={open && activeIndex >= 0 ? `${uid}-option-${activeIndex}` : undefined}
        onFocus={expand}
        onClick={() => { if (!open) expand(); }}
        onChange={event => { setQuery(event.target.value); setActive(0); setOpen(true); }}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (!open) { expand(); return; }
            if (visible.length) setActive(event.key === 'ArrowDown'
              ? (activeIndex + 1) % visible.length
              : (activeIndex - 1 + visible.length) % visible.length);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (!open) expand();
            else if (visible[activeIndex]) choose(visible[activeIndex]);
          } else if (event.key === 'Escape') {
            if (open) { event.preventDefault(); event.stopPropagation(); close(); }
          } else if (event.key === 'Tab') close();
        }} />
      <button type="button" tabIndex={-1} disabled={disabled} aria-label={placeholder}
        aria-expanded={open} aria-controls={open ? listId : undefined}
        onMouseDown={event => event.preventDefault()}
        onClick={() => { if (open) close(); else { input.current?.focus(); expand(); } }}>
        {loading ? <LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}
      </button>
    </div>
    {open && <div className="searchable-select-panel">
      <p id={hintId} className="searchable-select-hint" role="status">
        {loading ? t('common.loading') : error ? t('searchSelect.error', 'Could not load options.')
          : !options.length ? t('searchSelect.empty', 'No options available yet.')
          : !visible.length ? t('searchSelect.noMatches', 'No matches. Try a different search.')
          : t('searchSelect.hint', 'Type to search · ↑ ↓ to explore · Enter to choose')}
      </p>
      {error && onRetry && <button type="button" className="searchable-select-retry" onClick={onRetry}>{t('dashboard.learningHome.retry')}</button>}
      <ul id={listId} role="listbox" aria-labelledby={id} className="searchable-select-options">
        {visible.map((option, index) => <li key={option.value} id={`${uid}-option-${index}`}
          role="option" aria-selected={option.value === value} data-active={index === activeIndex}
          onMouseDown={event => event.preventDefault()}
          onPointerMove={event => { if (event.pointerType === 'mouse') setActive(index); }}
          onClick={() => choose(option)}>
          <span>{option.label}</span>{option.value === value && <Check size={17} aria-hidden="true" />}
        </li>)}
      </ul>
    </div>}
  </div>;
}
