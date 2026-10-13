import React, { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { contestAPI } from '../../api/endpoints';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/FormField';
import {
  Contest, ContestForm, VISIBILITY_OPTIONS,
  isoToLocalInput, localInputToIso,
} from './types';

const blank: ContestForm = {
  title: '',
  slug: '',
  description: '',
  visibility: 'PUBLIC',
  startTime: '',
  endTime: '',
  durationMinutes: 0,
  allowedLanguages: 'python,java,cpp,javascript',
  wrongSubmissionPenalty: 0,
};

export const ContestFormModal: React.FC<{
  open: boolean;
  editing: Contest | null;
  onClose: () => void;
}> = ({ open, editing, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState<ContestForm>(blank);

  useEffect(() => {
    if (!open) return;
    setForm(editing ? {
      title: editing.title,
      slug: editing.slug ?? '',
      description: editing.description ?? '',
      visibility: editing.visibility,
      startTime: isoToLocalInput(editing.startTime),
      endTime: isoToLocalInput(editing.endTime),
      durationMinutes: editing.durationMinutes,
      allowedLanguages: editing.allowedLanguages,
      wrongSubmissionPenalty: editing.wrongSubmissionPenalty,
    } : { ...blank });
  }, [open, editing]);

  const payload = () => ({
    title: form.title,
    slug: form.slug.trim() || undefined,
    description: form.description,
    visibility: form.visibility,
    startTime: localInputToIso(form.startTime),
    endTime: localInputToIso(form.endTime),
    durationMinutes: form.durationMinutes,
    allowedLanguages: form.allowedLanguages,
    wrongSubmissionPenalty: form.wrongSubmissionPenalty,
  });

  const createMut = useMutation({
    mutationFn: () => contestAPI.create(payload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contests'] }); toast.success('Contest created'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create contest'),
  });
  const updateMut = useMutation({
    mutationFn: () => contestAPI.update(editing!.id, payload()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contests'] }); toast.success('Contest updated'); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update contest'),
  });

  const windowOk = !form.startTime || !form.endTime || new Date(form.endTime) > new Date(form.startTime);
  const valid = form.title.trim() !== '' && windowOk;
  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} title={editing ? 'Edit Contest' : 'Create Contest'} onClose={onClose} size="md">
      <form
        onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }}
        className="space-y-4"
      >
        <FormField label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Weekly DSA Challenge #1"
            autoFocus
          />
        </FormField>

        <FormField label="Slug (optional — auto-generated from title)">
          <Input
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="weekly-dsa-challenge-1"
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Optional description…"
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition resize-none"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Visibility" required>
            <Select
              value={form.visibility}
              onChange={(e) => setForm({ ...form, visibility: e.target.value as ContestForm['visibility'] })}
              options={VISIBILITY_OPTIONS}
            />
          </FormField>
          <FormField label="Per-participant minutes (0 = until end)">
            <Input type="number" min={0}
              value={form.durationMinutes}
              onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value) || 0 })}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Start time">
            <Input type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            />
          </FormField>
          <FormField label="End time" error={!windowOk ? 'End must be after start' : undefined}>
            <Input type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              error={!windowOk}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Allowed languages (CSV)">
            <Input
              value={form.allowedLanguages}
              onChange={(e) => setForm({ ...form, allowedLanguages: e.target.value })}
              placeholder="python,java,cpp,javascript"
            />
          </FormField>
          <FormField label="Wrong-submission penalty">
            <Input type="number" min={0}
              value={form.wrongSubmissionPenalty}
              onChange={(e) => setForm({ ...form, wrongSubmissionPenalty: parseInt(e.target.value) || 0 })}
            />
          </FormField>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving || !valid}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-40"
          >
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Contest'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
