import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ArrowRight, BookOpen, Clock, GraduationCap, Sparkles } from 'lucide-react';
import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';
import type { Course } from '../../types';
import './course-card.css';

// Roadmap responses expose the same display fields without the full course DTO.
type CourseSummary = Pick<Course, 'id' | 'name' | 'imgUrl' | 'topicsCount' | 'totalTime'> & { level: string };
interface CourseCardProps {
  course: CourseSummary;
  /** Grid and mobile intentionally share the same responsive dashboard design. */
  variant?: 'grid' | 'list' | 'mobile';
  /** Only supply progress after learning has started; no progress is invented. */
  progress?: number;
  withActions?: boolean;
  className?: string;
  actionLabel?: string;
  /** Context-specific status and actions, e.g. roadmap course picking. */
  status?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

const CourseArtwork: React.FC<{ course: CourseSummary }> = ({ course }) => {
  const [failedUrl, setFailedUrl] = useState<string>();
  const showImage = !!course.imgUrl && /^https?:\/\//i.test(course.imgUrl.trim()) && failedUrl !== course.imgUrl;
  return (
    <div className="study-course-art">
      {showImage ? (
        <img src={course.imgUrl} alt="" loading="lazy" crossOrigin="anonymous"
          onError={() => setFailedUrl(course.imgUrl)} />
      ) : <BookOpen size={36} aria-hidden="true" />}
      <Badge label={course.level} className="study-course-level" />
      {!showImage && <span className="study-course-spark" aria-hidden="true"><Sparkles size={20} /></span>}
    </div>
  );
};

/** Dashboard course design shared by the catalog, My Learnings and roadmap. */
export const CourseCard: React.FC<CourseCardProps> = ({
  course, variant = 'grid', progress, withActions = false, className, actionLabel,
  status, secondaryAction,
}) => {
  const { t } = useTranslation();
  const to = `/courses/${course.id}`;
  const label = actionLabel ?? t(withActions ? 'dashboard.learningHome.keepLearning' : 'explore.viewCourse');
  const classes = clsx('study-course', `study-course--${course.level.toLowerCase()}`, {
    'study-course--list': variant === 'list',
  }, className);
  const content = (
    <>
      <CourseArtwork course={course} />
      <div className="study-course-body">
        {variant !== 'list' && <span className="study-course-eyebrow">{t('dashboard.learningHome.learningAdventure')}</span>}
        <h3>{course.name}</h3>
        {variant === 'list' && <Badge label={course.level} className="self-start mb-1" />}
        <div className="study-course-meta">
          {course.topicsCount > 0 && <span><BookOpen size={13} aria-hidden="true" />{t('dashboard.learningHome.topics', { count: course.topicsCount })}</span>}
          {course.totalTime && <span><Clock size={13} aria-hidden="true" />{course.totalTime}</span>}
        </div>
        {status && <div className="study-course-status">{status}</div>}
        {progress !== undefined && <ProgressBar value={progress} className="study-course-progress" />}
        <span className="study-course-action">{label}<span><ArrowRight size={17} className="ua-flip-rtl" aria-hidden="true" /></span></span>
      </div>
    </>
  );

  // Sibling links/buttons keep quiz and enrollment actions out of the main link.
  if (withActions || secondaryAction) {
    return (
      <div className={classes}>
        <Link to={to} className="study-course-main">{content}</Link>
        <div className="study-course-extra">
          {secondaryAction}
          {withActions && <Link to={`/tests?scope=COURSE&entityId=${course.id}`} className="btn-secondary"
            aria-label={`${t('dashboard.takeTest')}: ${course.name}`}>
            <GraduationCap size={16} aria-hidden="true" />{t('dashboard.takeTest')}
          </Link>}
        </div>
      </div>
    );
  }
  return <Link to={to} className={classes}>{content}</Link>;
};
