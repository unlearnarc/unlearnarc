import type { RuntimeManifest, Language } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// Runtime manifests.
//
// IMPORTANT: bump the `version` field whenever an asset URL changes. The version
// is baked into the Cache API key, so a bump transparently invalidates the old
// cached copy on every client's machine without any manual cache clearing.
//
// We SELF-HOST Pyodide from /wasm/pyodide/ (copied out of node_modules at build
// time — see the `pyodide:sync` npm script). Self-hosting means:
//   • no 3rd-party CDN dependency / outages,
//   • same-origin assets ⇒ COOP/COEP cross-origin-isolation stays intact,
//   • the big .wasm/.zip are served by our own host and then persisted in the
//     client's Cache API on first visit (the "install once per machine" layer).
// ─────────────────────────────────────────────────────────────────────────────

const PYODIDE_VERSION = '0.26.4';
// Same-origin base. `import.meta.env.BASE_URL` keeps it correct under a sub-path
// deploy; falls back to '/' in the worker where import.meta.env may be absent.
const BASE =
  (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
const PYODIDE_BASE = `${BASE}wasm/pyodide`;

export const RUNTIME_MANIFESTS: Record<Language, RuntimeManifest> = {
  python: {
    language: 'python',
    label: 'Python 3 (Pyodide)',
    assets: [
      {
        id: 'pyodide-js',
        version: PYODIDE_VERSION,
        url: `${PYODIDE_BASE}/pyodide.js`,
        sizeBytes: 15_000,
      },
      {
        id: 'pyodide-asm-js',
        version: PYODIDE_VERSION,
        url: `${PYODIDE_BASE}/pyodide.asm.js`,
        sizeBytes: 1_229_099,
      },
      {
        id: 'pyodide-wasm',
        version: PYODIDE_VERSION,
        url: `${PYODIDE_BASE}/pyodide.asm.wasm`,
        sizeBytes: 10_088_051,
      },
      {
        id: 'pyodide-stdlib',
        version: PYODIDE_VERSION,
        url: `${PYODIDE_BASE}/python_stdlib.zip`,
        sizeBytes: 2_341_872,
      },
      {
        id: 'pyodide-lock',
        version: PYODIDE_VERSION,
        url: `${PYODIDE_BASE}/pyodide-lock.json`,
        sizeBytes: 106_335,
      },
    ],
  },

  javascript: {
    language: 'javascript',
    label: 'JavaScript (native worker)',
    // JS needs no WASM runtime — it executes directly inside the worker.
    assets: [],
  },

  // C / C++ pattern — point these at your own compiled toolchain (e.g. a
  // clang/wasm bundle or a precompiled runner). Left as a template.
  cpp: {
    language: 'cpp',
    label: 'C++ (wasm toolchain)',
    assets: [],
  },

  c: {
    language: 'c',
    label: 'C (wasm toolchain)',
    assets: [],
  },
};

// Pyodide's loadPyodide() needs a directory URL to resolve its own sibling
// assets (pyodide.asm.js/.wasm, python_stdlib.zip, lock file). Because those
// are already warm in the Cache API after the first install, these resolve
// instantly on repeat visits.
export const PYODIDE_INDEX_URL = `${PYODIDE_BASE}/`;
