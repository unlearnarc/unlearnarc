// ─────────────────────────────────────────────────────────────────────────────
// SandboxClient — the main-thread handle to the worker-isolated runtime.
//
// Responsibilities:
//   • spawn / dispose the worker (so the UI thread never blocks)
//   • drive INIT (one-time per-machine WASM install) and surface progress
//   • serialise RUN requests and race them against a hard timeout
//   • expose a clean promise/callback API to React
//
// The heavy lifting (download, cache, VM, execution) is in the worker; this file
// stays small and DOM-aware.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  Language,
  WorkerRequest,
  WorkerResponse,
  ExecutionResult,
  InitProgress,
} from './types';
import { RUNTIME_MANIFESTS } from './manifests';
import { isRuntimeInstalled } from './assetCache';

export interface RunOptions {
  stdin?: string;
  /** Hard wall-clock limit; defaults to 10s. */
  timeoutMs?: number;
  onStdout?: (chunk: string) => void;
  onStderr?: (chunk: string) => void;
}

type PendingRun = {
  resolve: (r: ExecutionResult) => void;
  onStdout?: (c: string) => void;
  onStderr?: (c: string) => void;
};

export class SandboxClient {
  private worker: Worker | null = null;
  private language: Language | null = null;
  private readyPromise: Promise<void> | null = null;
  private readyResolve!: () => void;
  private readyReject!: (e: Error) => void;
  private pending = new Map<string, PendingRun>();
  private progressCb?: (p: InitProgress) => void;
  private runSeq = 0;

  /** True if every WASM asset for the language is already on this machine. */
  static isInstalled(language: Language): Promise<boolean> {
    return isRuntimeInstalled(RUNTIME_MANIFESTS[language].assets);
  }

  /**
   * Boot the worker and install/warm the runtime. Resolves once READY.
   * Safe to call repeatedly for the same language (no-op after first).
   */
  init(language: Language, onProgress?: (p: InitProgress) => void): Promise<void> {
    if (this.language === language && this.readyPromise) return this.readyPromise;

    // Switching language ⇒ tear down the old worker first.
    if (this.worker) this.dispose();

    this.language = language;
    this.progressCb = onProgress;

    this.worker = new Worker(new URL('./sandbox.worker.ts', import.meta.url), {
      type: 'module',
      name: `sandbox-${language}`,
    });
    this.worker.onmessage = this.handleMessage;
    this.worker.onerror = (e) => this.readyReject?.(new Error(e.message));

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });

    this.send({
      type: 'INIT',
      language,
      manifest: RUNTIME_MANIFESTS[language],
    });

    return this.readyPromise;
  }

  /** Execute code; resolves with stdout/stderr/result/timing. Never throws. */
  async run(code: string, opts: RunOptions = {}): Promise<ExecutionResult> {
    if (!this.worker || !this.language) {
      return {
        ok: false, stdout: '', stderr: 'Sandbox not initialised',
        durationMs: 0, timedOut: false, error: 'Sandbox not initialised',
      };
    }
    await this.readyPromise;

    const runId = `run-${++this.runSeq}`;
    const timeoutMs = opts.timeoutMs ?? 10_000;

    return new Promise<ExecutionResult>((resolve) => {
      this.pending.set(runId, {
        resolve,
        onStdout: opts.onStdout,
        onStderr: opts.onStderr,
      });

      this.send({
        type: 'RUN',
        runId,
        language: this.language!,
        code,
        stdin: opts.stdin,
        timeoutMs,
      });

      // Belt-and-braces: if the worker itself hangs (e.g. a runaway while-true
      // that starves even the worker's own timer), hard-kill it.
      setTimeout(() => {
        const p = this.pending.get(runId);
        if (!p) return;
        this.pending.delete(runId);
        this.hardReset();
        p.resolve({
          ok: false, stdout: '', stderr: `Execution timed out after ${timeoutMs}ms`,
          durationMs: timeoutMs, timedOut: true,
          error: `Execution timed out after ${timeoutMs}ms`,
        });
      }, timeoutMs + 500);
    });
  }

  dispose() {
    if (this.worker) {
      try { this.send({ type: 'DISPOSE' }); } catch { /* noop */ }
      this.worker.terminate();
    }
    this.worker = null;
    this.language = null;
    this.readyPromise = null;
    this.pending.clear();
  }

  // ── internals ──────────────────────────────────────────────────────────────
  private send(msg: WorkerRequest) {
    this.worker?.postMessage(msg);
  }

  /** Kill a wedged worker and respawn so the next run works. */
  private hardReset() {
    const lang = this.language;
    const cb = this.progressCb;
    this.dispose();
    if (lang) this.init(lang, cb);
  }

  private handleMessage = (ev: MessageEvent<WorkerResponse>) => {
    const msg = ev.data;
    switch (msg.type) {
      case 'READY':
        this.readyResolve?.();
        break;

      case 'INIT_PROGRESS':
        this.progressCb?.({
          assetId: msg.assetId,
          loaded: msg.loaded,
          total: msg.total,
          fromCache: msg.fromCache,
          ratio: msg.total ? msg.loaded / msg.total : 0,
        });
        break;

      case 'INIT_ERROR':
        this.readyReject?.(new Error(msg.error));
        break;

      case 'STDOUT':
        this.pending.get(msg.runId)?.onStdout?.(msg.chunk);
        break;

      case 'STDERR':
        this.pending.get(msg.runId)?.onStderr?.(msg.chunk);
        break;

      case 'RESULT': {
        const p = this.pending.get(msg.runId);
        if (!p) break;
        this.pending.delete(msg.runId);
        p.resolve({
          ok: msg.ok,
          stdout: msg.stdout,
          stderr: msg.stderr,
          returnValue: msg.returnValue,
          durationMs: msg.durationMs,
          timedOut: false,
          error: msg.error,
        });
        break;
      }
    }
  };
}
