import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { enrollmentAPI, testAPI } from '../../api/endpoints';
import { ProgressBar } from '../ui/ProgressBar';
import type { Page, TestAttemptSummary } from '../../types';

// Preserve the profile's existing 500-point milestone; do not invent a level system.
const XP_TARGET = 500;

export function LearningProgress() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const enrollments = useQuery({ queryKey: ['my-learnings'], queryFn: enrollmentAPI.getMine });
  const history = useQuery({ queryKey: ['test-history', 0], queryFn: () => testAPI.history(0, 20) });
  const courses: { courseId: string }[] | undefined = enrollments.data?.data?.data;
  const attempts: Page<TestAttemptSummary> | undefined = history.data?.data?.data;
  const points = user?.points;
  const percent = points == null ? undefined : Math.min(100, Math.max(0, points / XP_TARGET * 100));
  const format = (value?: number) => value == null ? '—' : value.toLocaleString(i18n.language);

  return <section className="card profile-learning" aria-labelledby="profile-learning-title">
    <header className="profile-card-heading"><GraduationCap size={18} aria-hidden="true" /><h2 id="profile-learning-title">{t('profile.learningProgress')}</h2>
      <span className="badge-primary">{t('profile.compact.milestone', 'XP milestone')}</span>
    </header>
    <div className="profile-xp"><strong>{format(points)} <small>/ {format(XP_TARGET)} XP</small></strong><span>{percent == null ? '—' : `${Math.round(percent)}%`}</span></div>
    <div role="progressbar" aria-label={t('profile.learningProgress')} aria-valuemin={0} aria-valuemax={XP_TARGET} aria-valuenow={points == null ? undefined : Math.min(XP_TARGET, Math.max(0, points))}>
      <ProgressBar value={percent ?? 0} height="h-2.5" />
    </div>
    <p>{t('profile.compact.progressHint', 'Your learning points count toward this XP milestone.')}</p>
    <dl className="profile-learning-stats">
      <div><BookOpen size={16} aria-hidden="true" /><dd>{format(enrollments.isSuccess && courses ? courses.length : undefined)}</dd><dt>{t('profile.compact.coursesStarted', 'Courses started')}</dt></div>
      <div><Target size={16} aria-hidden="true" /><dd>{format(history.isSuccess ? attempts?.totalElements : undefined)}</dd><dt>{t('profile.compact.testsCompleted', 'Tests completed')}</dt></div>
    </dl>
    {(enrollments.isError || history.isError) && <p role="status">{t('profile.compact.statsError', 'Some learning statistics are unavailable.')} <button type="button" className="text-primary-500 underline" onClick={() => { if (enrollments.isError) void enrollments.refetch(); if (history.isError) void history.refetch(); }}>{t('common.retry', 'Retry')}</button></p>}
  </section>;
}
