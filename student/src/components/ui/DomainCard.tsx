import React from 'react';
import { Link } from 'react-router-dom';
import clsx from 'clsx';
import { TrendingUp } from 'lucide-react';
import type { Domain } from '../../types';

/* =============================================================================
   DomainCard — compact domain tile (Dashboard "Learning Domains" list).
   Renders a coloured initial avatar + name, links into Explore filtered by it.
   ============================================================================= */

const COLORS = [
  'bg-primary-50 text-primary-500',
  'bg-success-soft text-success',
  'bg-achievement-soft text-achievement',
  'bg-warning-soft text-warning',
  'bg-danger-soft text-danger',
];

interface DomainCardProps {
  domain: Domain;
  /** Index used to pick a rotating accent colour. */
  index?: number;
  className?: string;
}

export const DomainCard: React.FC<DomainCardProps> = ({ domain, index = 0, className }) => (
  <Link
    to={`/explore?domain=${domain.id}`}
    className={clsx(
      'card p-3.5 flex items-center gap-3 hover:-translate-y-0.5 transition-all duration-200 block',
      className
    )}
  >
    <div
      className={clsx(
        'w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0',
        COLORS[index % COLORS.length]
      )}
    >
      {domain.name[0]?.toUpperCase()}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-text-primary truncate">{domain.name}</p>
    </div>
    <TrendingUp size={14} className="text-text-muted" />
  </Link>
);
