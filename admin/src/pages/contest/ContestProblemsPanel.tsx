import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Code2, Lock, Eye, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contestAPI } from '../../api/endpoints';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ProblemFormModal } from './ProblemFormModal';
import { Contest, Problem, diffColor } from './types';

const ProblemRow: React.FC<{
  p: Problem;
  idx: number;
  onEdit: (p: Problem) => void;
  onDelete: (p: Problem) => void;
}> = ({ p, idx, onEdit, onDelete }) => {
  const [open, setOpen] = useState(false);
  const cases = p.testCases ?? [];
  const hidden = cases.filter((c) => c.isHidden);
  const publics = cases.filter((c) => !c.isHidden);

  return (
    <div className="border-b border-white/5 last:border-0">
      <div className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition group">
        <button onClick={() => setOpen(!open)} className="mt-0.5 text-slate-500 hover:text-white shrink-0">
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/8 text-slate-500 text-xs font-bold mt-0.5 shrink-0">
          {idx + 1}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-100 font-medium">{p.title}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${diffColor[p.difficulty]}`}>
              {p.difficulty}
            </span>
            <span className="text-xs text-slate-500">{p.maxPoints} pts</span>
            <span className="text-xs text-slate-500">{p.harnessType === 'STDIN_STDOUT' ? 'stdin/stdout' : 'fn return'}</span>
            <span className="inline-flex items-center gap-1 text-xs text-emerald-400"><Eye size={11} />{publics.length}</span>
            <span className="inline-flex items-center gap-1 text-xs text-violet-400"><Lock size={11} />{hidden.length}</span>
            <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Clock size={11} />{p.timeLimitMs}ms</span>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button onClick={() => onEdit(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <Pencil size={13} />
          </button>
          <button onClick={() => onDelete(p)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {open && (
        <div className="pl-16 pr-5 pb-4 space-y-2">
          {cases.length === 0 ? (
            <p className="text-xs text-slate-600 italic">No test cases.</p>
          ) : (
            cases
              .slice()
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((tc, i) => (
                <div
                  key={tc.id ?? i}
                  className={`rounded-lg border p-2.5 text-xs ${
                    tc.isHidden ? 'bg-violet-500/5 border-violet-500/20' : 'bg-emerald-500/5 border-emerald-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] ${
                      tc.isHidden ? 'text-violet-300' : 'text-emerald-300'
                    }`}>
                      {tc.isHidden ? <Lock size={10} /> : <Eye size={10} />}
                      {tc.isHidden ? 'Hidden' : 'Public'}
                    </span>
                    <span className="text-slate-500">weight {tc.weight}</span>
                    {tc.strictMatch && <span className="text-amber-400">strict</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <pre className="whitespace-pre-wrap break-words text-slate-400 bg-bg rounded p-2 font-mono">{tc.input || '—'}</pre>
                    <pre className="whitespace-pre-wrap break-words text-slate-300 bg-bg rounded p-2 font-mono">{tc.expectedOutput || '—'}</pre>
                  </div>
                </div>
              ))
          )}
        </div>
      )}
    </div>
  );
};

export const ContestProblemsPanel: React.FC<{ contest: Contest }> = ({ contest }) => {
  const qc = useQueryClient();
  const [modalOpen, setModal] = useState(false);
  const [editing, setEditing] = useState<Problem | null>(null);
  const [del, setDel] = useState<Problem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contest-problems', contest.id],
    queryFn: () => contestAPI.getProblems(contest.id),
  });
  const problems: Problem[] = (data?.data?.data ?? []).slice().sort(
    (a: Problem, b: Problem) => a.displayOrder - b.displayOrder,
  );

  const deleteMut = useMutation({
    mutationFn: () => contestAPI.deleteProblem(del!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contest-problems', contest.id] });
      qc.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Problem deleted');
      setDel(null);
    },
    onError: () => toast.error('Failed to delete problem'),
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['contest-problems', contest.id] });
    qc.invalidateQueries({ queryKey: ['contests'] });
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex items-center gap-1.5">
          <Code2 size={13} className="text-violet-400" /> Problems
        </p>
        <button
          onClick={() => { setEditing(null); setModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition"
        >
          <Plus size={13} /> Add Problem
        </button>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 py-4 text-center">Loading problems…</div>
      ) : problems.length === 0 ? (
        <div className="text-xs text-slate-600 py-6 text-center italic">
          No problems yet. Click "Add Problem" to build this contest.
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden">
          {problems.map((p, i) => (
            <ProblemRow key={p.id} p={p} idx={i} onEdit={(p) => { setEditing(p); setModal(true); }} onDelete={setDel} />
          ))}
        </div>
      )}

      <ProblemFormModal
        open={modalOpen}
        contestId={contest.id}
        editing={editing}
        onClose={() => { setModal(false); setEditing(null); }}
        onSaved={refresh}
      />

      <ConfirmDialog
        open={!!del}
        message={`Delete problem "${del?.title}" and all its test cases?`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDel(null)}
        loading={deleteMut.isPending}
      />
    </>
  );
};
