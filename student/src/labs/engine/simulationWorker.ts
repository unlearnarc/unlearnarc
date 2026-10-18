/**
 * UnlearnARC Engineering Labs — Simulation Web Worker
 *
 * This file is loaded via `new Worker(new URL('./simulationWorker.ts', import.meta.url))`
 * and runs the deterministic simulation engine completely off the React/UI thread.
 *
 * Message protocol:
 *   Inbound  → WorkerInbound  (INIT | START | PAUSE | RESET | STEP | ACTION | DISPOSE)
 *   Outbound → WorkerOutbound (SNAPSHOT | METRICS | LOG | READY | ERROR)
 */

import { SimulationEngine } from './simulationEngine';
import type {
  WorkerInbound,
  WorkerOutbound,
  LabScenario,
  StudentAction,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// TICK RATE
// ─────────────────────────────────────────────────────────────────────────────

const TICK_INTERVAL_MS = 100;       // real ms between simulation ticks
const SIM_TICK_MS = 100;            // virtual ms advanced per real tick (1× speed)
const SNAPSHOT_INTERVAL_TICKS = 5; // emit SNAPSHOT every N ticks

// ─────────────────────────────────────────────────────────────────────────────
// WORKER STATE
// ─────────────────────────────────────────────────────────────────────────────

let engine: SimulationEngine | null = null;
let interval: ReturnType<typeof setInterval> | null = null;
let tickCount = 0;
let running = false;

function clearInterval_(): void {
  if (interval !== null) {
    clearInterval(interval);
    interval = null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// OUTBOUND HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function send(msg: WorkerOutbound): void {
  self.postMessage(msg);
}

function sendSnapshot(status: 'running' | 'paused' | 'completed'): void {
  if (!engine) return;
  const state = engine.snapshot(status);
  send({ type: 'SNAPSHOT', state });
}

function sendMetrics(): void {
  if (!engine) return;
  const samples = engine.getMetricSamples();
  if (samples.length > 0) {
    send({ type: 'METRICS', samples });
  }
}

function sendLogs(): void {
  if (!engine) return;
  const entries = engine.getDrainedLogs();
  if (entries.length > 0) {
    send({ type: 'LOG', entries });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION LOOP
// ─────────────────────────────────────────────────────────────────────────────

function startLoop(): void {
  if (interval !== null || !engine) return;
  running = true;
  interval = setInterval(() => {
    if (!engine || !running) {
      clearInterval_();
      return;
    }

    engine.tick(SIM_TICK_MS);
    tickCount++;

    // Send logs on every tick
    sendLogs();

    // Send full snapshot periodically
    if (tickCount % SNAPSHOT_INTERVAL_TICKS === 0) {
      const status = engine.isFinished() ? 'completed' : 'running';
      sendSnapshot(status);
      sendMetrics();
    }

    if (engine.isFinished()) {
      running = false;
      clearInterval_();
      sendSnapshot('completed');
      sendMetrics();
    }
  }, TICK_INTERVAL_MS);
}

function stopLoop(): void {
  running = false;
  clearInterval_();
}

// ─────────────────────────────────────────────────────────────────────────────
// MESSAGE HANDLER
// ─────────────────────────────────────────────────────────────────────────────

self.onmessage = (ev: MessageEvent<WorkerInbound>) => {
  const msg = ev.data;

  try {
    switch (msg.type) {
      case 'INIT': {
        stopLoop();
        tickCount = 0;
        engine = new SimulationEngine(msg.scenario as LabScenario);
        sendSnapshot('paused');
        send({ type: 'READY' });
        break;
      }

      case 'START': {
        if (!engine) {
          send({ type: 'ERROR', message: 'Engine not initialized. Send INIT first.' });
          return;
        }
        startLoop();
        sendSnapshot('running');
        break;
      }

      case 'PAUSE': {
        stopLoop();
        if (engine) sendSnapshot('paused');
        break;
      }

      case 'RESET': {
        stopLoop();
        tickCount = 0;
        // Re-create engine with same scenario (stored in closure)
        if (engine) {
          // We stored the scenario at INIT time; a real implementation would
          // store the original scenario. Here we re-init with the current snapshot's
          // topology which may have been mutated. For full deterministic replay,
          // keep the original immutable scenario in a separate variable.
          send({ type: 'ERROR', message: 'RESET requires re-sending INIT with original scenario.' });
        }
        break;
      }

      case 'STEP': {
        if (!engine) return;
        stopLoop();
        engine.tick(msg.deltaMs ?? SIM_TICK_MS);
        sendSnapshot('paused');
        sendMetrics();
        sendLogs();
        break;
      }

      case 'ACTION': {
        if (!engine) return;
        engine.applyAction(msg.action as StudentAction);
        sendSnapshot(running ? 'running' : 'paused');
        break;
      }

      case 'DISPOSE': {
        stopLoop();
        engine = null;
        break;
      }

      default:
        send({ type: 'ERROR', message: `Unknown message type: ${(msg as WorkerInbound).type}` });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    send({ type: 'ERROR', message });
  }
};
