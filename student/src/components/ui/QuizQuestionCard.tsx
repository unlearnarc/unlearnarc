import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Badge } from './Badge';
import { AnswerOption } from './AnswerOption';
import type { TestQuestion } from '../../types';

/* =============================================================================
   QuizQuestionCard — the glass question panel shown during a test.
   Renders difficulty/type badges, the prompt, a multi-select hint, and the
   list of AnswerOption rows. Selection state is owned by the parent.
   ============================================================================= */

interface QuizQuestionCardProps {
  question: TestQuestion;
  /** Currently selected answer ids for this question. */
  selected: string[];
  onToggleAnswer: (answerId: string) => void;
  className?: string;
}

export const QuizQuestionCard: React.FC<QuizQuestionCardProps> = ({
  question,
  selected,
  onToggleAnswer,
  className,
}) => (
  <div className={`quiz-question-card rounded-[18px] p-5 sm:p-8 animate-scale-in ${className ?? ''}`}>
    <div className="flex items-center gap-2 mb-4">
      <Badge label={question.difficulty} />
      <Badge label={question.questionType} />
      <span className="ml-auto text-xs text-text-muted">
        {question.points} pt{question.points !== 1 ? 's' : ''}
      </span>
    </div>

    <p className="text-text-primary text-base sm:text-lg font-medium leading-relaxed mb-6 break-words">
      {question.questionText}
    </p>

    {question.questionType === 'MULTIPLE_CORRECT' && (
      <p className="text-xs text-primary-400 mb-4 flex items-center gap-1.5">
        <AlertCircle size={12} /> Select all correct answers
      </p>
    )}

    <div className="space-y-2.5">
      {question.answers.map((ans, idx) => (
        <AnswerOption
          key={ans.id}
          index={idx}
          text={ans.answerText}
          selected={selected.includes(ans.id)}
          onToggle={() => onToggleAnswer(ans.id)}
        />
      ))}
    </div>
  </div>
);
