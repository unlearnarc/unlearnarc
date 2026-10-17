import React, { useMemo } from 'react';
import { Cpu, Info } from 'lucide-react';
import { CanvasAnimator } from '../CanvasAnimator';
import { buildAtomicOperationsTrace } from './atomicOperationsTrace';
import { usePlaybackController } from '../usePlaybackController';

/* =============================================================================
   AtomicOperationsScene — reference implementation / proof-of-concept.

   Demonstrates the full Canvas Animation subsystem end-to-end:
     simulator (traceBuilder) → AnimationTrace → CanvasAnimator → AnimationToolbar

   Visualises a lock-free Compare-And-Swap (CAS) loop where three threads race to
   increment a shared counter — showing lock acquisition, successful commits,
   failed CAS attempts on stale reads, and retries.

   Mount this anywhere (e.g. a System Design / Concurrency tutorial page):
       <AtomicOperationsScene />
   ============================================================================= */

export interface AtomicOperationsSceneProps {
  autoPlay?: boolean;
  className?: string;
}

export const AtomicOperationsScene: React.FC<AtomicOperationsSceneProps> = ({
  autoPlay = false,
  className,
}) => {
  // The trace is deterministic — build it once.
  const trace = useMemo(() => buildAtomicOperationsTrace(), []);

  return (
    <section
      className={`rounded-2xl border border-border p-4 md:p-5 space-y-4 animate-fade-in ${
        className ?? ''
      }`}
      style={{ background: 'var(--ua-surface)' }}
      aria-label="Atomic operations (CAS) animation"
    >
      <header className="flex items-start gap-2.5">
        <span className="mt-0.5 text-primary-500 shrink-0">
          <Cpu size={18} />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-text-primary leading-snug">
            {trace.title}
          </h3>
          <p className="text-[13px] text-text-secondary leading-relaxed mt-0.5">
            {trace.description}
          </p>
        </div>
      </header>

      <CanvasAnimator
        traceData={trace}
        autoPlay={autoPlay}
        initialSpeed={1}
        showGrid
        showCaption
        showInstructions
        showNotes
        enableCheckpoints
      />

      <HudLegend />
    </section>
  );
};

const LEGEND = [
  { label: 'Idle', color: '#475569' },
  { label: 'Active / Read', color: '#2563EB' },
  { label: 'Locked (CAS)', color: '#F59E0B' },
  { label: 'Success', color: '#16A34A' },
  { label: 'CAS failed', color: '#DC2626' },
  { label: 'Retry', color: '#D97706' },
];

const HudLegend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
    <span className="inline-flex items-center gap-1.5 text-[11.5px] text-text-muted">
      <Info size={13} /> States
    </span>
    {LEGEND.map((l) => (
      <span key={l.label} className="inline-flex items-center gap-1.5 text-[11.5px]">
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: l.color }}
        />
        <span className="text-text-secondary">{l.label}</span>
      </span>
    ))}
  </div>
);

/* -----------------------------------------------------------------------------
   Variant that exposes the live HUD variables alongside the canvas, using the
   shared playback controller — handy for a richer tutorial layout.
   --------------------------------------------------------------------------- */
export const AtomicOperationsSceneWithHud: React.FC<AtomicOperationsSceneProps> = ({
  autoPlay = false,
  className,
}) => {
  const trace = useMemo(() => buildAtomicOperationsTrace(), []);
  // Controller instantiated here is illustrative of external-control mounting.
  usePlaybackController(trace, { autoPlay });
  return <AtomicOperationsScene autoPlay={autoPlay} className={className} />;
};
