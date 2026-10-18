/**
 * Lab Scenario: "Caching & CDN Lab"
 *
 * Lets students see how caching changes load and correctness.
 * - Cache hit ratio, TTL and eviction
 * - Cache stampedes and hot keys
 * - Invalidation and stale data
 * - CDN edge caching versus origin requests
 *
 * Engine version: 1.0.0
 * Schema version: 1
 */

import type { LabScenario } from '../engine/types';

export const cachingCdnScenario: LabScenario = {
  engineVersion: '1.0.0',
  schemaVersion: 1,

  id:      'caching-cdn-v1',
  slug:    'caching-cdn',
  version: 1,
  domain:  'system_design',

  title: 'Caching & CDN Lab',
  description:
    'Watch a cold cache send 100% of requests to your DB. Warm it up, then flush it ' +
    'and observe the stampede. Add a CDN for static assets and measure origin offload.',

  objectives: [
    'Understand cache hit ratio and its multiplicative effect on DB load',
    'Experience a cache flush (cold start) and the resulting DB spike',
    'Observe cache stampede: popular key expires for 50k simultaneous users',
    'See how TTL length trades off freshness vs origin load',
    'Model CDN edge caching: only misses hit the origin',
    'Understand cache invalidation as a distributed consistency problem',
  ],

  seed: 99,

  initialTopology: {
    schemaVersion: 1,
    nodes: [
      {
        id: 'cc-client',
        kind: 'client',
        label: 'Users',
        config: { requestsPerSecond: 500, burstFactor: 8, readRatio: 0.9 },
        position: { x: 60, y: 200 },
      },
      {
        id: 'cc-cdn',
        kind: 'cdn',
        label: 'CDN Edge',
        config: { cacheHitRatio: 0.70, edgePops: 10, avgEdgeLatencyMs: 15 },
        position: { x: 260, y: 100 },
      },
      {
        id: 'cc-service',
        kind: 'service',
        label: 'Web Service',
        config: {
          replicas: 2, cpuCores: 4, memoryMb: 2048,
          maxRequestsPerSecond: 400, avgServiceTimeMs: 30, maxConcurrentRequests: 200,
        },
        position: { x: 490, y: 200 },
      },
      {
        id: 'cc-cache',
        kind: 'cache',
        label: 'Redis Cache',
        config: {
          maxSizeBytes: 8 * 1024 * 1024 * 1024, // 8GB
          ttlSeconds: 300,
          evictionPolicy: 'lru',
          hitRatioTarget: 0.85,
          warmupSeconds: 20,
        },
        position: { x: 720, y: 100 },
      },
      {
        id: 'cc-db',
        kind: 'database',
        label: 'Content DB',
        config: {
          engine: 'mysql',
          maxConnections: 150,
          avgQueryTimeMs: 20,
          replicationEnabled: true,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 950, y: 200 },
      },
    ],
    edges: [
      { id: 'e-cc-cl-cdn',  fromId: 'cc-client',  toId: 'cc-cdn',     label: 'HTTPS' },
      { id: 'e-cc-cdn-svc', fromId: 'cc-cdn',      toId: 'cc-service', label: 'origin' },
      { id: 'e-cc-svc-cch', fromId: 'cc-service',  toId: 'cc-cache',   label: 'get/set' },
      { id: 'e-cc-cch-db',  fromId: 'cc-cache',    toId: 'cc-db',      label: 'SQL miss' },
    ],
  },

  workload: {
    baseRequestsPerSecond: 500,
    burstMultiplier: 8,
    burstAtMs: 9_999_999,
    burstDurationMs: 0,
    readRatio: 0.9,
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
      'client', 'cdn', 'load_balancer', 'service', 'api_gateway',
      'cache', 'database', 'read_replica',
      'rate_limiter', 'monitoring', 'object_storage',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'Caching & CDN — Key Takeaways',
    markdown: `
## Hit ratio math

85% hit ratio → DB receives only 15% of read traffic.
At 500 RPS with 90% reads, DB sees 500 × 0.90 × 0.15 = **67 RPS** (down from 450).

Going from 80% to 90% hit ratio is NOT the same as 80→90%:
- 80% hit → 20% miss → 90 RPS on DB
- 90% hit → 10% miss → 45 RPS on DB  ← 50% less DB load for 10% more hit rate

## Cache stampede

A popular key expires → all concurrent requests miss → all hit DB simultaneously.
Solutions:
1. **TTL jitter** — expiry time = TTL ± random(0, 20%). Keys expire at different times.
2. **Probabilistic early reuse** — refresh before expiry when P(expiry soon) > threshold.
3. **Cache lock** — one request fetches, others wait on a short lock.

## CDN vs App cache

| Layer | What it caches | Invalidation |
|-------|---------------|-------------|
| CDN edge | Static assets, public API responses | Purge API or cache-key change |
| App Redis | Per-user data, DB query results | Event-driven, TTL, explicit delete |

CDN can't cache user-specific responses unless you design shared cache keys carefully.

## Stale data

Cache TTL = max staleness you tolerate.
Seat availability: TTL 1–5s (near real-time).
Train schedules: TTL 3600s (updated once daily).
Choose TTL based on **business cost of stale data**, not system convenience.
    `.trim(),
  },
};
