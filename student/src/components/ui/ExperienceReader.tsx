import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X, Building2, MapPin, Briefcase, CheckCircle2, XCircle, ShieldCheck, Clock,
} from 'lucide-react';
import { formatDate } from '../../i18n/format';
import { RichTextContent } from './RichTextContent';
// Temporarily disabled: read-aloud UI.
// import { SpeakButton } from './SpeakButton';
import type { InterviewExperience } from '../../types';

interface ExperienceReaderProps {
  exp: InterviewExperience;
  /** When true, shows pending/verified status (for the author's own posts). */
  ownerMode?: boolean;
  onClose: () => void;
}

/**
 * Full-screen reading view for a single interview story. Opened by clicking a
 * (now compact) card, so the feed stays dense while the story gets the whole
 * screen for comfortable reading.
 */
export const ExperienceReader: React.FC<ExperienceReaderProps> = ({
  exp,
  ownerMode,
  onClose,
}) => {
  const { t } = useTranslation();
  // Close on Escape + lock background scroll while open.
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
    <div className="fixed inset-0 z-[70] bg-background animate-fade-in flex flex-col">
      {/* Sticky header */}
      <header className="shrink-0 border-b border-border bg-surface/95 backdrop-blur">
        <div className="max-w-3xl mx-auto w-full px-5 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[10px] bg-primary-50 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-primary-500" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary truncate">{exp.company}</h2>
              <p className="text-xs text-text-muted flex items-center gap-2 mt-0.5">
                <span className="flex items-center gap-1"><Briefcase size={11} /> {exp.role}</span>
                {exp.city && (
                  <span className="flex items-center gap-1"><MapPin size={11} /> {exp.city}</span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('interviews.close')}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-soft transition shrink-0"
          >
            <X size={20} />
          </button>
        </div>
      </header>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto w-full px-5 sm:px-6 pt-4 pb-8">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                exp.isPassed ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
              }`}
            >
              {exp.isPassed ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
              {exp.isPassed ? t('interviews.passed') : t('interviews.notSelectedShort')}
            </span>
            {ownerMode && (
              exp.isVerified ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-success-soft text-success">
                  <ShieldCheck size={12} /> {t('interviews.verified')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning-soft text-warning">
                  <Clock size={12} /> {t('interviews.pendingReview')}
                </span>
              )
            )}
            <span className="text-xs text-text-muted ml-auto">
              {t('interviews.byAuthor', { author: exp.authorName ?? t('interviews.student'), date: formatDate(exp.createdAt) })}
            </span>
          </div>

          {/* Temporarily disabled: read-aloud for the story body.
          <div className="mb-4">
            <SpeakButton text={exp.experience} id={`exp-${exp.id}`} html label />
          </div>
          */}

          <RichTextContent html={exp.experience} className="text-text-secondary text-[15px]" />
        </article>
      </div>
    </div>
  );
};
