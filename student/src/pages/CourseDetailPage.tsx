import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { courseAPI, topicAPI, poolAPI, enrollmentAPI } from '../api/endpoints';
import { useMascot } from '../components/mascot';
import { useAuth } from '../context/AuthContext';
import { Badge, EmptyState, Spinner, TopicRow } from '../components/ui';
import type { Topic } from '../types';
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

  const enrolled: boolean = statusRes?.data?.data?.enrolled ?? false;
  const { fire } = useMascot();

  const enrollMutation = useMutation({
    mutationFn: () => enrollmentAPI.enroll(id!),
    onSuccess: () => {
      fire('COURSE_ENROLLED');
      // Reflect the new state everywhere it's shown.
      queryClient.invalidateQueries({ queryKey: ['enrollment-status', id] });
      queryClient.invalidateQueries({ queryKey: ['my-learnings'] });
    },
  });

  const course = courseRes?.data?.data;
  const topics: Topic[] = topicsRes?.data?.data ?? [];
  const pools  = poolRes?.data?.data ?? [];

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
                to={`/tests?scope=COURSE&entityId=${course.id}`}
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
              .map((topic, i) => (
                <TopicRow key={topic.id} topic={topic} index={i} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
