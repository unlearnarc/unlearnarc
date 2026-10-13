// Self-contained WASM boot diagnostic. Drives headless Chrome via the DevTools
// pipe directly (no playwright), loads a page that boots Pyodide in a worker
// EXACTLY like the app (same-origin /wasm/pyodide assets, COEP require-corp),
// and prints the real failure — crossOriginIsolated, worker errors, the lot.
//
//   BASE_URL=http://127.0.0.1:3002 node scripts/wasm-diag.mjs
import http from 'node:http';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const TARGET = new URL(process.env.BASE_URL || 'http://127.0.0.1:3002');
const CHROME =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const COEP = {
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

const WORKER_JS = `
self.onmessage = async (ev) => {
  const PYBASE = ev.data.base + '/wasm/pyodide';
  const send = (o) => self.postMessage(o);
  try {
    send({ step: 'coi', crossOriginIsolated: self.crossOriginIsolated, hasSAB: typeof SharedArrayBuffer });
    send({ step: 'fetching', url: PYBASE + '/pyodide.js' });
    const probe = await fetch(PYBASE + '/pyodide.js', { mode: 'cors' });
    send({ step: 'fetched', status: probe.status, type: probe.headers.get('content-type') });
    importScripts(PYBASE + '/pyodide.js');
    send({ step: 'imported', hasLoad: typeof self.loadPyodide });
    const py = await self.loadPyodide({ indexURL: PYBASE + '/' });
    send({ step: 'loaded' });
    let out = '';
    py.setStdout({ batched: (s) => { out += s; } });
    await py.runPythonAsync('print(6*7)');
    send({ step: 'ran', out: out.trim() });
  } catch (e) { send({ step: 'error', error: (e && e.stack) || String(e) }); }
};`;

const PAGE = `<!doctype html><meta charset=utf8><title>diag</title><script>
const w = new Worker('/__diag-worker.js');
window.__logs = [];
w.onmessage = (e) => { window.__logs.push(e.data); if (e.data.step==='ran'||e.data.step==='error') window.__done = true; };
w.onerror = (e) => { window.__logs.push({ step:'worker.onerror', error: e.message }); window.__done = true; };
w.postMessage({ base: location.origin });
</script>`;

// Proxy that injects the diag page/worker and forwards /wasm/** to the dev server.
const proxy = http.createServer((req, res) => {
  if (req.url === '/__diag.html') { res.writeHead(200, { 'content-type': 'text/html', ...COEP }); return res.end(PAGE); }
  if (req.url === '/__diag-worker.js') { res.writeHead(200, { 'content-type': 'text/javascript', ...COEP }); return res.end(WORKER_JS); }
  const up = http.request({ hostname: TARGET.hostname, port: TARGET.port, path: req.url, method: req.method,
    headers: { ...req.headers, host: TARGET.host } }, (r) => { res.writeHead(r.statusCode || 502, { ...r.headers, ...COEP }); r.pipe(res); });
  up.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
});
await new Promise((r) => proxy.listen(4600, '127.0.0.1', r));

// Launch Chrome with a fixed remote-debugging-port (robust vs pipe).
const port = await freePort();
const dir = mkdtempSync(path.join(os.tmpdir(), 'wasmdiag-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${dir}`,
  `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: 'ignore' });

const base = await waitForDevtools(port);
const targets = await j(`${base}/json/list`);
let tab = targets.find((t) => t.type === 'page') || (await j(`${base}/json/new`));
const ws = tab.webSocketDebuggerUrl;

const cdp = await connectCDP(ws);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4600/__diag.html' });
await sleep(1500);

// Poll window.__logs until done or timeout.
const deadline = Date.now() + 90000;
let logs = [];
for (;;) {
  const r = await cdp.send('Runtime.evaluate', {
    expression: 'JSON.stringify({ done: !!window.__done, logs: window.__logs || [] })',
    returnByValue: true,
  });
  try { const v = JSON.parse(r.result.value); logs = v.logs; if (v.done || Date.now() > deadline) break; } catch {}
  await sleep(800);
}

console.log('\n=== WASM BOOT DIAGNOSTIC ===');
for (const l of logs) console.log(' ', JSON.stringify(l));
const ran = logs.find((l) => l.step === 'ran');
console.log(ran && ran.out === '42' ? '\n✅ PASS — Pyodide booted in a worker and ran code (6*7=42).'
  : '\n❌ FAIL — see the error step above.');

chrome.kill('SIGKILL'); proxy.close();
process.exit(ran && ran.out === '42' ? 0 : 1);

// ── helpers ──
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function j(u){return new Promise((res,rej)=>http.get(u,(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));}
function freePort(){return new Promise((res)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p));});});}
async function waitForDevtools(port){const end=Date.now()+15000;for(;;){try{const v=await j(`http://127.0.0.1:${port}/json/version`);return v.webSocketDebuggerUrl?`http://127.0.0.1:${port}`:`http://127.0.0.1:${port}`;}catch{if(Date.now()>end)throw new Error('devtools not up');await sleep(300);}}}
async function connectCDP(wsUrl){
  const { WebSocket } = await import('ws').catch(()=>({ WebSocket: null }));
  if(!WebSocket) throw new Error('ws module missing');
  const sock = new WebSocket(wsUrl, { perMessageDeflate:false, maxPayload: 256*1024*1024 });
  await new Promise((r,e)=>{sock.once('open',r);sock.once('error',e);});
  let id=0; const waiters=new Map();
  sock.on('message',(data)=>{const m=JSON.parse(data);if(m.id&&waiters.has(m.id)){waiters.get(m.id)(m);waiters.delete(m.id);}});
  return { send:(method,params={})=>new Promise((res,rej)=>{const mid=++id;waiters.set(mid,(m)=>m.error?rej(new Error(m.error.message)):res(m.result));sock.send(JSON.stringify({id:mid,method,params}));}) };
}
