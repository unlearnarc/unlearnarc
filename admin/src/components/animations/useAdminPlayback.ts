import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimationTrace } from '../../types/animation';

/* =============================================================================
   useAdminPlayback — a trimmed time-based playback controller for the admin
   preview canvas. Mirrors the student usePlaybackController performance model
   (playhead in a ref, throttled UI read-out) but drops checkpoint gating since
   the admin preview is a scrubbable dry-run, not an interactive lesson.
   ============================================================================= */

export interface AdminPlaybackState {
  time: number;
  duration: number;
  isPlaying: boolean;
  isFinished: boolean;
  speed: number;
}

export interface AdminPlaybackControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (ms: number) => void;
  reset: () => void;
  setSpeed: (m: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
}

export interface AdminPlaybackHandle {
  state: AdminPlaybackState;
  controls: AdminPlaybackControls;
  timeRef: React.MutableRefObject<number>;
  seekTick: number;
}

const UI_REFRESH_MS = 66;

export function useAdminPlayback(
  trace: AnimationTrace,
  opts: { autoPlay?: boolean; initialSpeed?: number } = {},
): AdminPlaybackHandle {
  const duration = Math.max(1, trace.duration);

  const timeRef = useRef(0);
  const speedRef = useRef(opts.initialSpeed ?? 1);
  const playingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef(0);
  const lastUiRef = useRef(0);

  const [state, setState] = useState<AdminPlaybackState>({
    time: 0,
    duration,
    isPlaying: false,
    isFinished: false,
    speed: opts.initialSpeed ?? 1,
  });
  const [seekTick, setSeekTick] = useState(0);

  const sync = useCallback(() => {
    setState({
      time: timeRef.current,
      duration,
      isPlaying: playingRef.current,
      isFinished: timeRef.current >= duration,
      speed: speedRef.current,
    });
  }, [duration]);

  const stopRaf = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(
    (ts: number) => {
      if (!playingRef.current) return;
      const dt = lastTsRef.current ? ts - lastTsRef.current : 0;
      lastTsRef.current = ts;
      timeRef.current = Math.min(duration, timeRef.current + dt * speedRef.current);
      if (ts - lastUiRef.current >= UI_REFRESH_MS) {
        lastUiRef.current = ts;
        sync();
      }
      if (timeRef.current >= duration) {
        playingRef.current = false;
        stopRaf();
        sync();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [duration, sync, stopRaf],
  );

  const play = useCallback(() => {
    if (playingRef.current) return;
    if (timeRef.current >= duration) timeRef.current = 0;
    playingRef.current = true;
    lastTsRef.current = 0;
    lastUiRef.current = 0;
    sync();
    rafRef.current = requestAnimationFrame(tick);
  }, [duration, sync, tick]);

  const pause = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    stopRaf();
    sync();
  }, [stopRaf, sync]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const seek = useCallback(
    (ms: number) => {
      timeRef.current = Math.max(0, Math.min(duration, ms));
      sync();
      if (!playingRef.current) setSeekTick((t) => t + 1);
    },
    [duration, sync],
  );

  const reset = useCallback(() => {
    playingRef.current = false;
    stopRaf();
    timeRef.current = 0;
    sync();
    setSeekTick((t) => t + 1);
  }, [stopRaf, sync]);

  const setSpeed = useCallback(
    (m: number) => {
      speedRef.current = m;
      sync();
    },
    [sync],
  );

  const stepForward = useCallback(() => {
    const next = trace.keyframes.find((k) => k.time > timeRef.current + 0.5);
    seek(next ? next.time : duration);
  }, [trace.keyframes, duration, seek]);

  const stepBackward = useCallback(() => {
    const prev = [...trace.keyframes].reverse().find((k) => k.time < timeRef.current - 0.5);
    seek(prev ? prev.time : 0);
  }, [trace.keyframes, seek]);

  useEffect(() => {
    if (opts.autoPlay) play();
    return () => stopRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trace.id, trace.duration]);

  return {
    state,
    controls: { play, pause, toggle, seek, reset, setSpeed, stepForward, stepBackward },
    timeRef,
    seekTick,
  };
}
