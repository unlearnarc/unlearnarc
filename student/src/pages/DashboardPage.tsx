import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { courseAPI, contestAPI, enrollmentAPI, testAPI, roadmapAPI } from '../api/endpoints';
import { CourseCard, Spinner } from '../components/ui';
import { formatDateTime } from '../i18n/format';
import type { Course, Contest, TestAttemptSummary, Page } from '../types';
import {
  ArrowRight, BookOpen, CheckCircle, ChevronRight, Clock, Code2,
  Flame, GraduationCap, Map as MapIcon, Play, Sparkles, Star, Target, Trophy,
} from 'lucide-react';
import './dashboard.css';

interface EnrolledCourse { courseId: string }
interface Role { id: string; name: string; description?: string }

const LearningSection: React.FC<{
  id: string; title: string; subtitle: string; to: string; linkLabel: string;
  children: React.ReactNode;
}> = ({ id, title, subtitle, to, linkLabel, children }) => (
  <section className="study-section" aria-labelledby={id}>
    <header className="study-section-heading">
      <div><h2 id={id}>{title}</h2><p>{subtitle}</p></div>
      <Link className="study-text-link" to={to}>{linkLabel}<ArrowRight size={16} className="ua-flip-rtl" /></Link>
    </header>
    {children}
  </section>
);

