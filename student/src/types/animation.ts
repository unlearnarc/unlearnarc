/* =============================================================================
   Canvas Animation Engine — Trace Schema & Type Definitions
   -----------------------------------------------------------------------------
   A *time-based* (continuous) animation contract, distinct from the discrete,
   step-indexed `algoviz` subsystem. Here, state is captured as timestamped
   keyframes and the renderer interpolates (lerp) between adjacent keyframes so
   that scrubbing and variable playback speed are perfectly smooth.

   Pipeline:
     Simulator  →  AnimationTrace (JSON)  →  CanvasAnimator (interpolate+draw)
                                          ↘  AnimationToolbar (play/scrub/speed)

   Keep this file framework-agnostic: no React, no DOM. A trace produced here
   can be serialized to JSON by the backend simulator and replayed on the client.
   ============================================================================= */

/** Lifecycle / semantic status of a single entity at a given keyframe. */
export type EntityStatus =
  | 'IDLE'
  | 'ACTIVE'
  | 'LOCKED'
  | 'WAITING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRY'
  | 'DONE';

/**
 * How an entity should be drawn. Covers every tutorial domain:
 *  - circle / rect / pill / diamond / text : general nodes, boxes, labels
 *  - node        : graph vertex (circle with crisp border) — DSA graphs
 *  - cylinder    : database / datastore — System Design
 *  - matrix      : a grid of numbers (meta.rows / meta.cols / meta.values) — AI/ML, DP
 *  - table       : a titled SQL/record table (meta.columns / meta.rows) — SQL
 *  - packet      : a small travelling square — networking / routing
 *  - arrayCell   : a single indexed cell — DSA arrays
 */
export type EntityShape =
  | 'circle'
  | 'rect'
  | 'diamond'
  | 'pill'
  | 'text'
  | 'node'
  | 'cylinder'
  | 'matrix'
  | 'table'
  | 'packet'
  | 'arrayCell';

/**
 * A single visual entity's state at a keyframe (a thread, memory cell, pointer,
 * packet, matrix tile …). Numeric fields (x, y, opacity, scale, rotation,
 * progress) are interpolated between keyframes; discrete fields (label, color,
 * status, shape, visible) snap to the *source* keyframe's value.
 */
export interface EntityState {
  /** Stable identity used to match the same entity across keyframes. */
  id: string;

  // ── interpolated (numeric) fields ────────────────────────────────────────
  x: number;
  y: number;
  /** Optional box dimensions (interpolated when present). */
  width?: number;
  height?: number;
  /** Optional circle / marker radius (interpolated when present). */
  radius?: number;
  /** 0‑1, interpolated. Defaults to 1 when omitted. */
  opacity?: number;
  /** Uniform scale multiplier, interpolated. Defaults to 1. */
  scale?: number;
  /** Degrees, interpolated. Defaults to 0. */
  rotation?: number;
  /** Generic 0‑1 progress (e.g. a filling bar / spinner), interpolated. */
  progress?: number;

  // ── discrete (snapped) fields ────────────────────────────────────────────
  label?: string;
  /** Secondary text rendered beneath the label. */
  sublabel?: string;
  /** Any CSS color string, or a semantic token like 'primary' | 'success'. */
  color?: string;
  shape?: EntityShape;
  status?: EntityStatus;
  /** When false the entity is skipped entirely. Defaults to true. */
  visible?: boolean;

  /** Escape hatch for renderer-specific metadata (never interpolated). */
  meta?: Record<string, unknown>;
}

/** An optional directed/undirected visual link between two entities. */
export interface ConnectionState {
  id: string;
  from: string; // entity id
  to: string; // entity id
  color?: string;
  /** 0‑1, interpolated — animate a packet travelling along the link. */
  progress?: number;
  opacity?: number;
  label?: string;
  dashed?: boolean;
}

/**
 * A single snapshot of the whole scene at an exact point in time.
 * `time` is expressed in the same unit as `AnimationTrace.duration` (ms).
 */
