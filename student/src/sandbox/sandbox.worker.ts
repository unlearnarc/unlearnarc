/// <reference lib="webworker" />
// ─────────────────────────────────────────────────────────────────────────────
// Sandbox worker.
//
// EVERYTHING here runs on a dedicated worker thread, so no student code ever
// blocks the main UI thread. Isolation layers:
//
//   1. Worker thread     → separate JS realm, no DOM, no window, no cookies.
//   2. Pyodide VM        → Python runs inside its own WASM linear memory.
//   3. JS Function eval  → run with a shadowed global scope (see runJavaScript).
//   4. Wall-clock guard  → every RUN is raced against a hard timeout.
//
// The worker also talks to the persistent assetCache so the big WASM downloads
// happen exactly once per machine/browser. We additionally install a fetch()
// shim so Pyodide's internal asset fetches (pyodide.asm.js/.wasm, stdlib zip,
// lock file) are served out of the same Cache API instead of re-hitting the
// network — making repeat loads instant and fully offline-capable.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  WorkerRequest,
  WorkerResponse,
  RuntimeManifest,
  Language,
  RuntimeAsset,
} from './types';
import { getAsset } from './assetCache';
import { PYODIDE_INDEX_URL } from './manifests';
import { failedExecution, formatExecutionError, normalizeExecutionError } from './executionErrors';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

function post(msg: WorkerResponse) {
  ctx.postMessage(msg);
}

// ── Runtime state ────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null;

// ── Cache-backed fetch shim ──────────────────────────────────────────────────
// Pyodide fetches its own sibling assets by absolute URL during loadPyodide().
// We route those specific URLs through the persistent cache so they are only
// ever downloaded once per machine. Everything else falls through to native
// fetch (and student code has no access to fetch at all — see runJavaScript).
function installPyodideFetchShim(assets: RuntimeAsset[]) {
  const byUrl = new Map<string, RuntimeAsset>();
  for (const a of assets) {
    // Index by both the raw path and a fully-resolved absolute URL.
    byUrl.set(a.url, a);
    try {
      byUrl.set(new URL(a.url, ctx.location.href).href, a);
    } catch {
      /* noop */
    }
  }

  const nativeFetch = ctx.fetch.bind(ctx);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (ctx as any).fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.href
          : input.url;
    const asset = byUrl.get(url);
    if (asset) {
      const buf = await getAsset(asset);
      return new Response(buf.slice(0), {
        status: 200,
        headers: { 'content-type': guessType(url) },
      });
    }
    return nativeFetch(input as RequestInfo, init);
  };
}

function guessType(url: string): string {
  if (url.endsWith('.wasm')) return 'application/wasm';
  if (url.endsWith('.json')) return 'application/json';
  if (url.endsWith('.zip')) return 'application/zip';
  if (url.endsWith('.js')) return 'text/javascript';
  return 'application/octet-stream';
}

