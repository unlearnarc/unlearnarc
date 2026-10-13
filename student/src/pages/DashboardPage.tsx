import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  courseAPI, contestAPI, enrollmentAPI, testAPI, roadmapAPI,
} from '../api/endpoints';
import { CourseCard, Spinner } from '../components/ui';
import { formatDateTime } from '../i18n/format';
import type {
  Course, Contest, TestAttemptSummary, Page,
} from '../types';
import {
  GraduationCap, Trophy, Clock, Sparkles, ArrowRight,
  BookOpen, History, Map as MapIcon, CheckCircle, XCircle,
} from 'lucide-react';

interface EnrolledCourse { courseId: string }
interface Role { id: string; name: string; description?: string }

/**
 * Reusable column wrapper: fixed header + an independently scrolling body.
 * Each of the four dashboard sections uses this so only the inner list scrolls.
 */
const DashboardColumn: React.FC<{
  icon: React.ElementType;
  title: string;
  to: string;
  linkLabel: string;
  children: React.ReactNode;
}> = ({ icon: Icon, title, to, linkLabel, children }) => (
  <div className="card flex flex-col overflow-hidden p-0 h-[60vh] min-h-[380px]">
    {/* Sticky header stays put while the body scrolls */}
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3 shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="ua-icon-tile w-8 h-8 bg-primary-50 text-primary-500 shrink-0">
          <Icon size={16} />
        </span>
        <h2 className="text-sm font-semibold text-text-primary truncate">{title}</h2>
      </div>
      <Link
        to={to}
        className="text-xs text-primary-500 font-medium hover:underline flex items-center gap-1 shrink-0"
      >
        {linkLabel} <ArrowRight size={12} className="ua-flip-rtl" />
      </Link>
    </div>

    {/* Independent scroll region */}
    <div className="flex-1 overflow-y-auto px-4 py-3 ua-scroll">
      {children}
    </div>
  </div>
);

