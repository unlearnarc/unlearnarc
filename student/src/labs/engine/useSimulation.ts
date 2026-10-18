/**
 * useSimulation — React hook that manages the simulation Web Worker lifecycle.
 *
 * Responsibilities:
 *   - Spawn the worker on mount, terminate on unmount
 *   - Route WorkerInbound messages from the caller
 *   - Receive and merge WorkerOutbound snapshots into React state
 *   - Expose typed controls: start, pause, step, reset, applyAction
 *   - Guard against stale-closure state updates after unmount
 *   - Keep metric samples bounded in React state
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  SimulationState,
  WorkerInbound,
  WorkerOutbound,
  LabScenario,
  StudentAction,
  MetricSample,
  LogEntry,
} from './types';

const MAX_SAMPLES_IN_STATE = 1000;

export interface SimulationControls {
  start:       () => void;
  pause:       () => void;
  step:        (deltaMs?: number) => void;
  reset:       (scenario: LabScenario) => void;
  applyAction: (action: StudentAction) => void;
}

export interface UseSimulationReturn {
  state:    SimulationState | null;
  samples:  MetricSample[];
  logs:     LogEntry[];
  error:    string | null;
  ready:    boolean;
  controls: SimulationControls;
}

export function useSimulation(initialScenario: LabScenario | null): UseSimulationReturn {
  const workerRef   = useRef<Worker | null>(null);
  const mountedRef  = useRef(true);

  const [state,   setState]   = useState<SimulationState | null>(null);
  const [samples, setSamples] = useState<MetricSample[]>([]);
  const [logs,    setLogs]    = useState<LogEntry[]>([]);
  const [error,   setError]   = useState<string | null>(null);
  const [ready,   setReady]   = useState(false);

  // ── Spawn worker ─────────────────────────────────────────────────────────
  useEffect(() => {
    mountedRef.current = true;

    const worker = new Worker(
      new URL('./simulationWorker.ts', import.meta.url),
      { type: 'module' },
    );
    workerRef.current = worker;

    worker.onmessage = (ev: MessageEvent<WorkerOutbound>) => {
      if (!mountedRef.current) return;
      const msg = ev.data;
      switch (msg.type) {
        case 'READY':
          setReady(true);
          setError(null);
          break;
        case 'SNAPSHOT':
          setState(msg.state);
          break;
        case 'METRICS':
          setSamples(prev => {
            const combined = [...prev, ...msg.samples];
            return combined.length > MAX_SAMPLES_IN_STATE
              ? combined.slice(combined.length - MAX_SAMPLES_IN_STATE)
              : combined;
          });
          break;
        case 'LOG':
          setLogs(prev => {
            const combined = [...prev, ...msg.entries];
            return combined.length > 500
              ? combined.slice(combined.length - 500)
              : combined;
          });
          break;
        case 'ERROR':
          setError(msg.message);
          break;
      }
    };

    worker.onerror = (ev) => {
      if (mountedRef.current) setError(ev.message);
    };

    // Initialize immediately if a scenario is provided
    if (initialScenario) {
      send(worker, { type: 'INIT', scenario: initialScenario, mode: 'simulation' });
    }

    return () => {
      mountedRef.current = false;
      send(worker, { type: 'DISPOSE' });
      worker.terminate();
      workerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function send(worker: Worker, msg: WorkerInbound): void {
    worker.postMessage(msg);
  }

  function post(msg: WorkerInbound): void {
    if (workerRef.current) workerRef.current.postMessage(msg);
  }

  // ── Controls ─────────────────────────────────────────────────────────────
  const start = useCallback(() => {
    post({ type: 'START' });
  }, []);

  const pause = useCallback(() => {
    post({ type: 'PAUSE' });
  }, []);

  const step = useCallback((deltaMs = 100) => {
    post({ type: 'STEP', deltaMs });
  }, []);

  const reset = useCallback((scenario: LabScenario) => {
    setState(null);
    setSamples([]);
    setLogs([]);
    setReady(false);
    setError(null);
    post({ type: 'INIT', scenario, mode: 'simulation' });
  }, []);

  const applyAction = useCallback((action: StudentAction) => {
    post({ type: 'ACTION', action });
  }, []);

  return {
    state,
    samples,
    logs,
    error,
    ready,
    controls: { start, pause, step, reset, applyAction },
  };
}
