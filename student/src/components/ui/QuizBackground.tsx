import React from 'react';
import clsx from 'clsx';

/* =============================================================================
   QuizBackground — full-bleed dark gradient surface for the quiz experience.

   Designed for use inside a full-screen page (AppLayout `useFullScreen()`),
   where the surrounding <main> has no padding. It fills the whole viewport,
   is independently scrollable, and centres its content column.
   ============================================================================= */

interface QuizBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const QuizBackground: React.FC<QuizBackgroundProps> = ({ children, className }) => (
  <div
    className={clsx(
      'quiz-surface min-h-screen w-full overflow-y-auto px-4 sm:px-6 py-8',
      className
    )}
  >
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">{children}</div>
  </div>
);