export interface Keyframe {
  /** Absolute timestamp in milliseconds from the start of the trace. */
  time: number;
  /** All entities present at this instant, keyed by id for O(1) lookup. */
  entities: Record<string, EntityState>;
  /** Optional connections/edges present at this instant. */
  connections?: Record<string, ConnectionState>;
  /** Global scalar variables shown in a side panel / HUD (snapped). */
  variables?: Record<string, string | number | boolean>;
  /** Human-readable caption describing what happens at this moment. */
  caption?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   Instructions, checkpoints (mid-animation questions) & authoring notes.
   These are additive: a trace without them behaves exactly as before.
   ───────────────────────────────────────────────────────────────────────── */

/** A single step in the step-by-step instruction rail, tied to a timestamp. */
export interface InstructionStep {
  /** Stable id. */
  id: string;
  /** Timestamp (ms) this step becomes "current"; the rail highlights the
   *  last step whose `time <= playhead`. */
  time: number;
  /** Short title shown in the rail. */
  title: string;
  /** Optional longer explanation shown when the step is active. */
  detail?: string;
}

export type QuestionKind = 'single' | 'multiple' | 'boolean' | 'number';

export interface QuestionOption {
  id: string;
  label: string;
}

/**
 * A mid-animation checkpoint. When the playhead reaches `time`, playback pauses
 * and the question is surfaced. The user must answer (and optionally be correct,
 * when `blocking`) before playback resumes.
 */
export interface Checkpoint {
  id: string;
  /** Timestamp (ms) at which to pause and ask. */
  time: number;
  kind: QuestionKind;
  prompt: string;
  /** For single/multiple choice. */
  options?: QuestionOption[];
  /**
   * The correct answer:
   *  - single  → option id (string)
   *  - multiple→ array of option ids (string[])
   *  - boolean → boolean
   *  - number  → number (compared with optional `tolerance`)
   */
  answer: string | string[] | boolean | number;
  /** Absolute tolerance for `number` questions. Defaults to 0. */
  tolerance?: number;
  /** Shown after a correct answer. */
  explanation?: string;
  /** Shown after a wrong answer (hint). */
  hint?: string;
  /** When true the user must answer correctly before playback continues. */
  blocking?: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────
   Code programs — attach source code to a scene so a tutorial can teach a
   LeetCode problem, an SQL query, or any snippet *alongside* the animation.
   Lines are highlighted in sync with the playhead, and the panel can optionally
   mount a runnable sandbox (Pyodide / JS) so learners execute the code live.
   ───────────────────────────────────────────────────────────────────────── */

/** Languages the code panel understands (runnable ones map to the sandbox). */
export type CodeLanguage =
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'cpp'
  | 'c'
  | 'sql'
  | 'go'
  | 'rust'
  | 'text';

/**
 * A time-synced highlight that lights up one or more source lines while the
 * playhead is within [time, time + (next highlight or duration)]. This is what
 * ties an algorithm's *code* to its *animation* step-by-step.
 */
export interface CodeHighlight {
  /** Timestamp (ms) from which these lines are the "current" lines. */
  time: number;
  /** 1-based line numbers to highlight (inclusive). */
  lines: number[];
  /** Optional caption shown beneath the code for this span. */
  note?: string;
}

/** A source-code program attached to a scene. */
export interface CodeProgram {
  /** Stable id (allows multiple programs, e.g. brute-force vs optimal). */
  id: string;
  /** Tab label, e.g. "Two Sum — O(n)". */
  label: string;
  language: CodeLanguage;
  /** The full source. */
  source: string;
  /** Time-synced line highlights (must be ascending by `time`). */
  highlights?: CodeHighlight[];
  /**
   * When true and the language is runnable (python/javascript), the panel shows
   * a "Run" button that executes the code in the client sandbox. SQL/other langs
   * are display-only (highlighting still works). Defaults to false.
   */
  runnable?: boolean;
  /** Optional stdin fed to the program when run. */
  stdin?: string;
  /** Short explanation of the approach (complexity, idea). */
  explanation?: string;
}

/** Free-form authoring notes: what the animation shows and where to use it. */
export interface AnimationNotes {
  /** One-paragraph summary of the concept being visualised. */
  summary?: string;
  /** "Where to use" / real-world applications (bullet list). */
  whereToUse?: string[];
  /** Key takeaways / things to notice (bullet list). */
  keyPoints?: string[];
  /** Further-reading links. */
  references?: { label: string; url: string }[];
}

/** Visual theming hook so a scene can override canvas colors. */
export interface AnimationTheme {
  background?: string;
  gridColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  font?: string;
  /** Maps semantic status → fill color. */
  statusColors?: Partial<Record<EntityStatus, string>>;
  /** Maps semantic token (e.g. 'primary') → color. */
  tokens?: Record<string, string>;
}

/**
 * The complete, serializable animation produced by a simulator for one tutorial.
 * Keyframes MUST be sorted ascending by `time`. `duration` SHOULD equal the
 * timestamp of the final keyframe (the engine clamps to it regardless).
 */
export interface AnimationTrace {
  /** Short identifier, e.g. "atomic-cas". */
  id: string;
  title: string;
  description?: string;
  /** Total timeline length in milliseconds. */
  duration: number;
  /** Logical drawing size; the canvas scales its contents to fit the viewport. */
  viewport: { width: number; height: number };
  /** Ascending, time-sorted snapshots. */
  keyframes: Keyframe[];
  theme?: AnimationTheme;
  /** Semantic domain this scene belongs to (drives catalog grouping/filters). */
  category?:
    | 'CONCURRENCY'
    | 'SYSTEM_DESIGN'
    | 'DSA'
    | 'AI_ML'
    | 'NETWORKING'
    | 'DATABASE'
    | 'OTHER';
  /** Step-by-step instruction rail (time-synced to the playhead). */
  instructions?: InstructionStep[];
  /** Mid-animation checkpoints that pause playback and ask a question. */
  checkpoints?: Checkpoint[];
  /** General authoring notes: summary, where-to-use, key points, references. */
  notes?: AnimationNotes;
  /** Source-code programs taught alongside the animation (LeetCode, SQL, …). */
  programs?: CodeProgram[];
}

/* ─────────────────────────────────────────────────────────────────────────
   Instruction / checkpoint resolvers (pure).
   ───────────────────────────────────────────────────────────────────────── */

/** Index of the currently-active instruction step at `time` (or -1). */
export function activeInstructionIndex(
  steps: InstructionStep[] | undefined,
  time: number,
): number {
  if (!steps || steps.length === 0) return -1;
  let idx = -1;
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].time <= time) idx = i;
    else break;
  }
  return idx;
}

