import React, { useEffect } from 'react';
import { X, Clock, BookOpen } from 'lucide-react';
import { RichTextContent } from '../../components/ui/RichTextContent';
import { NoteVisualBlock } from './NoteVisualBlock';
import type { NoteBlock } from './types';

interface NotePreviewModalProps {
  onClose: () => void;
  title: string;
  contentHtml: string;
  coverImageUrl?: string;
  blocks: NoteBlock[];
  readMinutes?: number;
}

/**
 * Full-screen, student-accurate preview of a note being authored. Renders the
 * sanitized rich HTML followed by the embedded visual blocks, so an admin can
 * verify the final reading experience before publishing.
 */
export const NotePreviewModal: React.FC<NotePreviewModalProps> = ({
  onClose,
  title,
  contentHtml,
  coverImageUrl,
  blocks,
  readMinutes,
}) => {
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

  return (
    <div className="fixed inset-0 z-[80] bg-[#0b1016] flex flex-col">
      <header className="shrink-0 border-b border-white/8 bg-surface/80 backdrop-blur">
        <div className="max-w-3xl mx-auto w-full px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 text-sm text-slate-400">
            <BookOpen size={15} className="text-violet-400 shrink-0" />
            <span className="font-medium text-white truncate">Preview</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close preview"
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto w-full px-5 sm:px-6 py-8">
          {coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverImageUrl}
              alt=""
              className="w-full max-h-72 object-cover rounded-xl mb-6 border border-white/8"
            />
          )}
          <h1 className="text-2xl font-bold text-white mb-2">{title}</h1>
          {readMinutes != null && readMinutes > 0 && (
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mb-6">
              <Clock size={12} /> {readMinutes} min read
            </p>
          )}

          <RichTextContent html={contentHtml} />

          {blocks.filter((b) => b.slug).map((b, i) => (
            <NoteVisualBlock key={`${b.kind}-${b.slug}-${i}`} block={b} />
          ))}
        </article>
      </div>
    </div>
  );
};
