// Node smoke test: boots the self-hosted Pyodide exactly like the worker would,
// to prove the asset set under public/wasm/pyodide is complete and loadable.
// Run: node scripts/smoke-pyodide.mjs
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const indexURL = path.resolve(__dirname, '../public/wasm/pyodide') + '/';

await import(path.join(indexURL, 'pyodide.js'));
const loadPyodide = globalThis.loadPyodide;

console.log('[smoke] booting pyodide from', indexURL);
const t0 = Date.now();
const py = await loadPyodide({ indexURL });
console.log('[smoke] booted in', Date.now() - t0, 'ms  version=', py.version);

let out = '';
py.setStdout({ batched: (s) => (out += s + '\n') });
const lines = ['3 4'];
let i = 0;
py.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) });

await py.runPythonAsync(`a, b = map(int, input().split())\nprint(a + b)`);
console.log('[smoke] program stdout:', JSON.stringify(out.trim()));
console.log(out.trim() === '7' ? '[smoke] PASS ✅' : '[smoke] FAIL ❌');
process.exit(out.trim() === '7' ? 0 : 1);
