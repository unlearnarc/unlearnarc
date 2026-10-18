/**
 * Lab Scenario: "Load Testing & Capacity Planning"
 *
 * Students apply traffic patterns to find the first bottleneck.
 * - Ramp-up, sudden spikes and sustained traffic
 * - Requests per second, concurrency, p95/p99 latency
 * - Server capacity, connection pools and saturation
 * - Capacity estimates and cost-versus-performance trade-offs
 *
 * Engine version: 1.0.0
 * Schema version: 1
 */

import type { LabScenario } from '../engine/types';

export const loadTestingScenario: LabScenario = {
  engineVersion: '1.0.0',
  schemaVersion: 1,

  id:      'load-testing-v1',
  slug:    'load-testing',
  version: 1,
  domain:  'performance',

  title: 'Load Testing & Capacity Planning',
  description:
    'Ramp traffic from 50 to 5 000 RPS and find exactly where your system buckles. ' +
    'Learn p95/p99 latency, connection pool limits, saturation and cost trade-offs.',

  objectives: [
    'Understand how saturation drives latency exponentially (M/D/1 queue effect)',
    'Find the first bottleneck: is it CPU, DB connections, or network?',
    'Experience the difference between a ramp-up and a sudden spike',
    'Calculate the minimum replicas needed to hit a target RPS with < 100ms p99',
    'Compare infrastructure cost at different capacity configurations',
  ],

  seed: 7,

  initialTopology: {
    schemaVersion: 1,
    nodes: [
      {
        id: 'lt-client',
        kind: 'client',
        label: 'Load Generator',
        config: { requestsPerSecond: 50, burstFactor: 5, readRatio: 0.8 },
        position: { x: 60, y: 220 },
      },
      {
        id: 'lt-lb',
        kind: 'load_balancer',
        label: 'Load Balancer',
        config: {
          algorithm: 'round_robin',
          healthCheckIntervalMs: 5000,
          maxConnectionsPerBackend: 1000,
        },
        position: { x: 290, y: 220 },
      },
      {
        id: 'lt-app',
        kind: 'service',
        label: 'App Server',
        config: {
          replicas: 1,
          cpuCores: 2,
          memoryMb: 2048,
          maxRequestsPerSecond: 200,
          avgServiceTimeMs: 80,
          maxConcurrentRequests: 100,
        },
        position: { x: 520, y: 220 },
      },
      {
        id: 'lt-db',
        kind: 'database',
        label: 'Primary DB',
        config: {
          engine: 'postgres',
          maxConnections: 50,
          avgQueryTimeMs: 25,
          replicationEnabled: false,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 750, y: 220 },
      },
    ],
    edges: [
      { id: 'e-lt-c-lb',  fromId: 'lt-client', toId: 'lt-lb',  label: 'HTTP' },
      { id: 'e-lt-lb-app', fromId: 'lt-lb',    toId: 'lt-app', label: 'HTTP' },
      { id: 'e-lt-app-db', fromId: 'lt-app',   toId: 'lt-db',  label: 'SQL'  },
    ],
  },

  workload: {
    baseRequestsPerSecond: 50,
    burstMultiplier: 5,
    burstAtMs: 9_999_999,
    burstDurationMs: 0,
    readRatio: 0.8,
    totalDurationMs: Number.MAX_SAFE_INTEGER,
  },

  scheduledEvents: [],

  availableActions: [
    'add_node', 'remove_node', 'add_edge', 'remove_edge',
    'configure_node', 'scale_replicas',
    'trigger_failure', 'trigger_recovery',
  ],

  constraints: {
    maxNodes: 16,
    maxEdges: 30,
    allowedKinds: [
      'client', 'load_balancer', 'api_gateway', 'service', 'worker',
      'database', 'read_replica', 'cache', 'rate_limiter',
      'circuit_breaker', 'monitoring', 'cdn',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'Load Testing — Key Takeaways',
    markdown: `
## The saturation-latency curve

At 70% utilisation latency is ~2× baseline.
At 90% it's ~5×. At 95% it's >30×.
This is the M/D/1 queue: **never run production above 70% steady-state**.

## First bottleneck patterns

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| App saturation → 100%, DB fine | CPU bound service | Scale replicas |
| DB connections → 100%, App fine | Pool exhaustion | Cache + replica |
| LB saturation → high | Underpowered LB | Increase maxConns |

## Cost vs performance

2 replicas at 200 RPS = 400 RPS total.
4 replicas + cache = 4× throughput at 3× cost (cache absorbs 80% reads).
Rate limiter protects the cluster from burst — cheapest insurance.
    `.trim(),
  },
};
