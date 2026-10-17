import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Eye, EyeOff, BookOpen, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { noteAPI } from '../../api/endpoints';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { NoteFormModal } from './NoteFormModal';
import type { Note, NoteParent, NoteSummary } from './types';

interface TopicNotesPanelProps {
  parent: NoteParent;
}

/**
 * Inline CRUD list of book-style notes for a topic (or course). Shows publish
 * status and order; opens the full authoring modal for create/edit.
 */
export const TopicNotesPanel: React.FC<TopicNotesPanelProps> = ({ parent }) => {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [del, setDel] = useState<NoteSummary | null>(null);

  const listKey = parent.topicId
    ? ['notes', 'topic', parent.topicId]
    : ['notes', 'course', parent.courseId];

  const { data, isLoading } = useQuery({
    queryKey: listKey,
    queryFn: () =>
      parent.topicId
        ? noteAPI.getByTopic(parent.topicId)
        : noteAPI.getByCourse(parent.courseId!),
  });
  const notes: NoteSummary[] = data?.data?.data ?? [];

  const publishMut = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      noteAPI.publish(id, value),
    onSuccess: (_r, v) => {
      qc.invalidateQueries({ queryKey: listKey });
      toast.success(v.value ? 'Published' : 'Unpublished');
    },
    onError: () => toast.error('Failed to update'),
  });

  const deleteMut = useMutation({
    mutationFn: () => noteAPI.delete(del!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      toast.success('Note deleted');
      setDel(null);
    },
    onError: () => toast.error('Failed to delete'),
  });

  // Fetch the full note (with contentHtml/blocks) before opening the editor.
  const openEdit = async (id: string) => {
    try {
      const res = await noteAPI.getById(id);
      setEditing(res.data?.data as Note);
      setFormOpen(true);
    } catch {
      toast.error('Failed to load note');
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-indigo-300 flex items-center gap-1.5">
            <BookOpen size={12} /> Notes (book-style lessons)
          </p>
          <button
            onClick={openCreate}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-indigo-300 hover:bg-indigo-500/15 border border-indigo-500/20 transition"
          >
            <Plus size={11} /> Note
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 size={16} className="animate-spin text-slate-500" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-slate-600 italic">No notes yet</p>
        ) : (
          notes.map((n) => (
            <div
              key={n.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/3 border border-white/5 group hover:bg-white/5 transition"
            >
              <BookOpen size={13} className="text-indigo-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-200 truncate">
                  <span className="text-slate-500 mr-2">#{n.noteOrder}</span>
                  {n.title}
                </p>
                {n.readMinutes ? (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Clock size={9} /> {n.readMinutes} min
                  </p>
                ) : null}
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  n.isPublished
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                }`}
              >
                {n.isPublished ? 'Published' : 'Draft'}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                <button
                  title={n.isPublished ? 'Unpublish' : 'Publish'}
                  onClick={() => publishMut.mutate({ id: n.id, value: !n.isPublished })}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  {n.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  title="Edit"
                  onClick={() => openEdit(n.id)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                >
                  <Pencil size={13} />
                </button>
                <button
                  title="Delete"
                  onClick={() => setDel(n)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <NoteFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        parent={parent}
        note={editing}
      />

      <ConfirmDialog
        open={!!del}
        message={`Delete note “${del?.title}”? This cannot be undone.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDel(null)}
        loading={deleteMut.isPending}
      />
    </>
  );
};
