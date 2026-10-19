// ─────────────────────────────────────────────────────────────────────────────
// Shared types for the client-side code-execution sandbox.
// These are imported by BOTH the main thread and the worker, so keep them
// free of any DOM / window references.
// ─────────────────────────────────────────────────────────────────────────────

export type Language = 'python' | 'javascript' | 'cpp' | 'c';

export type ExecutionErrorKind = 'syntax' | 'runtime' | 'timeout' | 'initialization' | 'worker' | 'cancelled';

export interface ExecutionError {
  kind: ExecutionErrorKind;
  name: string;
  message: string;
  line?: number;
  column?: number;
  sourceLine?: string;
  /** Original exception for debugging; not the learner-facing output. */
  traceback?: string;
}

/** A single WASM runtime asset that must be present before a language can run. */
export interface RuntimeAsset {
  /** Stable identity used as the Cache API key. Bump `version` to invalidate. */
  id: string;
  version: string;
  url: string;
  /** Optional integrity hash (sha256-...) — verified after download. */
  integrity?: string;
  /** Approx size in bytes, used purely for progress UI. */
  sizeBytes?: number;
}

/** Full descriptor for a language runtime (one or more assets). */
export interface RuntimeManifest {
  language: Language;
  label: string;
  /** All assets that make up this runtime. */
  assets: RuntimeAsset[];
}

// ── Worker protocol ──────────────────────────────────────────────────────────
// Main thread → worker
export type WorkerRequest =
  | { type: 'INIT'; language: Language; manifest: RuntimeManifest }
  | {
      type: 'RUN';
      runId: string;
      language: Language;
      code: string;
      stdin?: string;
      /** Hard wall-clock limit in ms; worker self-terminates logic past this. */
      timeoutMs: number;
    }
  | { type: 'DISPOSE' };

// Worker → main thread
export type WorkerResponse =
  | { type: 'READY'; language: Language }
  | { type: 'INIT_PROGRESS'; assetId: string; loaded: number; total: number; fromCache: boolean }
  | { type: 'INIT_ERROR'; error: string }
  | { type: 'STDOUT'; runId: string; chunk: string }
  | { type: 'STDERR'; runId: string; chunk: string }
  | {
      type: 'RESULT';
      runId: string;
      ok: boolean;
      stdout: string;
      stderr: string;
      returnValue?: unknown;
      durationMs: number;
      error?: string;
      errorDetails?: ExecutionError;
      timedOut?: boolean;
    };

// ── Public result surfaced to callers ────────────────────────────────────────
export interface ExecutionResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  returnValue?: unknown;
  durationMs: number;
  /** Set when the run was aborted by the wall-clock timeout. */
  timedOut: boolean;
  error?: string;
  errorDetails?: ExecutionError;
}

export interface InitProgress {
  assetId: string;
  loaded: number;
  total: number;
  /** True when the asset was served from the persistent cache (no download). */
  fromCache: boolean;
  /** 0..1 convenience value. */
  ratio: number;
}
