import React from 'react';
import { ListChecks, Circle, CheckCircle2, PlayCircle } from 'lucide-react';
import type { InstructionStep } from '../../types/animation';
import { activeInstructionIndex } from '../../types/animation';
import type { PlaybackControls } from './usePlaybackController';

/* =============================================================================
   InstructionRail — a time-synced, step-by-step narration list.

   The rail highlights the step whose timestamp the playhead has reached. Steps
   already passed show as "done", the current one is active, upcoming ones are
   muted. Clicking a step seeks the animation to that moment, so the rail doubles
   as a chapter navigator.
   ============================================================================= */

export interface InstructionRailProps {
  steps: InstructionStep[];
  /** Current playhead (ms). */
  time: number;
  controls: Pick<PlaybackControls, 'seek'>;
  className?: string;
}

export const InstructionRail: React.FC<InstructionRailProps> = ({
  steps,
  time,
  controls,
  className,
}) => {
  if (!steps || steps.length === 0) return null;
  const activeIdx = activeInstructionIndex(steps, time);

  return (
    <div
      className={`rounded-2xl border border-border p-3.5 ${className ?? ''}`}
      style={{ background: 'var(--ua-surface-soft)' }}
      aria-label="Step-by-step instructions"
    >
      <header className="flex items-center gap-2 mb-3">
        <ListChecks size={15} className="text-primary-500" />
        <h4 className="text-[13px] font-bold text-text-primary">Steps</h4>
        <span className="ml-auto text-[11px] text-text-muted">
          {Math.max(0, activeIdx + 1)} / {steps.length}
        </span>
      </header>

      <ol className="space-y-1.5">
        {steps.map((s, i) => {
          const state =
            i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'upcoming';
          return (
            <li key={s.id}>
              <button
                onClick={() => controls.seek(s.time)}
                className={`w-full text-left flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition ${
                  state === 'active'
                    ? 'bg-primary-500/10'
                    : 'hover:bg-white/[0.03]'
                }`}
              >
                <span className="mt-0.5 shrink-0">
                  {state === 'done' ? (
                    <CheckCircle2 size={15} className="text-success" />
                  ) : state === 'active' ? (
                    <PlayCircle size={15} className="text-primary-500" />
                  ) : (
                    <Circle size={15} className="text-text-muted" />
                  )}
                </span>
                <span className="min-w-0">
                  <span
                    className={`block text-[12.5px] font-semibold leading-snug ${
                      state === 'upcoming'
                        ? 'text-text-muted'
                        : 'text-text-primary'
                    }`}
                  >
                    {s.title}
                  </span>
                  {state === 'active' && s.detail && (
                    <span className="block text-[11.5px] text-text-secondary leading-relaxed mt-0.5">
                      {s.detail}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
