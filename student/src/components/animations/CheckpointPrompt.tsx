import React, { useMemo, useState } from 'react';
import { HelpCircle, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import type { Checkpoint } from '../../types/animation';
import type { PlaybackControls } from './usePlaybackController';
import { QuestionModal } from '../ui/QuestionModal';

/* =============================================================================
   CheckpointPrompt — the mid-animation question overlay.

   When the playback controller pauses at a checkpoint, this surfaces the
   question over the canvas. The user answers; the controller validates it. A
   correct answer (or a non-blocking checkpoint) dismisses the overlay and
   resumes playback. Blocking checkpoints keep the user until they're right.
   ============================================================================= */

export interface CheckpointPromptProps {
  checkpoint: Checkpoint;
  controls: Pick<PlaybackControls, 'answerCheckpoint' | 'skipCheckpoint'>;
}

export const CheckpointPrompt: React.FC<CheckpointPromptProps> = ({
  checkpoint,
  controls,
}) => {
  const [selected, setSelected] = useState<string[]>([]);
  const [numberValue, setNumberValue] = useState('');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  // Reset local state whenever a new checkpoint appears.
  const cpKey = checkpoint.id;
  useMemo(() => {
    setSelected([]);
    setNumberValue('');
    setFeedback(null);
  }, [cpKey]);

  const canSubmit =
    checkpoint.kind === 'number'
      ? numberValue.trim() !== ''
      : selected.length > 0;

  const submit = (value: string | string[] | boolean | number) => {
    const correct = controls.answerCheckpoint(value);
    setFeedback(correct ? 'correct' : 'wrong');
  };

  const handleSubmit = () => {
    switch (checkpoint.kind) {
      case 'single':
        submit(selected[0]);
        break;
      case 'multiple':
        submit(selected);
        break;
      case 'boolean':
        submit(selected[0] === 'true');
        break;
      case 'number':
        submit(Number(numberValue));
        break;
    }
  };

  const toggleOption = (id: string) => {
    if (checkpoint.kind === 'multiple') {
      setSelected((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelected([id]);
    }
    setFeedback(null);
  };

  const options =
    checkpoint.kind === 'boolean'
      ? [
          { id: 'true', label: 'True' },
          { id: 'false', label: 'False' },
        ]
      : checkpoint.options ?? [];

  return (
    <QuestionModal label="Animation checkpoint question">
      <div className="space-y-4">
        <header className="flex items-start gap-2.5">
          <span className="mt-0.5 text-primary-500 shrink-0">
            <HelpCircle size={18} />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
              Checkpoint
            </p>
            <h4 className="text-sm md:text-base font-bold text-text-primary leading-snug">
              {checkpoint.prompt}
            </h4>
          </div>
        </header>

        {checkpoint.kind === 'number' ? (
          <input
            type="number"
            value={numberValue}
            onChange={(e) => {
              setNumberValue(e.target.value);
              setFeedback(null);
            }}
            placeholder="Type your answer…"
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            autoFocus
          />
        ) : (
          <div className="space-y-2">
            {options.map((o) => {
              const active = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  onClick={() => toggleOption(o.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-[13px] transition ${
                    active
                      ? 'border-primary-500 text-text-primary'
                      : 'border-border text-text-secondary hover:text-text-primary'
                  }`}
                  style={active ? { background: 'rgba(37,99,235,0.14)' } : undefined}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        )}

        {feedback === 'correct' && (
          <p className="flex items-start gap-2 text-[13px] text-success">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            <span>{checkpoint.explanation ?? 'Correct!'}</span>
          </p>
        )}
        {feedback === 'wrong' && (
          <p className="flex items-start gap-2 text-[13px] text-danger">
            <XCircle size={15} className="mt-0.5 shrink-0" />
            <span>
              {checkpoint.hint ?? 'Not quite — try again.'}
              {checkpoint.blocking ? '' : ' You can continue anyway.'}
            </span>
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          {!checkpoint.blocking ? (
            <button
              onClick={controls.skipCheckpoint}
              className="text-[12.5px] font-medium text-text-muted hover:text-text-secondary"
            >
              Skip
            </button>
          ) : (
            <span className="text-[11.5px] text-text-muted">
              Answer correctly to continue
            </span>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || feedback === 'correct'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-4 py-2 text-[13px] font-semibold text-white transition hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </QuestionModal>
  );
};
