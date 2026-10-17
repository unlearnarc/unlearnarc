import React, { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, GraduationCap, ChevronDown, ChevronRight, PlayCircle,
  Video, FileText, File, Zap, Activity, ScrollText,
  BookOpen, ChevronRight as ArrowRight,
} from 'lucide-react';
import { Badge } from './Badge';
import { Spinner } from './Spinner';
import { studyMaterialAPI, noteAPI } from '../../api/endpoints';
import type { Topic, StudyMaterial, NoteSummary } from '../../types';
import { NoteReader } from '../notes';
import { useTranslation } from 'react-i18next';

/* Collapsible topic accordion with lazy-loaded study materials. */
const MaterialIcon: React.FC<{ type: string }> = ({ type }) => {
  const icons: Record<string, React.ReactNode> = {
    VIDEO:    <Video size={15} className="text-primary-500" />,
    ARTICLE:  <FileText size={15} className="text-achievement" />,
    PDF:      <File size={15} className="text-warning" />,
    QUIZ:     <Zap size={15} className="text-danger" />,
    EXERCISE: <Activity size={15} className="text-success" />,
    SLIDES:   <ScrollText size={15} className="text-achievement" />,
  };
  return <>{icons[type] ?? <FileText size={15} />}</>;
};

interface TopicRowProps {
  topic: Topic;
  index: number;
}

export const TopicRow: React.FC<TopicRowProps> = ({ topic, index }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const [readingNoteId, setReadingNoteId] = useState<string | null>(null);

  const { data: matsRes, isLoading } = useQuery({
    queryKey: ['study-materials', topic.id],
    queryFn: () => studyMaterialAPI.getByTopic(topic.id),
    enabled: open,
  });
  const { data: notesRes, isLoading: notesLoading } = useQuery({
    queryKey: ['notes', 'topic', topic.id],
    queryFn: () => noteAPI.getByTopic(topic.id),
    enabled: open,
  });

  const materials: StudyMaterial[] = matsRes?.data?.data ?? [];
  const notes: NoteSummary[] = notesRes?.data?.data ?? [];

  return (
    <div className="min-w-0 border border-border rounded-[10px] overflow-hidden">
      <div className="flex items-center gap-1 bg-surface pr-2 sm:pr-3">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          aria-expanded={open}
          aria-controls={open ? contentId : undefined}
          className="flex flex-1 min-w-0 items-start sm:items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 sm:py-4 hover:bg-surface-soft transition text-left"
        >
          <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center text-xs font-bold shrink-0">
            {index + 1}
          </span>
          <span className="flex-1 min-w-0">
            <span className="block text-xs sm:text-sm font-semibold text-text-primary [overflow-wrap:anywhere]">{topic.name}</span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
              <Badge label={topic.level} />
              {topic.time && (
                <span className="min-w-0 text-xs text-text-muted flex items-center gap-1 [overflow-wrap:anywhere]">
                  <Clock size={10} className="shrink-0" /> {topic.time}
                </span>
              )}
            </span>
          </span>
          {open
            ? <ChevronDown size={16} className="text-text-muted shrink-0 mt-1 sm:mt-0" />
            : <ChevronRight size={16} className="text-text-muted shrink-0 mt-1 sm:mt-0" />}
        </button>
        <Link
          to={`/tests?scope=TOPIC&entityId=${encodeURIComponent(topic.id)}&courseId=${encodeURIComponent(topic.courseId)}`}
          aria-label={`Quiz: ${topic.name}`}
          className="btn-ghost min-h-11 shrink-0 gap-1 px-2 sm:px-2.5 text-xs"
        >
          <GraduationCap size={13} className="shrink-0" /> Quiz
        </Link>
      </div>

      {open && (
        <div id={contentId} className="border-t border-border bg-bg-soft px-3 sm:px-5 py-3 sm:py-4 space-y-2 animate-slide-up">
          {/* Book-style notes — read in-app for a visual, textbook experience */}
          {notesLoading ? (
            <div className="flex justify-center py-3"><Spinner size="sm" /></div>
          ) : notes.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                {t('notes.lessons')}
              </p>
              {[...notes]
                .sort((a, b) => a.noteOrder - b.noteOrder)
                .map(note => (
                  <button
                    key={note.id}
                    onClick={() => setReadingNoteId(note.id)}
                    className="w-full grid grid-cols-[auto_minmax(0,1fr)_auto] sm:flex items-center gap-x-2 gap-y-1 sm:gap-3 px-2 sm:px-3 py-2.5 bg-surface rounded-[8px] border border-border hover:border-primary-300 hover:shadow-card transition group text-left"
                  >
                    <div className="w-7 h-7 rounded-md bg-primary-50 flex items-center justify-center shrink-0">
                      <BookOpen size={15} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-text-primary [overflow-wrap:anywhere]">{note.title}</p>
                      {note.summary && (
                        <p className="text-[10px] text-text-muted truncate">{note.summary}</p>
                      )}
                    </div>
                    {note.readMinutes ? (
                      <span className="col-start-2 row-start-2 text-[10px] text-text-muted flex items-center gap-1 shrink-0">
                        <Clock size={9} /> {t('notes.minShort', { count: note.readMinutes })}
                      </span>
                    ) : null}
                    <ArrowRight size={14} className="col-start-3 row-start-1 text-text-muted group-hover:text-primary-500 transition shrink-0" />
                  </button>
                ))}
            </div>
          )}

          {/* External study material links */}
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : materials.length === 0 && notes.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-3">{t('notes.noMaterials')}</p>
          ) : (
            materials.map(mat => (
              <a
                key={mat.id}
                href={mat.url}
                target="_blank"
                rel="noreferrer"
                className="flex min-w-0 items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 bg-surface rounded-[8px] border border-border hover:border-primary-300 hover:shadow-card transition group"
              >
                <div className="w-7 h-7 rounded-md bg-primary-50 flex items-center justify-center shrink-0">
                  <MaterialIcon type={mat.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">
                    {mat.type.charAt(0) + mat.type.slice(1).toLowerCase()} Material
                  </p>
                  <p className="text-[10px] text-text-muted truncate">{mat.url}</p>
                </div>
                <Badge label={mat.type} className="hidden sm:inline-flex" />
                <PlayCircle size={14} className="text-text-muted group-hover:text-primary-500 transition shrink-0" />
              </a>
            ))
          )}
        </div>
      )}

      {readingNoteId && (
        <NoteReader noteId={readingNoteId} onClose={() => setReadingNoteId(null)} />
      )}
    </div>
  );
};
