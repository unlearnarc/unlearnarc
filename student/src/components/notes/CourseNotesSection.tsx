import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { BookOpen, Clock, ChevronRight } from 'lucide-react';
import { noteAPI } from '../../api/endpoints';
import { Spinner } from '../ui/Spinner';
import { NoteReader } from './NoteReader';
import type { NoteSummary } from './types';

interface CourseNotesSectionProps {
  courseId: string;
}

/**
 * Course-level book-style lessons (published only), shown on the Course detail
 * page above the topic list. These are notes authored against the whole course
 * rather than a single topic — the admin manages them from the "Course Notes"
 * page. Topic-scoped notes continue to render inside each TopicRow.
 */
export const CourseNotesSection: React.FC<CourseNotesSectionProps> = ({ courseId }) => {
  const { t } = useTranslation();
  const [readingNoteId, setReadingNoteId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['notes', 'course', courseId],
    queryFn: () => noteAPI.getByCourse(courseId),
    enabled: !!courseId,
  });

  const notes: NoteSummary[] = data?.data?.data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-6"><Spinner /></div>
    );
  }
  if (notes.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <BookOpen size={18} className="text-primary-500" />
          {t('notes.courseLessons', { defaultValue: 'Course lessons' })}
        </h2>
        <span className="text-xs text-text-muted">
          {t('notes.lessonCount', { count: notes.length, defaultValue: '{{count}} lessons' })}
        </span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        {[...notes]
          .sort((a, b) => a.noteOrder - b.noteOrder)
          .map((note) => (
            <button
              key={note.id}
              onClick={() => setReadingNoteId(note.id)}
              className="flex items-stretch gap-0 bg-surface rounded-[12px] border border-border hover:border-primary-300 hover:shadow-card transition group text-left overflow-hidden"
            >
              {note.coverImageUrl ? (
                <img
                  src={note.coverImageUrl}
                  alt=""
                  className="w-20 object-cover shrink-0"
                />
              ) : (
                <div className="w-14 bg-primary-50 flex items-center justify-center shrink-0">
                  <BookOpen size={20} className="text-primary-500" />
                </div>
              )}
              <div className="flex-1 min-w-0 p-3.5">
                <p className="text-sm font-semibold text-text-primary truncate">{note.title}</p>
                {note.summary && (
                  <p className="text-xs text-text-muted line-clamp-2 mt-0.5">{note.summary}</p>
                )}
                <div className="flex items-center gap-3 mt-2">
                  {note.readMinutes ? (
                    <span className="text-[11px] text-text-muted flex items-center gap-1">
                      <Clock size={10} /> {t('notes.minRead', { count: note.readMinutes })}
                    </span>
                  ) : null}
                  <span className="text-[11px] text-primary-500 font-medium flex items-center gap-0.5 group-hover:gap-1.5 transition-all ml-auto">
                    {t('notes.read', { defaultValue: 'Read' })}
                    <ChevronRight size={13} />
                  </span>
                </div>
              </div>
            </button>
          ))}
      </div>

      {readingNoteId && (
        <NoteReader noteId={readingNoteId} onClose={() => setReadingNoteId(null)} />
      )}
    </div>
  );
};
