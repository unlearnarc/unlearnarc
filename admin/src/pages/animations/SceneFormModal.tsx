import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle2, XCircle, Play, Loader2, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { animationSceneAPI } from '../../api/endpoints';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/FormField';
import { AnimationPreview } from '../../components/animations/AnimationPreview';
import type {
  AnimationCategory,
  AnimationScene,
  AnimationTrace,
  SceneSource,
  SimulatorInfo,
} from '../../types/animation';
import { CATEGORIES, CATEGORY_LABEL, SOURCES, STARTER_TRACE, slugify } from './types';

interface Props {
  open: boolean;
  editing: AnimationScene | null;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  slug: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  category: AnimationCategory;
  source: SceneSource;
  kind: string;
  simulatorParams: string; // JSON
  traceJson: string;
}

const emptyForm: FormState = {
  slug: '',
  title: '',
  description: '',
  thumbnailUrl: '',
  category: 'OTHER',
  source: 'GENERATED',
  kind: '',
  simulatorParams: '{}',
  traceJson: STARTER_TRACE,
};

export const SceneFormModal: React.FC<Props> = ({ open, editing, onClose, onSaved }) => {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [err, setErr] = useState<string | null>(null);
  const [preview, setPreview] = useState<AnimationTrace | null>(null);

  // simulator catalog (self-documenting from the backend)
  const { data: simData } = useQuery({
    queryKey: ['anim-simulators'],
    queryFn: animationSceneAPI.simulators,
    enabled: open,
  });
  const simulators: SimulatorInfo[] = simData?.data?.data ?? [];

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        slug: editing.slug,
        title: editing.title,
        description: editing.description ?? '',
        thumbnailUrl: editing.thumbnailUrl ?? '',
        category: editing.category ?? 'OTHER',
        source: editing.source,
        kind: editing.kind ?? '',
        simulatorParams: '{}',
        traceJson: editing.trace ? JSON.stringify(editing.trace, null, 2) : STARTER_TRACE,
      });
    } else {
      setForm({ ...emptyForm, kind: '' });
    }
    setErr(null);
    setPreview(null);
  }, [open, editing]);

  const selectedSim = useMemo(
    () => simulators.find((s) => s.kind === form.kind),
    [simulators, form.kind],
  );

  // auto-fill category when a simulator is chosen
  const pickSimulator = (kind: string) => {
    const sim = simulators.find((s) => s.kind === kind);
    setForm((f) => ({
      ...f,
      kind,
      category: (sim?.category as AnimationCategory) ?? f.category,
      title: f.title || sim?.title || sim?.kind || f.title,
    }));
    setPreview(null);
  };

  const buildPayload = (): Record<string, unknown> => {
    const payload: Record<string, unknown> = {
      slug: form.slug || slugify(form.title),
      title: form.title,
      description: form.description || undefined,
      thumbnailUrl: form.thumbnailUrl.trim() || null,
      category: form.category,
      source: form.source,
    };
    if (form.source === 'GENERATED') {
      payload.kind = form.kind;
      const p = form.simulatorParams.trim();
      if (p && p !== '{}') payload.simulatorParams = JSON.parse(p);
    } else {
      payload.trace = JSON.parse(form.traceJson);
    }
    return payload;
  };

  const validateMut = useMutation({
    mutationFn: () => animationSceneAPI.validate(buildPayload()),
    onSuccess: (res) => {
      setErr(null);
      setPreview(res.data?.data as AnimationTrace);
      toast.success('Trace is valid ✓');
    },
    onError: (e: { response?: { data?: { message?: string } }; message?: string }) => {
      setPreview(null);
      setErr(e.response?.data?.message ?? e.message ?? 'Validation failed');
      toast.error('Validation failed');
    },
  });

  const previewSimMut = useMutation({
    mutationFn: () => {
      const p = form.simulatorParams.trim();
      const params = p && p !== '{}' ? JSON.parse(p) : {};
      return animationSceneAPI.preview(form.kind, params);
    },
    onSuccess: (res) => {
      setErr(null);
      setPreview(res.data?.data as AnimationTrace);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      setPreview(null);
      setErr(e.response?.data?.message ?? 'Preview failed');
    },
  });

  const saveMut = useMutation({
    mutationFn: () =>
      editing
        ? animationSceneAPI.update(editing.id, buildPayload())
        : animationSceneAPI.create(buildPayload()),
    onSuccess: () => {
      toast.success(editing ? 'Scene updated' : 'Scene created');
      onSaved();
    },
    onError: (e: { response?: { data?: { message?: string } } }) =>
      toast.error(e.response?.data?.message ?? 'Save failed'),
  });

  const safeParse = (): boolean => {
    try {
      if (form.source === 'AUTHORED') JSON.parse(form.traceJson);
      else if (form.simulatorParams.trim()) JSON.parse(form.simulatorParams);
      setErr(null);
      return true;
    } catch (e) {
      setErr('Invalid JSON: ' + (e as Error).message);
      return false;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Title is required');
    if (form.source === 'GENERATED' && !form.kind) return toast.error('Pick a simulator');
    if (!safeParse()) return toast.error('Fix the JSON first');
    saveMut.mutate();
  };

  const busyPreview = validateMut.isPending || previewSimMut.isPending;

  return (
    <Modal
      open={open}
      title={editing ? `Edit Scene — ${editing.title}` : 'Create Animation Scene'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
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
              placeholder="Atomic Compare-And-Swap"
              required
            />
          </FormField>
          <FormField label="Slug">
            <Input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="atomic-cas"
            />
          </FormField>
        </div>

        <FormField label="Thumbnail URL">
          <Input value={form.thumbnailUrl} onChange={e => setForm({ ...form, thumbnailUrl: e.target.value })} maxLength={1024} placeholder="/images/animations/lesson.svg or https://…" />
          <p className="text-xs text-slate-400 mt-1">Optional public image reference. Leave blank to use the automatic preview.</p>
        </FormField>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Short summary shown in the catalog"
            className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Category">
            <Select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as AnimationCategory })}
              options={CATEGORIES.map((c) => ({ label: CATEGORY_LABEL[c], value: c }))}
            />
          </FormField>
          <FormField label="Source" required>
            <Select
              value={form.source}
              onChange={(e) => {
                setForm({ ...form, source: e.target.value as SceneSource });
                setPreview(null);
              }}
              options={SOURCES.map((s) => ({ label: s, value: s }))}
            />
          </FormField>
        </div>

        {/* GENERATED: simulator picker + params */}
        {form.source === 'GENERATED' && (
          <div className="rounded-xl border border-white/10 bg-surface-soft p-4 space-y-3">
            <p className="text-xs uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <Wand2 size={13} /> Server simulator
            </p>
            <FormField label="Simulator (kind)" required>
              <Select
                value={form.kind}
                onChange={(e) => pickSimulator(e.target.value)}
                placeholder="Select a simulator…"
                options={simulators.map((s) => ({
                  label: `${s.title ?? s.kind} · ${s.category ?? 'OTHER'}`,
                  value: s.kind,
                }))}
              />
            </FormField>
            {selectedSim?.description && (
              <p className="text-xs text-slate-500">{selectedSim.description}</p>
            )}
            {selectedSim?.paramSchema && Object.keys(selectedSim.paramSchema).length > 0 && (
              <div className="text-[11px] text-slate-500">
                <span className="font-semibold text-slate-400">Params schema:</span>{' '}
                <code className="text-slate-400">{JSON.stringify(selectedSim.paramSchema)}</code>
              </div>
            )}
            <FormField label="Simulator params (JSON)">
              <textarea
                value={form.simulatorParams}
                onChange={(e) => setForm({ ...form, simulatorParams: e.target.value })}
                rows={3}
                spellCheck={false}
                placeholder='{ "threads": 3 }'
                className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
              />
            </FormField>
            <button
              type="button"
              disabled={!form.kind || previewSimMut.isPending}
              onClick={() => safeParse() && previewSimMut.mutate()}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 transition disabled:opacity-50"
            >
              {previewSimMut.isPending ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Generate preview
            </button>
          </div>
        )}

        {/* AUTHORED: trace JSON */}
        {form.source === 'AUTHORED' && (
          <FormField label="Trace JSON" required>
            <textarea
              value={form.traceJson}
              onChange={(e) => {
                setForm({ ...form, traceJson: e.target.value });
                setPreview(null);
              }}
              onBlur={safeParse}
              rows={14}
              spellCheck={false}
              className="w-full px-3 py-2 rounded-xl bg-surface border border-white/10 text-slate-200 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/50"
            />
          </FormField>
        )}

        {err && (
          <div className="flex items-start gap-2 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
            <XCircle size={14} className="mt-0.5 shrink-0" />
            <span className="break-all">{err}</span>
          </div>
        )}

        {/* Live preview */}
        {preview && preview.keyframes?.length > 0 && (
          <div className="rounded-xl border border-white/10 p-4 bg-sidebar">
            <p className="text-xs uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
              <Play size={12} /> Live preview — {preview.keyframes.length} keyframes ·{' '}
              {(preview.duration / 1000).toFixed(1)}s
            </p>
            <AnimationPreview trace={preview} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface-raised pb-1">
          <button
            type="button"
            onClick={() => safeParse() && validateMut.mutate()}
            disabled={busyPreview}
            className="py-2.5 px-4 rounded-xl border border-violet-500/40 text-violet-300 hover:bg-violet-500/10 text-sm transition disabled:opacity-50"
          >
            {validateMut.isPending ? 'Validating…' : 'Validate'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saveMut.isPending}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50"
          >
            {saveMut.isPending ? 'Saving…' : editing ? 'Save Changes' : 'Create Scene'}
          </button>
        </div>

        {validateMut.isSuccess && !err && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 size={14} /> Trace validated on server
          </div>
        )}
      </form>
    </Modal>
  );
};