// ── INIT: install + warm the runtime (downloads once, then cache) ────────────
async function initRuntime(language: Language, manifest: RuntimeManifest) {
  // JavaScript needs no WASM — ready immediately.
  if (language === 'javascript') {
    post({ type: 'READY', language });
    return;
  }

  if (language === 'python') {
    const jsAsset = manifest.assets.find(a => a.id === 'pyodide-js');
    if (!jsAsset) throw new Error('Python manifest missing pyodide-js asset');

    // 1. Pull every asset through the persistent cache (progress streamed).
    //    First run downloads + persists; later runs resolve instantly.
    for (const asset of manifest.assets) {
      await getAsset(asset, p =>
        post({
          type: 'INIT_PROGRESS',
          assetId: asset.id,
          loaded: p.loaded,
          total: p.total,
          fromCache: p.fromCache,
        }),
      );
    }

    // 2. Route Pyodide's own asset fetches through the cache. Pyodide resolves
    //    its siblings (pyodide.asm.js/.wasm, python_stdlib.zip, lock file) by
    //    `indexURL + filename`, so index them by that resolved absolute URL too.
    installPyodideFetchShim(manifest.assets);

    // 3. Load the loader script. This worker is bundled as an ES MODULE
    //    (vite.config.ts → worker.format: 'es'), and module workers do NOT
    //    support importScripts() — calling it throws
    //    "Module scripts don't support importScripts()". So we load Pyodide's
    //    loader via a dynamic import() of a blob built from the cached bytes.
    //    pyodide.js is UMD: when imported as a module it does NOT set a named
    //    export, it assigns `loadPyodide` onto the worker global (self). We read
    //    it back off `ctx` afterwards. The bytes are already warm in the Cache
    //    API (step 1), so this is an in-memory load with no extra network hit.
    const jsBuf = await getAsset(jsAsset);
    const loaderBlobUrl = URL.createObjectURL(
      new Blob([jsBuf], { type: 'text/javascript' }),
    );
    try {
      await import(/* @vite-ignore */ loaderBlobUrl);
    } finally {
      URL.revokeObjectURL(loaderBlobUrl);
    }

    // 4. Boot Pyodide. indexURL must be the same-origin directory so locateFile
    //    (`indexURL + name`) resolves every sibling through our fetch shim /
    //    the static host.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loadPyodide = (ctx as any).loadPyodide as (opts: {
      indexURL: string;
      stdLibURL?: string;
      lockFileURL?: string;
    }) => Promise<unknown>;
    if (typeof loadPyodide !== 'function') {
      throw new Error(
        'Pyodide loader did not expose loadPyodide() on the worker global after import().',
      );
    }

    pyodide = await loadPyodide({ indexURL: PYODIDE_INDEX_URL });
    hardenPython();
    post({ type: 'READY', language });
    return;
  }

  throw new Error(`Runtime not implemented for language: ${language}`);
}

// ── Extra Python hardening ───────────────────────────────────────────────────
// Pyodide is already sandboxed (its own WASM heap, no host FS/network by
// default), but we additionally neuter modules that could reach the host JS
// realm so untrusted contest code cannot escape.
function hardenPython() {
  try {
    pyodide.runPython(`
import builtins as _b
# Block the escape hatches into the host JS realm.
for _m in ("js", "pyodide_js"):
    import sys as _sys
    if _m in _sys.modules:
        del _sys.modules[_m]
def _blocked(*_a, **_k):
    raise PermissionError("network / host access is disabled in the sandbox")
# Neuter network-capable stdlib entry points.
try:
    import urllib.request as _u
    _u.urlopen = _blocked
except Exception:
    pass
`);
  } catch {
    /* best-effort hardening; never block startup on it */
  }
}

// ── JS execution with a shadowed global scope ────────────────────────────────
function runJavaScript(code: string, runId: string) {
  let stdout = '';
  let stderr = '';
  const log = (...args: unknown[]) => {
    const line = args.map(stringify).join(' ') + '\n';
    stdout += line;
    post({ type: 'STDOUT', runId, chunk: line });
  };
  const errlog = (...args: unknown[]) => {
    const line = args.map(stringify).join(' ') + '\n';
    stderr += line;
    post({ type: 'STDERR', runId, chunk: line });
  };

  const sandboxConsole = { log, info: log, debug: log, warn: errlog, error: errlog };

  // Shadow dangerous globals so student code cannot touch network / storage /
  // the worker postMessage channel. These names resolve to `undefined` inside.
  const blocked = [
    'self', 'globalThis', 'postMessage', 'importScripts', 'fetch',
    'XMLHttpRequest', 'WebSocket', 'indexedDB', 'caches', 'crypto',
    'Worker', 'SharedWorker', 'localStorage', 'sessionStorage',
    'Function', 'eval',
  ];

  let returnValue: unknown;
  try {
    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'console',
      ...blocked,
      // `eval` may be shadowed in the outer, non-strict parameter list,
      // but is an illegal parameter name on a strict-mode function itself.
      `return (function () { "use strict";\n${code}\n}).call(undefined);`,
    );
    returnValue = fn(sandboxConsole, ...blocked.map(() => undefined));
    return { ok: true, stdout, stderr, returnValue };
  } catch (e) {
    const errorDetails = normalizeExecutionError(e, { language: 'javascript', code });
    const message = formatExecutionError(errorDetails);
    stderr += message + '\n';
    post({ type: 'STDERR', runId, chunk: message + '\n' });
    return { ok: false, stdout, stderr, error: message, errorDetails };
  }
}

