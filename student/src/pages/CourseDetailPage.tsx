import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { courseAPI, topicAPI, poolAPI, enrollmentAPI } from '../api/endpoints';
import { useMascot } from '../components/mascot';
import { useAuth } from '../context/AuthContext';
import { Badge, EmptyState, Spinner, TopicRow } from '../components/ui';
import { CourseNotesSection } from '../components/notes';
import type { CourseProgress, Topic } from '../types';
import './course-detail.css';
import {
  ArrowLeft, BookOpen, Clock, Layers, GraduationCap,
  Plus, Check, Loader2,
} from 'lucide-react';

export const CourseDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  const { data: courseRes, isLoading: courseLoading } = useQuery({
    queryKey: ['course', id],
    queryFn:  () => courseAPI.getById(id!),
    enabled:  !!id,
  });
  const { data: topicsRes, isLoading: topicsLoading } = useQuery({
    queryKey: ['topics', id],
    queryFn:  () => topicAPI.getByCourse(id!),
    enabled:  !!id,
  });
  const { data: poolRes } = useQuery({
    queryKey: ['course-pool', id],
    queryFn:  () => poolAPI.getByCourse(id!),
    enabled:  !!id,
  });

  // Is this course already in the student's learnings?
  const {
    data: statusRes,
    isLoading: statusLoading,
  } = useQuery({
    queryKey: ['enrollment-status', id],
    queryFn:  () => enrollmentAPI.status(id!),
    enabled:  !!id && isAuthenticated,
  });

  const progressQuery = useQuery({
    queryKey: ['course-progress', id],
    queryFn: () => enrollmentAPI.progress(id!),
    enabled: !!id && isAuthenticated,
  });
  const progress: CourseProgress | undefined = progressQuery.data?.data?.data;

  const enrolled: boolean = statusRes?.data?.data?.enrolled ?? false;
  const { fire } = useMascot();

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentAPI.enroll(id!),
    onSuccess: () => {
      fire('COURSE_ENROLLED');
      // Reflect the new state everywhere it's shown.
      queryClient.invalidateQueries({ queryKey: ['enrollment-status', id] });
      queryClient.invalidateQueries({ queryKey: ['my-learnings'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress', id] });
    },
  });

  const course = courseRes?.data?.data;
  const topics: Topic[] = topicsRes?.data?.data ?? [];
  const pools  = poolRes?.data?.data ?? [];
  const progressPercent = typeof progress?.progressPercent === 'number' && Number.isFinite(progress.progressPercent)
    ? Math.min(100, Math.max(0, progress.progressPercent)) : 0;

  if (courseLoading) return (
    <div className="flex justify-center py-24"><Spinner size="lg" /></div>
  );

  if (!course) return (
    <EmptyState icon={BookOpen} title={t('courseDetail.notFound')} />
  );

  /* ── Start-learning / enrolled button ──────────────────────────────────── */
  const renderLearningButton = () => {
    if (!isAuthenticated) return null;

    if (statusLoading) {
      return (
        <span className="inline-flex items-center gap-2 bg-white/15 text-white/80 px-5 py-2.5 rounded-[10px] text-sm font-semibold">
          <Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t('courseDetail.checking')}
        </span>
      );
    }

    if (enrolled) {
      return (
        <span
          className="inline-flex items-center gap-2 bg-white/20 text-white px-5 py-2.5 rounded-[10px] text-sm font-semibold border border-white/25"
          aria-label={t('courseDetail.inLearningsAria')}
        >
          <Check size={16} aria-hidden="true" /> {t('courseDetail.inYourLearnings')}
        </span>
      );
    }

    return (
      <button
        onClick={() => enrollMutation.mutate()}
        disabled={enrollMutation.isPending}
        aria-label={t('courseDetail.startLearningAria', { name: course.name })}
        className="inline-flex items-center gap-2 bg-surface text-primary-500 px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-surface-soft transition disabled:opacity-60 active:scale-[0.98]"
      >
        {enrollMutation.isPending
          ? <><Loader2 size={16} className="animate-spin" aria-hidden="true" /> {t('courseDetail.adding')}</>
          : <><Plus size={16} aria-hidden="true" /> {t('courseDetail.startLearning')}</>}
      </button>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="btn-ghost px-0 text-sm"
      >
        <ArrowLeft size={16} aria-hidden="true" className="ua-flip-rtl" /> {t('courseDetail.back')}
      </button>

      {/* Header card */}
      <div className="relative overflow-hidden rounded-[20px] bg-gradient-primary p-8 sm:p-10 text-white">
        <div className="relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Badge label={course.level} className="bg-white/20 text-white border-0" />
            {enrolled && (
              <span className="badge bg-white/15 text-white text-xs">
                <Check size={11} className="mr-1" aria-hidden="true" /> {t('courseDetail.learning')}
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{course.name}</h1>
          <div className="flex flex-wrap items-center gap-4 text-white/75 text-sm">
            {topics.length > 0 && (
              <span className="flex items-center gap-1.5">
                <Layers size={14} aria-hidden="true" /> {t('courseDetail.topicsCount', { count: topics.length })}
              </span>
            )}
            {course.totalTime && (
              <span className="flex items-center gap-1.5">
                <Clock size={14} aria-hidden="true" /> {course.totalTime}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            {renderLearningButton()}
            {pools.length > 0 && (
              <Link
                /* Direct flow: fixed pool mix drawn from the union of this
                   course's + its topics' pools (no ?adaptive=1). */
                to={`/tests?scope=COURSE&entityId=${encodeURIComponent(course.id)}`}
                className="inline-flex items-center gap-2 bg-white/15 text-white px-5 py-2.5 rounded-[10px] text-sm font-semibold hover:bg-white/25 transition border border-white/20"
              >
                <GraduationCap size={16} aria-hidden="true" /> {t('courseDetail.takeCourseTest')}
              </Link>
            )}
          </div>
        </div>
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10" />
        <div className="absolute right-10 bottom-4 w-20 h-20 rounded-full bg-white/5" />
      </div>

      {isAuthenticated && (
        <section className="card course-learning-progress" aria-label="Your learning progress" aria-busy={progressQuery.isLoading}>
          <div className="course-learning-progress__summary">
            <h2>{progress?.completed ? 'Course completed' : 'Learning progress'}</h2>
            {!progressQuery.isLoading && !progressQuery.isError && progress && (
              <p>{progress.completedTopics ?? 0}/{progress.totalTopics ?? topics.length} quizzes · <strong>{Math.round(progressPercent)}%</strong></p>
            )}
          </div>
          {progressQuery.isLoading ? <Spinner size="sm" /> : progressQuery.isError ? (
            <button className="btn-secondary" onClick={() => progressQuery.refetch()}>Retry loading progress</button>
          ) : progress && <>
            <div
              className="course-liquid-progress"
              role="progressbar"
              aria-label="Course completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              aria-valuetext={`${Math.round(progressPercent)}% complete; ${progress.completedTopics ?? 0} of ${progress.totalTopics ?? topics.length} topic quizzes completed`}
            >
              <div className="course-liquid-progress__fill" style={{ width: `${progressPercent}%`, minWidth: 0, display: progressPercent > 0 ? undefined : 'none' }}>
                <span className="course-liquid-progress__wave" aria-hidden="true" />
              </div>
            </div>
            {typeof progress.bestCourseScore === 'number' && Number.isFinite(progress.bestCourseScore) && <p className="course-learning-progress__score">Best course quiz: {progress.bestCourseScore.toFixed(2)}%</p>}
          </>}
        </section>
      )}

      {/* Course-level book lessons (published only). Renders nothing when empty. */}
      {id && <CourseNotesSection courseId={id} />}

      {/* Topics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-text-primary">{t('courseDetail.courseContent')}</h2>
          <span className="text-xs text-text-muted">{t('courseDetail.topicsCount', { count: topics.length })}</span>
        </div>

        {topicsLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={t('courseDetail.noTopics')}
            description={t('courseDetail.noTopicsDesc')}
          />
        ) : (
          <div className="space-y-2">
            {[...topics]
              .sort((a, b) => a.topicOrder - b.topicOrder)
              .map((topic, i) => {
                const topicProgress = progress?.topics?.find(item => item.topicId === topic.id);
                const bestScore = topicProgress?.bestScore;
                return (
                  <div key={topic.id}>
                    {typeof bestScore === 'number' && Number.isFinite(bestScore) && (
                      <p className="text-xs text-text-muted px-2 pb-1">
                        {topicProgress?.completed ? 'Completed' : 'Keep practicing'} · Best quiz: {bestScore.toFixed(2)}%
                      </p>
                    )}
                    <TopicRow topic={topic} index={i} />
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
