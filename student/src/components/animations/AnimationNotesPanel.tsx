import React from 'react';
import { BookOpen, MapPin, Lightbulb, ExternalLink } from 'lucide-react';
import type { AnimationNotes } from '../../types/animation';

/* =============================================================================
   AnimationNotesPanel — the "general notes" block for a scene.

   Renders the authoring notes attached to a trace: a plain-language summary,
   a "where to use" list (real-world applications), key takeaways, and
   references. Any section is optional — the panel renders only what's present.
   ============================================================================= */

export interface AnimationNotesPanelProps {
  notes: AnimationNotes;
  className?: string;
}

export const AnimationNotesPanel: React.FC<AnimationNotesPanelProps> = ({
  notes,
  className,
}) => {
  const hasContent =
    notes.summary ||
    (notes.whereToUse && notes.whereToUse.length) ||
    (notes.keyPoints && notes.keyPoints.length) ||
    (notes.references && notes.references.length);
  if (!hasContent) return null;

  return (
    <div
      className={`rounded-2xl border border-border p-4 space-y-4 ${className ?? ''}`}
      style={{ background: '#16232E' }}
      aria-label="About this animation"
    >
      <header className="flex items-center gap-2">
        <BookOpen size={15} className="text-primary-500" />
        <h4 className="text-[13px] font-bold text-text-primary">
          About this animation
        </h4>
      </header>

      {notes.summary && (
        <p className="text-[13px] text-text-secondary leading-relaxed">
          {notes.summary}
        </p>
      )}

      {notes.whereToUse && notes.whereToUse.length > 0 && (
        <section className="space-y-1.5">
          <h5 className="flex items-center gap-1.5 text-[12px] font-semibold text-text-primary">
            <MapPin size={13} className="text-primary-500" /> Where it's used
          </h5>
          <ul className="space-y-1">
            {notes.whereToUse.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12.5px] text-text-secondary leading-relaxed"
              >
                <span className="mt-1.5 h-1 w-1 rounded-full bg-primary-500 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.keyPoints && notes.keyPoints.length > 0 && (
        <section className="space-y-1.5">
          <h5 className="flex items-center gap-1.5 text-[12px] font-semibold text-text-primary">
            <Lightbulb size={13} className="text-warning" /> Key points
          </h5>
          <ul className="space-y-1">
            {notes.keyPoints.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-[12.5px] text-text-secondary leading-relaxed"
              >
                <span className="mt-1.5 h-1 w-1 rounded-full bg-warning shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {notes.references && notes.references.length > 0 && (
        <section className="space-y-1.5">
          <h5 className="text-[12px] font-semibold text-text-primary">
            References
          </h5>
          <ul className="space-y-1">
            {notes.references.map((r, i) => (
              <li key={i}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[12.5px] text-primary-500 hover:underline"
                >
                  <ExternalLink size={12} /> {r.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};
