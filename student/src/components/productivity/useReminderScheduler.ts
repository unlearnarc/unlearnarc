import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { read, write } from './storage';
import type { Reminder } from './types';
import { isDnd, pushEnabled, showLocalNotification } from '../../pwa/notifications';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local fallback only. The server owns delivery while push is enabled. */
export function useReminderScheduler() {
  useEffect(() => {
    const scan = () => {
      if (isDnd() || pushEnabled()) return;
      const list = read<Reminder[]>('reminders', []);
      const now = Date.now();
      let changed = false;
      const next = list.map(r => {
        if (r.fired || r.at > now) return r;
        toast(r.title, { icon: '⏰', duration: 8000 });
        void showLocalNotification(r.title, '', `reminder-${r.id}-${r.at}`);
        changed = true;
        if (r.repeat === 'DAILY' || r.repeat === 'WEEKLY') {
          const step = r.repeat === 'DAILY' ? DAY_MS : 7 * DAY_MS;
          return { ...r, at: r.at + (Math.floor((now - r.at) / step) + 1) * step, fired: false };
        }
        return { ...r, fired: true };
      });
      if (changed) write('reminders', next);
    };
    scan();
    const id = window.setInterval(scan, 15000);
    return () => window.clearInterval(id);
  }, []);
}
