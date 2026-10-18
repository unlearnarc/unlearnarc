/**
 * Lab Scenario: "Queues & Event-Driven Systems"
 *
 * Teaches asynchronous processing and backpressure.
 * - Producers, consumers, partitions and consumer groups
 * - Queue depth, consumer lag and throughput
 * - Retries, duplicate delivery and dead-letter queues
 * - Ordering, idempotency and replay
 *
 * Engine version: 1.0.0
 * Schema version: 1
 */

import type { LabScenario } from '../engine/types';

export const queuesStreamsScenario: LabScenario = {
  engineVersion: '1.0.0',
  schemaVersion: 1,

  id:      'queues-streams-v1',
  slug:    'queues-streams',
  version: 1,
  domain:  'messaging',

  title: 'Queues & Event-Driven Systems',
  description:
    'Build an event-driven booking confirmation pipeline. See what happens when producers ' +
    'outrun consumers, queues fill up, and retries cause duplicate deliveries.',

  objectives: [
    'Understand producer/consumer decoupling and the role of queues',
    'Observe consumer lag growing when production > consumption rate',
    'Drain a full queue by scaling consumers (add workers)',
    'See how more partitions enable more parallel consumers',
    'Trigger a consumer crash and watch messages requeue',
    'Understand dead-letter queues for failed message handling',
    'Learn idempotency: why retries + at-least-once delivery require dedup keys',
  ],

  seed: 55,

  initialTopology: {
    schemaVersion: 1,
    nodes: [
      {
        id: 'qs-client',
        kind: 'client',
        label: 'Booking API',
        config: { requestsPerSecond: 300, burstFactor: 5, readRatio: 0.1 },
        position: { x: 60, y: 220 },
      },
      {
        id: 'qs-service',
        kind: 'service',
        label: 'Order Service',
        config: {
          replicas: 2, cpuCores: 2, memoryMb: 1024,
          maxRequestsPerSecond: 400, avgServiceTimeMs: 30, maxConcurrentRequests: 150,
        },
        position: { x: 280, y: 220 },
      },
      {
        id: 'qs-stream',
        kind: 'event_stream',
        label: 'Booking Events',
        config: {
          partitions: 4,
          replicationFactor: 2,
          retentionHours: 168,
          maxBytesPerPartitionMb: 1024,
          maxDepth: 500000,
        },
        position: { x: 510, y: 220 },
      },
      {
        id: 'qs-worker-1',
        kind: 'worker',
        label: 'Confirmation Worker',
        config: {
          replicas: 1, cpuCores: 1, memoryMb: 512,
          maxRequestsPerSecond: 80, avgServiceTimeMs: 200, maxConcurrentRequests: 30,
        },
        position: { x: 740, y: 150 },
      },
      {
        id: 'qs-db',
        kind: 'database',
        label: 'Orders DB',
        config: {
          engine: 'postgres',
          maxConnections: 80,
          avgQueryTimeMs: 12,
          replicationEnabled: false,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 510, y: 420 },
      },
    ],
    edges: [
      { id: 'e-qs-c-s',    fromId: 'qs-client',   toId: 'qs-service',  label: 'HTTP'    },
      { id: 'e-qs-s-db',   fromId: 'qs-service',   toId: 'qs-db',       label: 'SQL'     },
      { id: 'e-qs-s-str',  fromId: 'qs-service',   toId: 'qs-stream',   label: 'produce' },
      { id: 'e-qs-str-w1', fromId: 'qs-stream',    toId: 'qs-worker-1', label: 'consume' },
    ],
  },

  workload: {
    baseRequestsPerSecond: 300,
    burstMultiplier: 5,
    burstAtMs: 9_999_999,
    burstDurationMs: 0,
    readRatio: 0.1,
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
      'client', 'service', 'api_gateway', 'load_balancer',
      'queue', 'event_stream', 'worker',
      'database', 'read_replica', 'cache',
      'rate_limiter', 'circuit_breaker', 'monitoring',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'Queues & Event-Driven Systems — Key Takeaways',
    markdown: `
## Producer/Consumer decoupling

Without a queue: Booking API → Notification Service (synchronous)
If Notification Service is slow, every booking takes longer.
With a queue: Booking API enqueues instantly, Worker processes async.
Booking latency is now independent of notification latency.

## Consumer lag

Lag = queue depth / consumption rate.
If producers write 300 events/s and each worker handles 80/s:
- 1 worker: net accumulation = 300 - 80 = 220 events/s → fills queue
- 4 workers: 300 - 320 = draining → queue empties

**Scale workers to match producer rate + buffer for bursts.**

## Partitions and parallelism

Each Kafka partition can be consumed by ONE consumer in a group at a time.
4 partitions = max 4 parallel consumers.
Scale partitions BEFORE you need more than 4 workers.

Adding partitions mid-stream triggers **consumer rebalance** — brief pause.

## At-least-once delivery

Message delivery is guaranteed but not exactly-once.
On consumer crash: message re-delivered from last committed offset.
**Consumer must be idempotent**: processing the same booking twice should be safe.
Use unique booking IDs as dedup keys.

## Dead-letter queues (DLQ)

After N retries (typically 3), failed messages go to DLQ.
DLQ prevents poison-pill messages from blocking the queue forever.
Monitor DLQ size — it tells you about bugs in consumer logic.
    `.trim(),
  },
};
