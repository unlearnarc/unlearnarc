import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { dndUntil, isDnd, pushEnabled } from './notifications';

describe('notification preferences', () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    });
    vi.spyOn(Date, 'now').mockReturnValue(1000);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it('does not enable push without explicit opt-in', () => expect(pushEnabled()).toBe(false));
  it('silences only an active session with DND enabled', () => {
    values.set('ua_prod_focus_session', JSON.stringify({ startedAt: 500, endsAt: 2000, dnd: true }));
    expect(isDnd()).toBe(true);
    expect(dndUntil()).toBe(2000);
    values.set('ua_prod_focus_session', JSON.stringify({ startedAt: 500, endsAt: 2000, dnd: false }));
    expect(isDnd()).toBe(false);
  });
  it('expires abandoned sessions and tolerates corrupt storage', () => {
    values.set('ua_prod_focus_session', JSON.stringify({ startedAt: 0, endsAt: 999, dnd: true }));
    expect(isDnd()).toBe(false);
    values.set('ua_prod_focus_session', 'invalid');
    expect(isDnd()).toBe(false);
  });
});
