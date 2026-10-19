import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { disablePush, enablePush, pushEnabled, syncPush } from './notifications';
import { read, subscribe } from '../components/productivity/storage';

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function NotificationSettings() {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(pushEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(() => read('push_sync_error', ''));
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(() => window.matchMedia('(display-mode: standalone)').matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true);
  useEffect(() => {
    const off = subscribe('push_enabled', () => setEnabled(pushEnabled()));
    const offError = subscribe('push_sync_error', () => setError(read('push_sync_error', '')));
    const prompt = (event: Event) => { event.preventDefault(); setInstall(event as InstallPrompt); };
    const done = () => { setInstalled(true); setInstall(null); };
    window.addEventListener('beforeinstallprompt', prompt);
    window.addEventListener('appinstalled', done);
    return () => { off(); offError(); window.removeEventListener('beforeinstallprompt', prompt); window.removeEventListener('appinstalled', done); };
  }, []);
  const act = async (action: () => Promise<void>) => {
    setBusy(true); setError('');
    try { await action(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not update notifications. Please try again.'); }
    finally { setBusy(false); setEnabled(pushEnabled()); }
  };
  return <section className="rounded-xl border border-border bg-surface p-4 space-y-3">
    <h2 className="font-semibold text-text-primary">{t('pwa.title', 'App & notifications')}</h2>
    <p className="text-sm text-text-secondary">{t('pwa.description', 'Enable learning reminders on this device, even while using another app. Delivery requires internet and is subject to phone notification settings.')}</p>
    <div className="flex flex-wrap items-center gap-3">
      <button disabled={busy} onClick={() => void act(enabled ? disablePush : enablePush)} className="px-4 py-2 rounded-lg bg-primary-500 text-white disabled:opacity-50">
        {busy ? t('pwa.saving', 'Updating…') : enabled ? t('pwa.disable', 'Disable notifications') : t('pwa.enable', 'Enable notifications')}
      </button>
      {!installed && install && <button className="px-4 py-2 rounded-lg border border-border text-text-primary" onClick={() => void act(async () => {
        await install.prompt(); await install.userChoice; setInstall(null);
      })}>{t('pwa.install', 'Install app')}</button>}
      {enabled && error && <button className="text-primary-500" disabled={busy} onClick={() => void act(syncPush)}>{t('pwa.retry', 'Retry sync')}</button>}
    </div>
    {!installed && <p className="text-xs text-text-muted">{t('pwa.installHint', 'On iPhone/iPad (iOS 16.4+): Safari → Share → Add to Home Screen, then open the installed app to enable push. On Android, use Install app or the browser’s install menu.')}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </section>;
}
