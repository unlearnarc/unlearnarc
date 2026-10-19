import api from '../api/client';
import { read, write, uid } from '../components/productivity/storage';
import type { Reminder } from '../components/productivity/types';
import { registerPwa } from './register';

export interface FocusSession { startedAt: number; endsAt: number; dnd: boolean }
export function dndUntil(): number {
  const session = read<FocusSession | null>('focus_session', null);
  return session?.dnd && session.endsAt > Date.now() ? session.endsAt : 0;
}
export function isDnd(): boolean { return dndUntil() > Date.now(); }
export function pushEnabled(): boolean { return read('push_enabled', false); }
export function pushSupported(): boolean {
  return window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}
export function deviceId(): string {
  let id = read<string>('push_device', '');
  if (!id) { id = uid(); write('push_device', id); }
  return id;
}

export async function updateWorkerPreferences(enabled = pushEnabled()) {
  if (!('serviceWorker' in navigator)) return;
  const registration = await registerPwa();
  const worker = registration.active;
  if (!worker) throw new Error('The app is still installing. Please try again.');
  await new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => { channel.port1.close(); reject(new Error('Could not save notification preferences.')); }, 5000);
    channel.port1.onmessage = () => { window.clearTimeout(timer); channel.port1.close(); resolve(); };
    worker.postMessage({ type: 'NOTIFICATION_SETTINGS', preferences: { enabled, dndUntil: dndUntil() } }, [channel.port2]);
  });
}

// Serialize synchronization so an old request cannot overwrite a newer edit.
let pending = Promise.resolve();
export function syncPush(): Promise<void> {
  pending = pending.catch(() => {}).then(async () => {
    if (!pushEnabled() || !localStorage.getItem('ua_user_token')) return;
    await updateWorkerPreferences();
    const registration = await registerPwa();
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription || Notification.permission !== 'granted') {
      write('push_enabled', false);
      throw new Error('Notifications are no longer allowed. Enable them again in browser settings.');
    }
    const json = subscription.toJSON();
    const reminders = read<Reminder[]>('reminders', []).map(r => ({
      id: r.id, title: r.title.slice(0, 200), at: r.at, repeat: r.repeat ?? 'NONE', fired: r.fired,
    }));
    if (reminders.length > 100) throw new Error('Background push supports up to 100 reminders per device.');
    const response = await api.put('/push/subscription', {
      deviceId: deviceId(), endpoint: json.endpoint, p256dh: json.keys?.p256dh,
      auth: json.keys?.auth, dndUntil: dndUntil(), reminders,
    });
    // Reconcile server-delivered occurrences without overwriting edits made during the request.
    const states = response.data.data as { id: string; at: number; fired: boolean }[];
    const sent = new Map(reminders.map(r => [r.id, r]));
    let changed = false;
    const current = read<Reminder[]>('reminders', []).map(r => {
      const state = states.find(item => item.id === r.id);
      const before = sent.get(r.id);
      if (!state || !before || r.at !== before.at || r.title.slice(0, 200) !== before.title) return r;
      if (r.at === state.at && r.fired === state.fired) return r;
      changed = true;
      return { ...r, at: state.at, fired: state.fired };
    });
    if (changed) write('reminders', current);
    write('push_sync_error', '');
  });
  return pending;
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Push is unavailable. On iPhone/iPad, add UnlearnArc to your Home Screen and open it there (iOS 16.4+).');
  // Called directly from the user's tap, before any network await (required on iOS).
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notification permission was not granted. You can change it in browser settings.');
  const { data } = await api.get('/push/config');
  const config = data.data as { enabled: boolean; publicKey: string };
  if (!config.enabled) throw new Error('Background notifications are not configured on the server yet.');
  const registration = await registerPwa();
  const decoded = atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/'));
  const key = Uint8Array.from(decoded, char => char.charCodeAt(0));
  const existing = await registration.pushManager.getSubscription();
  await (existing ? Promise.resolve(existing) : registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }));
  write('push_enabled', true);
  try { await syncPush(); }
  catch (error) { write('push_enabled', false); await updateWorkerPreferences(false); throw error; }
}

export async function disablePush(): Promise<void> {
  const token = localStorage.getItem('ua_user_token');
  // Stop receiving on this browser even if the network is unavailable.
  write('push_enabled', false);
  await updateWorkerPreferences(false);
  const registration = await registerPwa();
  await (await registration.pushManager.getSubscription())?.unsubscribe();
  if (token) await api.delete(`/push/subscription/${deviceId()}`, { headers: { Authorization: `Bearer ${token}` } });
}

export async function showLocalNotification(title: string, body = '', tag?: string) {
  if (isDnd() || !('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const registration = await registerPwa();
    await registration.showNotification(title, { body, tag, icon: '/pwa-192.png', silent: true, data: { url: '/dashboard' } });
  } catch { /* In-app reminders still work if service workers are unavailable. */ }
}
