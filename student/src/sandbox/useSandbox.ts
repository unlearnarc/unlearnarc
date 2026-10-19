import { useCallback, useEffect, useRef, useState } from 'react';
import { SandboxClient, type RunOptions } from './SandboxClient';
import type { ExecutionResult, InitProgress, Language } from './types';
import { failedExecution } from './executionErrors';

export type SandboxStatus =
  | 'idle'
  | 'installing'   // first-ever download on this machine
  | 'loading'      // warming from local cache
  | 'ready'
  | 'running'
  | 'error';

export interface UseSandbox {
  status: SandboxStatus;
  /** Aggregate 0..1 install/load progress. */
  progress: number;
  /** True once the runtime is installed on this machine (served from cache). */
  installedFromCache: boolean;
  error: string | null;
  lastResult: ExecutionResult | null;
  init: () => Promise<void>;
  run: (code: string, opts?: RunOptions) => Promise<ExecutionResult>;
}

/**
 * React binding for the worker-isolated sandbox. One SandboxClient per hook
 * instance, torn down on unmount. The expensive WASM install happens once per
 * machine/browser (Cache API) — subsequent mounts resolve from cache instantly.
 */
export function useSandbox(language: Language): UseSandbox {
  const clientRef = useRef<SandboxClient | null>(null);
  const [status, setStatus] = useState<SandboxStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [installedFromCache, setInstalledFromCache] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ExecutionResult | null>(null);

  const init = useCallback(async () => {
    const client = clientRef.current ?? (clientRef.current = new SandboxClient());
    setError(null);

    // Cache probing must not prevent execution when browser storage is blocked.
    const alreadyInstalled = await SandboxClient.isInstalled(language).catch(() => false);
    setInstalledFromCache(alreadyInstalled);
    setStatus(alreadyInstalled ? 'loading' : 'installing');

    // Track per-asset progress → aggregate ratio.
    const perAsset = new Map<string, number>();
    const onProgress = (p: InitProgress) => {
      perAsset.set(p.assetId, p.ratio);
      const vals = [...perAsset.values()];
      const avg = vals.reduce((a, b) => a + b, 0) / Math.max(vals.length, 1);
      setProgress(avg);
    };

    try {
      await client.init(language, onProgress);
      setProgress(1);
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, [language]);

  const run = useCallback(async (code: string, opts?: RunOptions) => {
    const client = clientRef.current;
    setStatus('running');
    const result = client
      ? await client.run(code, opts)
      : failedExecution('Sandbox not initialised', 'initialization');
    if (clientRef.current !== client) return result;
    setLastResult(result);
    const unavailable = result.errorDetails && ['initialization', 'worker', 'cancelled'].includes(result.errorDetails.kind);
    setError(unavailable ? result.error ?? 'Code executor unavailable' : null);
    setStatus(unavailable ? 'error' : 'ready');
    return result;
  }, []);

  // Tear down worker on unmount / language change.
  useEffect(() => {
    return () => {
      clientRef.current?.dispose();
      clientRef.current = null;
    };
  }, [language]);

  return { status, progress, installedFromCache, error, lastResult, init, run };
}
