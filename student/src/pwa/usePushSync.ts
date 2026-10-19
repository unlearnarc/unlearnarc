import { useEffect } from 'react';
import { subscribe, write } from '../components/productivity/storage';
import { syncPush, updateWorkerPreferences } from './notifications';

export function usePushSync() {
  useEffect(() => {
    let timer: number | undefined;
    const sync = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void syncPush().catch(error => write('push_sync_error', error instanceof Error ? error.message : 'Push sync failed. Reconnect and retry.'));
      }, 300);
    };
    const off = ['reminders', 'focus_session', 'push_enabled'].map(key => subscribe(key, sync));
    const focusChanged = subscribe('focus_session', () => { void updateWorkerPreferences().catch(() => {}); });
    const visible = () => { if (document.visibilityState === 'visible') sync(); };
    window.addEventListener('online', sync);
    document.addEventListener('visibilitychange', visible);
    sync();
    return () => { window.clearTimeout(timer); off.forEach(fn => fn()); focusChanged(); window.removeEventListener('online', sync); document.removeEventListener('visibilitychange', visible); };
  }, []);
}
