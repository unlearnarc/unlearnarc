import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
const types = { js: 'text/javascript', html: 'text/html', webmanifest: 'application/manifest+json', png: 'image/png', css: 'text/css' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const path = pathname === '/' ? '/index.html' : pathname;
  try {
    const data = await readFile(new URL(`../dist${path}`, import.meta.url));
    res.setHeader('Content-Type', types[path.split('.').at(-1)] || 'application/octet-stream');
    res.end(data);
  } catch {
    res.setHeader('Content-Type', 'text/html');
    res.end(await readFile(new URL('../dist/index.html', import.meta.url)));
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(origin);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const result = await page.evaluate(async () => {
    const manifest = await (await fetch('/manifest.webmanifest')).json();
    const bytes = new Uint8Array(await (await fetch('/pwa-512.png')).arrayBuffer());
    if (bytes[0] !== 137 || bytes[1] !== 80) throw new Error('Invalid PNG');
    const registration = await navigator.serviceWorker.ready;
    await new Promise(resolve => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
      registration.active.postMessage({ type: 'NOTIFICATION_SETTINGS', preferences: { enabled: true, dndUntil: Date.now() + 60000 } }, [channel.port2]);
    });
    const prefs = await new Promise((resolve, reject) => {
      const request = indexedDB.open('ua-notification-settings', 1);
      request.onsuccess = () => {
        const db = request.result;
        const item = db.transaction('settings').objectStore('settings').get('preferences');
        item.onsuccess = () => { resolve(item.result); db.close(); };
      };
      request.onerror = reject;
    });
    if (!prefs.enabled || prefs.dndUntil <= Date.now()) throw new Error('DND not persisted');
    return { manifest: manifest.name, worker: registration.active.state, icon: 'PNG verified', dnd: 'persisted' };
  });
  await context.setOffline(true);
  await page.goto(`${origin}/offline-test`);
  await page.getByRole('heading', { name: 'You’re offline' }).waitFor();
  console.log(JSON.stringify({ ...result, offline: 'navigation fallback passed' }));
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
