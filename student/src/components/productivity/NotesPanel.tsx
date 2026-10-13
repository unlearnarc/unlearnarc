import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pin, Trash2, Search, StickyNote } from 'lucide-react';
import clsx from 'clsx';
import { EmptyState } from '../ui/EmptyState';
import { LinkPicker, LinkBadge } from './LinkPicker';
import { useNotes } from './hooks';
import { NOTE_COLORS, type LinkRef, type Note } from './types';

/* =============================================================================
   NotesPanel — quick notes with course/topic linking.

   Left: a search box + "new note" composer. Below: a responsive masonry-ish grid
   of note cards. Each card is editable inline (title + body), can be pinned,
   colour-tagged and linked to a learning entity, or deleted. All changes persist
   instantly to localStorage via useNotes().
   ============================================================================= */

const COLOR_BG: Record<string, string> = {
  amber: 'bg-[#FEF3C7] dark:bg-[#3A2E12]',
  blue: 'bg-[#DBEAFE] dark:bg-[#132033]',
  green: 'bg-[#DCFCE7] dark:bg-[#10281B]',
  rose: 'bg-[#FFE4E6] dark:bg-[#301820]',
  violet: 'bg-[#EDE9FE] dark:bg-[#1F1833]',
  slate: 'bg-surface-soft',
};

export const NotesPanel: React.FC = () => {
  const { t } = useTranslation();
  const { notes, add, update, remove, togglePin } = useNotes();
  const [query, setQuery] = useState('');

  // composer state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState<LinkRef | undefined>();
  const [color, setColor] = useState<string>('slate');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.link?.label.toLowerCase().includes(q),
    );
  }, [notes, query]);

  const submit = () => {
    if (!title.trim() && !body.trim()) return;
    add({ title: title.trim() || t('productivity.notes.untitled'), body: body.trim(), link, color });
    setTitle('');
    setBody('');
    setLink(undefined);
    setColor('slate');
  };

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="rounded-[12px] border border-border bg-surface p-3 space-y-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('productivity.notes.titlePlaceholder')}
          className="w-full bg-transparent text-sm font-semibold text-text-primary placeholder:text-text-muted outline-none"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t('productivity.notes.bodyPlaceholder')}
          rows={2}
          className="w-full bg-transparent text-sm text-text-secondary placeholder:text-text-muted outline-none resize-none"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={clsx(
                  'w-5 h-5 rounded-full border transition',
                  COLOR_BG[c],
                  color === c ? 'ring-2 ring-primary-400 border-transparent' : 'border-border',
                )}
                aria-label={c}
              />
            ))}
          </div>
          <LinkPicker value={link} onChange={setLink} className="ml-1" />
          <button
            onClick={submit}
            className="ml-auto inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition"
          >
            <Plus size={15} />
            {t('productivity.notes.add')}
          </button>
        </div>
      </div>

      {/* Search */}
      {notes.length > 0 && (
        <div className="flex items-center gap-2 h-9 px-3 rounded-[10px] border border-border bg-surface-soft">
          <Search size={15} className="text-text-muted shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('productivity.notes.search')}
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={StickyNote}
          title={t('productivity.notes.emptyTitle')}
          description={t('productivity.notes.emptyDesc')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onUpdate={(patch) => update(note.id, patch)}
              onRemove={() => remove(note.id)}
              onTogglePin={() => togglePin(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const NoteCard: React.FC<{
  note: Note;
  onUpdate: (patch: Partial<Note>) => void;
  onRemove: () => void;
  onTogglePin: () => void;
}> = ({ note, onUpdate, onRemove, onTogglePin }) => {
  const { t } = useTranslation();
  return (
    <div className={clsx('rounded-[12px] border border-border p-3 flex flex-col gap-2', COLOR_BG[note.color ?? 'slate'])}>
      <div className="flex items-start gap-2">
        <input
          value={note.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 bg-transparent text-sm font-semibold text-text-primary outline-none"
        />
        <button
          onClick={onTogglePin}
          className={clsx('p-1 rounded transition', note.pinned ? 'text-primary-500' : 'text-text-muted hover:text-text-secondary')}
          aria-label={t('productivity.notes.pin')}
        >
          <Pin size={14} className={note.pinned ? 'fill-current' : ''} />
        </button>
        <button
          onClick={onRemove}
          className="p-1 rounded text-text-muted hover:text-danger transition"
          aria-label={t('productivity.notes.delete')}
        >
          <Trash2 size={14} />
        </button>
      </div>
      <textarea
        value={note.body}
        onChange={(e) => onUpdate({ body: e.target.value })}
        rows={3}
        className="w-full bg-transparent text-sm text-text-secondary outline-none resize-none"
      />
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        {note.link ? <LinkBadge link={note.link} /> : <span />}
        <LinkPicker
          value={note.link}
          onChange={(l) => onUpdate({ link: l })}
        />
      </div>
    </div>
  );
};