/** Standardises the loading / empty / content states inside each column. */
const SectionBody: React.FC<{
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyText: string;
  children: React.ReactNode;
}> = ({ isLoading, isEmpty, emptyText, children }) => {
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="flex h-full items-center justify-center text-center">
        <p className="text-sm text-text-muted">{emptyText}</p>
      </div>
    );
  }
  return <>{children}</>;
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  // ── My Courses (enrollments hydrated against the catalog) ──
  const { data: enrollRes, isLoading: enrollLoading } = useQuery({
    queryKey: ['my-learnings'],
    queryFn: enrollmentAPI.getMine,
  });
  const { data: coursesRes, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: courseAPI.getAll,
  });

  // ── Live & upcoming contests ──
  const { data: contestsRes, isLoading: contestsLoading } = useQuery({
    queryKey: ['contests'],
    queryFn: contestAPI.getAll,
  });

  // ── Test history ──
  const { data: historyRes, isLoading: historyLoading } = useQuery({
    queryKey: ['test-history', 0],
    queryFn: () => testAPI.history(0, 20),
  });

  // ── Recent roadmaps (roles) ──
  const { data: rolesRes, isLoading: rolesLoading } = useQuery({
    queryKey: ['roadmap-roles'],
    queryFn: roadmapAPI.roles,
  });

  const myCourses: Course[] = useMemo(() => {
    const enrollments: EnrolledCourse[] = enrollRes?.data?.data ?? [];
    const catalog: Course[] = coursesRes?.data?.data ?? [];
    const byId = new Map(catalog.map((c) => [c.id, c]));
    return enrollments
      .map((e) => byId.get(e.courseId))
      .filter((c): c is Course => Boolean(c));
  }, [enrollRes, coursesRes]);

  const contests: Contest[] = contestsRes?.data?.data ?? [];
  const liveContests = contests.filter(
    (c) => c.phase === 'RUNNING' || c.phase === 'UPCOMING',
  );

  const historyPage: Page<TestAttemptSummary> | undefined = historyRes?.data?.data;
  const attempts: TestAttemptSummary[] = historyPage?.content ?? [];

  const roles: Role[] = rolesRes?.data?.data ?? [];

  const firstName = user?.name?.split(' ')[0] ?? t('dashboard.defaultName');

  return (
    <div className="space-y-8 animate-fade-in">

      {/* Hero greeting */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-primary p-8 sm:p-10 text-white">
        <div className="ua-hero-grid absolute inset-0 opacity-40" aria-hidden="true" />
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1.5">
            {t('dashboard.greeting', { name: firstName })}
          </h1>
          <p className="text-white/80 text-sm sm:text-base mb-6">
            {t('dashboard.subtitle')}
          </p>
          <div className="flex flex-wrap gap-3">
            {/* Browse Courses — now light & transparent, matching the other buttons */}
            <Link to="/explore" className="inline-flex items-center gap-2 bg-white/15 text-white border border-white/25 px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-white/25 hover:-translate-y-0.5 transition-all">
              {t('dashboard.browseCourses')} <ArrowRight size={15} />
            </Link>
            <Link to="/tests" className="inline-flex items-center gap-2 bg-white/15 text-white border border-white/25 px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-white/25 hover:-translate-y-0.5 transition-all">
              {t('dashboard.takeTest')} <GraduationCap size={15} />
            </Link>
            <Link to="/tests?view=insights" className="inline-flex items-center gap-2 bg-white/15 text-white border border-white/25 px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-white/25 hover:-translate-y-0.5 transition-all">
              {t('dashboard.myInsights')} <Sparkles size={15} />
            </Link>
          </div>
        </div>
        <div className="absolute -right-8 -top-8 w-48 h-48 rounded-full bg-white/10" aria-hidden="true" />
        <div className="absolute -right-4 bottom-4 w-24 h-24 rounded-full bg-white/5" aria-hidden="true" />
      </div>

      {/* ── 2×2 grid on tablet/desktop, stacked one-by-one on mobile; each section scrolls internally ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* 1. My Courses */}
        <DashboardColumn
          icon={BookOpen}
          title={t('dashboard.myCourses')}
          to="/my-courses"
          linkLabel={t('common.viewAll')}
        >
          <SectionBody
            isLoading={enrollLoading || coursesLoading}
            isEmpty={myCourses.length === 0}
            emptyText={t('dashboard.noCourses')}
          >
            <div className="space-y-3">
              {myCourses.map((course) => (
                <CourseCard key={course.id} course={course} variant="list" />
              ))}
            </div>
          </SectionBody>
        </DashboardColumn>

        {/* 2. Live & Upcoming Contests */}
        <DashboardColumn
          icon={Trophy}
          title={t('dashboard.liveUpcomingContests')}
          to="/contests"
          linkLabel={t('common.all')}
        >
          <SectionBody
            isLoading={contestsLoading}
            isEmpty={liveContests.length === 0}
            emptyText={t('dashboard.noContests')}
          >
            <div className="space-y-2.5">
              {liveContests.map((c) => (
                <Link
                  key={c.id}
                  to={`/contests/${c.id}`}
                  className="ua-card--accent card p-4 block hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-text-primary truncate group-hover:text-primary-500 transition-colors">
                      {c.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1 ${
                      c.phase === 'RUNNING' ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning'
                    }`}>
                      {c.phase === 'RUNNING' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" aria-hidden="true" />
                      )}
                      {t(`contest.phase.${c.phase}`, { defaultValue: c.phase })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Clock size={12} /> {c.durationMinutes} {t('common.minutes')} · {t('common.problems', { count: c.problemCount })}
                  </div>
                </Link>
              ))}
            </div>
          </SectionBody>
        </DashboardColumn>

        {/* 3. Test History */}
        <DashboardColumn
          icon={History}
          title={t('dashboard.testHistory')}
          to="/tests?view=history"
          linkLabel={t('common.viewAll')}
        >
          <SectionBody
            isLoading={historyLoading}
            isEmpty={attempts.length === 0}
            emptyText={t('dashboard.noTests')}
          >
            <div className="space-y-2.5">
              {attempts.map((a) => (
                <div key={a.attemptId} className="ua-card--accent card p-4">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-sm font-semibold text-text-primary truncate">
                      {a.poolName}
                    </span>
                    <span className={`text-xs font-bold shrink-0 inline-flex items-center gap-1 ${
                      a.passed ? 'text-success' : 'text-danger'
                    }`}>
                      {a.passed ? <CheckCircle size={13} /> : <XCircle size={13} />}
                      {Math.round(a.scorePercentage)}%
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {a.correctCount}/{a.totalQuestions} · {formatDateTime(a.attemptedAt)}
                  </div>
                </div>
              ))}
            </div>
          </SectionBody>
        </DashboardColumn>

        {/* 4. Recent Roadmaps */}
        <DashboardColumn
          icon={MapIcon}
          title={t('dashboard.recentRoadmaps')}
          to="/roadmap"
          linkLabel={t('common.viewAll')}
        >
          <SectionBody
            isLoading={rolesLoading}
            isEmpty={roles.length === 0}
            emptyText={t('dashboard.noRoadmaps')}
          >
            <div className="space-y-2.5">
              {roles.map((r) => (
                <Link
                  key={r.id}
                  to={`/roadmap?role=${r.id}`}
                  className="ua-card--accent card p-4 block hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <span className="text-sm font-semibold text-text-primary truncate block group-hover:text-primary-500 transition-colors">
                    {r.name}
                  </span>
                  {r.description && (
                    <p className="mt-0.5 text-xs text-text-muted line-clamp-2">
                      {r.description}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </SectionBody>
        </DashboardColumn>
      </div>
    </div>
  );
};
