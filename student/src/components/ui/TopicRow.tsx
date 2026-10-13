import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Clock, GraduationCap, ChevronDown, ChevronRight, PlayCircle,
  Video, FileText, File, Zap, Activity, ScrollText,
} from 'lucide-react';
import { Badge } from './Badge';
import { Spinner } from './Spinner';
import { studyMaterialAPI } from '../../api/endpoints';
import type { Topic, StudyMaterial } from '../../types';

/* =============================================================================
   TopicRow — collapsible topic accordion with lazy-loaded study materials.
   Used on the Course detail page; self-contained (fetches its own materials).
   ============================================================================= */

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
  const [open, setOpen] = useState(false);

  const { data: matsRes, isLoading } = useQuery({
    queryKey: ['study-materials', topic.id],
    queryFn:  () => studyMaterialAPI.getByTopic(topic.id),
    enabled:  open,
  });

  const materials: StudyMaterial[] = matsRes?.data?.data ?? [];

  return (
    <div className="border border-border rounded-[10px] overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-surface hover:bg-surface-soft transition text-left"
      >
        <div className="w-7 h-7 rounded-full bg-primary-50 text-primary-500 flex items-center justify-center text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate">{topic.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge label={topic.level} />
            {topic.time && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock size={10} /> {topic.time}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={`/tests?scope=TOPIC&entityId=${topic.id}`}
            onClick={e => e.stopPropagation()}
            className="btn-ghost py-1 px-2.5 text-xs"
          >
            <GraduationCap size={13} /> Quiz
          </Link>
          {open
            ? <ChevronDown size={16} className="text-text-muted" />
            : <ChevronRight size={16} className="text-text-muted" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-border bg-bg-soft px-5 py-4 space-y-2 animate-slide-up">
          {isLoading ? (
            <div className="flex justify-center py-4"><Spinner size="sm" /></div>
          ) : materials.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-3">No study materials yet.</p>
          ) : (
            materials.map(mat => (
              <a
                key={mat.id}
                href={mat.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 px-3 py-2.5 bg-surface rounded-[8px] border border-border hover:border-primary-300 hover:shadow-card transition group"
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
                <Badge label={mat.type} />
                <PlayCircle size={14} className="text-text-muted group-hover:text-primary-500 transition shrink-0" />
              </a>
            ))
          )}
        </div>
      )}
    </div>
  );
};
