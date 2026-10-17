import React, { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { contestAPI } from '../api/endpoints';
import { EmptyState, Spinner } from '../components/ui';
import { ContestSolver } from '../components/contest/ContestSolver';
import type { Contest, ContestProblem } from '../types';
import {
  Trophy, ArrowLeft, ListChecks, ChevronRight, CheckCircle2,
} from 'lucide-react';
import clsx from 'clsx';

const DIFF_TONE: Record<string, string> = {
  EASY:   'text-success',
  MEDIUM: 'text-amber-500',
  HARD:   'text-danger',
};

export const ContestDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeProblemId, setActiveProblemId] = useState<string | null>(null);

  const contestQ = useQuery({
    queryKey: ['contest', id],
    queryFn: () => contestAPI.getById(id),
    enabled: !!id,
  });
  const problemsQ = useQuery({
    queryKey: ['contest-problems', id],
    queryFn: () => contestAPI.getProblems(id),
    enabled: !!id,
  });

  const contest: Contest | undefined = contestQ.data?.data?.data;
  const problems: ContestProblem[] = problemsQ.data?.data?.data ?? [];

  const activeProblem = useMemo(
    () => problems.find(p => p.id === activeProblemId) ?? null,
    [problems, activeProblemId],
  );

  if (contestQ.isLoading || problemsQ.isLoading) return <Spinner />;
  if (contestQ.error || !contest) {
    return (
      <EmptyState
        icon={Trophy}
        title={t('contests.notFound')}
        description={t('contests.notFoundDesc')}
      />
    );
  }

  // Solving view — the full problem + sandbox runner.
  if (activeProblem) {
    return (
      <ContestSolver
        contest={contest}
        problem={activeProblem}
        onBack={() => setActiveProblemId(null)}
      />
    );
  }

  const difficultyLabel = (d: string): string =>
    t(`contests.difficulty.${d}`, { defaultValue: d });

  // Problem list view.
  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/contests')}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition"
      >
        <ArrowLeft size={15} className="ua-flip-rtl" /> {t('contests.allContests')}
      </button>

      <header className="card p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold text-text-primary tracking-tight break-words">{contest.title}</h1>
        <p className="mt-2 flex items-center gap-1.5 text-sm text-text-secondary">
          <ListChecks size={15} className="shrink-0" aria-hidden="true" />
          {t('contests.problemsCount', { count: problems.length })}
        </p>
      </header>

      {problems.length === 0 ? (
        <EmptyState icon={ListChecks} title={t('contests.noProblems')} />
      ) : (
        <div className="card divide-y divide-border overflow-hidden">
          {problems.map((p, idx) => (
            <button
              key={p.id}
              onClick={() => setActiveProblemId(p.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-surface-soft transition group"
            >
              <span className="w-7 h-7 shrink-0 rounded-lg bg-surface-soft text-text-muted text-xs font-semibold flex items-center justify-center">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary group-hover:text-primary-500 transition truncate">
                  {p.title}
                </p>
                <div className="flex items-center gap-3 mt-0.5 text-xs">
                  <span className={clsx('font-medium', DIFF_TONE[p.difficulty])}>{difficultyLabel(p.difficulty)}</span>
                  <span className="text-text-muted flex items-center gap-1">
                    <CheckCircle2 size={12} /> {t('contests.points', { count: p.maxPoints })}
                  </span>
                  <span className="text-text-muted">{t('contests.samplesHidden', { samples: p.sampleTestCases.length, hidden: p.hiddenTestCount })}</span>
                </div>
              </div>
              <ChevronRight size={18} className="text-text-muted shrink-0 ua-flip-rtl" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
