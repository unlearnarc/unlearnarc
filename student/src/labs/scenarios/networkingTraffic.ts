/**
 * Lab Scenario: "Networking & Traffic Routing"
 *
 * Show what happens between a user's device and an application.
 * - DNS, routing, TCP connections and TLS concepts
 * - Load-balancing algorithms and health checks
 * - Latency, packet loss, bandwidth and connection limits
 * - Regional outages and routing changes
 *
 * Interview use: "Why is the service slow even though application CPU is low?"
 *
 * Engine version: 1.0.0
 * Schema version: 1
 */

import type { LabScenario } from '../engine/types';

export const networkingTrafficScenario: LabScenario = {
  engineVersion: '1.0.0',
  schemaVersion: 1,

  id:      'networking-traffic-v1',
  slug:    'networking-traffic',
  version: 1,
  domain:  'networking',

  title: 'Networking & Traffic Routing',
  description:
    'Trace a request from a user\'s browser through DNS, CDN edge, load balancer and ' +
    'into your application. Find why the service is slow even though app CPU is low.',

  objectives: [
    'Understand the full request path: DNS → CDN → LB → App → DB',
    'See how CDN edge latency differs from origin latency',
    'Observe load-balancer health checks failing and traffic rerouting',
    'Experience connection pool limits on the LB (not just the app)',
    'Trigger a regional outage and watch DNS failover take effect',
    'Understand TLS handshake cost and connection keep-alive',
    'Learn why high latency does not always mean high CPU (networking bottlenecks)',
  ],

  seed: 42,

  initialTopology: {
    schemaVersion: 1,
    nodes: [
      {
        id: 'nt-client',
        kind: 'client',
        label: 'Global Users',
        config: { requestsPerSecond: 300, burstFactor: 4, readRatio: 0.85 },
        position: { x: 60, y: 260 },
      },
      {
        id: 'nt-cdn',
        kind: 'cdn',
        label: 'CDN / Edge PoP',
        config: {
          cacheHitRatio: 0.60,
          edgePops: 12,
          avgEdgeLatencyMs: 8,
        },
        position: { x: 280, y: 160 },
      },
      {
        id: 'nt-lb',
        kind: 'load_balancer',
        label: 'Regional LB',
        config: {
          algorithm: 'round_robin',
          healthCheckIntervalMs: 5000,
          maxConnectionsPerBackend: 500,
        },
        position: { x: 500, y: 260 },
      },
      {
        id: 'nt-svc-a',
        kind: 'service',
        label: 'App Server A',
        config: {
          replicas: 1, cpuCores: 2, memoryMb: 2048,
          maxRequestsPerSecond: 200, avgServiceTimeMs: 60,
          maxConcurrentRequests: 100,
        },
        position: { x: 720, y: 160 },
      },
      {
        id: 'nt-svc-b',
        kind: 'service',
        label: 'App Server B',
        config: {
          replicas: 1, cpuCores: 2, memoryMb: 2048,
          maxRequestsPerSecond: 200, avgServiceTimeMs: 60,
          maxConcurrentRequests: 100,
        },
        position: { x: 720, y: 360 },
      },
      {
        id: 'nt-db',
        kind: 'database',
        label: 'Backend DB',
        config: {
          engine: 'postgres',
          maxConnections: 100,
          avgQueryTimeMs: 18,
          replicationEnabled: false,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 950, y: 260 },
      },
    ],
    edges: [
      { id: 'e-nt-c-cdn',   fromId: 'nt-client', toId: 'nt-cdn',   label: 'HTTPS/TLS' },
      { id: 'e-nt-cdn-lb',  fromId: 'nt-cdn',    toId: 'nt-lb',    label: 'origin'    },
      { id: 'e-nt-lb-a',    fromId: 'nt-lb',     toId: 'nt-svc-a', label: 'HTTP'      },
      { id: 'e-nt-lb-b',    fromId: 'nt-lb',     toId: 'nt-svc-b', label: 'HTTP'      },
      { id: 'e-nt-a-db',    fromId: 'nt-svc-a',  toId: 'nt-db',    label: 'SQL'       },
      { id: 'e-nt-b-db',    fromId: 'nt-svc-b',  toId: 'nt-db',    label: 'SQL'       },
    ],
  },

  workload: {
    baseRequestsPerSecond: 300,
    burstMultiplier: 4,
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
    maxEdges: 32,
    allowedKinds: [
      'client', 'cdn', 'dns', 'load_balancer', 'api_gateway',
      'service', 'worker',
      'database', 'read_replica', 'cache',
      'rate_limiter', 'circuit_breaker', 'monitoring',
      'object_storage',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'Networking & Traffic Routing — Key Takeaways',
    markdown: `
## Why is it slow if app CPU is low?

The bottleneck isn't always the app. Common networking causes:

| Symptom | Likely cause |
|---------|-------------|
| High latency, low CPU | Network hop latency, TLS handshake, DNS lookup |
| Requests timing out | LB connection pool exhausted |
| Some users fast, some slow | CDN edge hit vs origin miss |
| One backend overloaded, others idle | LB health-check delay or wrong algorithm |

## The full request path cost

Browser → DNS lookup (10–200ms first time, cached ~0ms)
→ TCP connect (1 RTT ≈ 10–150ms based on distance)
→ TLS handshake (1–2 RTT ≈ 20–300ms, or 0ms with session resumption)
→ HTTP request (1 RTT + server processing)
→ Response transfer

**TLS + TCP + DNS on a cold connection: 100–500ms before the server processes anything.**
Use keep-alive connections and CDN to eliminate repeated TLS handshakes.

## Load balancer algorithms

| Algorithm | When to use |
|-----------|------------|
| Round Robin | Stateless services, equal capacity backends |
| Least Connections | Long-lived connections (WebSockets, streaming) |
| IP Hash | Sticky sessions (stateful apps without session store) |
| Random | Simple, low overhead, works well with many backends |

## CDN edge vs origin

CDN edge hit: ~8ms (user to nearest PoP)
CDN origin miss: 8ms + 60ms origin RTT + backend processing = 80–200ms

60% hit ratio means 40% of requests still hit origin.
For static assets: target >95% hit ratio.
For personalised API responses: CDN may not help (Vary: Cookie header).

## Regional outage and DNS failover

When a region goes down:
1. Health checks fail → LB removes backends
2. DNS TTL expires (30s–300s) → clients get new IP
3. New region receives traffic

DNS TTL is your RTO floor for regional failover.
Use short TTL (60s) for services that need fast failover.
Use long TTL (3600s) for stable, rarely-changed records.
    `.trim(),
  },
};
