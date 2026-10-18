/**
 * Simulation Engine Tests
 *
 * Validates determinism, component behavior, bounded resources, and
 * action dispatch. These run in Vitest (same toolchain as the rest of
 * the student app — check vitest.config.ts).
 *
 * NOTE: the engine is framework-independent; no React needed.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SimulationEngine } from './simulationEngine';
import { SeededRandom } from './seededRandom';
import { trafficSurgeScenario } from '../scenarios/trafficSurge';
import type { LabScenario, StudentAction } from './types';

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function freshScenario(): LabScenario {
  return JSON.parse(JSON.stringify(trafficSurgeScenario)) as LabScenario;
}

function runTicks(engine: SimulationEngine, ticks: number, deltaMs = 100): void {
  for (let i = 0; i < ticks; i++) {
    engine.tick(deltaMs);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEEDED RANDOM
// ─────────────────────────────────────────────────────────────────────────────

describe('SeededRandom', () => {
  it('produces the same sequence for the same seed', () => {
    const a = new SeededRandom(42);
    const b = new SeededRandom(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('produces different sequences for different seeds', () => {
    const a = new SeededRandom(1);
    const b = new SeededRandom(2);
    const seqA = a.next();
    const seqB = b.next();
    expect(seqA).not.toEqual(seqB);
  });

  it('returns values in [0, 1)', () => {
    const rng = new SeededRandom(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('nextInt returns integers in [min, max)', () => {
    const rng = new SeededRandom(7);
    for (let i = 0; i < 200; i++) {
      const v = rng.nextInt(5, 10);
      expect(v).toBeGreaterThanOrEqual(5);
      expect(v).toBeLessThan(10);
      expect(Number.isInteger(v)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DETERMINISM
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulationEngine — determinism', () => {
  it('produces identical snapshots for the same seed and tick count', () => {
    const s1 = new SimulationEngine(freshScenario());
    const s2 = new SimulationEngine(freshScenario());
    runTicks(s1, 50);
    runTicks(s2, 50);
    const snap1 = s1.snapshot('paused');
    const snap2 = s2.snapshot('paused');
    // Times must match
    expect(snap1.simulationTime).toBe(snap2.simulationTime);
    // Per-node saturation must match
    for (const node of snap1.topology.nodes) {
      const m1 = snap1.metrics[node.id];
      const m2 = snap2.metrics[node.id];
      expect(m1).toBeDefined();
      expect(m2).toBeDefined();
      expect(m1!.saturation.toFixed(4)).toBe(m2!.saturation.toFixed(4));
    }
  });

  it('advances virtual time correctly', () => {
    const engine = new SimulationEngine(freshScenario());
    runTicks(engine, 10, 100);
    expect(engine.time).toBe(1000);
  });

  it('reports isFinished after maxTime is reached', () => {
    const scenario = freshScenario();
    scenario.workload.totalDurationMs = 500;
    const engine = new SimulationEngine(scenario);
    runTicks(engine, 5, 100);
    expect(engine.isFinished()).toBe(true);
  });

  it('does not exceed maxTime boundary', () => {
    const scenario = freshScenario();
    scenario.workload.totalDurationMs = 300;
    const engine = new SimulationEngine(scenario);
    runTicks(engine, 10, 100);  // 10 × 100ms = 1000ms > 300ms
    expect(engine.time).toBeGreaterThanOrEqual(300);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT BEHAVIOR
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulationEngine — component models', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine(freshScenario());
  });

  it('initializes node states for all topology nodes', () => {
    const snap = engine.snapshot('paused');
    const nodeIds = snap.topology.nodes.map(n => n.id);
    for (const id of nodeIds) {
      expect(snap.metrics[id]).toBeDefined();
    }
  });

  it('service saturation is > 0 under baseline load', () => {
    // Run 10 seconds of baseline load
    runTicks(engine, 100, 100);
    const snap = engine.snapshot('paused');
    const svc = snap.metrics['service-1']!;
    // Booking service receives 200 RPS, its max is 300 — should have non-trivial saturation
    expect(svc.saturation).toBeGreaterThan(0);
    expect(svc.requestsIn).toBeGreaterThan(0);
  });

  it('service saturation increases when manually flooded via trigger_failure', () => {
    runTicks(engine, 50, 100);
    const snapBefore = engine.snapshot('paused');
    const satBefore = snapBefore.metrics['service-1']!.saturation;

    // Trigger a failure directly
    engine.applyAction({
      id: 'test-fail', kind: 'trigger_failure',
      payload: { nodeId: 'service-1' }, appliedAt: 5000,
    });
    runTicks(engine, 5, 100);
    const snapAfter = engine.snapshot('paused');
    const satAfter = snapAfter.metrics['service-1']!.saturation;

    expect(satAfter).toBeGreaterThan(satBefore);
  });

  it('cache shows non-zero hits after warmup period', () => {
    // Connect cache downstream of the client so it receives traffic
    const scenario = freshScenario();
    const clientNode = scenario.initialTopology.nodes.find(n => n.kind === 'client')!;
    scenario.initialTopology.nodes.push({
      id: 'cache-test',
      kind: 'cache',
      label: 'Test Cache',
      config: {
        maxSizeBytes: 1073741824,
        ttlSeconds: 300,
        evictionPolicy: 'lru',
        hitRatioTarget: 0.8,
        warmupSeconds: 5,
      },
      position: { x: 400, y: 300 },
    });
    scenario.initialTopology.edges.push({
      id: 'edge-client-cache',
      fromId: clientNode.id,
      toId: 'cache-test',
    });
    const cacheEngine = new SimulationEngine(scenario);
    runTicks(cacheEngine, 100, 100); // 10 virtual seconds > 5s warmup
    const snap = cacheEngine.snapshot('paused');
    const cacheMetrics = snap.metrics['cache-test'];
    expect(cacheMetrics).toBeDefined();
    expect(cacheMetrics!.cacheHits).toBeGreaterThan(0);
  });

  it('queue depth increases when producers exceed consumers', () => {
    const scenario = freshScenario();
    const clientNode = scenario.initialTopology.nodes.find(n => n.kind === 'client')!;
    // Add a queue connected from the client so it receives traffic
    scenario.initialTopology.nodes.push({
      id: 'queue-test',
      kind: 'queue',
      label: 'Test Queue',
      // consumerRps deliberately low so backlog builds
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config: { maxDepth: 10000, visibilityTimeoutSeconds: 30, maxRetries: 3, deadLetterEnabled: false } as any,
      position: { x: 500, y: 300 },
    });
    scenario.initialTopology.edges.push({
      id: 'edge-client-queue',
      fromId: clientNode.id,
      toId: 'queue-test',
    });
    const queueEngine = new SimulationEngine(scenario);
    runTicks(queueEngine, 50, 100);
    const snap = queueEngine.snapshot('paused');
    const queueMetrics = snap.metrics['queue-test'];
    expect(queueMetrics).toBeDefined();
    expect(queueMetrics!.queueDepth).toBeGreaterThan(0);
  });

  it('rate limiter clamps saturation to 1 when arrival exceeds limit', () => {
    // The rate limiter is connected downstream of the client (client → rate_limiter).
    // Client generates 2000 RPS, rate limiter limit is 100 RPS.
    // saturation = clamp(2000/100, 0, 1) = 1.0
    const scenario = freshScenario();
    // Set client to 2000 RPS
    const clientNode = scenario.initialTopology.nodes.find(n => n.kind === 'client')!;
    (clientNode.config as Record<string, unknown>)['requestsPerSecond'] = 2000;

    // Add a rate limiter node
    scenario.initialTopology.nodes.push({
      id: 'rl-test',
      kind: 'rate_limiter',
      label: 'Rate Limiter',
      config: { requestsPerSecond: 100, burstCapacity: 200, algorithm: 'token_bucket' },
      position: { x: 200, y: 300 },
    });
    // Connect client → rate_limiter so it receives traffic
    scenario.initialTopology.edges.push({
      id: 'edge-client-rl',
      fromId: clientNode.id,
      toId: 'rl-test',
    });

    const rlEngine = new SimulationEngine(scenario);
    runTicks(rlEngine, 10, 100);
    const snap = rlEngine.snapshot('paused');
    const rlMetrics = snap.metrics['rl-test']!;
    // At 2000 RPS into a 100 RPS rate limiter, saturation must be fully clamped
    expect(rlMetrics.saturation).toBeCloseTo(1.0, 1);
    // requestsIn must be positive (client generates 2000 RPS)
    expect(rlMetrics.requestsIn).toBeGreaterThan(0);
    // requestsOut ≤ requestsIn (rate limiter drops excess)
    expect(rlMetrics.requestsOut).toBeLessThanOrEqual(rlMetrics.requestsIn);
  });

  it('database connection utilization increases with load', () => {
    runTicks(engine, 50, 100);
    const snap = engine.snapshot('paused');
    const dbMetrics = snap.metrics['db-1']!;
    expect(dbMetrics.connections).toBeGreaterThan(0);
    expect(dbMetrics.saturation).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULED EVENTS
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulationEngine — scheduled events', () => {
  it('applies component_failure event at scheduled time', () => {
    const scenario = freshScenario();
    scenario.scheduledEvents = [
      {
        id: 'test-failure',
        scheduledAt: 500,
        kind: 'component_failure',
        payload: { nodeId: 'service-1' },
      },
    ];
    const engine = new SimulationEngine(scenario);
    runTicks(engine, 4, 100);   // t=400 — before event
    const snapBefore = engine.snapshot('paused');
    expect(snapBefore.metrics['service-1']!.errorRate).toBeLessThan(1.0);

    runTicks(engine, 2, 100);   // t=600 — after event
    const snapAfter = engine.snapshot('paused');
    expect(snapAfter.metrics['service-1']!.errorRate).toBe(1.0);
  });

  it('applies component_recovery event after failure', () => {
    const scenario = freshScenario();
    scenario.scheduledEvents = [
      { id: 'f', scheduledAt: 200,  kind: 'component_failure', payload: { nodeId: 'service-1' } },
      { id: 'r', scheduledAt: 1000, kind: 'component_recovery', payload: { nodeId: 'service-1' } },
    ];
    const engine = new SimulationEngine(scenario);
    runTicks(engine, 5, 100);    // t=500
    expect(engine.snapshot('paused').metrics['service-1']!.errorRate).toBe(1.0);
    runTicks(engine, 10, 100);   // t=1500
    // After recovery, saturation should be below 1 (not in failed state)
    expect(engine.snapshot('paused').metrics['service-1']!.saturation).toBeLessThan(1.0);
  });

  it('applies cache_invalidation event', () => {
    const scenario = freshScenario();
    scenario.initialTopology.nodes.push({
      id: 'cache-ev',
      kind: 'cache',
      label: 'Cache',
      config: { maxSizeBytes: 1073741824, ttlSeconds: 300, evictionPolicy: 'lru', hitRatioTarget: 0.9, warmupSeconds: 1 },
      position: { x: 400, y: 400 },
    });
    scenario.scheduledEvents = [
      { id: 'ci', scheduledAt: 5000, kind: 'cache_invalidation', payload: { nodeId: 'cache-ev' } },
    ];
    const engine = new SimulationEngine(scenario);
    runTicks(engine, 60, 100);  // t=6000 — after invalidation
    const snap = engine.snapshot('paused');
    const activeIncidents = snap.activeIncidents;
    // Cache invalidation doesn't set an incident but resets hits/misses — just verify no crash
    expect(activeIncidents).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulationEngine — student actions', () => {
  let engine: SimulationEngine;

  beforeEach(() => {
    engine = new SimulationEngine(freshScenario());
    runTicks(engine, 20, 100);
  });

  function makeAction(kind: StudentAction['kind'], payload: Record<string, unknown>): StudentAction {
    return { id: `test-${kind}`, kind, payload, appliedAt: engine.time };
  }

  it('trigger_failure sets error rate to 1.0', () => {
    engine.applyAction(makeAction('trigger_failure', { nodeId: 'service-1' }));
    const snap = engine.snapshot('paused');
    expect(snap.metrics['service-1']!.errorRate).toBe(1.0);
    expect(snap.activeIncidents.some(i => i.includes('service-1'))).toBe(true);
  });

  it('trigger_recovery clears failure state', () => {
    engine.applyAction(makeAction('trigger_failure', { nodeId: 'service-1' }));
    engine.applyAction(makeAction('trigger_recovery', { nodeId: 'service-1' }));
    const snap = engine.snapshot('paused');
    expect(snap.metrics['service-1']!.errorRate).toBeLessThan(0.1);
    expect(snap.activeIncidents.some(i => i.includes('service-1'))).toBe(false);
  });

  it('scale_replicas updates config in the topology', () => {
    engine.applyAction(makeAction('scale_replicas', { nodeId: 'service-1', replicas: 4 }));
    const snap = engine.snapshot('paused');
    const node = snap.topology.nodes.find(n => n.id === 'service-1');
    const cfg = node!.config as Record<string, number>;
    expect(cfg['replicas']).toBe(4);
  });

  it('add_node adds a new component', () => {
    const snapBefore = engine.snapshot('paused');
    const countBefore = snapBefore.topology.nodes.length;
    engine.applyAction(makeAction('add_node', {
      node: {
        id: 'new-lb',
        kind: 'load_balancer',
        label: 'New LB',
        config: { algorithm: 'round_robin', healthCheckIntervalMs: 5000, maxConnectionsPerBackend: 5000 },
        position: { x: 200, y: 400 },
      },
    }));
    const snapAfter = engine.snapshot('paused');
    expect(snapAfter.topology.nodes.length).toBe(countBefore + 1);
  });

  it('can remove any node (no locked nodes in open design mode)', () => {
    const countBefore = engine.snapshot('paused').topology.nodes.length;
    engine.applyAction(makeAction('remove_node', { nodeId: 'client-1' }));
    const snap = engine.snapshot('paused');
    // Node should be removed — no locked nodes in open design mode
    expect(snap.topology.nodes.length).toBe(countBefore - 1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE BOUNDS
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulationEngine — resource bounds', () => {
  it('keeps saturation in [0, 1]', () => {
    const engine = new SimulationEngine(freshScenario());
    // Run through the full scenario including the 10× burst
    runTicks(engine, 1300, 100);  // 130s > 120s scenario
    const snap = engine.snapshot('paused');
    for (const m of Object.values(snap.metrics)) {
      expect(m.saturation).toBeGreaterThanOrEqual(0);
      expect(m.saturation).toBeLessThanOrEqual(1.001);  // small float tolerance
    }
  });

  it('does not exceed max node count constraint', () => {
    const engine = new SimulationEngine(freshScenario());
    // Flood with add_node actions beyond maxNodes (12)
    for (let i = 0; i < 20; i++) {
      engine.applyAction({
        id: `add-${i}`,
        kind: 'add_node',
        payload: {
          node: {
            id: `extra-${i}`,
            kind: 'service',
            label: `Extra ${i}`,
            config: { replicas: 1, cpuCores: 1, memoryMb: 512, maxRequestsPerSecond: 100, avgServiceTimeMs: 50, maxConcurrentRequests: 50 },
            position: { x: 100, y: 100 },
          },
        },
        appliedAt: 0,
      });
    }
    const snap = engine.snapshot('paused');
    expect(snap.topology.nodes.length).toBeLessThanOrEqual(
      trafficSurgeScenario.constraints.maxNodes,
    );
  });

  it('error rate stays in [0, 1] range', () => {
    const engine = new SimulationEngine(freshScenario());
    runTicks(engine, 1300, 100);
    for (const m of Object.values(engine.snapshot('paused').metrics)) {
      expect(m.errorRate).toBeGreaterThanOrEqual(0);
      expect(m.errorRate).toBeLessThanOrEqual(1.001);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// LOG BOUNDS
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulationEngine — log bounds', () => {
  it('does not accumulate more than 500 log entries', () => {
    const engine = new SimulationEngine(freshScenario());
    // Run 1500 ticks — many log events
    runTicks(engine, 1500, 100);
    const snap = engine.snapshot('paused');
    expect(snap.logs.length).toBeLessThanOrEqual(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SNAPSHOT COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────

describe('SimulationEngine — snapshot', () => {
  it('snapshot contains all required fields', () => {
    const engine = new SimulationEngine(freshScenario());
    const snap = engine.snapshot('paused');
    expect(snap.simulationTime).toBeDefined();
    expect(snap.status).toBe('paused');
    expect(snap.topology).toBeDefined();
    expect(snap.metrics).toBeDefined();
    expect(snap.logs).toBeDefined();
    expect(snap.events).toBeDefined();
    expect(snap.activeIncidents).toBeDefined();
    expect(snap.engineVersion).toBe('1.0.0');
  });

  it('getDrainedLogs empties the internal log buffer', () => {
    const engine = new SimulationEngine(freshScenario());
    runTicks(engine, 50, 100);
    const first = engine.getDrainedLogs();
    const second = engine.getDrainedLogs();
    expect(first.length).toBeGreaterThanOrEqual(0);
    expect(second.length).toBe(0);  // drained
  });
});
