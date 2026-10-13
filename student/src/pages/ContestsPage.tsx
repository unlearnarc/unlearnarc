import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { contestAPI } from '../api/endpoints';
import { EmptyState, Spinner } from '../components/ui';
import { formatDateTime } from '../i18n/format';
import type { Contest, ContestPhase } from '../types';
import { Trophy, Users, ListChecks, Clock, Timer, Code2 } from 'lucide-react';
import clsx from 'clsx';

const PHASE_TONE: Record<ContestPhase, string> = {
  UPCOMING: 'bg-amber-50 text-amber-600 border-amber-200',
  RUNNING:  'bg-success/10 text-success border-success/30',
  ENDED:    'bg-surface-soft text-text-muted border-border',
};

export const ContestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { data, isLoading, error } = useQuery({
    queryKey: ['contests'],
    queryFn: contestAPI.getAll,
  });

  const contests: Contest[] = data?.data?.data ?? [];

  const phaseLabel = (phase: ContestPhase): string => {
    if (phase === 'RUNNING') return t('contests.phaseLive');
    if (phase === 'UPCOMING') return t('contests.phaseUpcoming');
    return t('contests.phaseEnded');
  };

  const formatWindow = (c: Contest): string =>
    c.startTime ? formatDateTime(c.startTime) : t('contests.open');

  if (isLoading) return <Spinner />;
  if (error) {
    return (
      <EmptyState
        icon={Trophy}
        title={t('contests.loadError')}
        description={t('contests.loadErrorDesc')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">{t('contests.title')}</h1>
          <p className="text-sm text-text-muted">{t('contests.subtitle')}</p>
        </div>
      </header>

      {contests.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={t('contests.empty')}
          description={t('contests.emptyDesc')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {contests.map(c => {
            const tone = PHASE_TONE[c.phase] ?? PHASE_TONE.ENDED;
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/contests/${c.id}`)}
                className="card p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition group"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="text-base font-semibold text-text-primary group-hover:text-primary-500 transition line-clamp-2">
                    {c.title}
                  </h3>
                  <span className={clsx(
                    'shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border',
                    tone,
                  )}>
                    {phaseLabel(c.phase)}
                  </span>
                </div>

                {c.description && (
                  <p className="text-sm text-text-muted line-clamp-2 mb-4">{c.description}</p>
                )}

                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-secondary">
                  <span className="flex items-center gap-1"><ListChecks size={13} /> {t('contests.problemsCount', { count: c.problemCount })}</span>
                  <span className="flex items-center gap-1"><Users size={13} /> {c.participantCount}</span>
                  <span className="flex items-center gap-1"><Clock size={13} /> {formatWindow(c)}</span>
                  {c.durationMinutes > 0 && (
                    <span className="flex items-center gap-1"><Timer size={13} /> {t('contests.durationMin', { count: c.durationMinutes })}</span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.allowedLanguages.split(',').map(lang => (
                    <span
                      key={lang}
                      className="inline-flex items-center gap-1 text-[10px] font-medium capitalize px-2 py-0.5 rounded-full bg-surface-soft text-text-secondary border border-border"
                    >
                      <Code2 size={10} /> {lang.trim()}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
