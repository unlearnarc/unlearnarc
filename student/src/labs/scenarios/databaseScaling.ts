/**
 * Lab Scenario: "Database Scaling"
 *
 * Teaches what happens when one database stops being enough.
 * - Read replicas and primary-replica replication
 * - Horizontal sharding and partition-key selection
 * - Hot partitions, uneven data distribution, connection exhaustion
 * - Replication lag, failover and stale reads
 *
 * Engine version: 1.0.0
 * Schema version: 1
 */

import type { LabScenario } from '../engine/types';

export const databaseScalingScenario: LabScenario = {
  engineVersion: '1.0.0',
  schemaVersion: 1,

  id:      'database-scaling-v1',
  slug:    'database-scaling',
  version: 1,
  domain:  'databases',

  title: 'Database Scaling Lab',
  description:
    'Start with a single overloaded database. Add read replicas, explore sharding, ' +
    'observe replication lag, and experience what happens during a primary failover.',

  objectives: [
    'See how read replicas offload the primary DB by ~readRatio × hitRate',
    'Understand that replicas do NOT increase write throughput',
    'Observe replication lag and its effect on read consistency',
    'Trigger a primary crash and promote a replica — measure the recovery time',
    'Learn when to shard: when write throughput saturates the primary',
    'Experience connection exhaustion — the #1 DB scaling failure mode',
  ],

  seed: 13,

  initialTopology: {
    schemaVersion: 1,
    nodes: [
      {
        id: 'ds-client',
        kind: 'client',
        label: 'App Traffic',
        config: { requestsPerSecond: 400, burstFactor: 3, readRatio: 0.85 },
        position: { x: 60, y: 240 },
      },
      {
        id: 'ds-service',
        kind: 'service',
        label: 'API Service',
        config: {
          replicas: 2, cpuCores: 4, memoryMb: 4096,
          maxRequestsPerSecond: 500, avgServiceTimeMs: 40, maxConcurrentRequests: 300,
        },
        position: { x: 290, y: 240 },
      },
      {
        id: 'ds-primary',
        kind: 'database',
        label: 'Primary DB',
        config: {
          engine: 'postgres',
          maxConnections: 100,
          avgQueryTimeMs: 15,
          replicationEnabled: true,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 560, y: 240 },
      },
    ],
    edges: [
      { id: 'e-ds-c-s',  fromId: 'ds-client',  toId: 'ds-service', label: 'HTTPS' },
      { id: 'e-ds-s-db', fromId: 'ds-service',  toId: 'ds-primary', label: 'SQL'   },
    ],
  },

  workload: {
    baseRequestsPerSecond: 400,
    burstMultiplier: 3,
    burstAtMs: 9_999_999,
    burstDurationMs: 0,
    readRatio: 0.85,
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
      'database', 'read_replica', 'cache',
      'queue', 'worker', 'rate_limiter', 'circuit_breaker', 'monitoring',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'Database Scaling — Key Takeaways',
    markdown: `
## Read vs Write scaling

**Read replicas**: offload reads (85% of your workload here).
The primary sees only writes. Saturation drops dramatically.

**Adding replicas doesn't help with writes.**
If write throughput is the bottleneck, you need sharding.

## Replication lag

Replication lag = time between a write landing on primary and appearing on replicas.
At low load: 10–50ms. Under heavy write load: 200ms–2s.

A user who just booked a seat might see it as still available on a replica for lag duration.
**Use the primary for reads that must be consistent** (seat reservation, payment).

## Connection exhaustion

The most common DB failure mode. Each connection uses ~4MB RAM.
100 connections = 400MB just for the pool.

Fixes: 
- PgBouncer / ProxySQL connection pooling (multiplexes thousands of app connections onto ~100 DB connections)
- Cache layer (80–90% fewer DB connections needed)
- Read replicas (distribute read connections)

## Failover

Promoting a replica to primary takes 10–60 seconds in real systems.
Data written between last sync and promotion is lost (RPO gap).
Automated failover requires: health-check agents, VIP or DNS failover, replica sync monitoring.
    `.trim(),
  },
};
