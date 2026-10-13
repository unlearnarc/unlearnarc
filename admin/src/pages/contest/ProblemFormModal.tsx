import React, { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { contestAPI } from '../../api/endpoints';
import { Modal } from '../../components/ui/Modal';
import { FormField, Input, Select } from '../../components/ui/FormField';
import { TestCaseEditor } from './TestCaseEditor';
import {
  Problem, ProblemForm, DIFFICULTY_OPTIONS, HARNESS_OPTIONS, emptyTestCase,
} from './types';

const blankForm: ProblemForm = {
  title: '',
  statement: '',
  constraints: '',
  difficulty: 'EASY',
  maxPoints: 100,
  starterCodeJson: '',
  harnessType: 'STDIN_STDOUT',
  timeLimitMs: 2000,
  displayOrder: 0,
  testCases: [emptyTestCase(0, false), emptyTestCase(1, true)],
};

export const ProblemFormModal: React.FC<{
  open: boolean;
  contestId: string;
  editing: Problem | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, contestId, editing, onClose, onSaved }) => {
  const [form, setForm] = useState<ProblemForm>(blankForm);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        title: editing.title,
        statement: editing.statement,
        constraints: editing.constraints ?? '',
        difficulty: editing.difficulty,
        maxPoints: editing.maxPoints,
        starterCodeJson: editing.starterCodeJson ?? '',
        harnessType: editing.harnessType,
        timeLimitMs: editing.timeLimitMs,
        displayOrder: editing.displayOrder,
        testCases: (editing.testCases ?? []).map((tc, i) => ({ ...tc, displayOrder: i })),
      });
    } else {
      setForm({ ...blankForm, testCases: [emptyTestCase(0, false), emptyTestCase(1, true)] });
    }
  }, [open, editing]);

  const createMut = useMutation({
    mutationFn: () => contestAPI.addProblem(contestId, form as unknown as Record<string, unknown>),
    onSuccess: () => { toast.success('Problem added'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to add problem'),
  });
  const updateMut = useMutation({
    mutationFn: () => contestAPI.updateProblem(editing!.id, form as unknown as Record<string, unknown>),
    onSuccess: () => { toast.success('Problem updated'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update problem'),
  });

  // starter code JSON validity (optional field)
  const starterValid = (() => {
    if (!form.starterCodeJson.trim()) return true;
    try { JSON.parse(form.starterCodeJson); return true; } catch { return false; }
  })();

  const valid =
    form.title.trim() !== '' &&
    form.statement.trim() !== '' &&
    form.testCases.length > 0 &&
    form.testCases.every((tc) => tc.input.trim() !== '' && tc.expectedOutput.trim() !== '') &&
    starterValid;

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} title={editing ? 'Edit Problem' : 'Add Problem'} onClose={onClose} size="lg">
      <form
        onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }}
        className="space-y-4 max-h-[76vh] overflow-y-auto pr-1"
      >
        <FormField label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Two Sum"
            autoFocus
          />
        </FormField>

        <FormField label="Statement (Markdown)" required>
          <textarea
            value={form.statement}
            onChange={(e) => setForm({ ...form, statement: e.target.value })}
            rows={5}
            placeholder="Describe the problem…"
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition resize-y font-mono"
          />
        </FormField>

        <FormField label="Constraints / I/O format (Markdown)">
          <textarea
            value={form.constraints}
            onChange={(e) => setForm({ ...form, constraints: e.target.value })}
            rows={3}
            placeholder="e.g. 1 ≤ n ≤ 10^5"
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition resize-y font-mono"
          />
        </FormField>

        <div className="grid grid-cols-4 gap-3">
          <FormField label="Difficulty" required>
            <Select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as ProblemForm['difficulty'] })}
              options={DIFFICULTY_OPTIONS}
            />
          </FormField>
          <FormField label="Max points">
            <Input type="number" min={1} max={1000}
              value={form.maxPoints}
              onChange={(e) => setForm({ ...form, maxPoints: parseInt(e.target.value) || 1 })}
            />
          </FormField>
          <FormField label="Time limit (ms)">
            <Input type="number" min={100} step={100}
              value={form.timeLimitMs}
              onChange={(e) => setForm({ ...form, timeLimitMs: parseInt(e.target.value) || 2000 })}
            />
          </FormField>
          <FormField label="Order">
            <Input type="number" min={0}
              value={form.displayOrder}
              onChange={(e) => setForm({ ...form, displayOrder: parseInt(e.target.value) || 0 })}
            />
          </FormField>
        </div>

        <FormField label="Harness type" required>
          <Select
            value={form.harnessType}
            onChange={(e) => setForm({ ...form, harnessType: e.target.value as ProblemForm['harnessType'] })}
            options={HARNESS_OPTIONS}
          />
        </FormField>

        <FormField label="Starter code (JSON keyed by language)" error={!starterValid ? 'Invalid JSON' : undefined}>
          <textarea
            value={form.starterCodeJson}
            onChange={(e) => setForm({ ...form, starterCodeJson: e.target.value })}
            rows={3}
            placeholder={'{"python":"def solve():\\n    pass","java":"class Solution {}"}'}
            className={`w-full px-3 py-2.5 rounded-lg bg-white/5 border ${
              starterValid ? 'border-white/10 focus:ring-violet-500/50' : 'border-rose-500 focus:ring-rose-500/50'
            } text-white placeholder-slate-500 text-xs font-mono focus:outline-none focus:ring-2 transition resize-y`}
          />
        </FormField>

        {/* Test cases */}
        <div className="p-4 rounded-xl bg-bg border border-white/8">
          <TestCaseEditor
            testCases={form.testCases}
            onChange={(testCases) => setForm({ ...form, testCases })}
          />
        </div>

        <div className="flex gap-3 pt-1 sticky bottom-0 bg-surface-raised pb-1">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
          >
            Cancel
          </button>
          <button type="submit" disabled={saving || !valid}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-40"
          >
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Problem'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
