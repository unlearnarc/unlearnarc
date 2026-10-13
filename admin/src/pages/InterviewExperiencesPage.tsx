import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  MessageSquareText, Building2, MapPin, Briefcase,
  CheckCircle2, XCircle, ShieldCheck, Clock, User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { interviewAPI } from '../api/endpoints';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { ExperienceReader } from '../components/ui/ExperienceReader';
import { htmlToPlainText } from '../utils/sanitizeHtml';

interface InterviewExperience {
  id: string;
  userId: string;
  authorName?: string;
  isPassed: boolean;
  company: string;
  city?: string;
  role: string;
  experience: string;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

type Filter = 'pending' | 'verified' | 'all';

// ── Compact card (click to open full-screen reader) ──────────────────────────
const ExperienceCard: React.FC<{
  exp: InterviewExperience;
  onRead: (e: InterviewExperience) => void;
}> = ({ exp, onRead }) => {
  const preview = htmlToPlainText(exp.experience);
  const teaser = preview.length > 180 ? `${preview.slice(0, 180).trimEnd()}…` : preview;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onRead(exp)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onRead(exp); }
      }}
      className="bg-surface/60 border border-white/8 rounded-2xl p-5 cursor-pointer hover:border-white/20 hover:bg-surface/80 transition focus:outline-none focus:ring-2 focus:ring-violet-500/50"
    >
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 rounded-xl bg-violet-500/15 shrink-0">
            <Building2 size={18} className="text-violet-400" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">{exp.company}</h3>
            <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1"><Briefcase size={11} /> {exp.role}</span>
              {exp.city && <span className="flex items-center gap-1"><MapPin size={11} /> {exp.city}</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
              exp.isPassed
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
            }`}
          >
            {exp.isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
            {exp.isPassed ? 'Passed' : 'Not selected'}
          </span>
          {exp.isVerified ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-emerald-500/15 text-emerald-400 border-emerald-500/30">
              <ShieldCheck size={12} /> Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/15 text-amber-400 border-amber-500/30">
              <Clock size={12} /> Pending
            </span>
          )}
        </div>
      </div>

      {/* Compact teaser */}
      <p className="text-sm text-slate-300 line-clamp-2">{teaser}</p>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
        <span className="text-xs text-slate-500 flex items-center gap-1.5">
          <User size={12} /> {exp.authorName ?? 'Unknown student'} ·{' '}
          {new Date(exp.createdAt).toLocaleDateString()}
        </span>
        <span className="text-xs font-medium text-violet-400">Open to review →</span>
      </div>
    </div>
  );
};

// ── Main page ───────────────────────────────────────────────────────────────
export const InterviewExperiencesPage: React.FC = () => {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('pending');
  const [delTarget, setDelTarget] = useState<InterviewExperience | null>(null);
  const [reading, setReading] = useState<InterviewExperience | null>(null);

  const verifiedParam =
    filter === 'all' ? undefined : filter === 'verified';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-interviews', filter],
    queryFn: () => interviewAPI.getAll(verifiedParam),
  });

  const all: InterviewExperience[] = data?.data?.data ?? [];
  const filtered = all;

  // Keep the open reader in sync with refetched data (e.g. after verify/unverify).
  const readingLive = reading
    ? all.find((e) => e.id === reading.id) ?? reading
    : null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-interviews'] });

  const verifyMut = useMutation({
    mutationFn: (id: string) => interviewAPI.verify(id),
    onSuccess: () => { invalidate(); toast.success('Verified — now public'); },
    onError: () => toast.error('Failed to verify'),
  });

  const unverifyMut = useMutation({
    mutationFn: (id: string) => interviewAPI.unverify(id),
    onSuccess: () => { invalidate(); toast.success('Unverified — hidden from feed'); },
    onError: () => toast.error('Failed to unverify'),
  });

  const deleteMut = useMutation({
    mutationFn: () => interviewAPI.delete(delTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-interviews'] });
      toast.success('Experience deleted');
      setReading(null);
      setDelTarget(null);
    },
    onError: () => toast.error('Failed to delete'),
  });

  const TABS: { key: Filter; label: string }[] = [
    { key: 'pending',  label: 'Pending Review' },
    { key: 'verified', label: 'Verified' },
    { key: 'all',      label: 'All' },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <MessageSquareText size={22} className="text-violet-400" />
          Interview Experiences
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Review student-submitted stories. Verify to publish them, or delete inappropriate ones.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === t.key
                  ? 'bg-violet-600/30 text-violet-200 border border-violet-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface/60 border border-white/8 rounded-2xl">
          <EmptyState
            message={
              filter === 'pending'
                ? 'No experiences pending review 🎉'
                : 'No experiences found'
            }
          />
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((e) => (
            <ExperienceCard key={e.id} exp={e} onRead={setReading} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 mt-3">
          {filtered.length} experience{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Full-screen reader / review */}
      {readingLive && (
        <ExperienceReader
          exp={readingLive}
          onClose={() => setReading(null)}
          onVerify={() => verifyMut.mutate(readingLive.id)}
          onUnverify={() => unverifyMut.mutate(readingLive.id)}
          onDelete={() => setDelTarget(readingLive)}
          actionPending={verifyMut.isPending || unverifyMut.isPending}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!delTarget}
        message={`Delete the "${delTarget?.company}" experience by ${delTarget?.authorName ?? 'this student'}? This cannot be undone.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
