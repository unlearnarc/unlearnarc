/**
 * Lab Scenario: "Observability & Incident Investigation"
 *
 * Teach students to diagnose an unfamiliar system before changing it.
 * - Logs, metrics, traces and service dependencies
 * - Alert thresholds and error budgets
 * - Root-cause investigation
 * - Incident timelines and postmortems
 *
 * Interview use: "The API latency has suddenly increased. Find the cause."
 *
 * Engine version: 1.0.0
 * Schema version: 1
 */

import type { LabScenario } from '../engine/types';

export const observabilityLabScenario: LabScenario = {
  engineVersion: '1.0.0',
  schemaVersion: 1,

  id:      'observability-v1',
  slug:    'observability',
  version: 1,
  domain:  'observability',

  title: 'Observability & Incident Investigation',
  description:
    'The API latency has suddenly increased. Use metrics, logs and traces to find the ' +
    'root cause without changing anything first. Then fix it and prevent recurrence.',

  objectives: [
    'Build a system with monitoring wired to every component',
    'Read saturation, error rate and latency metrics to locate a bottleneck',
    'Understand the difference between symptoms and root causes',
    'Use the Failures panel as your "incident trigger" — reproduce real incidents',
    'Set alert thresholds and understand error budgets (99.9% SLO = 43 min downtime/month)',
    'Construct an incident timeline: detection → diagnosis → fix → validation',
    'Write a postmortem: what failed, why, how to prevent it',
  ],

  seed: 61,

  initialTopology: {
    schemaVersion: 1,
    nodes: [
      {
        id: 'ob-client',
        kind: 'client',
        label: 'API Clients',
        config: { requestsPerSecond: 250, burstFactor: 3, readRatio: 0.75 },
        position: { x: 60, y: 260 },
      },
      {
        id: 'ob-lb',
        kind: 'load_balancer',
        label: 'API Gateway / LB',
        config: {
          algorithm: 'least_connections',
          healthCheckIntervalMs: 3000,
          maxConnectionsPerBackend: 1000,
        },
        position: { x: 280, y: 260 },
      },
      {
        id: 'ob-svc',
        kind: 'service',
        label: 'API Service',
        config: {
          replicas: 2, cpuCores: 4, memoryMb: 4096,
          maxRequestsPerSecond: 400, avgServiceTimeMs: 45,
          maxConcurrentRequests: 200,
        },
        position: { x: 500, y: 260 },
      },
      {
        id: 'ob-cache',
        kind: 'cache',
        label: 'Response Cache',
        config: {
          maxSizeBytes: 4 * 1024 * 1024 * 1024,
          ttlSeconds: 120,
          evictionPolicy: 'lru',
          hitRatioTarget: 0.80,
          warmupSeconds: 15,
        },
        position: { x: 720, y: 140 },
      },
      {
        id: 'ob-db',
        kind: 'database',
        label: 'Primary DB',
        config: {
          engine: 'postgres',
          maxConnections: 100,
          avgQueryTimeMs: 14,
          replicationEnabled: true,
          shardingEnabled: false,
          shardCount: 1,
        },
        position: { x: 720, y: 380 },
      },
      {
        id: 'ob-monitoring',
        kind: 'monitoring',
        label: 'Observability Stack',
        config: {
          samplingIntervalMs: 1000,
          alertThresholds: {
            saturation: 0.80,
            errorRate: 0.01,
            avgLatencyMs: 200,
          },
        },
        position: { x: 960, y: 260 },
      },
    ],
    edges: [
      { id: 'e-ob-c-lb',   fromId: 'ob-client', toId: 'ob-lb',         label: 'HTTPS'    },
      { id: 'e-ob-lb-svc', fromId: 'ob-lb',     toId: 'ob-svc',        label: 'HTTP'     },
      { id: 'e-ob-svc-ch', fromId: 'ob-svc',    toId: 'ob-cache',      label: 'read'     },
      { id: 'e-ob-svc-db', fromId: 'ob-svc',    toId: 'ob-db',         label: 'SQL'      },
      { id: 'e-ob-svc-m',  fromId: 'ob-svc',    toId: 'ob-monitoring', label: 'metrics'  },
      { id: 'e-ob-db-m',   fromId: 'ob-db',     toId: 'ob-monitoring', label: 'metrics'  },
      { id: 'e-ob-lb-m',   fromId: 'ob-lb',     toId: 'ob-monitoring', label: 'metrics'  },
    ],
  },

  workload: {
    baseRequestsPerSecond: 250,
    burstMultiplier: 3,
    burstAtMs: 9_999_999,
    burstDurationMs: 0,
    readRatio: 0.75,
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
      'client', 'cdn', 'load_balancer', 'api_gateway',
      'service', 'worker',
      'database', 'read_replica', 'cache',
      'queue', 'event_stream',
      'rate_limiter', 'circuit_breaker', 'monitoring',
      'object_storage',
    ],
    lockedNodeIds: [],
  },

  evaluationRules: [],

  debrief: {
    title: 'Observability & Incident Investigation — Key Takeaways',
    markdown: `
## The four golden signals (Google SRE)

| Signal | What it measures | Alert when |
|--------|-----------------|-----------|
| **Latency** | Time to serve a request | p99 > SLO threshold |
| **Traffic** | Requests per second | Sudden drop (silent failure) or spike |
| **Errors** | Rate of failed requests | Error rate > 0.1% |
| **Saturation** | How full is the resource | CPU/connections/queue > 70% |

Always check all four before diagnosing. A saturation alert alone doesn't tell you which resource.

## Symptoms vs root causes

**Symptom**: API latency increased from 80ms to 2000ms.
**Not a root cause** — it's an effect. Dig deeper:

1. Is service saturation high? → App CPU is the bottleneck
2. Is DB saturation high? → Connection pool or slow queries
3. Is cache hit rate low? → Cache flush, stampede, or misconfiguration
4. Is LB dropping requests? → Backend health-check failures
5. Is error rate high upstream but not downstream? → Network partition or timeout misconfiguration

## Error budgets and SLOs

99.9% availability = 43 minutes downtime per month allowed.
99.99% availability = 4.3 minutes per month.

Error budget = (1 - SLO) × time period.
If you burn your error budget early, **freeze changes** until next month.
Use error budget as a signal: burning fast = reliability work takes priority.

## Incident timeline structure

A good incident postmortem has:
1. **Timeline**: When did each signal change? (detection latency)
2. **Impact**: How many users affected? Revenue lost?
3. **Root cause**: The specific technical reason (not "human error")
4. **Contributing factors**: What made the root cause possible?
5. **Action items**: Specific tasks with owners and dates

## The diagnosis checklist

When "latency suddenly increased":
\`\`\`
1. Check traffic — is RPS normal? (not a DDoS or traffic drop)
2. Check error rate — are requests failing or just slow?
3. Check saturation — which component is busiest?
4. Check recent deployments — what changed 1h before the incident?
5. Check downstream dependencies — is DB/cache/queue healthy?
6. Correlate logs — which specific requests are slow?
\`\`\`

With observability wired to all nodes in this lab, you can follow this checklist using the live metrics panel.
    `.trim(),
  },
};
