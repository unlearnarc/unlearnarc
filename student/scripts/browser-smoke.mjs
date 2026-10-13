// End-to-end real-browser check of the sandbox worker + Pyodide boot path.
//
// Why this exists: Pyodide boots inside a Web Worker and, under COEP
// `require-corp`, every subresource fetch (including same-origin ones made from
// a worker) is blocked unless the response carries a Cross-Origin-Resource-
// Policy header. That failure is invisible in unit tests and shows only as an
// opaque "Failed to fetch". This script drives headless Chrome against the
// running dev/preview server, boots Pyodide in a worker exactly like the app,
// runs a stdin/stdout program, and asserts the output — catching that class of
// regression automatically.
//
//   CHROME_PATH=... BASE_URL=http://localhost:3002 node scripts/browser-smoke.mjs
import http from 'node:http';
import { chromium } from 'playwright-core';

const EXEC = process.env.CHROME_PATH;
const TARGET = process.env.BASE_URL || 'http://localhost:3002';

// The smoke html + worker are injected by a tiny local proxy that forwards
// everything else to the target server, so we never drop files into public/.
const WORKER_JS = `
self.onmessage = async (ev) => {
  const PYBASE = ev.data.base + '/wasm/pyodide';
  try {
    importScripts(PYBASE + '/pyodide.js');
    self.postMessage({ step: 'imported', hasLoad: typeof self.loadPyodide });
    const py = await self.loadPyodide({ indexURL: PYBASE + '/' });
    self.postMessage({ step: 'loaded' });
    let out = '';
    py.setStdout({ batched: (s) => { out += s + '\\n'; } });
    const lines = ['3', '1 2 3']; let i = 0;
    py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) });
    await py.runPythonAsync('n=int(input())\\narr=list(map(int,input().split()))\\nprint(sum(arr))');
    self.postMessage({ step: 'ran', out });
  } catch (e) { self.postMessage({ step: 'error', error: (e && e.stack) || String(e) }); }
};`;

const COEP = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

// Local proxy on :4599 serves __smoke.html / __smoke-worker.js and forwards
// /wasm/** to the real server, re-stamping COEP/CORP so the worker fetch passes.
const url = new URL(TARGET);
const proxy = http.createServer((req, res) => {
  if (req.url === '/__smoke.html') {
    res.writeHead(200, { 'content-type': 'text/html', ...COEP });
    return res.end('<!doctype html><title>smoke</title>ok');
  }
  if (req.url === '/__smoke-worker.js') {
    res.writeHead(200, { 'content-type': 'text/javascript', ...COEP });
    return res.end(WORKER_JS);
  }
  const upstream = http.request(
    { hostname: url.hostname, port: url.port, path: req.url, method: req.method, headers: { ...req.headers, host: url.host } },
    (up) => { res.writeHead(up.statusCode || 502, { ...up.headers, ...COEP }); up.pipe(res); },
  );
  upstream.on('error', () => { res.writeHead(502); res.end('upstream error'); });
  req.pipe(upstream);
});
await new Promise((r) => proxy.listen(4599, r));
const BASE = 'http://localhost:4599';

const browser = await chromium.launch({ executablePath: EXEC, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage();
page.on('console', (m) => console.log(`[page:${m.type()}]`, m.text()));
page.on('pageerror', (e) => console.log('[page:error]', e.message));

await page.goto(`${BASE}/__smoke.html`, { waitUntil: 'load' });

const result = await page.evaluate(async (base) => {
  const logs = [];
  return await new Promise((resolve) => {
    const w = new Worker(base + '/__smoke-worker.js');
    const t = setTimeout(() => resolve({ logs, result: { step: 'timeout' }, coi: self.crossOriginIsolated }), 120000);
    w.onmessage = (ev) => {
      logs.push('WORKER MSG: ' + JSON.stringify(ev.data));
      if (ev.data.step === 'ran' || ev.data.step === 'error') { clearTimeout(t); resolve({ logs, result: ev.data, coi: self.crossOriginIsolated }); }
    };
    w.onerror = (e) => { clearTimeout(t); resolve({ logs, result: { step: 'onerror', error: e.message }, coi: self.crossOriginIsolated }); };
    w.postMessage({ base });
  });
}, BASE);

console.log('\n=== SMOKE RESULT ===');
console.log('crossOriginIsolated:', result.coi);
for (const l of result.logs || []) console.log(' ', l);
console.log('final:', JSON.stringify(result.result, null, 2));

await browser.close();
proxy.close();
const ok = result.result && result.result.step === 'ran' && result.result.out.trim() === '6';
console.log(ok ? '\n✅ PASS — Pyodide booted in a worker and executed stdin/stdout code.' : '\n❌ FAIL');
process.exit(ok ? 0 : 1);
