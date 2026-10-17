/* =============================================================================
   Canvas Animation Engine — Trace Schema (ADMIN copy)
   -----------------------------------------------------------------------------
   Mirrors student/src/types/animation.ts. Kept framework-agnostic (no React/DOM)
   so the admin preview canvas and the student renderer share one contract.
   Only the pieces the admin console needs (schema + interpolation resolver) are
   included here.
   ============================================================================= */

export type EntityStatus =
  | 'IDLE'
  | 'ACTIVE'
  | 'LOCKED'
  | 'WAITING'
  | 'SUCCESS'
  | 'FAILED'
  | 'RETRY'
  | 'DONE';

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

export interface EntityState {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  opacity?: number;
  scale?: number;
  rotation?: number;
  progress?: number;
  label?: string;
  sublabel?: string;
  color?: string;
  shape?: EntityShape;
  status?: EntityStatus;
  visible?: boolean;
  meta?: Record<string, unknown>;
}

export interface ConnectionState {
  id: string;
  from: string;
  to: string;
  color?: string;
  progress?: number;
  opacity?: number;
  label?: string;
  dashed?: boolean;
}

export interface Keyframe {
  time: number;
  entities: Record<string, EntityState>;
  connections?: Record<string, ConnectionState>;
  variables?: Record<string, string | number | boolean>;
  caption?: string;
}

export interface InstructionStep {
  id: string;
  time: number;
  title: string;
  detail?: string;
}

export type QuestionKind = 'single' | 'multiple' | 'boolean' | 'number';

export interface QuestionOption {
  id: string;
  label: string;
}

export interface Checkpoint {
  id: string;
  time: number;
  kind: QuestionKind;
  prompt: string;
  options?: QuestionOption[];
  answer: string | string[] | boolean | number;
  tolerance?: number;
  explanation?: string;
  hint?: string;
  blocking?: boolean;
}

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

export interface CodeHighlight {
  time: number;
  lines: number[];
  note?: string;
}

export interface CodeProgram {
  id: string;
  label: string;
  language: CodeLanguage;
  source: string;
  highlights?: CodeHighlight[];
  runnable?: boolean;
  stdin?: string;
  explanation?: string;
}

export interface AnimationNotes {
  summary?: string;
  whereToUse?: string[];
  keyPoints?: string[];
  references?: { label: string; url: string }[];
}

export interface AnimationTheme {
  background?: string;
  gridColor?: string;
  textColor?: string;
  mutedTextColor?: string;
  font?: string;
  statusColors?: Partial<Record<EntityStatus, string>>;
  tokens?: Record<string, string>;
}

export type AnimationCategory =
  | 'CONCURRENCY'
  | 'SYSTEM_DESIGN'
  | 'DSA'
  | 'AI_ML'
  | 'NETWORKING'
  | 'DATABASE'
  | 'OTHER';

export interface AnimationTrace {
  id: string;
  title: string;
  description?: string;
  duration: number;
  viewport: { width: number; height: number };
  keyframes: Keyframe[];
  theme?: AnimationTheme;
  category?: AnimationCategory;
  instructions?: InstructionStep[];
  checkpoints?: Checkpoint[];
  notes?: AnimationNotes;
  programs?: CodeProgram[];
}

/* ── Scene DTOs (match backend AnimationScene*Response) ────────────────────── */

export type SceneSource = 'AUTHORED' | 'GENERATED';

export interface AnimationSceneSummary {
  id: string;
  slug: string;
  title: string;
  description?: string;
  thumbnailUrl?: string | null;
  category?: AnimationCategory;
  source: SceneSource;
  kind?: string;
  isPublished?: boolean;
  keyframeCount?: number;
  duration?: number;
}

export interface AnimationScene extends AnimationSceneSummary {
  trace?: AnimationTrace;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** A registered server-side simulator surfaced by GET /simulators. */
export interface SimulatorInfo {
  kind: string;
  title?: string;
  description?: string;
  category?: string;
  paramSchema?: Record<string, unknown>;
}

/* ─────────────────────────────────────────────────────────────────────────
   Interpolation helpers (pure) — drive the admin preview canvas.
   ───────────────────────────────────────────────────────────────────────── */

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function easeInOut(t: number): number {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
}

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

export interface ResolvedFrame {
  time: number;
  entities: EntityState[];
  connections: ConnectionState[];
  variables: Record<string, string | number | boolean>;
  caption?: string;
}

export function resolveFrameAtTime(
  trace: AnimationTrace,
  time: number,
  ease: (t: number) => number = easeInOut,
): ResolvedFrame {
  const frames = trace.keyframes;
  if (!frames || frames.length === 0) {
    return { time, entities: [], connections: [], variables: {} };
  }

  const t = clamp(time, 0, trace.duration);

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
