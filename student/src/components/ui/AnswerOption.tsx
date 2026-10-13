import React from 'react';
import clsx from 'clsx';
import { CheckCircle } from 'lucide-react';

/* =============================================================================
   AnswerOption — a single selectable answer row inside the quiz question card.
   Designed for the dark quiz surface (glass / on-dark styling).
   ============================================================================= */

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface AnswerOptionProps {
  text: string;
  /** Zero-based index → rendered as A, B, C … */
  index: number;
  selected: boolean;
  onToggle: () => void;
  className?: string;
}

export const AnswerOption: React.FC<AnswerOptionProps> = ({
  text,
  index,
  selected,
  onToggle,
  className,
}) => (
  <button
    onClick={onToggle}
    className={clsx(
      'w-full text-left flex items-center gap-4 px-4 py-3.5 rounded-[10px] border transition-all duration-150',
      selected
        ? 'bg-primary-500/25 border-primary-500 text-white'
        : 'bg-white/5 border-white/10 text-text-on-dark hover:bg-white/10 hover:border-white/25',
      className
    )}
  >
    <div
      className={clsx(
        'w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition',
        selected ? 'bg-primary-500 text-white' : 'bg-white/10 text-text-muted'
      )}
    >
      {LETTERS[index] ?? index + 1}
    </div>
    <span className="text-sm leading-snug">{text}</span>
    {selected && <CheckCircle size={15} className="text-primary-500 ml-auto shrink-0" />}
  </button>
);
