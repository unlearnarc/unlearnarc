import { useCallback, useEffect, useState } from 'react';
import { read, write, subscribe, uid } from './storage';
import type { Note, Todo, Reminder, PomodoroStats } from './types';

/* =============================================================================
   Productivity collection hooks.

   Each hook exposes a reactive array backed by localStorage and the CRUD helpers
   the panels need. They subscribe to the storage pub/sub so every mounted
   consumer (dock badges + open panel) re-renders together and stays consistent
   across browser tabs.
   ============================================================================= */

function useCollection<T extends { id: string }>(key: string) {
  const [items, setItems] = useState<T[]>(() => read<T[]>(key, []));

  useEffect(() => subscribe(key, () => setItems(read<T[]>(key, []))), [key]);

  const persist = useCallback(
    (next: T[]) => {
      write(key, next);
      setItems(next);
    },
    [key],
  );

  return [items, persist] as const;
}

// ── Notes ─────────────────────────────────────────────────────────────────────
export function useNotes() {
  const [notes, persist] = useCollection<Note>('notes');

  const add = useCallback(
    (data: Pick<Note, 'title' | 'body' | 'link' | 'color'>) => {
      const now = Date.now();
      const note: Note = { id: uid(), createdAt: now, updatedAt: now, pinned: false, ...data };
      persist([note, ...read<Note[]>('notes', [])]);
      return note;
    },
    [persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<Note>) => {
      persist(
        read<Note[]>('notes', []).map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n,
        ),
      );
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => persist(read<Note[]>('notes', []).filter((n) => n.id !== id)),
    [persist],
  );

  const togglePin = useCallback(
    (id: string) => {
      persist(
        read<Note[]>('notes', []).map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)),
      );
    },
    [persist],
  );

  const sorted = [...notes].sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  return { notes: sorted, add, update, remove, togglePin };
}

// ── Todos ─────────────────────────────────────────────────────────────────────
export function useTodos() {
  const [todos, persist] = useCollection<Todo>('todos');

  const add = useCallback(
    (data: Pick<Todo, 'text' | 'priority' | 'link' | 'dueAt'>) => {
      const todo: Todo = {
        id: uid(),
        done: false,
        createdAt: Date.now(),
        completedAt: null,
        ...data,
      };
      persist([todo, ...read<Todo[]>('todos', [])]);
      return todo;
    },
    [persist],
  );

  const toggle = useCallback(
    (id: string) => {
      persist(
        read<Todo[]>('todos', []).map((tdo) =>
          tdo.id === id
            ? { ...tdo, done: !tdo.done, completedAt: !tdo.done ? Date.now() : null }
            : tdo,
        ),
      );
    },
    [persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<Todo>) => {
      persist(read<Todo[]>('todos', []).map((tdo) => (tdo.id === id ? { ...tdo, ...patch } : tdo)));
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => persist(read<Todo[]>('todos', []).filter((tdo) => tdo.id !== id)),
    [persist],
  );

  const clearCompleted = useCallback(
    () => persist(read<Todo[]>('todos', []).filter((tdo) => !tdo.done)),
    [persist],
  );

  const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
  const sorted = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority])
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    return b.createdAt - a.createdAt;
  });

  const openCount = todos.filter((tdo) => !tdo.done).length;

  return { todos: sorted, openCount, add, toggle, update, remove, clearCompleted };
}

// ── Reminders ───────────────────────────────────────────────────────────────────
export function useReminders() {
  const [reminders, persist] = useCollection<Reminder>('reminders');

  const add = useCallback(
    (data: Pick<Reminder, 'title' | 'at' | 'link' | 'repeat'>) => {
      const reminder: Reminder = {
        id: uid(),
        fired: false,
        createdAt: Date.now(),
        repeat: data.repeat ?? 'NONE',
        ...data,
      };
      persist([reminder, ...read<Reminder[]>('reminders', [])]);
      return reminder;
    },
    [persist],
  );

  const update = useCallback(
    (id: string, patch: Partial<Reminder>) => {
      persist(read<Reminder[]>('reminders', []).map((r) => (r.id === id ? { ...r, ...patch } : r)));
    },
    [persist],
  );

  const remove = useCallback(
    (id: string) => persist(read<Reminder[]>('reminders', []).filter((r) => r.id !== id)),
    [persist],
  );

  const sorted = [...reminders].sort((a, b) => a.at - b.at);
  const upcomingCount = reminders.filter((r) => !r.fired && r.at > Date.now()).length;

  return { reminders: sorted, upcomingCount, add, update, remove };
}

// ── Pomodoro stats ──────────────────────────────────────────────────────────────
export function usePomodoroStats() {
  const [stats, setStats] = useState<PomodoroStats>(() =>
    read<PomodoroStats>('pomodoro_stats', { byDay: {}, totalFocusMinutes: 0 }),
  );

  useEffect(
    () =>
      subscribe('pomodoro_stats', () =>
        setStats(read<PomodoroStats>('pomodoro_stats', { byDay: {}, totalFocusMinutes: 0 })),
      ),
    [],
  );

  const recordSession = useCallback((focusMinutes: number) => {
    const current = read<PomodoroStats>('pomodoro_stats', { byDay: {}, totalFocusMinutes: 0 });
    const day = new Date().toISOString().slice(0, 10);
    const next: PomodoroStats = {
      byDay: { ...current.byDay, [day]: (current.byDay[day] ?? 0) + 1 },
      totalFocusMinutes: current.totalFocusMinutes + focusMinutes,
      lastSessionAt: Date.now(),
    };
    write('pomodoro_stats', next);
    setStats(next);
  }, []);

  const todayCount = stats.byDay[new Date().toISOString().slice(0, 10)] ?? 0;

  return { stats, todayCount, recordSession };
}
