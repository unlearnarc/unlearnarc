/* Keep APIs, auth pages and private responses out of the offline cache. */
const CACHE = 'ua-pwa-v1';
const OFFLINE = '/offline.html';
const DB = 'ua-notification-settings';
function setting(key, value) {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => open.result.createObjectStore('settings');
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction('settings', value === undefined ? 'readonly' : 'readwrite');
      const store = tx.objectStore('settings');
      const req = value === undefined ? store.get(key) : store.put(value, key);
      tx.oncomplete = () => { db.close(); resolve(req.result); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    };
  });
}
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll([OFFLINE, '/pwa-192.png'])));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('ua-pwa-') && key !== CACHE).map(key => caches.delete(key)))),
    self.clients.claim(),
  ]));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.mode !== 'navigate' || url.origin !== self.location.origin
      || url.pathname.startsWith('/api/') || url.pathname.startsWith('/oauth2/')) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'NOTIFICATION_SETTINGS') {
    event.waitUntil(setting('preferences', event.data.preferences).then(() => event.ports[0]?.postMessage({ ok: true })));
  }
});
async function show(payload) {
  const prefs = await setting('preferences').catch(() => null);
  if (prefs?.enabled === false || (prefs?.dndUntil ?? 0) > Date.now()) return;
  await self.registration.showNotification(payload.title || 'UnlearnArc', {
    body: payload.body || 'Your learning reminder is due.',
    icon: '/pwa-192.png', badge: '/pwa-192.png',
    tag: payload.tag || 'unlearnarc-reminder',
    data: { url: payload.url || '/dashboard' },
  });
}
self.addEventListener('push', event => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Use safe defaults. */ }
  event.waitUntil(show(payload));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  let url = new URL('/dashboard', self.location.origin);
  try {
    const candidate = new URL(event.notification.data?.url || '/dashboard', self.location.origin);
    if (candidate.origin === self.location.origin) url = candidate;
  } catch { /* Ignore malformed URLs. */ }
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const client = clients.find(item => item.url === url.href);
    if (client) return client.focus();
    return self.clients.openWindow(url.href);
  }));
});
