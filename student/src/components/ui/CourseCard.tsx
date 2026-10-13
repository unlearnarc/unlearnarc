import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { BookOpen, Clock, Layers, ArrowRight, GraduationCap } from 'lucide-react';
import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';
import type { Course } from '../../types';

/* =============================================================================
   CourseCard — unified course tile used on Explore, My Courses & Dashboard.
     variant="grid"    → full cover card (Explore / My Courses)
     variant="list"    → compact horizontal row (Dashboard)
   Pass `showProgress` to render the progress bar + continue/test actions.

   Visual polish:
     • A rotating cover gradient per course gives the grid visual variety
       instead of one flat blue block repeated down the page.
     • `.ua-card--accent` reveals a brand gradient hairline on hover.
     • The cover icon scales gently on hover (group-hover) for life.
   ============================================================================= */

/** Rotating cover gradients so a grid of courses isn't one flat colour. */
const COVERS = [
  'from-[#3478D4] to-[#18B6C9]',
  'from-[#18B6C9] to-[#20C997]',
  'from-[#20C997] to-[#3478D4]',
  'from-[#6366F1] to-[#3478D4]',
  'from-[#F59E0B] to-[#EC4899]',
];

/** Deterministic cover pick from the course id so it's stable across renders. */
function coverFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return COVERS[h % COVERS.length];
}

interface CourseCardProps {
  course: Course;
  variant?: 'grid' | 'list' | 'mobile';
  /** 0–100; when provided the progress bar is shown. */
  progress?: number;
  /** Render Continue + Take-test action buttons (My Courses style). */
  withActions?: boolean;
  className?: string;
  /** Label for the explicit action link (mobile variant). */
  actionLabel?: string;
}

export const CourseCard: React.FC<CourseCardProps> = ({
  course,
  variant = 'grid',
  progress,
  withActions = false,
  className,
  actionLabel,
}) => {
  const cover = coverFor(course.id);

  const meta = (
    <div className="flex items-center gap-3 text-xs text-text-muted">
      {course.topicsCount > 0 && (
        <span className="flex items-center gap-1">
          <Layers size={11} /> {course.topicsCount} topics
        </span>
      )}
      {course.totalTime && (
        <span className="flex items-center gap-1">
          <Clock size={11} /> {course.totalTime}
        </span>
      )}
    </div>
  );

  /* ── Mobile card (Explore on phones) ─────────────────────────────────
     A wide cover banner, title, difficulty badge, topics/duration meta, and a
     single clear "View course" action. The whole card is one <Link> so there's
     exactly one tap target (no nested clickable elements). */
  if (variant === 'mobile') {
    return (
      <Link
        to={`/courses/${course.id}`}
        className={clsx(
          'ua-card--accent card overflow-hidden flex flex-col active:scale-[0.99] transition-transform duration-150 group',
          className,
        )}
      >
        {/* Wide subject banner (16:9-ish) */}
        <div className={clsx('relative w-full aspect-[16/7] shrink-0 bg-gradient-to-br flex items-center justify-center overflow-hidden', cover)}>
          <div className="ua-hero-grid absolute inset-0 opacity-50" />
          <BookOpen size={34} className="relative text-white/90" />
          <span className="absolute top-3 right-3">
            <Badge label={course.level} />
          </span>
        </div>

        <div className="p-4 flex flex-col gap-2">
          <h3 className="text-base font-semibold text-text-primary leading-snug line-clamp-2">
            {course.name}
          </h3>
          {meta}
          <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500">
            {actionLabel ?? 'View course'} <ArrowRight size={15} />
          </span>
        </div>
      </Link>
    );
  }

  /* ── Compact list row (Dashboard) ───────────────────────────────────── */
  if (variant === 'list') {
    return (
      <Link
        to={`/courses/${course.id}`}
        className={clsx(
          'ua-card--accent card p-4 flex items-center gap-4 hover:-translate-y-0.5 transition-all duration-200 block group',
          className
        )}
      >
        <div className={clsx(
          'w-12 h-12 rounded-[10px] bg-gradient-to-br flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105',
          cover,
        )}>
          <BookOpen size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary truncate group-hover:text-primary-500 transition-colors">
            {course.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge label={course.level} />
            {course.topicsCount > 0 && (
              <span className="text-xs text-text-muted flex items-center gap-1">
                <Clock size={11} /> {course.topicsCount} topics
              </span>
            )}
          </div>
          {progress !== undefined && <ProgressBar value={progress} className="mt-2" />}
        </div>
        <ArrowRight size={16} className="text-text-muted shrink-0 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-primary-500" />
      </Link>
    );
  }

  /* ── Grid card with action buttons (My Courses) ─────────────────────── */
  if (withActions) {
    return (
      <div
        className={clsx(
          'ua-card--accent card overflow-hidden flex flex-col hover:-translate-y-1 transition-all duration-200 group',
          className
        )}
      >
        <div className={clsx('relative h-28 shrink-0 bg-gradient-to-br flex items-center justify-center overflow-hidden', cover)}>
          <div className="ua-hero-grid absolute inset-0 opacity-50" />
          <BookOpen size={30} className="relative text-white/80 transition-transform duration-300 group-hover:scale-110" />
        </div>
        <div className="p-4 flex flex-col flex-1 min-h-0">
          <div className="flex items-start gap-2 mb-2">
            <h3 className="text-sm font-semibold text-text-primary flex-1 line-clamp-2 leading-snug">
              {course.name}
            </h3>
            <Badge label={course.level} className="shrink-0" />
          </div>
          <div className="mb-3">{meta}</div>

          {progress !== undefined && (
            <div className="mb-3">
              <div className="flex justify-between text-xs text-text-muted mb-1">
                <span>Progress</span>
                <span className="font-semibold text-text-secondary">{Math.round(progress)}%</span>
              </div>
              <ProgressBar value={progress} />
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <Link
              to={`/courses/${course.id}`}
              className="btn-primary flex-1 justify-center text-xs py-2"
            >
              Continue <ArrowRight size={13} />
            </Link>
            <Link
              to={`/tests?scope=COURSE&entityId=${course.id}`}
              className="btn-secondary px-3 py-2"
              title="Take course test"
              aria-label={`Take test for ${course.name}`}
            >
              <GraduationCap size={15} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── Default grid card (Explore) ────────────────────────────────────── */
  return (
    <Link
      to={`/courses/${course.id}`}
      className={clsx(
        'ua-card--accent card p-5 h-[15.5rem] flex flex-col hover:-translate-y-1 transition-all duration-200 group',
        className
      )}
    >
      <div className={clsx(
        'relative w-full h-32 shrink-0 rounded-[10px] bg-gradient-to-br flex items-center justify-center mb-4 overflow-hidden group-hover:shadow-hover transition',
        cover,
      )}>
        <div className="ua-hero-grid absolute inset-0 opacity-50" />
        <BookOpen size={32} className="relative text-white/90 transition-transform duration-300 group-hover:scale-110" />
      </div>
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-primary-500 transition-colors">
          {course.name}
        </h3>
        <Badge label={course.level} className="shrink-0" />
      </div>
      <div className="mt-auto">{meta}</div>
    </Link>
  );
};
