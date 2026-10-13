/* =============================================================================
   Productivity — shared domain types.

   A `LinkRef` is the glue that lets any productivity item (note / todo /
   reminder) be associated with a learning entity — a course or topic. It mirrors
   the scope vocabulary used across the app (DOMAIN | COURSE | TOPIC) so the same
   links can later be resolved against the real API.
   ============================================================================= */

export type LinkKind = 'COURSE' | 'TOPIC' | 'DOMAIN';

export interface LinkRef {
  kind: LinkKind;
  id: string;
  /** Cached display label so a linked item renders even offline. */
  label: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  link?: LinkRef;
  color?: string;           // token name, e.g. 'amber' | 'blue'
  pinned?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type TodoPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  priority: TodoPriority;
  link?: LinkRef;
  dueAt?: number | null;
  createdAt: number;
  completedAt?: number | null;
}

export interface Reminder {
  id: string;
  title: string;
  at: number;               // epoch ms when it should fire
  link?: LinkRef;
  fired: boolean;
  repeat?: 'NONE' | 'DAILY' | 'WEEKLY';
  createdAt: number;
}

export interface PomodoroStats {
  /** yyyy-mm-dd → completed focus sessions that day. */
  byDay: Record<string, number>;
  totalFocusMinutes: number;
  lastSessionAt?: number;
}

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartNext: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartNext: false,
  soundEnabled: true,
};

export type ToolId = 'pomodoro' | 'notes' | 'todos' | 'reminders' | 'focus';

export const NOTE_COLORS = ['amber', 'blue', 'green', 'rose', 'violet', 'slate'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];
