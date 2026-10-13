import { useCallback, useEffect, useRef, useState } from 'react';
import { read, write } from './storage';
import { DEFAULT_POMODORO_SETTINGS, type PomodoroSettings } from './types';
import { usePomodoroStats } from './hooks';

/* =============================================================================
   usePomodoro — a self-contained Pomodoro engine.

   • Survives panel open/close and page navigation by persisting its running
     state (phase + target timestamp) to localStorage. When remounted it
     re-derives `remaining` from the wall-clock, so the timer keeps ticking
     "in the background" even though no component was mounted.
   • Advances focus → break → focus automatically, counting completed focus
     sessions toward a long break and recording each finished focus block in the
     shared Pomodoro stats.
   • Fires an optional chime + Notification when a phase completes.
   ============================================================================= */

export type Phase = 'focus' | 'short' | 'long';

interface RunState {
  phase: Phase;
  /** epoch ms when the current phase ends; null when paused/idle. */
  endsAt: number | null;
  /** seconds left when paused (so resume is exact). */
  pausedRemaining: number | null;
  completedFocus: number; // focus sessions completed in the current cycle
  running: boolean;
}

const STATE_KEY = 'pomodoro_state';

function phaseSeconds(phase: Phase, s: PomodoroSettings): number {
  if (phase === 'focus') return s.focusMinutes * 60;
  if (phase === 'short') return s.shortBreakMinutes * 60;
  return s.longBreakMinutes * 60;
}

function playChime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9);
    osc.start();
    osc.stop(ctx.currentTime + 0.95);
    osc.onended = () => ctx.close();
  } catch {
    /* audio blocked — ignore */
  }
}

function notify(title: string, body: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, silent: true });
    }
  } catch {
    /* ignore */
  }
}

export function usePomodoro() {
  const [settings, setSettingsState] = useState<PomodoroSettings>(() =>
    read<PomodoroSettings>('pomodoro_settings', DEFAULT_POMODORO_SETTINGS),
  );
  const [state, setState] = useState<RunState>(() =>
    read<RunState>(STATE_KEY, {
      phase: 'focus',
      endsAt: null,
      pausedRemaining: null,
      completedFocus: 0,
      running: false,
    }),
  );
  const [remaining, setRemaining] = useState<number>(() => phaseSeconds(state.phase, settings));

  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const { recordSession } = usePomodoroStats();

  const persistState = useCallback((next: RunState) => {
    write(STATE_KEY, next);
    setState(next);
  }, []);

  const setSettings = useCallback((patch: Partial<PomodoroSettings>) => {
    setSettingsState((prev) => {
      const next = { ...prev, ...patch };
      write('pomodoro_settings', next);
      return next;
    });
  }, []);

  // Determine the next phase after a completion.
  const resolveNext = useCallback(
    (prev: RunState): { phase: Phase; completedFocus: number } => {
      const s = settingsRef.current;
      if (prev.phase === 'focus') {
        const completed = prev.completedFocus + 1;
        const isLong = completed % s.sessionsBeforeLongBreak === 0;
        return { phase: isLong ? 'long' : 'short', completedFocus: completed };
      }
      return { phase: 'focus', completedFocus: prev.completedFocus };
    },
    [],
  );

  // Advance to the next phase when the current one elapses.
  const complete = useCallback(() => {
    setState((prev) => {
      const s = settingsRef.current;
      if (prev.phase === 'focus') recordSession(s.focusMinutes);

      const { phase, completedFocus } = resolveNext(prev);
      const dur = phaseSeconds(phase, s);
      const autostart = s.autoStartNext;

      if (s.soundEnabled) playChime();
      notify(
        prev.phase === 'focus' ? 'Focus complete 🎉' : 'Break over',
        prev.phase === 'focus' ? 'Time for a break.' : 'Back to focus!',
      );

      const next: RunState = {
        phase,
        completedFocus,
        running: autostart,
        endsAt: autostart ? Date.now() + dur * 1000 : null,
        pausedRemaining: autostart ? null : dur,
      };
      write(STATE_KEY, next);
      setRemaining(dur);
      return next;
    });
  }, [recordSession, resolveNext]);

  // Keep `remaining` correct for the idle/paused case without a cascading
  // setState-in-effect: derive it whenever phase/pause/settings change.
  useEffect(() => {
    if (state.running && state.endsAt != null) return;
    setRemaining(state.pausedRemaining ?? phaseSeconds(state.phase, settings));
  }, [state.running, state.endsAt, state.phase, state.pausedRemaining, settings]);

  // Tick loop — derives remaining from wall-clock so background time counts.
  useEffect(() => {
    if (!state.running || state.endsAt == null) return;
    const tick = () => {
      const left = Math.round((state.endsAt! - Date.now()) / 1000);
      if (left <= 0) {
        setRemaining(0);
        complete();
      } else {
        setRemaining(left);
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [state.running, state.endsAt, state.phase, state.pausedRemaining, settings, complete]);

  // ── Controls ────────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
    setState((prev) => {
      const secs = prev.pausedRemaining ?? phaseSeconds(prev.phase, settingsRef.current);
      const next: RunState = {
        ...prev,
        running: true,
        endsAt: Date.now() + secs * 1000,
        pausedRemaining: null,
      };
      write(STATE_KEY, next);
      return next;
    });
  }, []);

  const pause = useCallback(() => {
    setState((prev) => {
      if (!prev.running || prev.endsAt == null) return prev;
      const left = Math.max(0, Math.round((prev.endsAt - Date.now()) / 1000));
      const next: RunState = { ...prev, running: false, endsAt: null, pausedRemaining: left };
      write(STATE_KEY, next);
      setRemaining(left);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    const dur = phaseSeconds(state.phase, settingsRef.current);
    persistState({ ...state, running: false, endsAt: null, pausedRemaining: dur });
    setRemaining(dur);
  }, [state, persistState]);

  const skip = useCallback(() => {
    complete();
  }, [complete]);

  const switchPhase = useCallback(
    (phase: Phase) => {
      const dur = phaseSeconds(phase, settingsRef.current);
      persistState({
        phase,
        running: false,
        endsAt: null,
        pausedRemaining: dur,
        completedFocus: state.completedFocus,
      });
      setRemaining(dur);
    },
    [persistState, state.completedFocus],
  );

  const total = phaseSeconds(state.phase, settings);
  const progress = total > 0 ? 1 - remaining / total : 0;

  return {
    phase: state.phase,
    running: state.running,
    remaining,
    total,
    progress,
    completedFocus: state.completedFocus,
    settings,
    setSettings,
    start,
    pause,
    reset,
    skip,
    switchPhase,
  };
}
