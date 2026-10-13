// Same as wasm-diag.mjs but boots the worker as an ES MODULE (type:'module'),
// exactly like the real app (SandboxClient uses { type:'module' }).
// This reproduces the app's actual failure mode, which the classic-worker diag misses.
//   BASE_URL=http://127.0.0.1:3002 node scripts/wasm-diag-module.mjs
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

// MODULE worker: importScripts is NOT defined here -> reproduces the app failure.
const WORKER_JS = `
self.onmessage = async (ev) => {
  const PYBASE = ev.data.base + '/wasm/pyodide';
  const send = (o) => self.postMessage(o);
  try {
    send({ step: 'coi', crossOriginIsolated: self.crossOriginIsolated, hasImportScripts: typeof self.importScripts });
    // Mimic the FIXED sandbox.worker.ts step 3: load pyodide.js (UMD) via a
    // blob dynamic import, then read loadPyodide off the worker global.
    const r = await fetch(PYBASE + '/pyodide.js');
    const buf = await r.arrayBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: 'text/javascript' }));
    await import(url);
    URL.revokeObjectURL(url);
    send({ step: 'imported', hasLoad: typeof self.loadPyodide });
    const py = await self.loadPyodide({ indexURL: PYBASE + '/' });
    let out = '';
    py.setStdout({ batched: (s) => { out += s; } });
    await py.runPythonAsync('print(6*7)');
    send({ step: 'ran', out: out.trim() });
  } catch (e) { send({ step: 'error', error: (e && e.stack) || String(e) }); }
};`;

const PAGE = `<!doctype html><meta charset=utf8><title>diag</title><script type="module">
const w = new Worker('/__diag-worker.js', { type: 'module' });
window.__logs = [];
w.onmessage = (e) => { window.__logs.push(e.data); if (e.data.step==='ran'||e.data.step==='error') window.__done = true; };
w.onerror = (e) => { window.__logs.push({ step:'worker.onerror', error: e.message }); window.__done = true; };
w.postMessage({ base: location.origin });
</script>`;

const proxy = http.createServer((req, res) => {
  if (req.url === '/__diag.html') { res.writeHead(200, { 'content-type': 'text/html', ...COEP }); return res.end(PAGE); }
  if (req.url === '/__diag-worker.js') { res.writeHead(200, { 'content-type': 'text/javascript', ...COEP }); return res.end(WORKER_JS); }
  const up = http.request({ hostname: TARGET.hostname, port: TARGET.port, path: req.url, method: req.method,
    headers: { ...req.headers, host: TARGET.host } }, (r) => { res.writeHead(r.statusCode || 502, { ...r.headers, ...COEP }); r.pipe(res); });
  up.on('error', (e) => { res.writeHead(502); res.end(String(e)); });
  req.pipe(up);
});
await new Promise((r) => proxy.listen(4601, '127.0.0.1', r));

const port = await freePort();
const dir = mkdtempSync(path.join(os.tmpdir(), 'wasmdiagm-'));
const chrome = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', `--user-data-dir=${dir}`,
  `--remote-debugging-port=${port}`, '--no-first-run', '--no-default-browser-check',
  'about:blank',
], { stdio: 'ignore' });

const base = await waitForDevtools(port);
const targets = await j(`${base}/json/list`);
let tab = targets.find((t) => t.type === 'page') || (await j(`${base}/json/new`));
const cdp = await connectCDP(tab.webSocketDebuggerUrl);
await cdp.send('Page.enable');
await cdp.send('Runtime.enable');
await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4601/__diag.html' });
await sleep(1500);

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

console.log('\n=== MODULE-WORKER BOOT DIAGNOSTIC (mimics the app) ===');
for (const l of logs) console.log(' ', JSON.stringify(l));
const ran = logs.find((l) => l.step === 'ran');
console.log(ran && ran.out === '42' ? '\n✅ PASS' : '\n❌ FAIL — this is the app failure mode.');

chrome.kill('SIGKILL'); proxy.close();
process.exit(ran && ran.out === '42' ? 0 : 1);

function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function j(u){return new Promise((res,rej)=>http.get(u,(r)=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>res(JSON.parse(d)));}).on('error',rej));}
function freePort(){return new Promise((res)=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p));});});}
async function waitForDevtools(port){const end=Date.now()+15000;for(;;){try{await j(`http://127.0.0.1:${port}/json/version`);return `http://127.0.0.1:${port}`;}catch{if(Date.now()>end)throw new Error('devtools not up');await sleep(300);}}}
async function connectCDP(wsUrl){
  const { WebSocket } = await import('ws').catch(()=>({ WebSocket: null }));
  if(!WebSocket) throw new Error('ws module missing');
  const sock = new WebSocket(wsUrl, { perMessageDeflate:false, maxPayload: 256*1024*1024 });
  await new Promise((r,e)=>{sock.once('open',r);sock.once('error',e);});
  let id=0; const waiters=new Map();
  sock.on('message',(data)=>{const m=JSON.parse(data);if(m.id&&waiters.has(m.id)){waiters.get(m.id)(m);waiters.delete(m.id);}});
  return { send:(method,params={})=>new Promise((res,rej)=>{const mid=++id;waiters.set(mid,(m)=>m.error?rej(new Error(m.error.message)):res(m.result));sock.send(JSON.stringify({id:mid,method,params}));}) };
}
