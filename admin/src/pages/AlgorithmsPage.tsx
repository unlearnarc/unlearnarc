import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Workflow, Eye, CheckCircle2, XCircle, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import { AlgorithmVisualizer } from '../components/algoviz';
import type { Algorithm } from '../components/algoviz';
import { algorithmAPI } from '../api/endpoints';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField, Input, Select } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const VISUALIZERS = ['ARRAY', 'GRAPH', 'TREE', 'STACK', 'QUEUE', 'LINKED_LIST', 'MATRIX', 'CUSTOM'].map(
  (v) => ({ label: v, value: v })
);
const DIFFICULTIES = ['EASY', 'MEDIUM', 'HARD'].map((v) => ({ label: v, value: v }));

interface FormState {
  slug: string;
  title: string;
  summary: string;
  thumbnailUrl: string;
  usage: string;
  category: string;
  difficulty: string;
  visualizer: string;
  javaSource: string;
  pythonSource: string;
  specJson: string;
  complexityJson: string;
}

const SAMPLE_SPEC = `{
  "visualizer": "ARRAY",
  "variables": [
    { "name": "i", "label": "i", "color": "#f59e0b" },
    { "name": "j", "label": "j", "color": "#3b82f6" }
  ],
  "steps": [
    {
      "title": "Start",
      "explanation": "Initial array before sorting.",
      "state": { "array": [5, 2, 4, 1] },
      "variables": { "i": 0, "j": 0 }
    },
    {
      "title": "Compare",
      "explanation": "Compare arr[0] and arr[1].",
      "state": { "array": [5, 2, 4, 1] },
      "variables": { "i": 0, "j": 1 },
      "highlights": [{ "target": "array", "indices": [0, 1], "style": "COMPARE" }]
    }
  ]
}`;