/** The set of 1-based line numbers active at `time` for a program (or []). */
export function activeCodeLines(
  program: CodeProgram | undefined,
  time: number,
): number[] {
  const hs = program?.highlights;
  if (!hs || hs.length === 0) return [];
  let current: CodeHighlight | undefined;
  for (const h of hs) {
    if (h.time <= time) current = h;
    else break;
  }
  return current?.lines ?? [];
}

/** The active highlight's note (caption) at `time`, if any. */
export function activeCodeNote(
  program: CodeProgram | undefined,
  time: number,
): string | undefined {
  const hs = program?.highlights;
  if (!hs || hs.length === 0) return undefined;
  let current: CodeHighlight | undefined;
  for (const h of hs) {
    if (h.time <= time) current = h;
    else break;
  }
  return current?.note;
}

/**
 * Find the first unanswered checkpoint the playhead has reached or crossed,
 * given a set of already-answered ids. Used by the controller to pause & ask.
 */
export function pendingCheckpoint(
  checkpoints: Checkpoint[] | undefined,
  time: number,
  answered: ReadonlySet<string>,
): Checkpoint | null {
  if (!checkpoints || checkpoints.length === 0) return null;
  for (const c of checkpoints) {
    if (c.time <= time && !answered.has(c.id)) return c;
  }
  return null;
}

