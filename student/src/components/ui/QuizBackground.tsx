import React from 'react';
import clsx from 'clsx';
import '../../styles/quiz.css';

/** Full-bleed quiz artwork with responsive, theme-aware image selection. */
interface QuizBackgroundProps {
  children: React.ReactNode;
  className?: string;
}

export const QuizBackground: React.FC<QuizBackgroundProps> = ({ children, className }) => (
  <div className={clsx('quiz-surface quiz-scene w-full px-4 sm:px-6 py-8', className)}>
    <div className="quiz-scene-content max-w-3xl mx-auto space-y-6 animate-fade-in">{children}</div>
  </div>
);
