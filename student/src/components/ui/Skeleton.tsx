import React from 'react';
import clsx from 'clsx';

/* =============================================================================
   Skeleton — shimmer placeholders shown while data loads.
   Replaces the lone centered spinner with layout-matching placeholders so the
   page doesn't jump when real content arrives (less "pop-in", feels faster).

   Usage:
     <Skeleton className="h-4 w-32" />
     <SkeletonText lines={3} />
     <CourseCardSkeleton />           // matches CourseCard grid tile
     <CourseListSkeleton />           // matches CourseCard variant="list"
     <StatCardSkeleton />
   ============================================================================= */

interface SkeletonProps {
  className?: string;
  /** Pill shape for avatars/badges. */
  rounded?: 'md' | 'lg' | 'xl' | 'full';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, rounded = 'md' }) => (
  <div
    aria-hidden="true"
    className={clsx(
      'ua-skeleton',
      rounded === 'md' && 'rounded-md',
      rounded === 'lg' && 'rounded-lg',
      rounded === 'xl' && 'rounded-xl',
      rounded === 'full' && 'rounded-full',
      className,
    )}
  />
);

/** A block of fake text lines; last line is shorter for realism. */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className,
}) => (
  <div className={clsx('space-y-2', className)} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={clsx('h-3', i === lines - 1 ? 'w-2/3' : 'w-full')}
      />
    ))}
  </div>
);

/* ── Domain-shaped skeletons (match the real components 1:1) ─────────────── */

export const CourseCardSkeleton: React.FC = () => (
  <div className="card overflow-hidden" aria-hidden="true">
    <Skeleton className="w-full h-28" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-2 w-24" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-8 w-full" />
    </div>
  </div>
);

export const CourseListSkeleton: React.FC = () => (
  <div className="card p-4 flex items-center gap-4" aria-hidden="true">
    <Skeleton className="w-12 h-12 shrink-0" rounded="lg" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3.5 w-2/3" />
      <Skeleton className="h-3 w-1/3" />
    </div>
  </div>
);

export const StatCardSkeleton: React.FC = () => (
  <div className="card p-5" aria-hidden="true">
    <Skeleton className="w-10 h-10 mb-3" rounded="xl" />
    <Skeleton className="h-7 w-12 mb-2" />
    <Skeleton className="h-3 w-16" />
  </div>
);

/** Renders `count` copies of a skeleton — handy for grids/lists. */
export const SkeletonRepeat: React.FC<{
  count: number;
  children: React.ReactNode;
}> = ({ count, children }) => (
  <>{Array.from({ length: count }).map((_, i) => <React.Fragment key={i}>{children}</React.Fragment>)}</>
);
