import { useQuery } from '@tanstack/react-query';
import { BookOpen, GraduationCap, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { enrollmentAPI, testAPI } from '../../api/endpoints';
import type { Page, TestAttemptSummary } from '../../types';

export function LearningProgress() {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const enrollments = useQuery({ queryKey: ['my-learnings'], queryFn: enrollmentAPI.getMine });
  const history = useQuery({ queryKey: ['test-history', 0], queryFn: () => testAPI.history(0, 20) });
  const courses: { courseId: string }[] | undefined = enrollments.data?.data?.data;
  const attempts: Page<TestAttemptSummary> | undefined = history.data?.data?.data;
  const points = user?.points;
  const format = (value?: number) => value == null ? '—' : value.toLocaleString(i18n.language);

  return <section className="card profile-learning" aria-labelledby="profile-learning-title">
    <header className="profile-card-heading"><GraduationCap size={18} aria-hidden="true" /><h2 id="profile-learning-title">{t('profile.learningProgress')}</h2>
    </header>
    <div className="profile-xp"><strong>{format(points)} <small>XP</small></strong></div>
    <dl className="profile-learning-stats">
      <div><BookOpen size={16} aria-hidden="true" /><dd>{format(enrollments.isSuccess && courses ? courses.length : undefined)}</dd><dt>{t('profile.compact.coursesStarted', 'Courses started')}</dt></div>
      <div><Target size={16} aria-hidden="true" /><dd>{format(history.isSuccess ? attempts?.totalElements : undefined)}</dd><dt>{t('profile.compact.testsCompleted', 'Tests completed')}</dt></div>
    </dl>
    {(enrollments.isError || history.isError) && <p role="status">{t('profile.compact.statsError', 'Some learning statistics are unavailable.')} <button type="button" className="text-primary-500 underline" onClick={() => { if (enrollments.isError) void enrollments.refetch(); if (history.isError) void history.refetch(); }}>{t('common.retry', 'Retry')}</button></p>}
  </section>;
}
