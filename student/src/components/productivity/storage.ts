/* =============================================================================
   Productivity — local-first persistence layer.

   Every productivity tool (notes, todos, reminders, pomodoro stats, settings)
   is stored under a namespaced localStorage key. This keeps the feature fully
   functional with no backend dependency while remaining trivial to migrate to
   an API later — swap `read`/`write` for `api.get`/`api.post` and keep the
   same shapes.

   A tiny pub/sub lets multiple mounted components (e.g. the dock badge and the
   open panel) stay in sync when one of them mutates a collection.
   ============================================================================= */

const PREFIX = 'ua_prod_';

type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function emit(key: string): void {
  listeners.get(key)?.forEach((fn) => fn());
  // also notify cross-tab via the native storage event (fired by the browser)
}

export function subscribe(key: string, fn: Listener): () => void {
  const full = PREFIX + key;
  if (!listeners.has(full)) listeners.set(full, new Set());
  listeners.get(full)!.add(fn);

  // cross-tab sync
  const onStorage = (e: StorageEvent) => {
    if (e.key === full) fn();
  };
  window.addEventListener('storage', onStorage);

  return () => {
    listeners.get(full)?.delete(fn);
    window.removeEventListener('storage', onStorage);
  };
}

export function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    emit(PREFIX + key);
  } catch {
    /* quota exceeded — ignore for now */
  }
}

/** Stable id generator (crypto.randomUUID with a fallback for old browsers). */
export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
