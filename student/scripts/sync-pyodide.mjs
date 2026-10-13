// ─────────────────────────────────────────────────────────────────────────────
// sync-pyodide.mjs
//
// Copies the Pyodide runtime assets out of node_modules into public/wasm/pyodide
// so they are SELF-HOSTED and served same-origin (keeps COOP/COEP isolation and
// removes any CDN dependency). Runs automatically before `dev` and `build`.
//
// Idempotent: skips the copy when the destination already matches by size.
// ─────────────────────────────────────────────────────────────────────────────
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const studentRoot = join(here, '..');

// The files loadPyodide() needs at runtime.
const ASSETS = [
  'pyodide.js',
  'pyodide.asm.js',
  'pyodide.asm.wasm',
  'python_stdlib.zip',
  'pyodide-lock.json',
];

function resolvePyodideDir() {
  try {
    // pyodide ships package.json; resolve its directory from there.
    return dirname(require.resolve('pyodide/package.json'));
  } catch {
    const fallback = join(studentRoot, 'node_modules', 'pyodide');
    if (existsSync(fallback)) return fallback;
    return null;
  }
}

const src = resolvePyodideDir();
if (!src) {
  console.error(
    '[sync-pyodide] pyodide package not found. Run: npm install pyodide@0.26.4',
  );
  process.exit(1);
}

const dest = join(studentRoot, 'public', 'wasm', 'pyodide');
mkdirSync(dest, { recursive: true });

let copied = 0;
let skipped = 0;
for (const name of ASSETS) {
  const from = join(src, name);
  const to = join(dest, name);
  if (!existsSync(from)) {
    console.warn(`[sync-pyodide] missing source asset: ${name} (skipping)`);
    continue;
  }
  if (existsSync(to) && statSync(to).size === statSync(from).size) {
    skipped++;
    continue;
  }
  copyFileSync(from, to);
  copied++;
}

console.log(
  `[sync-pyodide] ok → public/wasm/pyodide (copied ${copied}, up-to-date ${skipped})`,
);
