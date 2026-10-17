import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NotebookPen, BookOpen, ChevronRight } from 'lucide-react';
import { courseAPI } from '../api/endpoints';
import { EmptyState } from '../components/ui/EmptyState';
import { TopicNotesPanel } from './notes/TopicNotesPanel';

interface Course {
  id: string;
  name: string;
  level: string;
  topicsCount: number;
}

/**
 * Course-level Notes manager. Admins pick a course from the left rail and author
 * book-style lessons scoped to the course as a whole (topic-scoped notes are
 * still managed inline on the Courses page). This gives a single, focused home
 * for long-form "book" content that spans a whole course.
 */
export const NotesPage: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: () => courseAPI.getAll(),
  });
  const courses: Course[] = data?.data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => c.name.toLowerCase().includes(q));
  }, [courses, search]);

  const selected = courses.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <NotebookPen size={22} className="text-violet-400" />
          Course Notes
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Author book-style lessons scoped to an entire course — rich text, embedded
          images and interactive animations. Topic-level notes live on the Courses page.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
        {/* Course rail */}
        <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden self-start">
          <div className="p-3 border-b border-white/8">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search courses…"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <p className="text-center text-xs text-slate-500 py-8">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-8">No courses found</p>
            ) : (
              filtered.map((c) => {
                const active = c.id === selectedId;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition ${
                      active
                        ? 'bg-violet-600/20 border border-violet-500/30'
                        : 'hover:bg-white/5 border border-transparent'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      <BookOpen size={15} className="text-violet-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${active ? 'text-white' : 'text-slate-200'}`}>
                        {c.name}
                      </p>
                      <p className="text-[11px] text-slate-500">{c.level}</p>
                    </div>
                    <ChevronRight size={15} className={active ? 'text-violet-300' : 'text-slate-600'} />
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Notes panel */}
        <div className="bg-surface/60 border border-white/8 rounded-2xl p-5 min-h-[60vh]">
          {selected ? (
            <>
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">{selected.name}</h2>
                <p className="text-xs text-slate-500">Course-level notes</p>
              </div>
              <TopicNotesPanel parent={{ courseId: selected.id }} />
            </>
          ) : (
            <EmptyState message="Select a course on the left to manage its notes" />
          )}
        </div>
      </div>
    </div>
  );
};
