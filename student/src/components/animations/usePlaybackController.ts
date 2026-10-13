import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnimationTrace, Checkpoint } from '../../types/animation';
import {
  isCheckpointAnswerCorrect,
  pendingCheckpoint,
} from '../../types/animation';

/* =============================================================================
   usePlaybackController — the time-based playback state machine for the Canvas
   Animation Engine.

   PERFORMANCE CONTRACT
   --------------------
   The *continuous* playhead (`timeRef`) lives in a ref and is advanced inside a
   single requestAnimationFrame loop — it is NEVER stored in React state, so the
   render loop does not trigger React re-renders every frame.

   React state (`uiTick`) is updated on a throttled cadence (~15 fps) purely to
   refresh the toolbar read-outs (timestamp, slider position). The canvas itself
   reads `timeRef.current` directly every animation frame for buttery motion.

   The controller also exposes imperative controls (play/pause/seek/step/speed)
   that any toolbar can bind to.
   ============================================================================= */

export interface PlaybackState {
  /** Current playhead in ms (snapshot — read timeRef for per-frame precision). */
  time: number;
  duration: number;
  isPlaying: boolean;
  isFinished: boolean;
  speed: number;
  /** The checkpoint currently blocking playback (null when none pending). */
  activeCheckpoint: Checkpoint | null;
  /** ids of checkpoints the user has already answered. */
  answeredCheckpoints: string[];
}

export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  toggle: () => void;
  /** Seek to an absolute time in ms. */
  seek: (ms: number) => void;
  /** Restart from 0 and pause. */
  reset: () => void;
  setSpeed: (multiplier: number) => void;
  /** Jump to the next keyframe boundary. */
  stepForward: () => void;
  /** Jump to the previous keyframe boundary. */
  stepBackward: () => void;
  /**
   * Submit an answer for the active checkpoint. Returns whether it was correct.
   * A correct answer (or a non-blocking checkpoint) dismisses the prompt and
   * resumes playback.
   */
  answerCheckpoint: (value: string | string[] | boolean | number) => boolean;
  /** Dismiss the active checkpoint without answering (skip). */
  skipCheckpoint: () => void;
}

export interface PlaybackHandle {
  state: PlaybackState;
  controls: PlaybackControls;
  /** Live, mutable playhead — read this inside the render loop (no re-render). */
  timeRef: React.MutableRefObject<number>;
  /** Bump when a manual seek happens so the canvas redraws while paused. */
  seekTick: number;
}

/** UI read-out refresh rate while playing (keeps toolbar cheap). */
const UI_REFRESH_MS = 66; // ~15 fps

