import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight, Trophy, Users, Code2,
  Send, Archive, FileEdit, Globe, Lock, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { contestAPI } from '../api/endpoints';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ContestFormModal } from './contest/ContestFormModal';
import { ContestProblemsPanel } from './contest/ContestProblemsPanel';
import { Contest, ContestStatus, statusColor } from './contest/types';

const phasePill = (phase: string) => {
  const map: Record<string, string> = {
    UPCOMING: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    RUNNING:  'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    ENDED:    'bg-slate-500/15 text-slate-400 border-slate-500/30',
  };
  return map[phase] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30';
};

const ContestRow: React.FC<{
  c: Contest;
  onEdit: (c: Contest) => void;
  onDelete: (c: Contest) => void;
}> = ({ c, onEdit, onDelete }) => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const statusMut = useMutation({
    mutationFn: (status: ContestStatus) => contestAPI.setStatus(c.id, status),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['contests'] });
      toast.success(`Contest ${status.toLowerCase()}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to change status'),
  });

  return (
    <div className="border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition group">
        <button onClick={() => setOpen(!open)} className="text-slate-500 hover:text-white shrink-0">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <Trophy size={16} className="text-violet-400 shrink-0" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white text-sm">{c.title}</span>
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${statusColor[c.status]}`}>
              {c.status}
            </span>
            {c.phase && (
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${phasePill(c.phase)}`}>
                {c.phase}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-white/8">
              {c.visibility === 'PUBLIC' ? <Globe size={11} /> : <Lock size={11} />} {c.visibility}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            <span className="text-slate-600">/{c.slug}</span>
            {c.startTime && ` · ${new Date(c.startTime).toLocaleString()}`}
            {c.endTime && ` → ${new Date(c.endTime).toLocaleString()}`}
          </p>
        </div>

        {/* live counts */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-400">
          <span className="inline-flex items-center gap-1"><Code2 size={12} className="text-violet-400" />{c.problemCount ?? 0}</span>
          <span className="inline-flex items-center gap-1"><Users size={12} className="text-blue-400" />{c.participantCount ?? 0}</span>
        </div>

        {/* actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          {c.status !== 'PUBLISHED' && (
            <button
              onClick={() => statusMut.mutate('PUBLISHED')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 transition"
            >
              <Send size={12} /> Publish
            </button>
          )}
          {c.status === 'PUBLISHED' && (
            <button
              onClick={() => statusMut.mutate('ARCHIVED')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 transition"
            >
              <Archive size={12} /> Archive
            </button>
          )}
          {c.status === 'ARCHIVED' && (
            <button
              onClick={() => statusMut.mutate('DRAFT')}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/10 border border-white/10 transition"
            >
              <FileEdit size={12} /> To Draft
            </button>
          )}
          <button onClick={() => onEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(c)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {open && (
        <div className="px-8 pb-5">
          <ContestProblemsPanel contest={c} />
        </div>
      )}
    </div>
  );
};

export const ContestsPage: React.FC = () => {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<ContestStatus | 'ALL'>('ALL');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Contest | null>(null);
  const [del, setDel] = useState<Contest | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: contestAPI.getAll,
  });
  const contests: Contest[] = data?.data?.data ?? [];

  const filtered = contests.filter((c) => statusFilter === 'ALL' || c.status === statusFilter);

  const deleteMut = useMutation({
    mutationFn: () => contestAPI.delete(del!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contests'] });
      toast.success('Contest deleted');
      setDel(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to delete contest'),
  });

  const published = contests.filter((c) => c.status === 'PUBLISHED').length;
  const drafts    = contests.filter((c) => c.status === 'DRAFT').length;
  const running   = contests.filter((c) => c.phase === 'RUNNING').length;

  const openCreate = () => { setEditing(null); setModal(true); };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Trophy size={22} className="text-violet-400" /> Contests
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            LeetCode / NeetCode-style coding contests · code runs on the student's machine, the server re-validates outputs
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-violet-900/30"
        >
          <Plus size={16} /> New Contest
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total contests', value: contests.length, icon: <Trophy size={18} className="text-violet-400" /> },
          { label: 'Published',      value: published,        icon: <CheckCircle size={18} className="text-emerald-400" /> },
          { label: 'Running now',    value: running,          icon: <Send size={18} className="text-blue-400" /> },
          { label: 'Drafts',         value: drafts,           icon: <FileEdit size={18} className="text-slate-400" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
            {icon}
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Status filter */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8 w-fit mb-5">
        {(['ALL', 'DRAFT', 'PUBLISHED', 'ARCHIVED'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              statusFilter === s ? 'bg-violet-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No contests yet"
            action={<button onClick={openCreate} className="text-xs text-violet-400 hover:underline">Create your first contest</button>}
          />
        ) : (
          filtered.map((c) => (
            <ContestRow key={c.id} c={c} onEdit={(c) => { setEditing(c); setModal(true); }} onDelete={setDel} />
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 mt-3">{filtered.length} contest{filtered.length !== 1 ? 's' : ''}</p>
      )}

      {/* How it works */}
      <div className="mt-6 p-4 rounded-xl bg-blue-500/6 border border-blue-500/20 space-y-2">
        <p className="text-xs font-semibold text-blue-300">How contest grading works (client-side execution)</p>
        <ul className="text-xs text-slate-400 space-y-1 pl-1">
          <li>• Students run their code <strong className="text-white">on their own machine</strong> — code is never sent to the server.</li>
          <li>• The server ships <span className="text-emerald-400">public</span> sample cases (input + expected) and only the <strong className="text-white">inputs</strong> of <span className="text-violet-400">hidden</span> cases.</li>
          <li>• The client posts back the outputs it produced; the server re-compares them against the stored hidden expected outputs to compute the authoritative score.</li>
          <li>• Publish a contest to open it; set a start/end window and per-participant time limit as needed.</li>
        </ul>
      </div>

      <ContestFormModal open={modal} editing={editing} onClose={() => { setModal(false); setEditing(null); }} />

      <ConfirmDialog
        open={!!del}
        message={`Delete contest "${del?.title}"? All its problems, test cases, submissions and leaderboard data will be permanently removed.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDel(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
