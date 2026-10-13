/* =============================================================================
   traceBuilder — a small, chainable authoring helper that turns imperative
   "simulator" logic into a well-formed, time-sorted AnimationTrace.

   Why a builder?
   --------------
   Hand-writing keyframe JSON is error-prone (ids must match across frames, times
   must be sorted, numeric defaults must be consistent). The builder lets a
   scene/simulator describe the world mutably — "move thread T1 here, lock the
   cell, wait 400ms" — and emits a clean trace the CanvasAnimator can replay.

   This is the client-side mirror of what a backend simulator would produce as
   JSON. Keeping the shape identical means a scene can be swapped from
   "generated in the browser" to "fetched from the API" with no renderer change.
   ============================================================================= */

import type {
  AnimationNotes,
  AnimationTheme,
  AnimationTrace,
  Checkpoint,
  CodeProgram,
  ConnectionState,
  EntityState,
  InstructionStep,
  Keyframe,
} from '../../../types/animation';

export interface TraceMeta {
  id: string;
  title: string;
  description?: string;
  viewport: { width: number; height: number };
  theme?: AnimationTheme;
  category?: AnimationTrace['category'];
  notes?: AnimationNotes;
  programs?: CodeProgram[];
}

export class TraceBuilder {
  private cursor = 0;
  private entities = new Map<string, EntityState>();
  private connections = new Map<string, ConnectionState>();
  private variables: Record<string, string | number | boolean> = {};
  private caption?: string;
  private keyframes: Keyframe[] = [];
  private instructions: InstructionStep[] = [];
  private checkpoints: Checkpoint[] = [];
  private notes?: AnimationNotes;
  private programs: CodeProgram[] = [];
  private readonly meta: TraceMeta;

  constructor(meta: TraceMeta) {
    this.meta = meta;
    this.notes = meta.notes;
    this.programs = meta.programs ? [...meta.programs] : [];
  }

  /** Current cursor time (ms) — handy for anchoring steps/checkpoints. */
  now(): number {
    return this.cursor;
  }

  /**
   * Add a step to the instruction rail, anchored at the current cursor time
   * (or an explicit `time`). The rail highlights steps as the playhead passes.
   */
  step(title: string, detail?: string, time?: number): this {
    this.instructions.push({
      id: `step-${this.instructions.length + 1}`,
      time: time ?? this.cursor,
      title,
      detail,
    });
    return this;
  }

  /**
   * Add a mid-animation checkpoint that pauses playback at the current cursor
   * time (or an explicit `time`) and asks a question.
   */
  checkpoint(cp: Omit<Checkpoint, 'id' | 'time'> & { id?: string; time?: number }): this {
    this.checkpoints.push({
      id: cp.id ?? `cp-${this.checkpoints.length + 1}`,
      time: cp.time ?? this.cursor,
      kind: cp.kind,
      prompt: cp.prompt,
      options: cp.options,
      answer: cp.answer,
      tolerance: cp.tolerance,
      explanation: cp.explanation,
      hint: cp.hint,
      blocking: cp.blocking,
    });
    return this;
  }

  /** Attach / merge general authoring notes (summary, where-to-use, …). */
  withNotes(notes: AnimationNotes): this {
    this.notes = { ...(this.notes ?? {}), ...notes };
    return this;
  }

  /** Attach a source-code program (LeetCode solution, SQL query, …) to the scene. */
  program(program: CodeProgram): this {
    const idx = this.programs.findIndex((p) => p.id === program.id);
    if (idx >= 0) this.programs[idx] = program;
    else this.programs.push(program);
    return this;
  }

  /**
   * Highlight code line(s) of a program at the current cursor time (or explicit
   * `time`). Chains naturally with `.set().say().commit()` so code lines light up
   * in lock-step with the animation.
   */
  highlightCode(programId: string, lines: number[], note?: string, time?: number): this {
    const p = this.programs.find((pr) => pr.id === programId);
    if (!p) return this;
    p.highlights = p.highlights ?? [];
    p.highlights.push({ time: time ?? this.cursor, lines, note });
    return this;
  }

  /** Create or update an entity's state (partial merge). */
  set(id: string, patch: Partial<EntityState>): this {
    const prev = this.entities.get(id);
    this.entities.set(id, { ...(prev ?? ({ id, x: 0, y: 0 } as EntityState)), ...patch, id });
    return this;
  }

  /** Create or update a connection (partial merge). */
  link(id: string, patch: Partial<ConnectionState> & { from: string; to: string }): this {
    const prev = this.connections.get(id);
    this.connections.set(id, { ...(prev ?? {}), ...patch, id });
    return this;
  }

  /** Remove a connection going forward. */
  unlink(id: string): this {
    this.connections.delete(id);
    return this;
  }

  /** Set / merge global HUD variables. */
  vars(patch: Record<string, string | number | boolean>): this {
    this.variables = { ...this.variables, ...patch };
    return this;
  }

  /** Narration ribbon for the upcoming keyframe. */
  say(caption: string): this {
    this.caption = caption;
    return this;
  }

  /**
   * Commit the current world as a keyframe at the current cursor time, then
   * advance the cursor by `holdMs` (dwell before the next transition).
   */
  commit(holdMs = 0): this {
    this.keyframes.push(this.snapshot(this.cursor));
    this.cursor += holdMs;
    return this;
  }

  /** Advance the cursor without committing (used to space out transitions). */
  wait(ms: number): this {
    this.cursor += ms;
    return this;
  }

  private snapshot(time: number): Keyframe {
    const entities: Record<string, EntityState> = {};
    this.entities.forEach((e, id) => (entities[id] = { ...e }));
    const connections: Record<string, ConnectionState> = {};
    this.connections.forEach((c, id) => (connections[id] = { ...c }));
    return {
      time,
      entities,
      connections: Object.keys(connections).length ? connections : undefined,
      variables: { ...this.variables },
      caption: this.caption,
    };
  }

  build(): AnimationTrace {
    // Guarantee a terminal keyframe so motion settles at the end.
    if (
      this.keyframes.length === 0 ||
      this.keyframes[this.keyframes.length - 1].time < this.cursor
    ) {
      this.keyframes.push(this.snapshot(this.cursor));
    }
    return {
      id: this.meta.id,
      title: this.meta.title,
      description: this.meta.description,
      viewport: this.meta.viewport,
      duration: this.keyframes[this.keyframes.length - 1].time,
      keyframes: this.keyframes,
      theme: this.meta.theme,
      category: this.meta.category,
      instructions: this.instructions.length ? this.instructions : undefined,
      checkpoints: this.checkpoints.length
        ? [...this.checkpoints].sort((a, b) => a.time - b.time)
        : undefined,
      notes: this.notes,
      programs: this.programs.length
        ? this.programs.map((p) => ({
            ...p,
            highlights: p.highlights
              ? [...p.highlights].sort((a, b) => a.time - b.time)
              : undefined,
          }))
        : undefined,
    };
  }
}
