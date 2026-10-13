import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { read, write } from './storage';
import type { Reminder } from './types';

/* =============================================================================
   useReminderScheduler — a single app-wide ticker that fires due reminders.

   Mounted once (in ProductivityProvider). Every 15s it scans the stored
   reminders; any whose `at` has passed and that haven't fired yet trigger a
   toast + system Notification, are marked fired, and — if repeating — are
   rescheduled to the next day/week. This runs independently of whether any
   productivity panel is open.
   ============================================================================= */

const DAY_MS = 24 * 60 * 60 * 1000;

export function useReminderScheduler() {
  const notified = useRef<Set<string>>(new Set());

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // request lazily on first mount; harmless if denied
      Notification.requestPermission().catch(() => {});
    }

    const fire = (r: Reminder) => {
      if (notified.current.has(r.id)) return;
      notified.current.add(r.id);

      toast(r.title, { icon: '⏰', duration: 8000 });
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⏰ ' + r.title);
        }
      } catch {
        /* ignore */
      }
    };

    const scan = () => {
      const list = read<Reminder[]>('reminders', []);
      const now = Date.now();
      let changed = false;

      const next = list.map((r) => {
        if (r.fired || r.at > now) return r;
        fire(r);

        if (r.repeat === 'DAILY' || r.repeat === 'WEEKLY') {
          const step = r.repeat === 'DAILY' ? DAY_MS : 7 * DAY_MS;
          let at = r.at;
          while (at <= now) at += step;
          notified.current.delete(r.id);
          changed = true;
          return { ...r, at, fired: false };
        }
        changed = true;
        return { ...r, fired: true };
      });

      if (changed) write('reminders', next);
    };

    scan();
    const id = window.setInterval(scan, 15_000);
    return () => window.clearInterval(id);
  }, []);
}
