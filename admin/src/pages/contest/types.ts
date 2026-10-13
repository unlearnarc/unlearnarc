// Shared types for the admin Contest module.

export type ContestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Visibility    = 'PUBLIC' | 'PRIVATE';
export type Difficulty    = 'EASY' | 'MEDIUM' | 'HARD';
export type HarnessType   = 'STDIN_STDOUT' | 'FUNCTION_RETURN';

export interface Contest {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: ContestStatus;
  visibility: Visibility;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  allowedLanguages: string;
  wrongSubmissionPenalty: number;
  createdBy: string;
  createdAt: string;
  problemCount: number;
  participantCount: number;
  phase: string;
}

export interface TestCase {
  id?: string;
  input: string;
  expectedOutput: string;
  isHidden: boolean;
  weight: number;
  strictMatch: boolean;
  displayOrder: number;
}

export interface Problem {
  id: string;
  contestId: string;
  title: string;
  statement: string;
  constraints: string;
  difficulty: Difficulty;
  maxPoints: number;
  starterCodeJson: string;
  harnessType: HarnessType;
  timeLimitMs: number;
  displayOrder: number;
  isActive: boolean;
  testCases: TestCase[];
}

// ── Form shapes (mutable drafts) ──────────────────────────────────────────────
export interface ContestForm {
  title: string;
  slug: string;
  description: string;
  visibility: Visibility;
  startTime: string;        // datetime-local value ("" = none)
  endTime: string;
  durationMinutes: number;
  allowedLanguages: string;
  wrongSubmissionPenalty: number;
}

export interface ProblemForm {
  title: string;
  statement: string;
  constraints: string;
  difficulty: Difficulty;
  maxPoints: number;
  starterCodeJson: string;
  harnessType: HarnessType;
  timeLimitMs: number;
  displayOrder: number;
  testCases: TestCase[];
}

// ── Constants ─────────────────────────────────────────────────────────────────
export const STATUS_OPTIONS: { label: string; value: ContestStatus }[] = [
  { label: 'Draft',     value: 'DRAFT' },
  { label: 'Published', value: 'PUBLISHED' },
  { label: 'Archived',  value: 'ARCHIVED' },
];

export const VISIBILITY_OPTIONS: { label: string; value: Visibility }[] = [
  { label: 'Public',  value: 'PUBLIC' },
  { label: 'Private', value: 'PRIVATE' },
];

export const DIFFICULTY_OPTIONS: { label: string; value: Difficulty }[] = [
  { label: 'Easy',   value: 'EASY' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Hard',   value: 'HARD' },
];

export const HARNESS_OPTIONS: { label: string; value: HarnessType }[] = [
  { label: 'stdin → stdout (compare printed output)', value: 'STDIN_STDOUT' },
  { label: 'function return (compare JSON return)',   value: 'FUNCTION_RETURN' },
];

export const diffColor: Record<Difficulty, string> = {
  EASY:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  HARD:   'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

export const statusColor: Record<ContestStatus, string> = {
  DRAFT:     'bg-slate-500/15 text-slate-300 border-slate-500/30',
  PUBLISHED: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  ARCHIVED:  'bg-amber-500/15 text-amber-400 border-amber-500/30',
};

export const emptyTestCase = (order: number, hidden = true): TestCase => ({
  input: '',
  expectedOutput: '',
  isHidden: hidden,
  weight: 1,
  strictMatch: false,
  displayOrder: order,
});

// ── datetime-local <-> ISO helpers ────────────────────────────────────────────
/** ISO instant -> value for <input type="datetime-local"> (local tz). */
export const isoToLocalInput = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** datetime-local value -> ISO instant (or null). */
export const localInputToIso = (v: string): string | null =>
  v ? new Date(v).toISOString() : null;
