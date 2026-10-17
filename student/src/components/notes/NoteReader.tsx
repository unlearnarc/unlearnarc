import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { X, Clock, BookOpen } from 'lucide-react';
import { noteAPI } from '../../api/endpoints';
import { RichTextContent } from '../ui/RichTextContent';
// Temporarily disabled: read-aloud UI.
// import { SpeakButton } from '../ui/SpeakButton';
import { Spinner } from '../ui/Spinner';
import { NoteVisualBlock } from './NoteVisualBlock';
import { parseBlocks } from './types';
import type { Note } from './types';

interface NoteReaderProps {
  noteId: string;
  onClose: () => void;
}

/**
 * Full-screen, textbook-style reading view for a single note. Fetches the full
 * body by id, renders the sanitized rich HTML (with inline images), then the
 * embedded interactive visuals. Read-aloud controls are temporarily hidden.
 */
export const NoteReader: React.FC<NoteReaderProps> = ({ noteId, onClose }) => {
  const { t } = useTranslation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['note', noteId],
    queryFn: () => noteAPI.getById(noteId),
    enabled: !!noteId,
  });

  const note: Note | undefined = data?.data?.data;
  const blocks = parseBlocks(note?.blocksJson).filter((b) => b.slug);

  return (
    <div className="fixed inset-0 z-[70] bg-background animate-fade-in flex flex-col">
      {/* Sticky header */}
      <header className="shrink-0 border-b border-border bg-surface/95 backdrop-blur">
        <div className="max-w-3xl mx-auto w-full px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-sm">
            <BookOpen size={16} className="text-primary-500 shrink-0" />
            <span className="font-semibold text-text-primary truncate">
              {note?.title ?? t('notes.reading', { defaultValue: 'Reading' })}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label={t('common.close', { defaultValue: 'Close' })}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto w-full px-5 sm:px-6 py-8">
          {isLoading && (
            <div className="flex justify-center py-24"><Spinner size="lg" /></div>
          )}
          {isError && (
            <p className="text-center text-sm text-text-muted py-24">
              {t('notes.loadError', { defaultValue: 'Could not load this note.' })}
            </p>
          )}

          {note && (
            <>
              {note.coverImageUrl && (
                <img
                  src={note.coverImageUrl}
                  alt=""
                  className="w-full max-h-72 object-cover rounded-2xl mb-6 border border-border"
                />
              )}

              <h1 className="text-2xl sm:text-3xl font-bold text-text-primary mb-2">
                {note.title}
              </h1>

              <div className="flex items-center gap-3 mb-6">
                {note.readMinutes != null && note.readMinutes > 0 && (
                  <span className="text-xs text-text-muted flex items-center gap-1.5">
                    <Clock size={12} /> {t('notes.minRead', { count: note.readMinutes })}
                  </span>
                )}
                {/* Temporarily disabled: read-aloud.
                <SpeakButton text={note.contentHtml} id={`note-${note.id}`} html label />
                */}
              </div>

              <RichTextContent html={note.contentHtml} className="text-text-secondary text-[15px]" />

              {blocks.map((b, i) => (
                <NoteVisualBlock key={`${b.kind}-${b.slug}-${i}`} block={b} />
              ))}
            </>
          )}
        </article>
      </div>
    </div>
  );
};
