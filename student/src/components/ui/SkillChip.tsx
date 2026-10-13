import React from 'react';
import clsx from 'clsx';
import { Badge } from './Badge';

/* =============================================================================
   SkillChip — name + level-badge pill used in the domain "Skills" strip.
   ============================================================================= */

interface SkillChipProps {
  name: string;
  level?: string;
  className?: string;
}

export const SkillChip: React.FC<SkillChipProps> = ({ name, level, className }) => (
  <div
    className={clsx(
      'flex items-center gap-1.5 bg-surface-soft rounded-full pl-3 pr-2 py-1',
      className
    )}
  >
    <span className="text-xs text-text-primary font-medium">{name}</span>
    {level && <Badge label={level} />}
  </div>
);
