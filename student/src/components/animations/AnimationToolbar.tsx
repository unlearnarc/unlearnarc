import React, { useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Gauge,
} from 'lucide-react';
import type {
  PlaybackControls,
  PlaybackState,
} from './usePlaybackController';

/* =============================================================================
   AnimationToolbar — unified playback controls for the Canvas Animation Engine.
   Mirrors the look & feel of the algoviz PlaybackToolbar (same tokens, shapes)
   so the two subsystems feel like one product.
   ============================================================================= */

const SPEED_OPTIONS = [
  { label: '0.5×', value: 0.5 },
  { label: '1×', value: 1 },
  { label: '2×', value: 2 },
];

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const s = Math.floor(totalSec);
  const cs = Math.floor((totalSec - s) * 100);
  return `${s}.${String(cs).padStart(2, '0')}s`;
}

export interface AnimationToolbarProps {
  state: PlaybackState;
  controls: PlaybackControls;
  className?: string;
}

export const AnimationToolbar: React.FC<AnimationToolbarProps> = ({
  state,
  controls,
  className,
}) => {
  const { time, duration, isPlaying, isFinished, speed } = state;
  const atStart = time <= 0;

  const readout = useMemo(
    () => `${formatTime(time)} / ${formatTime(duration)}`,
    [time, duration],
  );

  return (
    <div
      className={`rounded-2xl border border-border p-2.5 md:p-3 flex flex-wrap items-center gap-2 md:gap-3 ${
        className ?? ''
      }`}
      style={{ background: '#16232E' }}
      role="group"
      aria-label="Animation playback controls"
    >
      <div className="flex items-center gap-1.5">
        <IconBtn
          onClick={controls.reset}
          disabled={atStart && !isPlaying}
          title="Restart"
          label="Restart"
        >
          <SkipBack size={16} aria-hidden />
        </IconBtn>
        <IconBtn
          onClick={controls.stepBackward}
          disabled={atStart}
          title="Previous keyframe"
          label="Previous keyframe"
        >
          <ChevronLeft size={16} aria-hidden />
        </IconBtn>

        {isPlaying ? (
          <IconBtn primary wide onClick={controls.pause} title="Pause" label="Pause">
            <Pause size={16} aria-hidden />
            <span className="text-[13px] font-semibold">Pause</span>
          </IconBtn>
        ) : (
          <IconBtn
            primary
            wide
            onClick={controls.play}
            title={isFinished ? 'Replay from start' : 'Play'}
            label="Play"
          >
            <Play size={16} aria-hidden />
            <span className="text-[13px] font-semibold">
              {isFinished ? 'Replay' : 'Play'}
            </span>
          </IconBtn>
        )}

        <IconBtn
          onClick={controls.stepForward}
          disabled={isFinished}
          title="Next keyframe"
          label="Next keyframe"
        >
          <ChevronRight size={16} aria-hidden />
        </IconBtn>
      </div>

      {/* scrub timeline */}
      <div className="flex items-center gap-3 flex-1 min-w-[180px]">
        <input
          type="range"
          min={0}
          max={duration}
          step={1}
          value={Math.round(time)}
          onChange={(e) => controls.seek(Number(e.target.value))}
          className="flex-1 cursor-pointer"
          style={{ accentColor: 'var(--ua-primary-500)' }}
          title="Drag to scrub the timeline"
          aria-label="Timeline scrubber"
          aria-valuetext={readout}
        />
        <span className="text-[12px] font-mono font-semibold text-text-secondary whitespace-nowrap min-w-[108px] text-right">
          {readout}
        </span>
      </div>

      {/* speed selector */}
      <label className="flex items-center gap-1.5 shrink-0" title="Playback speed">
        <Gauge size={15} className="text-text-muted" aria-hidden />
        <select
          value={speed}
          onChange={(e) => controls.setSpeed(Number(e.target.value))}
          className="rounded-lg border border-border text-[12.5px] font-semibold text-text-primary px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          style={{ background: 'rgba(255,255,255,0.04)' }}
          aria-label="Playback speed"
        >
          {SPEED_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

const IconBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  title: string;
  label: string;
  primary?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, title, label, primary, wide, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={label}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      wide ? 'px-4 py-2 min-w-[92px]' : 'w-9 h-9'
    } ${
      primary
        ? 'bg-primary-500 border-primary-500 text-white hover:brightness-110'
        : 'border-border text-text-secondary hover:text-text-primary'
    }`}
    style={primary ? undefined : { background: 'rgba(255,255,255,0.04)' }}
  >
    {children}
  </button>
);
