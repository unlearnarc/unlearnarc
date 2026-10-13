import type { Step, UserInputRequest, VisualizationSpec } from "./types";

export interface EngineState {
  index: number;
  total: number;
  step: Step | undefined;
  isPlaying: boolean;
  isFinished: boolean;
  /** Set when the current step requires input that has not been answered. */
  pendingInput: UserInputRequest | undefined;
  /** Collected answers keyed by input.key. */
  inputs: Record<string, unknown>;
}

export type EngineListener = (state: EngineState) => void;

/**
 * Framework-agnostic playback state machine.
 *
 * Responsibilities:
 *  - forward / backward / seek / reset step control
 *  - auto-play with a configurable speed (ms per step)
 *  - pause automatically when a step declares `input`
 *  - branch to another step id when a CHOICE option carries `nextStepId`
 *
 * It holds NO rendering logic — the React layer and canvas renderers subscribe
 * to state changes. This keeps the engine unit-testable and reusable (e.g.
 * headless snapshot testing of a spec).
 */
export class VisualizationEngine {
  private readonly spec: VisualizationSpec;
  private readonly idToIndex = new Map<string, number>();
  private listeners = new Set<EngineListener>();

  private index = 0;
  private playing = false;
  private inputs: Record<string, unknown> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private speedMs = 900;

  constructor(spec: VisualizationSpec | null | undefined) {
    // Defensive: a summary payload (no spec) or a malformed spec must never
    // crash the host. Normalise to an empty, well-formed spec instead.
    this.spec = {
      visualizer: spec?.visualizer ?? "ARRAY",
      initialState: spec?.initialState,
      variables: Array.isArray(spec?.variables) ? spec!.variables : [],
      steps: Array.isArray(spec?.steps) ? spec!.steps : [],
    };
    this.spec.steps.forEach((s, i) => {
      if (s.id) this.idToIndex.set(s.id, i);
    });
  }

  // ── subscription ─────────────────────────────────────────────────────────
  subscribe(listener: EngineListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
  }

  snapshot(): EngineState {
    const step = this.spec.steps[this.index];
    const total = this.spec.steps.length;
    const pendingInput =
      step?.input && this.inputs[step.input.key] === undefined
        ? step.input
        : undefined;
    return {
      index: this.index,
      total,
      step,
      isPlaying: this.playing,
      isFinished: this.index >= total - 1,
      pendingInput,
      inputs: { ...this.inputs },
    };
  }

  // ── step control ─────────────────────────────────────────────────────────
  next(): void {
    const snap = this.snapshot();
    if (snap.pendingInput) {
      // Block auto-advance until the learner answers.
      this.pause();
      return;
    }
    if (this.index < this.spec.steps.length - 1) {
      this.index += 1;
      this.emit();
      if (this.playing) this.scheduleNext();
    } else {
      this.pause();
    }
  }

  prev(): void {
    if (this.index > 0) {
      this.index -= 1;
      this.emit();
    }
  }

  seek(index: number): void {
    const clamped = Math.max(0, Math.min(index, this.spec.steps.length - 1));
    this.index = clamped;
    this.emit();
  }

  seekToStepId(id: string): void {
    const idx = this.idToIndex.get(id);
    if (idx !== undefined) this.seek(idx);
  }

  reset(): void {
    this.pause();
    this.index = 0;
    this.inputs = {};
    this.emit();
  }

  // ── auto play ──────────────────────────────────────────────────────────────
  play(): void {
    if (this.playing) return;
    if (this.snapshot().pendingInput) return;
    this.playing = true;
    this.emit();
    this.scheduleNext();
  }

  pause(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.playing) {
      this.playing = false;
      this.emit();
    }
  }

  setSpeed(ms: number): void {
    this.speedMs = Math.max(100, ms);
  }

  private scheduleNext(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.next(), this.speedMs);
  }

  // ── user input ──────────────────────────────────────────────────────────────
  /**
   * Submit an answer for the current step's input request.
   * Returns true if the (optional) expected answer matched.
   * Handles CHOICE branching via option.nextStepId.
   */
  submitInput(value: unknown): { correct: boolean | null } {
    const step = this.spec.steps[this.index];
    const input = step?.input;
    if (!input) return { correct: null };

    this.inputs[input.key] = value;

    // branch if a matching option declares nextStepId
    if (input.options) {
      const picked = input.options.find((o) => o.value === value);
      if (picked?.nextStepId) {
        this.emit();
        this.seekToStepId(picked.nextStepId);
        return { correct: this.evaluate(input, value) };
      }
    }

    this.emit();
    return { correct: this.evaluate(input, value) };
  }

  private evaluate(input: UserInputRequest, value: unknown): boolean | null {
    if (input.expected === undefined || input.expected === null) return null;
    // Loose compare so "5" from a NUMBER input matches 5.
    // eslint-disable-next-line eqeqeq
    return input.expected == (value as never);
  }

  dispose(): void {
    this.pause();
    this.listeners.clear();
  }
}