/** Validate a user's answer against a checkpoint's expected answer. */
export function isCheckpointAnswerCorrect(
  cp: Checkpoint,
  value: string | string[] | boolean | number,
): boolean {
  switch (cp.kind) {
    case 'single':
      return value === cp.answer;
    case 'boolean':
      return Boolean(value) === Boolean(cp.answer);
    case 'number': {
      const expected = Number(cp.answer);
      const tol = cp.tolerance ?? 0;
      return Math.abs(Number(value) - expected) <= tol;
    }
    case 'multiple': {
      const a = Array.isArray(value) ? [...value].sort() : [];
      const b = Array.isArray(cp.answer) ? [...cp.answer].sort() : [];
      return a.length === b.length && a.every((v, i) => v === b[i]);
    }
    default:
      return false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   Interpolation helpers (pure, reusable, testable)
   ───────────────────────────────────────────────────────────────────────── */

/** Linear interpolation between a and b at t∈[0,1]. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp v to the inclusive [min, max] range. */
export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

/** Smoothstep easing (ease-in-out) for nicer motion than raw linear. */
export function easeInOut(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

/**
 * The resolved scene at an arbitrary `time`, ready to draw. Produced by the
 * interpolator from the two bracketing keyframes.
 */
export interface ResolvedFrame {
  time: number;
  entities: EntityState[];
  connections: ConnectionState[];
  variables: Record<string, string | number | boolean>;
  caption?: string;
}

/**
 * Resolve the full scene at `time` by interpolating numeric fields of each
 * entity/connection between its bracketing keyframes. Discrete fields snap to
 * the lower (source) keyframe. This is the heart of smooth scrubbing.
 */
export function resolveFrameAtTime(
  trace: AnimationTrace,
  time: number,
  ease: (t: number) => number = easeInOut,
): ResolvedFrame {
  const frames = trace.keyframes;
  if (frames.length === 0) {
    return { time, entities: [], connections: [], variables: {} };
  }

  const t = clamp(time, 0, trace.duration);

  // Binary search for the last keyframe with keyframe.time <= t.
  let lo = 0;
  let hi = frames.length - 1;
  let loIdx = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (frames[mid].time <= t) {
      loIdx = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  const a = frames[loIdx];
  const b = frames[Math.min(loIdx + 1, frames.length - 1)];
  const span = b.time - a.time;
  const raw = span > 0 ? (t - a.time) / span : 0;
  const k = ease(clamp(raw, 0, 1));

  // ── entities ─────────────────────────────────────────────────────────────
  const ids = new Set<string>([
    ...Object.keys(a.entities ?? {}),
    ...Object.keys(b.entities ?? {}),
  ]);
  const entities: EntityState[] = [];
  ids.forEach((id) => {
    const from = a.entities?.[id];
    const to = b.entities?.[id];
    const base = from ?? to;
    if (!base) return;
    const other = to ?? from!;
    entities.push({
      ...base,
      x: lerp(from?.x ?? other.x, to?.x ?? other.x, k),
      y: lerp(from?.y ?? other.y, to?.y ?? other.y, k),
      width:
        base.width !== undefined
          ? lerp(from?.width ?? base.width, to?.width ?? base.width, k)
          : undefined,
      height:
        base.height !== undefined
          ? lerp(from?.height ?? base.height, to?.height ?? base.height, k)
          : undefined,
      radius:
        base.radius !== undefined
          ? lerp(from?.radius ?? base.radius, to?.radius ?? base.radius, k)
          : undefined,
      opacity: lerp(from?.opacity ?? 1, to?.opacity ?? 1, k),
      scale: lerp(from?.scale ?? 1, to?.scale ?? 1, k),
      rotation: lerp(from?.rotation ?? 0, to?.rotation ?? 0, k),
      progress:
        base.progress !== undefined
          ? lerp(from?.progress ?? 0, to?.progress ?? 0, k)
          : undefined,
    });
  });

  // ── connections ───────────────────────────────────────────────────────────
  const cIds = new Set<string>([
    ...Object.keys(a.connections ?? {}),
    ...Object.keys(b.connections ?? {}),
  ]);
  const connections: ConnectionState[] = [];
  cIds.forEach((id) => {
    const from = a.connections?.[id];
    const to = b.connections?.[id];
    const base = from ?? to;
    if (!base) return;
    connections.push({
      ...base,
      progress: lerp(from?.progress ?? 0, to?.progress ?? 0, k),
      opacity: lerp(from?.opacity ?? 1, to?.opacity ?? 1, k),
    });
  });

  return {
    time: t,
    entities,
    connections,
    variables: a.variables ?? {},
    caption: a.caption,
  };
}
