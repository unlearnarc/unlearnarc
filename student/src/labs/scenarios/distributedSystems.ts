/**
 * Lab Scenario: "Distributed Systems & Consistency"
 *
 * The lab for subtle failures that architecture diagrams often hide.
 * - Replication and consistency models
 * - Network partitions and split-brain scenarios
 * - Race conditions, duplicate requests and idempotency
 * - Distributed locks, leases and conflicting writes
 *
 * Engine version: 1.0.0
 * Schema version: 1
 */

import type { LabScenario } from '../engine/types';

export const distributedSystemsScenario: LabScenario = {
  engineVersion: '1.0.0',
  schemaVersion: 1,

  id:      'distributed-systems-v1',
  slug:    'distributed-systems',
  version: 1,
  domain:  'distributed_systems',

  title: 'Distributed Systems & Consistency',
  description:
    'Design a multi-replica booking system. Experience network partitions, split-brain, ' +
    'stale reads, and race conditions — then apply circuit breakers and consistency fixes.',

  objectives: [
    'Understand strong vs eventual consistency trade-offs (CAP theorem)',
    'Observe replication lag creating stale reads on replicas',
    'Trigger a network partition and watch split-brain behaviour',
    'Apply circuit breaker to stop cascade failures',
    'Model a distributed lock for critical sections (seat reservation)',
    'Understand why idempotency keys are required for retries',
    'See the difference between CP and AP system choices under partition',
  ],

  seed: 37,

  initialTopology: {
    schemaVersion: 1,
    nodes: [
      {
        id: 'ds2-client',
        kind: 'client',
        label: 'Global Users',
        config: { requestsPerSecond: 350, burstFactor: 6, readRatio: 0.7 },
        position: { x: 60, y: 240 },
      },
      {
        id: 'ds2-lb',
        kind: 'load_balancer',
        label: 'Global LB',
        config: {
          algorithm: 'round_robin',
          healthCheckIntervalMs: 3000,
          maxConnectionsPerBackend: 2000,
        },
        position: { x: 280, y: 240 },
      },
      {
        id: 'ds2-svc-a',
        kind: 'service',
        label: 'Service — Zone A',
        config: {
          replicas: 2, cpuCores: 4, memoryMb: 2048,
          maxRequestsPerSecond: 300, avgServiceTimeMs: 50, maxConcurrentRequests: 200,
        },
        position: { x: 500, y: 140 },
      },
      {
        id: 'ds2-svc-b',
        kind: 'service',
        label: 'Service — Zone B',
        config: {
          replicas: 2, cpuCores: 4, memoryMb: 2048,
          maxRequestsPerSecond: 300, avgServiceTimeMs: 50, maxConcurrentRequests: 200,
        },
        position: { x: 500, y: 340 },
      },
      {
        id: 'ds2-primary',
        kind: 'database',
        label: 'Primary DB (Zone A)',
        config: {
          engine: 'postgres',
          maxConnections: 100,
          avgQueryTimeMs: 12,
          replicationEnabled: true,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 750, y: 140 },
      },
      {
        id: 'ds2-replica',
        kind: 'read_replica',
        label: 'Replica (Zone B)',
        config: {
          replicationLagMs: 50,
          maxConnections: 100,
          avgQueryTimeMs: 10,
          stalereadsAllowed: true,
        },
        position: { x: 750, y: 340 },
      },
      {
        id: 'ds2-cb',
        kind: 'circuit_breaker',
        label: 'Circuit Breaker',
        config: {
          errorThresholdPercent: 50,
          openDurationMs: 15000,
          halfOpenMaxRequests: 5,
        },
        position: { x: 500, y: 480 },
      },
    ],
    edges: [
      { id: 'e-ds2-c-lb',    fromId: 'ds2-client',  toId: 'ds2-lb',      label: 'HTTPS'    },
      { id: 'e-ds2-lb-a',    fromId: 'ds2-lb',       toId: 'ds2-svc-a',   label: 'Zone A'   },
      { id: 'e-ds2-lb-b',    fromId: 'ds2-lb',       toId: 'ds2-svc-b',   label: 'Zone B'   },
      { id: 'e-ds2-a-prim',  fromId: 'ds2-svc-a',    toId: 'ds2-primary', label: 'write'    },
      { id: 'e-ds2-prim-rep',fromId: 'ds2-primary',  toId: 'ds2-replica', label: 'replicate'},
      { id: 'e-ds2-b-rep',   fromId: 'ds2-svc-b',    toId: 'ds2-replica', label: 'read'     },
      { id: 'e-ds2-cb-prim', fromId: 'ds2-cb',       toId: 'ds2-primary', label: 'guard'    },
    ],
  },

  workload: {
    baseRequestsPerSecond: 350,
    burstMultiplier: 6,
    burstAtMs: 9_999_999,
    burstDurationMs: 0,
    readRatio: 0.7,
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
      'client', 'cdn', 'dns', 'load_balancer', 'api_gateway',
      'service', 'worker',
      'database', 'read_replica',
      'cache', 'queue', 'event_stream',
      'rate_limiter', 'circuit_breaker', 'monitoring',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'Distributed Systems & Consistency — Key Takeaways',
    markdown: `
## CAP Theorem in practice

Under a network partition, choose:
- **CP** (Consistency + Partition tolerance): reject writes during partition. No stale reads. Used by banking, seat reservation.
- **AP** (Availability + Partition tolerance): serve stale reads during partition. Used by social feeds, product listings.

There is no CA — a distributed system will always face partitions.

## Replication lag

Replication lag = time between primary write and replica visibility.
Zone B service reading from its replica during lag = **stale reads**.
User in Zone B may see seat as available even after Zone A just booked it.

**Fix**: route writes AND strong reads to primary. Route only eventually-consistent reads to replicas.

## Network partition → Split-brain

Zone A and Zone B lose network connection.
Both think they're the primary. Both accept writes.
When partition heals: conflicting writes → data corruption.

**Fix**: Use a leader election protocol (Raft, Paxos).
Only the partition with quorum (majority of nodes) accepts writes.
Minority partition rejects writes or becomes read-only.

## Circuit breaker

Without CB: Service B → Replica (timeout 30s) → user waits 30s → error.
With CB: after 50% error rate, CB opens. Requests fail-fast (< 1ms).
After 15s, CB half-opens: 5 probe requests. If successful, closes.

**Circuit breaker protects your entire cluster** from a slow downstream dependency.

## Idempotency keys

Network retry: user's browser sends booking request again after timeout.
Without idempotency: 2 bookings created for 1 seat (double charge).
With idempotency key: second request with same key → same response, no duplicate.

Format: booking_{userId}_{timestamp}_{random}.
Store idempotency keys in DB with TTL of 24h.
    `.trim(),
  },
};