// ── Python execution via Pyodide ─────────────────────────────────────────────
async function runPython(code: string, stdin: string | undefined, runId: string) {
  if (!pyodide) throw new Error('Python runtime not initialised');

  let stdout = '';
  let stderr = '';

  pyodide.setStdout({
    batched: (s: string) => {
      stdout += s + '\n';
      post({ type: 'STDOUT', runId, chunk: s + '\n' });
    },
  });
  pyodide.setStderr({
    batched: (s: string) => {
      stderr += s + '\n';
      post({ type: 'STDERR', runId, chunk: s + '\n' });
    },
  });
  // Reset input for every run, including runs without stdin.
  const lines = stdin === undefined || stdin === '' ? [] : stdin.split('\n');
  let i = 0;
  pyodide.setStdin({ stdin: () => (i < lines.length ? lines[i++] : null) });

  try {
    const returnValue = await pyodide.runPythonAsync(code);
    const jsValue =
      returnValue && typeof returnValue.toJs === 'function'
        ? returnValue.toJs()
        : returnValue;
    // Free the proxy if Pyodide handed one back.
    if (returnValue && typeof returnValue.destroy === 'function') {
      try { returnValue.destroy(); } catch { /* noop */ }
    }
    return { ok: true, stdout, stderr, returnValue: jsValue };
  } catch (e) {
    const errorDetails = normalizeExecutionError(e, { language: 'python', code });
    const message = formatExecutionError(errorDetails);
    stderr += message + '\n';
    post({ type: 'STDERR', runId, chunk: message + '\n' });
    return { ok: false, stdout, stderr, error: message, errorDetails };
  }
}

function stringify(v: unknown): string {
  if (typeof v === 'string') return v;
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

// ── Wall-clock guard ─────────────────────────────────────────────────────────
function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(
      () => reject(Object.assign(new Error(`Execution timed out after ${ms}ms`), { name: 'TimeoutError' })),
      ms,
    );
    p.then(
      v => {
        clearTimeout(id);
        resolve(v);
      },
      e => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

// ── Message pump ─────────────────────────────────────────────────────────────
ctx.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const msg = ev.data;

  try {
    switch (msg.type) {
      case 'INIT':
        await initRuntime(msg.language, msg.manifest);
        break;

      case 'RUN': {
        const started = performance.now();
        try {
          const exec =
            msg.language === 'javascript'
              ? Promise.resolve(runJavaScript(msg.code, msg.runId))
              : runPython(msg.code, msg.stdin, msg.runId);

          const r = await withTimeout(exec, msg.timeoutMs);
          post({
            type: 'RESULT',
            runId: msg.runId,
            ok: r.ok,
            stdout: r.stdout,
            stderr: r.stderr,
            returnValue: r.returnValue,
            durationMs: performance.now() - started,
            error: r.error,
            errorDetails: r.errorDetails,
          });
        } catch (e) {
          const failure = failedExecution(
            e,
            e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'worker',
            performance.now() - started,
          );
          post({ type: 'RESULT', runId: msg.runId, ...failure });
        }
        break;
      }

      case 'DISPOSE':
        pyodide = null;
        ctx.close();
        break;
    }
  } catch (e) {
    post({ type: 'INIT_ERROR', error: e instanceof Error ? e.message : String(e) });
  }
};