export function usePlaybackController(
  trace: AnimationTrace,
  opts: { autoPlay?: boolean; initialSpeed?: number } = {},
): PlaybackHandle {
  const duration = Math.max(1, trace.duration);

  const timeRef = useRef(0);
  const speedRef = useRef(opts.initialSpeed ?? 1);
  const playingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const lastUiRef = useRef<number>(0);

  // Checkpoint state lives in refs so the RAF loop can read/mutate it cheaply.
  const answeredRef = useRef<Set<string>>(new Set());
  const activeCpRef = useRef<Checkpoint | null>(null);

  const [state, setState] = useState<PlaybackState>({
    time: 0,
    duration,
    isPlaying: false,
    isFinished: false,
    speed: opts.initialSpeed ?? 1,
    activeCheckpoint: null,
    answeredCheckpoints: [],
  });
  // Forces a one-off canvas redraw after a paused seek.
  const [seekTick, setSeekTick] = useState(0);

  const syncState = useCallback(() => {
    setState({
      time: timeRef.current,
      duration,
      isPlaying: playingRef.current,
      isFinished: timeRef.current >= duration,
      speed: speedRef.current,
      activeCheckpoint: activeCpRef.current,
      answeredCheckpoints: Array.from(answeredRef.current),
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

      // Pause at the first unanswered checkpoint the playhead has reached.
      const cp = pendingCheckpoint(trace.checkpoints, timeRef.current, answeredRef.current);
      if (cp) {
        // Snap exactly to the checkpoint time so the visual matches the prompt.
        timeRef.current = cp.time;
        activeCpRef.current = cp;
        playingRef.current = false;
        stopRaf();
        syncState();
        return;
      }

      // Throttle the React read-out; the canvas reads timeRef directly.
      if (ts - lastUiRef.current >= UI_REFRESH_MS) {
        lastUiRef.current = ts;
        syncState();
      }

      if (timeRef.current >= duration) {
        playingRef.current = false;
        stopRaf();
        syncState();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    },
    [duration, syncState, stopRaf, trace.checkpoints],
  );

  const play = useCallback(() => {
    if (playingRef.current) return;
    // Don't resume while a checkpoint is blocking playback.
    if (activeCpRef.current) return;
    // Restart from 0 if we're parked at the end.
    if (timeRef.current >= duration) timeRef.current = 0;
    playingRef.current = true;
    lastTsRef.current = 0;
    lastUiRef.current = 0;
    syncState();
    rafRef.current = requestAnimationFrame(tick);
  }, [duration, syncState, tick]);

  const pause = useCallback(() => {
    if (!playingRef.current) return;
    playingRef.current = false;
    stopRaf();
    syncState();
  }, [stopRaf, syncState]);

  const toggle = useCallback(() => {
    if (playingRef.current) pause();
    else play();
  }, [pause, play]);

  const seek = useCallback(
    (ms: number) => {
      const target = Math.max(0, Math.min(duration, ms));
      // Scrubbing backward past a checkpoint clears its "pending" block.
      if (activeCpRef.current && target < activeCpRef.current.time) {
        activeCpRef.current = null;
      }
      timeRef.current = target;
      syncState();
      if (!playingRef.current) setSeekTick((t) => t + 1);
    },
    [duration, syncState],
  );

  const reset = useCallback(() => {
    playingRef.current = false;
    stopRaf();
    timeRef.current = 0;
    activeCpRef.current = null;
    answeredRef.current = new Set();
    syncState();
    setSeekTick((t) => t + 1);
  }, [stopRaf, syncState]);

  const answerCheckpoint = useCallback(
    (value: string | string[] | boolean | number) => {
      const cp = activeCpRef.current;
      if (!cp) return false;
      const correct = isCheckpointAnswerCorrect(cp, value);
      // Blocking checkpoints only clear on a correct answer.
      if (correct || !cp.blocking) {
        answeredRef.current.add(cp.id);
        activeCpRef.current = null;
        syncState();
        // Nudge past the checkpoint instant and resume.
        timeRef.current = Math.min(duration, cp.time + 1);
        playingRef.current = true;
        lastTsRef.current = 0;
        lastUiRef.current = 0;
        rafRef.current = requestAnimationFrame(tick);
      } else {
        syncState();
      }
      return correct;
    },
    [duration, syncState, tick],
  );

  const skipCheckpoint = useCallback(() => {
    const cp = activeCpRef.current;
    if (!cp) return;
    answeredRef.current.add(cp.id);
    activeCpRef.current = null;
    // Nudge past the checkpoint instant and resume playback.
    timeRef.current = Math.min(duration, cp.time + 1);
    playingRef.current = true;
    lastTsRef.current = 0;
    lastUiRef.current = 0;
    syncState();
    rafRef.current = requestAnimationFrame(tick);
  }, [duration, syncState, tick]);

  const setSpeed = useCallback(
    (multiplier: number) => {
      speedRef.current = multiplier;
      syncState();
    },
    [syncState],
  );

  const stepForward = useCallback(() => {
    const next = trace.keyframes.find((k) => k.time > timeRef.current + 0.5);
    seek(next ? next.time : duration);
  }, [trace.keyframes, duration, seek]);

  const stepBackward = useCallback(() => {
    const prev = [...trace.keyframes]
      .reverse()
      .find((k) => k.time < timeRef.current - 0.5);
    seek(prev ? prev.time : 0);
  }, [trace.keyframes, seek]);

  // Auto-play once on mount if requested.
  useEffect(() => {
    if (opts.autoPlay) play();
    return () => stopRaf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-clamp when a brand-new trace is supplied.
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trace.id]);

  return {
    state,
    controls: {
      play, pause, toggle, seek, reset, setSpeed, stepForward, stepBackward,
      answerCheckpoint, skipCheckpoint,
    },
    timeRef,
    seekTick,
  };
}
