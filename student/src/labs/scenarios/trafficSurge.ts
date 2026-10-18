/**
 * Lab Scenario: "Design IRCTC at Scale" — System Design Lab
 *
 * Students design and stress-test a train-booking system like IRCTC.
 * They start with a minimal 3-node topology and must build it up to handle:
 *   - 10× Tatkal traffic burst
 *   - DB slow queries during peak booking windows
 *   - Service crashes under load
 *   - Queue consumer lag for booking confirmations
 *
 * The FailurePanel drives the learning: students trigger failures,
 * observe real metric degradation, pick recovery strategies, and
 * re-trigger the same failure to validate their fix.
 *
 * Engine version: 1.0.0
 * Schema version: 2
 */

import type { LabScenario } from '../engine/types';

const BASE_RPS = 200;
const BURST_RPS_MULTIPLIER = 10;

export const trafficSurgeScenario: LabScenario = {
  // ── Versioning
  engineVersion: '1.0.0',
  schemaVersion: 1,

  // ── Identity
  id:      'irctc-system-design-v1',
  slug:    'irctc-system-design',
  version: 2,
  domain:  'system_design',

  title:       'Design IRCTC at Scale',
  description: 'Build a train-booking system that handles Tatkal rush, slow DB queries, service crashes, and queue consumer lag — then fix each failure using the Failure & Recovery panel.',

  objectives: [
    'Understand how a single-server architecture collapses under Tatkal-level traffic (10×)',
    'Experience DB slow queries and choose between cache, read replica, connection pool, or sharding',
    'Trigger a service crash and build resilience with replicas and load balancing',
    'Observe queue consumer lag and fix it with more workers or extra partitions',
    'Learn that no single fix is sufficient — layering is the production approach',
  ],

  seed: 42,

  // ── Initial Topology (minimal IRCTC: client → app → db)
  initialTopology: {
    schemaVersion: 2,
    nodes: [
      {
        id: 'client-1',
        kind: 'client',
        label: 'Users (IRCTC)',
        config: {
          requestsPerSecond: BASE_RPS,
          burstFactor: BURST_RPS_MULTIPLIER,
          readRatio: 0.75,
        },
        position: { x: 60, y: 200 },
      },
      {
        id: 'service-1',
        kind: 'service',
        label: 'Booking Service',
        config: {
          replicas: 1,
          cpuCores: 4,
          memoryMb: 2048,
          maxRequestsPerSecond: 300,
          avgServiceTimeMs: 60,
          maxConcurrentRequests: 250,
        },
        position: { x: 320, y: 200 },
      },
      {
        id: 'db-1',
        kind: 'database',
        label: 'Booking DB',
        config: {
          engine: 'mysql',
          maxConnections: 100,
          avgQueryTimeMs: 20,
          replicationEnabled: false,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 580, y: 200 },
      },
    ],
    edges: [
      { id: 'e-client-service', fromId: 'client-1', toId: 'service-1', label: 'HTTPS' },
      { id: 'e-service-db',     fromId: 'service-1', toId: 'db-1',     label: 'SQL'   },
    ],
  },

  // ── Workload (steady 200 RPS; Tatkal burst is manually triggered via FailurePanel)
  workload: {
    baseRequestsPerSecond: BASE_RPS,
    burstMultiplier:       1,          // no auto-burst — student triggers manually
    burstAtMs:             9_999_999,  // effectively never
    burstDurationMs:       0,
    readRatio:             0.75,
    totalDurationMs:       Number.MAX_SAFE_INTEGER, // no time limit — runs until student stops
  },

  // No pre-scheduled events — all failures triggered manually by the student
  scheduledEvents: [],

  // ── Available Actions
  availableActions: [
    'add_node',
    'remove_node',
    'add_edge',
    'remove_edge',
    'configure_node',
    'scale_replicas',
    'trigger_failure',
    'trigger_recovery',
  ],

  // ── Constraints (all components available, no locked nodes)
  constraints: {
    maxNodes:     16,
    maxEdges:     30,
    allowedKinds: [
      'client',
      'cdn',
      'dns',
      'load_balancer',
      'api_gateway',
      'service',
      'worker',
      'database',
      'read_replica',
      'cache',
      'queue',
      'event_stream',
      'rate_limiter',
      'circuit_breaker',
      'monitoring',
      'object_storage',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'IRCTC System Design — Key Takeaways',
    markdown: `
## What you built

An IRCTC-like train booking system under real distributed systems pressure.

## Core lessons

**Tatkal traffic (10× surge)**  
A single Booking Service at 300 RPS fails instantly at 2000 RPS.
Cache + LB + rate limiter together handle it. No single fix is enough.

**Slow DB queries**  
Adding a read replica offloads 75% of queries.
Cache offloads 85% of reads.  
Increasing pool size buys time but doesn't fix slow queries.

**Service crash**  
Single replica = single point of failure.
3 replicas + LB = crash affects only 33% capacity.

**Queue lag**  
Booking confirmations back up during Tatkal rush.
More workers or more partitions drain the queue faster.

## Real IRCTC lessons

IRCTC serves 1.2 million bookings per day, peaking at Tatkal windows.
They use: Redis caching, read replicas, queue-based booking confirmations,
rate limiting per user, and horizontal autoscaling.
    `.trim(),
  },
};
