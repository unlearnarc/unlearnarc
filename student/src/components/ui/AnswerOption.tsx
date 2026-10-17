import React from 'react';
import clsx from 'clsx';
import { CheckCircle } from 'lucide-react';

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

interface AnswerOptionProps {
  text: string;
  /** Zero-based index → rendered as A, B, C … */
  index: number;
  selected: boolean;
  onToggle: () => void;
  className?: string;
}

/** Theme-aware selectable answer row, with an explicit pressed state. */
export const AnswerOption: React.FC<AnswerOptionProps> = ({ text, index, selected, onToggle, className }) => (
  <button
    type="button"
    aria-pressed={selected}
    onClick={onToggle}
    className={clsx(
      'quiz-answer w-full text-left flex items-center gap-3 sm:gap-4 px-4 py-3.5 rounded-[10px] border transition-all duration-150',
      selected && 'quiz-answer-selected',
      className
    )}
  >
    <div className="quiz-answer-letter w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 transition">
      {LETTERS[index] ?? index + 1}
    </div>
    <span className="min-w-0 text-sm leading-snug break-words">{text}</span>
    {selected && <CheckCircle size={15} className="text-primary-500 ml-auto shrink-0" />}
  </button>
);
