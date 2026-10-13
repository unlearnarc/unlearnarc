import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { courseAPI, enrollmentAPI } from '../api/endpoints';
import { CourseCard, EmptyState, CourseCardSkeleton, SkeletonRepeat } from '../components/ui';
import type { Course } from '../types';
import { BookOpen, ArrowRight } from 'lucide-react';

interface EnrolledCourse { courseId: string }

export const MyCoursesPage: React.FC = () => {
  const { t } = useTranslation();
  // The user's enrollments (just courseIds + timestamps)…
  const { data: enrollRes, isLoading: enrollLoading } = useQuery({
    queryKey: ['my-learnings'],
    queryFn:  enrollmentAPI.getMine,
  });
  // …hydrated against the full course catalog.
  const { data: coursesRes, isLoading: coursesLoading } = useQuery({
    queryKey: ['courses'],
    queryFn:  courseAPI.getAll,
  });

  const courses: Course[] = useMemo(() => {
    const enrollments: EnrolledCourse[] = enrollRes?.data?.data ?? [];
    const catalog: Course[] = coursesRes?.data?.data ?? [];
    const byId = new Map(catalog.map(c => [c.id, c]));
    // Preserve enrollment order (newest first from the API).
    return enrollments
      .map(e => byId.get(e.courseId))
      .filter((c): c is Course => Boolean(c));
  }, [enrollRes, coursesRes]);

  const isLoading = enrollLoading || coursesLoading;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{t('myCourses.title')}</h1>
          <p className="text-sm text-text-secondary mt-0.5">{t('myCourses.subtitle')}</p>
        </div>
        <Link to="/explore" className="btn-primary text-sm py-2">
          {t('myCourses.exploreMore')} <ArrowRight size={15} aria-hidden="true" className="ua-flip-rtl" />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <SkeletonRepeat count={6}><CourseCardSkeleton /></SkeletonRepeat>
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title={t('myCourses.empty')}
          description={t('myCourses.emptyDesc')}
          action={<Link to="/explore" className="btn-primary text-sm py-2">{t('myCourses.exploreCourses')}</Link>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => (
            <CourseCard key={course.id} course={course} withActions />
          ))}
        </div>
      )}
    </div>
  );
};
