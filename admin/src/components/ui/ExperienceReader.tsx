import React, { useEffect } from 'react';
import {
  X, Building2, MapPin, Briefcase, CheckCircle2, XCircle,
  ShieldCheck, ShieldX, Clock, Trash2, User,
} from 'lucide-react';
import { RichTextContent } from './RichTextContent';

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

interface ExperienceReaderProps {
  exp: InterviewExperience;
  onClose: () => void;
  onVerify: () => void;
  onUnverify: () => void;
  onDelete: () => void;
  actionPending?: boolean;
}

/**
 * Full-screen review view for a single interview story. Cards in the list are now
 * compact; clicking one opens this reader so admins get the whole screen to read
 * and the verify/delete actions stay pinned in the header.
 */
export const ExperienceReader: React.FC<ExperienceReaderProps> = ({
  exp,
  onClose,
  onVerify,
  onUnverify,
  onDelete,
  actionPending,
}) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] bg-[#0b1016] flex flex-col">
      {/* Sticky header with actions */}
      <header className="shrink-0 border-b border-white/8 bg-surface/80 backdrop-blur">
        <div className="max-w-3xl mx-auto w-full px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-xl bg-violet-500/15 shrink-0">
              <Building2 size={18} className="text-violet-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-white truncate">{exp.company}</h2>
              <p className="text-xs text-slate-400 flex items-center gap-3 mt-0.5">
                <span className="flex items-center gap-1"><Briefcase size={11} /> {exp.role}</span>
                {exp.city && (
                  <span className="flex items-center gap-1"><MapPin size={11} /> {exp.city}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {exp.isVerified ? (
              <button
                onClick={onUnverify}
                disabled={actionPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-amber-400 border border-amber-500/30 hover:bg-amber-500/15 transition disabled:opacity-50"
              >
                <ShieldX size={13} /> Unverify
              </button>
            ) : (
              <button
                onClick={onVerify}
                disabled={actionPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/15 transition disabled:opacity-50"
              >
                <ShieldCheck size={13} /> Verify
              </button>
            )}
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 border border-rose-500/30 hover:bg-rose-500/15 transition"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto w-full px-5 sm:px-6 py-6">
          <div className="flex flex-wrap items-center gap-2 mb-5">
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
            <span className="text-xs text-slate-500 flex items-center gap-1.5 ml-auto">
              <User size={12} /> {exp.authorName ?? 'Unknown student'} ·{' '}
              {new Date(exp.createdAt).toLocaleDateString()}
            </span>
          </div>

          <RichTextContent html={exp.experience} />
        </article>
      </div>
    </div>
  );
};
