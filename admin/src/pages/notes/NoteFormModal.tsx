import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Film, Workflow, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { noteAPI, animationSceneAPI, algorithmAPI } from '../../api/endpoints';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/FormField';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import { htmlToPlainText } from '../../utils/sanitizeHtml';
import { NotePreviewModal } from './NotePreviewModal';
import type { Note, NoteBlock, NoteParent } from './types';
import { parseBlocks } from './types';

interface NoteFormModalProps {
  open: boolean;
  onClose: () => void;
  /** The owning topic OR course. Exactly one id is set. */
  parent: NoteParent;
  /** Existing note for edit mode; null for create. */
  note: Note | null;
}

interface FormState {
  title: string;
  summary: string;
  contentHtml: string;
  coverImageUrl: string;
  noteOrder: string;
  readMinutes: string;
  isPublished: boolean;
}

const emptyForm: FormState = {
  title: '',
  summary: '',
  contentHtml: '',
  coverImageUrl: '',
  noteOrder: '0',
  readMinutes: '',
  isPublished: false,
};

export const NoteFormModal: React.FC<NoteFormModalProps> = ({ open, onClose, parent, note }) => {
  const qc = useQueryClient();
  const isEdit = !!note;

  const [form, setForm] = useState<FormState>(emptyForm);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [plainLen, setPlainLen] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previewOpen, setPreviewOpen] = useState(false);

  // Seed from the note being edited (or reset for create).
  useEffect(() => {
    if (!open) return;
    if (note) {
      setForm({
        title: note.title,
        summary: note.summary ?? '',
        contentHtml: note.contentHtml,
        coverImageUrl: note.coverImageUrl ?? '',
        noteOrder: String(note.noteOrder ?? 0),
        readMinutes: note.readMinutes != null ? String(note.readMinutes) : '',
        isPublished: note.isPublished,
      });
      setBlocks(parseBlocks(note.blocksJson));
      setPlainLen(htmlToPlainText(note.contentHtml).length);
    } else {
      setForm(emptyForm);
      setBlocks([]);
      setPlainLen(0);
    }
    setErrors({});
  }, [open, note]);

  // Slug pickers for embeddable visuals.
  const { data: scenesRes } = useQuery({
    queryKey: ['anim-scenes-all'],
    queryFn: () => animationSceneAPI.getAll(),
    enabled: open,
  });
  const { data: algosRes } = useQuery({
    queryKey: ['algorithms-all'],
    queryFn: () => algorithmAPI.getAll(),
    enabled: open,
  });

  const sceneOptions = useMemo(
    () => (scenesRes?.data?.data ?? []).map((s: { slug: string; title: string }) =>
      ({ label: s.title, value: s.slug })),
    [scenesRes],
  );
  const algoOptions = useMemo(
    () => (algosRes?.data?.data ?? []).map((a: { slug: string; name?: string; title?: string }) =>
      ({ label: a.name ?? a.title ?? a.slug, value: a.slug })),
    [algosRes],
  );

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: val }));

  const addBlock = (kind: NoteBlock['kind']) =>
    setBlocks((b) => [...b, { kind, slug: '', caption: '' }]);
  const updateBlock = (i: number, patch: Partial<NoteBlock>) =>
    setBlocks((b) => b.map((blk, idx) => (idx === i ? { ...blk, ...patch } : blk)));
  const removeBlock = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (plainLen === 0) e.contentHtml = 'Lesson content is required';
    blocks.forEach((blk, i) => {
      if (!blk.slug) e[`block-${i}`] = 'Pick a visual';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = () => ({
    ...parent,
    title: form.title.trim(),
    summary: form.summary.trim() || undefined,
    contentHtml: form.contentHtml,
    coverImageUrl: form.coverImageUrl.trim() || undefined,
    blocksJson: blocks.length ? JSON.stringify(blocks) : undefined,
    noteOrder: Number(form.noteOrder) || 0,
    readMinutes: form.readMinutes ? Number(form.readMinutes) : undefined,
    isPublished: form.isPublished,
  });

  const listKey = parent.topicId
    ? ['notes', 'topic', parent.topicId]
    : ['notes', 'course', parent.courseId];

  const saveMut = useMutation({
    mutationFn: () =>
      isEdit ? noteAPI.update(note!.id, buildPayload()) : noteAPI.create(buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: listKey });
      toast.success(isEdit ? 'Note updated' : 'Note created');
      onClose();
    },
    onError: () => toast.error('Failed to save note'),
  });

  const handleSave = () => {
    if (!validate()) return;
    saveMut.mutate();
  };

  return (
    <>
      <Modal open={open} onClose={onClose} size="lg" title={isEdit ? 'Edit Note' : 'New Note'}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <FormField label="Title" required error={errors.title}>
            <Input
              value={form.title}
              error={!!errors.title}
              onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Understanding Binary Search"
            />
          </FormField>

          <FormField label="Summary (optional)">
            <Input
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              placeholder="One-line teaser shown on the card"
            />
          </FormField>

          <FormField label="Cover image URL (optional)">
            <Input
              value={form.coverImageUrl}
              onChange={(e) => set('coverImageUrl', e.target.value)}
              placeholder="https://…/cover.png"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Order">
              <Input
                type="number"
                min={0}
                value={form.noteOrder}
                onChange={(e) => set('noteOrder', e.target.value)}
              />
            </FormField>
            <FormField label="Read time (min, optional)">
              <Input
                type="number"
                min={0}
                value={form.readMinutes}
                onChange={(e) => set('readMinutes', e.target.value)}
                placeholder="e.g. 8"
              />
            </FormField>
          </div>

          <FormField label="Lesson content" required error={errors.contentHtml}>
            <RichTextEditor
              value={form.contentHtml}
              onChange={(html) => set('contentHtml', html)}
              onPlainTextChange={setPlainLen}
              placeholder="Write the lesson. Insert images, headings, code blocks…"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {plainLen} characters · paste or drop images directly into the editor
            </p>
          </FormField>

          {/* Embedded visuals */}
          <div className="rounded-lg border border-white/10 bg-white/3 p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-slate-300">Embedded visuals</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => addBlock('ANIMATION')}
                  className="flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
                >
                  <Film size={13} /> Animation
                </button>
                <button
                  type="button"
                  onClick={() => addBlock('ALGORITHM')}
                  className="flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200"
                >
                  <Workflow size={13} /> Algorithm
                </button>
              </div>
            </div>

            {blocks.length === 0 ? (
              <p className="text-xs text-slate-500">
                No visuals yet. Add an animation scene or algorithm visualizer — it renders
                inside the note for students.
              </p>
            ) : (
              <div className="space-y-2">
                {blocks.map((blk, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-md bg-white/3 p-2">
                    <span
                      className={`mt-2 shrink-0 ${
                        blk.kind === 'ANIMATION' ? 'text-violet-400' : 'text-cyan-400'
                      }`}
                    >
                      {blk.kind === 'ANIMATION' ? <Film size={14} /> : <Workflow size={14} />}
                    </span>
                    <div className="flex-1 space-y-1.5">
                      <Select
                        value={blk.slug}
                        error={!!errors[`block-${i}`]}
                        placeholder={`Choose ${blk.kind === 'ANIMATION' ? 'an animation' : 'an algorithm'}`}
                        options={blk.kind === 'ANIMATION' ? sceneOptions : algoOptions}
                        onChange={(e) => updateBlock(i, { slug: e.target.value })}
                      />
                      <Input
                        value={blk.caption ?? ''}
                        onChange={(e) => updateBlock(i, { caption: e.target.value })}
                        placeholder="Caption (optional)"
                      />
                      {errors[`block-${i}`] && (
                        <p className="text-xs text-rose-400">{errors[`block-${i}`]}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeBlock(i)}
                      className="mt-1 p-1 rounded text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => set('isPublished', e.target.checked)}
              className="w-4 h-4 rounded accent-violet-500"
            />
            Published (visible to students)
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white"
          >
            <Eye size={15} /> Preview
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-violet-600 text-white hover:bg-violet-500 transition disabled:opacity-60"
            >
              <Plus size={15} /> {isEdit ? 'Save changes' : 'Create note'}
            </button>
          </div>
        </div>
      </Modal>

      {previewOpen && (
        <NotePreviewModal
          onClose={() => setPreviewOpen(false)}
          title={form.title || 'Untitled note'}
          contentHtml={form.contentHtml}
          coverImageUrl={form.coverImageUrl}
          blocks={blocks}
          readMinutes={form.readMinutes ? Number(form.readMinutes) : undefined}
        />
      )}
    </>
  );
};
