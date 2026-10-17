import React from 'react';
import clsx from 'clsx';

const levelColors: Record<string, string> = {
  // skill / course / topic levels
  BEGINNER:     'bg-teal-500/15 text-teal-400 border-teal-500/30',
  INTERMEDIATE: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  ADVANCED:     'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  EXPERT:       'bg-purple-500/15 text-purple-400 border-purple-500/30',
  // study material types
  VIDEO:        'bg-sky-500/15 text-sky-400 border-sky-500/30',
  ARTICLE:      'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  PDF:          'bg-orange-500/15 text-orange-400 border-orange-500/30',
  QUIZ:         'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  EXERCISE:     'bg-teal-500/15 text-teal-400 border-teal-500/30',
  SLIDES:       'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  // question difficulty
  EASY:         'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEDIUM:       'bg-amber-500/15 text-amber-400 border-amber-500/30',
  HARD:         'bg-rose-500/15 text-rose-400 border-rose-500/30',
  // pool scope types
  DOMAIN:       'bg-violet-500/15 text-violet-400 border-violet-500/30',
  COURSE:       'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  TOPIC:        'bg-blue-500/15 text-blue-400 border-blue-500/30',
  // question types
  MCQ:              'bg-slate-500/15 text-slate-300 border-slate-500/30',
  MULTIPLE_CORRECT: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
};

interface BadgeProps {
  label: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, className }) => (
  <span
    className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      levelColors[label] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/30',
      className
    )}
  >
    {label}
  </span>
);
