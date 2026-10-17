import React from 'react';
import clsx from 'clsx';

/** Maps a semantic label to one of the token-driven ua-badge variants. */
const variantMap: Record<string, string> = {
  BEGINNER:         'ua-badge--beginner',
  INTERMEDIATE:     'ua-badge--intermediate',
  ADVANCED:         'ua-badge--advanced',
  EXPERT:           'ua-badge--expert',
  EASY:             'ua-badge--success',
  MEDIUM:           'ua-badge--warning',
  HARD:             'ua-badge--danger',
  VIDEO:            'ua-badge--primary',
  ARTICLE:          'ua-badge--achievement',
  PDF:              'ua-badge--warning',
  QUIZ:             'ua-badge--danger',
  EXERCISE:         'ua-badge--success',
  SLIDES:           'ua-badge--achievement',
  MCQ:              'ua-badge--muted',
  MULTIPLE_CORRECT: 'ua-badge--achievement',
  DOMAIN:           'ua-badge--primary',
  COURSE:           'ua-badge--success',
  TOPIC:            'ua-badge--warning',
};

interface BadgeProps {
  label: string;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ label, className }) => (
  <span className={clsx('ua-badge', variantMap[label] ?? 'ua-badge--muted', className)}>
    {label}
  </span>
);