const emptyForm: FormState = {
  slug: '',
  title: '',
  summary: '',
  thumbnailUrl: '',
  usage: '',
  category: '',
  difficulty: 'EASY',
  visualizer: 'ARRAY',
  javaSource: '',
  pythonSource: '',
  specJson: SAMPLE_SPEC,
  complexityJson: '',
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export const AlgorithmsPage: React.FC = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Algorithm | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [delTarget, setDelTarget] = useState<Algorithm | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);
  const [validateOk, setValidateOk] = useState<boolean | null>(null);

  const { data, isLoading } = useQuery({ queryKey: ['algorithms'], queryFn: algorithmAPI.getAll });
  const algorithms: Algorithm[] = data?.data?.data ?? [];

  // The list endpoint returns lightweight SUMMARIES (no `spec`/`javaSource`),
  // so we must fetch the FULL algorithm by id before rendering the visualizer.
  const [previewId, setPreviewId] = useState<string | null>(null);
  const { data: previewData, isLoading: previewLoading } = useQuery({
    queryKey: ['algorithm', previewId],
    queryFn: () => algorithmAPI.getById(previewId!),
    enabled: !!previewId,
  });
  const previewAlgo: Algorithm | null = previewData?.data?.data ?? null;
  const filtered = algorithms;

  const buildPayload = (): Record<string, unknown> => {
    const spec = JSON.parse(form.specJson);
    const payload: Record<string, unknown> = {
      slug: form.slug || slugify(form.title),
      title: form.title,
      summary: form.summary || undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      usage: form.usage || undefined,
      category: form.category || undefined,
      difficulty: form.difficulty,
      visualizer: form.visualizer,
      javaSource: form.javaSource || undefined,
      pythonSource: form.pythonSource || undefined,
      spec,
    };
    if (form.complexityJson.trim()) payload.complexity = JSON.parse(form.complexityJson);
    return payload;
  };

  const createMut = useMutation({
    mutationFn: () => algorithmAPI.create(buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['algorithms'] });
      toast.success('Algorithm created');
      closeModal();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Create failed'),
  });

  const updateMut = useMutation({
    mutationFn: () => algorithmAPI.update(editing!.id, buildPayload()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['algorithms'] });
      toast.success('Algorithm updated');
      closeModal();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: () => algorithmAPI.delete(delTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['algorithms'] });
      toast.success('Algorithm deleted');
      setDelTarget(null);
    },
    onError: () => toast.error('Delete failed'),
  });

  const publishMut = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => algorithmAPI.publish(id, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['algorithms'] });
      toast.success('Publish status updated');
    },
    onError: () => toast.error('Failed to update publish status'),
  });

  const validateMut = useMutation({
    mutationFn: () => algorithmAPI.validate(buildPayload()),
    onSuccess: () => {
      setValidateOk(true);
      setSpecError(null);
      toast.success('Spec is valid ✓');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setValidateOk(false);
      setSpecError(e.response?.data?.message ?? 'Validation failed');
      toast.error('Spec validation failed');
    },
  });

  const parseSpecSafe = (): boolean => {
    try {
      JSON.parse(form.specJson);
      if (form.complexityJson.trim()) JSON.parse(form.complexityJson);
      setSpecError(null);
      return true;
    } catch (err) {
      setSpecError('Invalid JSON: ' + (err as Error).message);
      return false;
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setSpecError(null);
    setValidateOk(null);
    setModalOpen(true);
  };

  const openEdit = async (summary: Algorithm) => {
    let a: Algorithm;
    try {
      a = (await algorithmAPI.getById(summary.id)).data.data;
    } catch {
      toast.error('Could not load algorithm for editing');
      return;
    }
    setEditing(a);
    setForm({
      slug: a.slug,
      title: a.title,
      summary: a.summary ?? '',
      thumbnailUrl: a.thumbnailUrl ?? '',
      usage: a.usage ?? '',
      category: a.category ?? '',
      difficulty: a.difficulty ?? 'EASY',
      visualizer: a.visualizer,
      javaSource: a.javaSource ?? '',
      pythonSource: a.pythonSource ?? '',
      specJson: JSON.stringify(a.spec, null, 2),
      complexityJson: a.complexity ? JSON.stringify(a.complexity, null, 2) : '',
    });
    setSpecError(null);
    setValidateOk(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (!parseSpecSafe()) return toast.error('Fix the spec JSON first');
    if (editing) updateMut.mutate();
    else createMut.mutate();
  };

  const livePreview: Algorithm | null = (() => {
    try {
      return {
        id: 'preview',
        slug: form.slug || 'preview',
        title: form.title || 'Preview',
        usage: form.usage,
        visualizer: form.visualizer as Algorithm['visualizer'],
        javaSource: form.javaSource || undefined,
        pythonSource: form.pythonSource || undefined,
        spec: JSON.parse(form.specJson),
      };
    } catch {
      return null;
    }
  })();

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Workflow size={22} className="text-violet-400" />
            Algorithm Visualizer
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Author meta-driven, step-by-step algorithm visualizations (Java / Python)
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-violet-900/30"
        >
          <Plus size={16} />
          New Algorithm
        </button>
      </div>

      <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No algorithms yet"
            action={
              <button onClick={openCreate} className="text-xs text-violet-400 hover:underline">
                Create your first algorithm
              </button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Title</th>
                <th className="text-left px-6 py-3">Visualizer</th>
                <th className="text-left px-6 py-3">Difficulty</th>
                <th className="text-left px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition ${
                    i % 2 === 0 ? '' : 'bg-white/[0.02]'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-white">{a.title}</div>
                    <div className="text-xs text-slate-500">/{a.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge label={a.visualizer} />
                  </td>
                  <td className="px-6 py-4">
                    <Badge label={a.difficulty ?? '—'} />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => publishMut.mutate({ id: a.id, value: !a.isPublished })}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition ${
                        a.isPublished
                          ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                          : 'bg-slate-500/15 text-slate-400 hover:bg-slate-500/25'
                      }`}
                    >
                      {a.isPublished ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                      {a.isPublished ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button
                      onClick={() => setPreviewId(a.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition"
                      title="Preview"
                    >
                      <Eye size={14} />
                    </button>
                    <button
                      onClick={() => openEdit(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDelTarget(a)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editing ? 'Edit Algorithm' : 'Create Algorithm'}
        onClose={closeModal}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Title" required>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                    slug: editing ? form.slug : slugify(e.target.value),
                  })
                }
                placeholder="Bubble Sort"
                required
              />
            </FormField>
            <FormField label="Slug">
              <Input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                placeholder="bubble-sort"
              />
            </FormField>
          </div>

          <FormField label="Summary">
            <Input
              value={form.summary}
              onChange={(e) => setForm({ ...form, summary: e.target.value })}
              placeholder="A short one-liner"
            />
          </FormField>

          <FormField label="Thumbnail URL (optional)">
            <Input value={form.thumbnailUrl} maxLength={1024}
              onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
              placeholder="HTTPS URL or /images/algorithms/bubble-sort.svg" />
            <p className="text-xs text-slate-400 mt-1">Public HTTPS image or bundled preview path. Leave blank for the built-in preview.</p>
          </FormField>

          <FormField label="Usage / When to use">
            <textarea
              value={form.usage}
              onChange={(e) => setForm({ ...form, usage: e.target.value })}
              rows={2}
              placeholder="Best for small datasets, teaching comparison-based sorting…"
              className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-4">
            <FormField label="Visualizer" required>
              <Select
                value={form.visualizer}
                onChange={(e) => setForm({ ...form, visualizer: e.target.value })}
                options={VISUALIZERS}
              />
            </FormField>
            <FormField label="Difficulty">
              <Select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                options={DIFFICULTIES}
              />
            </FormField>
            <FormField label="Category">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Sorting"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Java Source">
              <textarea
                value={form.javaSource}
                onChange={(e) => setForm({ ...form, javaSource: e.target.value })}
                rows={6}
                placeholder="// Java reference implementation"
                className="w-full px-3 py-2 rounded-xl bg-surface-soft border border-white/10 text-emerald-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </FormField>
            <FormField label="Python Source">
              <textarea
                value={form.pythonSource}
                onChange={(e) => setForm({ ...form, pythonSource: e.target.value })}
                rows={6}
                placeholder="# Python reference implementation"
                className="w-full px-3 py-2 rounded-xl bg-surface-soft border border-white/10 text-sky-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </FormField>
          </div>

          <FormField label="Visualization Spec (JSON)" required>
            <textarea
              value={form.specJson}
              onChange={(e) => {
                setForm({ ...form, specJson: e.target.value });
                setValidateOk(null);
              }}
              onBlur={parseSpecSafe}
              rows={12}
              spellCheck={false}
              className="w-full px-3 py-2 rounded-xl bg-surface-soft border border-white/10 text-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </FormField>

          <FormField label="Complexity (JSON, optional)">
            <textarea
              value={form.complexityJson}
              onChange={(e) => setForm({ ...form, complexityJson: e.target.value })}
              rows={2}
              spellCheck={false}
              placeholder='{ "time": "O(n^2)", "space": "O(1)" }'
              className="w-full px-3 py-2 rounded-xl bg-surface-soft border border-white/10 text-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </FormField>

          {specError && (
            <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              <XCircle size={14} className="mt-0.5 shrink-0" />
              <span>{specError}</span>
            </div>
          )}
          {validateOk && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 size={14} /> Spec validated successfully on server
            </div>
          )}

          {/* Live preview */}
          {livePreview && livePreview.spec?.steps?.length > 0 && (
            <div className="rounded-xl border border-white/10 p-4 bg-sidebar">
              <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Play size={12} /> Live Preview
              </p>
              <AlgorithmVisualizer algorithm={livePreview} width={520} height={280} />
            </div>
          )}

          <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface-raised pb-1">
            <button
              type="button"
              onClick={() => parseSpecSafe() && validateMut.mutate()}
              disabled={validateMut.isPending}
              className="py-2.5 px-4 rounded-xl border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 text-sm transition disabled:opacity-50"
            >
              {validateMut.isPending ? 'Validating…' : 'Validate Spec'}
            </button>
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        open={!!previewId}
        title={previewAlgo ? `Preview — ${previewAlgo.title}` : 'Preview'}
        onClose={() => setPreviewId(null)}
        size="lg"
      >
        <div className="max-h-[75vh] overflow-y-auto">
          {previewLoading || !previewAlgo ? (
            <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
              Loading algorithm…
            </div>
          ) : (
            <>
              {previewAlgo.usage && (
                <p className="text-sm text-slate-400 mb-4 border-l-2 border-violet-500/50 pl-3">
                  {previewAlgo.usage}
                </p>
              )}
              <AlgorithmVisualizer algorithm={previewAlgo} width={560} height={320} />
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!delTarget}
        message={`Delete algorithm "${delTarget?.title}"? This cannot be undone.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
