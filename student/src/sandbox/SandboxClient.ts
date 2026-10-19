import type {
  Language, WorkerRequest, WorkerResponse, ExecutionResult, InitProgress, ExecutionErrorKind,
} from './types';
import { RUNTIME_MANIFESTS } from './manifests';
import { isRuntimeInstalled } from './assetCache';
import { failedExecution } from './executionErrors';

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
  timer: ReturnType<typeof setTimeout>;
  started: number;
  stdout: string;
  stderr: string;
};

export class SandboxClient {
  private worker: Worker | null = null;
  private language: Language | null = null;
  private readyPromise: Promise<void> | null = null;
  private readyResolve?: () => void;
  private readyReject?: (e: Error) => void;
  private pending = new Map<string, PendingRun>();
  private progressCb?: (p: InitProgress) => void;
  private runSeq = 0;

  static isInstalled(language: Language): Promise<boolean> {
    return isRuntimeInstalled(RUNTIME_MANIFESTS[language].assets);
  }

  /** Initialise or retry a runtime. Startup failures reject; run failures resolve. */
  init(language: Language, onProgress?: (p: InitProgress) => void): Promise<void> {
    if (this.language === language && this.readyPromise) return this.readyPromise;
    this.dispose();
    this.language = language;
    this.progressCb = onProgress;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    const ready = this.readyPromise;
    // Background recovery may not have a caller awaiting startup yet.
    void ready.catch(() => {});
    try {
      const worker = new Worker(new URL('./sandbox.worker.ts', import.meta.url), {
        type: 'module', name: `sandbox-${language}`,
      });
      this.worker = worker;
      worker.onmessage = ev => {
        if (this.worker === worker) this.handleMessage(ev);
      };
      worker.onerror = e => {
        if (this.worker === worker) this.failWorker(new Error(e.message || 'Code executor worker failed'));
      };
      worker.onmessageerror = () => {
        if (this.worker === worker) this.failWorker(new Error('Unable to decode code executor response'));
      };
      this.send({ type: 'INIT', language, manifest: RUNTIME_MANIFESTS[language] });
    } catch (e) {
      this.failWorker(e instanceof Error ? e : new Error(String(e)), 'initialization');
    }
    return ready;
  }

  /** Execute code. All failures resolve with an ExecutionResult, never reject. */
  async run(code: string, opts: RunOptions = {}): Promise<ExecutionResult> {
    const worker = this.worker;
    const language = this.language;
    if (!worker || !language) return failedExecution('Sandbox not initialised', 'initialization');
    try {
      await this.readyPromise;
    } catch (e) {
      return failedExecution(e, 'initialization');
    }
    if (this.worker !== worker) return failedExecution('Execution cancelled', 'cancelled');
    // One runtime cannot safely execute overlapping programs (stdio is shared).
    if (this.pending.size) return failedExecution('Another execution is already running', 'runtime');

    const runId = `run-${++this.runSeq}`;
    const timeoutMs = opts.timeoutMs ?? 10_000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      return failedExecution('Execution timeout must be a positive finite number', 'runtime');
    }
    return new Promise<ExecutionResult>(resolve => {
      const timer = setTimeout(() => {
        const pending = this.pending.get(runId);
        if (!pending) return;
        this.finish(runId, failedExecution(
          `Execution timed out after ${timeoutMs}ms`, 'timeout', timeoutMs,
          pending.stdout, pending.stderr,
        ));
        this.hardReset();
      }, timeoutMs + 500);
      this.pending.set(runId, {
        resolve, timer, started: performance.now(), stdout: '', stderr: '',
        onStdout: opts.onStdout, onStderr: opts.onStderr,
      });
      try {
        this.send({ type: 'RUN', runId, language, code, stdin: opts.stdin, timeoutMs });
      } catch (e) {
        this.failWorker(e instanceof Error ? e : new Error(String(e)));
      }
    });
  }

  dispose() {
    this.readyReject?.(new Error('Execution cancelled: sandbox disposed'));
    this.readyResolve = undefined;
    this.readyReject = undefined;
    for (const [id, pending] of this.pending) {
      this.finish(id, failedExecution('Execution cancelled: sandbox disposed', 'cancelled',
        performance.now() - pending.started, pending.stdout, pending.stderr));
    }
    this.worker?.terminate();
    this.worker = null;
    this.language = null;
    this.readyPromise = null;
  }

  private send(msg: WorkerRequest) {
    this.worker?.postMessage(msg);
  }

  private finish(runId: string, result: ExecutionResult) {
    const pending = this.pending.get(runId);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.pending.delete(runId);
    pending.resolve(result);
  }

  private failWorker(error: Error, kind: ExecutionErrorKind = 'worker') {
    this.readyReject?.(error);
    for (const [id, pending] of this.pending) {
      this.finish(id, failedExecution(error, kind, performance.now() - pending.started,
        pending.stdout, pending.stderr));
    }
    this.dispose();
  }

  private hardReset() {
    const language = this.language;
    const cb = this.progressCb;
    this.dispose();
    if (language) void this.init(language, cb).catch(() => {});
  }

  private handleMessage = (ev: MessageEvent<WorkerResponse>) => {
    const msg = ev.data;
    switch (msg.type) {
      case 'READY':
        this.readyResolve?.();
        break;
      case 'INIT_PROGRESS':
        this.progressCb?.({
          assetId: msg.assetId, loaded: msg.loaded, total: msg.total,
          fromCache: msg.fromCache, ratio: msg.total ? msg.loaded / msg.total : 0,
        });
        break;
      case 'INIT_ERROR':
        this.failWorker(new Error(msg.error), 'initialization');
        break;
      case 'STDOUT':
      case 'STDERR': {
        const pending = this.pending.get(msg.runId);
        if (!pending) break;
        if (msg.type === 'STDOUT') {
          pending.stdout += msg.chunk;
          pending.onStdout?.(msg.chunk);
        } else {
          pending.stderr += msg.chunk;
          pending.onStderr?.(msg.chunk);
        }
        break;
      }
      case 'RESULT': {
        const pending = this.pending.get(msg.runId);
        if (!pending) break;
        const timedOut = msg.timedOut ?? msg.errorDetails?.kind === 'timeout';
        this.finish(msg.runId, {
          ok: msg.ok, stdout: timedOut ? pending.stdout : msg.stdout,
          stderr: timedOut ? pending.stderr + msg.stderr : msg.stderr,
          returnValue: msg.returnValue, durationMs: msg.durationMs,
          timedOut, error: msg.error, errorDetails: msg.errorDetails,
        });
        // A timed-out Python coroutine may still be running. Replace its VM.
        if (timedOut) this.hardReset();
        break;
      }
    }
  };
}