const SectionBody: React.FC<{
  isLoading: boolean; isError: boolean; isEmpty: boolean; emptyText: string;
  retry: () => void; children: React.ReactNode;
}> = ({ isLoading, isError, isEmpty, emptyText, retry, children }) => {
  const { t } = useTranslation();
  if (isLoading) return <div className="study-placeholder" role="status"><Spinner /><span>{t('common.loading')}</span></div>;
  if (isError) return <div className="study-placeholder" role="status"><p>{t('dashboard.learningHome.loadError')}</p><button className="study-text-link" onClick={retry}>{t('dashboard.learningHome.retry')}</button></div>;
  if (isEmpty) return <div className="study-placeholder"><Sparkles size={24} aria-hidden="true" /><p>{emptyText}</p></div>;
  return <>{children}</>;
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const copy = (key: string, options?: Record<string, unknown>) => t(`dashboard.learningHome.${key}`, options);
  const enrollQuery = useQuery({ queryKey: ['my-learnings'], queryFn: enrollmentAPI.getMine });
  const coursesQuery = useQuery({ queryKey: ['courses'], queryFn: courseAPI.getAll });
  const contestsQuery = useQuery({ queryKey: ['contests'], queryFn: contestAPI.getAll });
  const historyQuery = useQuery({ queryKey: ['test-history', 0], queryFn: () => testAPI.history(0, 20) });
  const rolesQuery = useQuery({ queryKey: ['roadmap-roles'], queryFn: roadmapAPI.roles });

  const myCourses = useMemo(() => {
    const enrollments: EnrolledCourse[] = enrollQuery.data?.data?.data ?? [];
    const catalog: Course[] = coursesQuery.data?.data?.data ?? [];
    const byId = new Map(catalog.map(course => [course.id, course]));
    return enrollments.map(e => byId.get(e.courseId)).filter((course): course is Course => Boolean(course));
  }, [enrollQuery.data, coursesQuery.data]);
  const contests: Contest[] = contestsQuery.data?.data?.data ?? [];
  const liveContests = contests.filter(c => c.phase === 'RUNNING' || c.phase === 'UPCOMING');
  const historyPage: Page<TestAttemptSummary> | undefined = historyQuery.data?.data?.data;
  const attempts = historyPage?.content ?? [];
  const roles: Role[] = rolesQuery.data?.data?.data ?? [];
  const firstName = user?.name?.trim().split(/\s+/)[0] || t('dashboard.defaultName');
  const streak = user?.currentStreak;
  const milestone = Math.max(7, Math.ceil(((streak ?? 0) + 1) / 7) * 7);
  const streakProgress = Math.min(100, ((streak ?? 0) / milestone) * 100);
  const number = (value: number | undefined) => value === undefined ? '—' : value.toLocaleString(i18n.language);
  const firstCourse = myCourses[0];
  const stats = [
    { icon: Flame, value: number(streak), label: copy('dayStreak'), detail: copy('bestStreak', { count: user?.longestStreak ?? 0 }), tone: 'warm', to: '/profile' },
    { icon: Star, value: number(user?.points), label: copy('learningPoints'), detail: copy('pointsHint'), tone: 'gold', to: '/leaderboard' },
    { icon: BookOpen, value: enrollQuery.isSuccess && coursesQuery.isSuccess ? number(myCourses.length) : '—', label: copy('coursesStarted'), detail: copy('coursesHint'), tone: 'blue', to: '/my-courses' },
    { icon: Target, value: historyQuery.isSuccess ? number(historyPage?.totalElements ?? attempts.length) : '—', label: copy('practiceRounds'), detail: copy('practiceHint'), tone: 'mint', to: '/tests?view=history' },
  ];

  return (
    <div className="study-home">
      <header className="study-greeting">
        <h1 id="study-greeting">{t('dashboard.greeting', { name: firstName })}</h1>
        <p>{t('dashboard.subtitle')}</p>
      </header>

      <section className="study-welcome" aria-labelledby="study-resume-title">
        <span className="study-icon study-tone-blue" aria-hidden="true"><BookOpen size={25} /></span>
        <div className="study-welcome-copy">
          <span className="study-eyebrow">{copy(firstCourse ? 'continueLearning' : 'startLearning')}</span>
          <h2 id="study-resume-title">{firstCourse?.name ?? t('dashboard.browseCourses')}</h2>
          {firstCourse ? <div className="study-meta">
            {firstCourse.topicsCount > 0 && <span><BookOpen size={13} aria-hidden="true" />{copy('topics', { count: firstCourse.topicsCount })}</span>}
            {firstCourse.totalTime && <span><Clock size={13} aria-hidden="true" />{firstCourse.totalTime}</span>}
          </div> : <p>{t('dashboard.subtitle')}</p>}
        </div>
        <div className="study-hero-actions">
          <Link className="study-button study-button-primary" to={firstCourse ? `/courses/${firstCourse.id}` : '/explore'}>
            <Play size={17} fill="currentColor" aria-hidden="true" />{copy(firstCourse ? 'continueLearning' : 'startLearning')}<ArrowRight size={17} className="ua-flip-rtl" />
          </Link>
        </div>
      </section>

      <section className="study-panel" aria-labelledby="daily-quiz-dashboard-title">
        <h2 id="daily-quiz-dashboard-title">Daily Quiz</h2>
        <p>Reinforce studied concepts with personalized retrieval practice.</p>
        <Link className="study-button study-button-primary" to="/daily-quiz">Open today's quiz <ArrowRight size={16} /></Link>
      </section>

      <div className="study-stats" role="group" aria-label={copy('statsLabel')}>
        {stats.map(({ icon: Icon, value, label, detail, tone, to }) => (
          <Link key={to} to={to} className={`study-stat study-tone-${tone}`}>
            <span className="study-icon"><Icon size={22} aria-hidden="true" /></span>
            <div><strong className="study-stat-value">{value}</strong><span className="study-stat-label">{label}</span><span className="study-stat-detail">{detail}</span></div>
          </Link>
        ))}
      </div>

      <div className="study-main-grid">
        <div className="study-main-column">
          <LearningSection id="study-courses" title={copy('yourNextChapter')} subtitle={copy('chapterHint')} to="/my-courses" linkLabel={t('common.viewAll')}>
            <SectionBody isLoading={enrollQuery.isLoading || coursesQuery.isLoading} isError={enrollQuery.isError || coursesQuery.isError} isEmpty={!myCourses.length} emptyText={copy('emptyCourses')} retry={() => { void enrollQuery.refetch(); void coursesQuery.refetch(); }}>
              <div className="study-course-grid">
                {myCourses.slice(0, 2).map(course => (
                  <CourseCard key={course.id} course={course} actionLabel={copy('keepLearning')} />
                ))}
              </div>
            </SectionBody>
            {enrollQuery.isSuccess && coursesQuery.isSuccess && !myCourses.length && <Link className="study-button study-button-primary study-empty-action" to="/explore">{t('dashboard.browseCourses')}<ArrowRight size={16} /></Link>}
          </LearningSection>

          <LearningSection id="study-challenges" title={copy('challengeTitle')} subtitle={copy('challengeHint')} to="/contests" linkLabel={t('common.viewAll')}>
            <SectionBody isLoading={contestsQuery.isLoading} isError={contestsQuery.isError} isEmpty={!liveContests.length} emptyText={t('dashboard.noContests')} retry={() => { void contestsQuery.refetch(); }}>
              <div className="study-list">{liveContests.slice(0, 3).map(c => (
                <Link key={c.id} to={`/contests/${c.id}`} className="study-list-card">
                  <span className="study-icon study-tone-gold"><Trophy size={23} aria-hidden="true" /></span>
                  <div className="study-list-copy"><span className={`study-pill ${c.phase === 'RUNNING' ? 'study-pill-live' : ''}`}>{t(`contest.phase.${c.phase}`, { defaultValue: c.phase })}</span><h3>{c.title}</h3><div className="study-meta"><span><Clock size={13} />{c.durationMinutes} {t('common.minutes')}</span><span>{t('common.problems', { count: c.problemCount })}</span></div></div>
                  <ArrowRight className="study-list-arrow ua-flip-rtl" size={18} aria-hidden="true" />
                </Link>
              ))}</div>
            </SectionBody>
          </LearningSection>

          <LearningSection id="study-practice" title={copy('practiceTitle')} subtitle={copy('practiceSubtitle')} to="/tests?view=history" linkLabel={t('common.viewAll')}>
            <SectionBody isLoading={historyQuery.isLoading} isError={historyQuery.isError} isEmpty={!attempts.length} emptyText={copy('emptyPractice')} retry={() => { void historyQuery.refetch(); }}>
              <div className="study-list">{attempts.slice(0, 3).map(a => (
                <div key={a.attemptId} className="study-list-card">
                  <span className={`study-icon ${a.passed ? 'study-tone-mint' : 'study-tone-blue'}`}>{a.passed ? <CheckCircle size={22} /> : <Target size={22} />}</span>
                  <div className="study-list-copy"><h3>{a.poolName}</h3><p>{a.correctCount}/{a.totalQuestions} · {formatDateTime(a.attemptedAt)}</p><span className="study-result-label">{copy(a.passed ? 'wellDone' : 'keepPracticing')}</span></div>
                  <strong className="study-score">{Math.round(a.scorePercentage)}%</strong>
                </div>
              ))}</div>
            </SectionBody>
          </LearningSection>
        </div>

        <aside className="study-side-column" aria-label={copy('journeyLabel')}>
          <section className="study-streak study-panel" aria-labelledby="study-streak-title">
            <span className="study-icon study-tone-warm"><Flame size={27} aria-hidden="true" /></span>
            <h2 id="study-streak-title">{copy('streakTitle')}</h2><p>{copy('streakHint')}</p>
            <div className="study-streak-count"><strong>{number(streak)}</strong><span>{copy('dayStreak')}</span></div>
            <div className="study-progress-label"><span>{copy('nextMilestone')}</span><strong>{copy('days', { count: milestone })}</strong></div>
            <div className="study-progress" role="progressbar" aria-label={copy('nextMilestone')} aria-valuemin={0} aria-valuemax={milestone} aria-valuenow={streak ?? 0}><span style={{ width: `${streakProgress}%` }} /></div>
            <Link className="study-text-link" to="/profile">{copy('activityCalendar')}<ArrowRight size={15} className="ua-flip-rtl" /></Link>
          </section>

          <section className="study-panel" aria-labelledby="study-picks-title">
            <span className="study-eyebrow"><Sparkles size={14} aria-hidden="true" />{copy('smallSteps')}</span><h2 id="study-picks-title">{copy('pickAdventure')}</h2>
            <div className="study-picks">
              <Link to="/tests"><span className="study-icon study-tone-mint"><GraduationCap size={20} /></span><span><strong>{copy('quickPractice')}</strong><small>{copy('quickPracticeHint')}</small></span><ChevronRight size={17} className="ua-flip-rtl" /></Link>
              <Link to="/algorithms"><span className="study-icon study-tone-blue"><Code2 size={20} /></span><span><strong>{copy('seeCode')}</strong><small>{copy('seeCodeHint')}</small></span><ChevronRight size={17} className="ua-flip-rtl" /></Link>
              <Link to="/tests?view=insights"><span className="study-icon study-tone-gold"><Target size={20} /></span><span><strong>{t('dashboard.myInsights')}</strong><small>{copy('insightsHint')}</small></span><ChevronRight size={17} className="ua-flip-rtl" /></Link>
            </div>
          </section>

          <LearningSection id="study-roadmaps" title={copy('findPath')} subtitle={copy('pathHint')} to="/roadmap" linkLabel={t('common.viewAll')}>
            <SectionBody isLoading={rolesQuery.isLoading} isError={rolesQuery.isError} isEmpty={!roles.length} emptyText={t('dashboard.noRoadmaps')} retry={() => { void rolesQuery.refetch(); }}>
              <div className="study-list">{roles.slice(0, 3).map((role, index) => <Link key={role.id} to={`/roadmap?role=${encodeURIComponent(role.id)}`} className="study-roadmap"><span className="study-path-number">{String(index + 1).padStart(2, '0')}</span><div><h3>{role.name}</h3>{role.description && <p>{role.description}</p>}</div><MapIcon size={18} aria-hidden="true" /></Link>)}</div>
            </SectionBody>
          </LearningSection>
        </aside>
      </div>
    </div>
  );
};
