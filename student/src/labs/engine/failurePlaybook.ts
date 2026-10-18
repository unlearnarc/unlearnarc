/**
 * Failure Playbook — component-specific failures with topology-aware recovery.
 *
 * Recovery options now carry explicit topology mutations:
 *   - addEdgeFrom / addEdgeTo: connect the new node into the graph
 *   - configPatch: update the failed node's config
 *
 * The engine uses actual topology edges for traffic propagation, so a
 * read_replica or cache only reduces DB load when connected via an edge.
 */

import type { ComponentKind } from './types';

export type FailureSeverity = 'warning' | 'critical' | 'catastrophic';

export interface RecoveryOption {
  id: string;
  label: string;
  icon?: string;
  description: string;
  /** Add a new component of this kind */
  addComponentKind?: ComponentKind;
  /**
   * After adding the new node, create these edges.
   * 'TARGET' = the failed node, 'NEW' = the just-added node.
   * e.g. { from: 'TARGET', to: 'NEW' } connects failed→new
   */
  addEdges?: Array<{ from: 'TARGET' | 'NEW'; to: 'TARGET' | 'NEW' }>;
  /** Config patch to apply to the failed (target) node */
  configPatch?: Record<string, unknown>;
  /** Expected outcome description */
  expectedOutcome: string;
  /** 0–1 effectiveness score */
  effectiveness: number;
  tradeoff?: string;
}

export interface FailureScenario {
  id: string;
  label: string;
  icon: string;
  severity: FailureSeverity;
  /** Which component kinds this failure applies to */
  targets: ComponentKind[];
  description: string;
  /** Observable symptoms */
  symptoms: string[];
  /** Recovery options */
  recoveryOptions: RecoveryOption[];
  /** Which engine metric to watch for validation */
  validationMetric: 'saturation' | 'avgLatencyMs' | 'errorRate' | 'queueDepth';
  /** Threshold value — fix is validated when metric crosses this */
  validationThreshold: number;
  validationDirection: 'below' | 'above';
  /** Engine action that triggers this failure */
  engineAction: 'trigger_failure';
  /** Config to apply to the target node when failure is triggered */
  failureConfig?: Record<string, unknown>;
  /** Log message on trigger */
  triggerMessage: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAYBOOK
// ─────────────────────────────────────────────────────────────────────────────

export const FAILURE_PLAYBOOK: FailureScenario[] = [

  // ── DATABASE ──────────────────────────────────────────────────────────────

  {
    id: 'db_slow_queries',
    label: 'Slow DB Queries',
    icon: '🐢',
    severity: 'warning',
    targets: ['database'],
    description:
      'Query execution time spikes — connection pool fills as queries pile behind slow locks or missing indexes.',
    symptoms: [
      'DB avgLatencyMs rises sharply (from ~15ms → 500ms+)',
      'Connection pool saturation climbs above 80%',
      'Upstream services queue up, their latency increases too',
      'Error rate on App Server rises as DB timeouts cascade upstream',
    ],
    failureConfig: { avgQueryTimeMs: 500 },
    recoveryOptions: [
      {
        id: 'add_read_replica',
        label: 'Add Read Replica',
        icon: '📖',
        addComponentKind: 'read_replica',
        addEdges: [{ from: 'TARGET', to: 'NEW' }],
        description:
          'Offload read traffic to a replica. The replica is connected to the DB and absorbs the read workload, freeing the primary for writes.',
        expectedOutcome:
          'Primary DB connection saturation drops proportionally to readRatio. Replica handles reads with lower latency.',
        effectiveness: 0.75,
        tradeoff: 'Replica lag 50–200ms — stale reads on availability possible. Writes still hit primary.',
      },
      {
        id: 'add_cache',
        label: 'Cache Frequent Queries',
        icon: '⚡',
        addComponentKind: 'cache',
        addEdges: [{ from: 'NEW', to: 'TARGET' }],
        description:
          'Place a cache upstream of the DB. Cache intercepts reads — only misses and writes reach the DB.',
        expectedOutcome:
          'DB receives only (1 - hitRatio) × readRatio of original traffic. Latency for cached paths < 1ms.',
        effectiveness: 0.85,
        tradeoff: 'Stale cache may show sold seats as available for TTL duration.',
      },
      {
        id: 'increase_pool',
        label: 'Increase Connection Pool',
        icon: '🔌',
        configPatch: { maxConnections: 300 },
        description:
          'Raise pool from 100 → 300 connections. More concurrent queries can run without queuing at the connection level.',
        expectedOutcome:
          'Queue depth drops. Saturation decreases if underlying query time is reasonable.',
        effectiveness: 0.5,
        tradeoff: 'More connections = more memory on DB server. If queries are slow, more connections won\'t help — fix queries first.',
      },
      {
        id: 'reduce_query_time',
        label: 'Optimise Queries (Index)',
        icon: '🏎️',
        configPatch: { avgQueryTimeMs: 10 },
        description:
          'Add indexes and optimise slow queries — reduces avgQueryTimeMs from 500ms back to 10ms.',
        expectedOutcome:
          'DB saturation drops immediately. Connection pool utilisation normalises.',
        effectiveness: 1.0,
        tradeoff: 'Requires identifying the slow queries. In real systems this takes time (EXPLAIN ANALYZE, slow query log).',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.65,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🐢 SLOW DB QUERIES: avgQueryTimeMs spiked to 500ms. Connection pool filling up.',
  },

  {
    id: 'db_connection_exhaustion',
    label: 'Connection Pool Exhausted',
    icon: '🔒',
    severity: 'critical',
    targets: ['database'],
    description:
      'All DB connections are in use. New queries queue then timeout. Services start returning 503.',
    symptoms: [
      'DB connections = maxConnections (pool 100%)',
      'queueDepth climbs rapidly',
      'App Server errorRate spikes (DB timeouts)',
      'Cascading failures — load balancer starts getting 503s',
    ],
    failureConfig: { maxConnections: 10 },
    recoveryOptions: [
      {
        id: 'add_cache_pool',
        label: 'Add Cache Layer',
        icon: '⚡',
        addComponentKind: 'cache',
        addEdges: [{ from: 'NEW', to: 'TARGET' }],
        description:
          'Cache upstream of the DB. 80% hit ratio means 80% fewer DB connections needed.',
        expectedOutcome:
          'DB connections drop proportional to cache hit rate × read ratio.',
        effectiveness: 0.9,
        tradeoff: 'Only helps for cacheable reads. Writes still hit the DB.',
      },
      {
        id: 'add_rate_limiter',
        label: 'Add Rate Limiter',
        icon: '🚦',
        addComponentKind: 'rate_limiter',
        description:
          'Cap incoming RPS so the DB never receives more than it can handle.',
        expectedOutcome:
          'DB saturation stabilises. Some users get 429 instead of 503.',
        effectiveness: 0.8,
        tradeoff: 'Legitimate users rejected during peak. Need careful limit tuning.',
      },
      {
        id: 'restore_pool',
        label: 'Restore Pool Size',
        icon: '🔌',
        configPatch: { maxConnections: 200 },
        description:
          'Emergency: restore pool to 200. Buys time but not a long-term fix.',
        expectedOutcome:
          'Immediate relief if DB server has spare capacity.',
        effectiveness: 0.6,
        tradeoff: 'Each connection uses ~4MB RAM. High pool = high memory. DB may OOM.',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.75,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🔒 CONNECTION POOL EXHAUSTED: Pool set to 10. All connections in use. Queries timing out.',
  },

  {
    id: 'db_crash',
    label: 'Database Down',
    icon: '💀',
    severity: 'catastrophic',
    targets: ['database'],
    description:
      'Primary database instance crashes — disk failure, OOM, or kernel panic. Complete data unavailability.',
    symptoms: [
      'DB errorRate = 100%',
      'All upstream services fail (App Server errorRate → 100%)',
      'Booking attempts return 500',
      'Queue depth spikes as retries pile up',
    ],
    recoveryOptions: [
      {
        id: 'failover_replica',
        label: 'Promote Read Replica',
        icon: '👑',
        addComponentKind: 'read_replica',
        addEdges: [{ from: 'TARGET', to: 'NEW' }],
        description:
          'If a replica exists, promote it to primary. Requires pre-existing replica with replication configured.',
        expectedOutcome:
          'Service restored. Some writes from before promotion may be lost (RPO gap).',
        effectiveness: 0.95,
        tradeoff: 'Promotion takes 10–30 seconds. Replication lag = potential data loss window.',
      },
      {
        id: 'add_circuit_breaker',
        label: 'Add Circuit Breaker',
        icon: '🔴',
        addComponentKind: 'circuit_breaker',
        description:
          'Circuit breaker stops cascading — upstream services get fast-fail instead of waiting on timeouts.',
        expectedOutcome:
          'App Server latency returns to normal. Users get clear error instead of 30s timeout.',
        effectiveness: 0.5,
        tradeoff: 'Doesn\'t restore DB. Just protects services from the cascade. Must fix DB separately.',
      },
      {
        id: 'manual_recovery',
        label: 'Trigger Recovery',
        icon: '🔄',
        description:
          'Simulate ops team restoring the DB instance (restart, volume remount).',
        expectedOutcome: 'DB comes back online. Full service restored.',
        effectiveness: 1.0,
        tradeoff: 'Real recovery takes 5–30 minutes. Use this to observe your architecture post-crash.',
      },
    ],
    validationMetric: 'errorRate',
    validationThreshold: 0.05,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '💀 DATABASE CRASH: Primary DB instance is down. All queries failing.',
  },

  // ── APP SERVICE ───────────────────────────────────────────────────────────

  {
    id: 'service_overload',
    label: 'Service CPU Saturation',
    icon: '🔥',
    severity: 'critical',
    targets: ['service', 'api_gateway'],
    description:
      'App Server CPU at 100% — request queue builds, latency spikes, then timeouts begin.',
    symptoms: [
      'Service saturation → 100%',
      'avgLatencyMs climbs from 80ms → 2000ms+',
      'queueDepth increases rapidly',
      'errorRate rises as queue timeouts hit',
    ],
    failureConfig: { maxRequestsPerSecond: 50, avgServiceTimeMs: 800 },
    recoveryOptions: [
      {
        id: 'scale_replicas',
        label: 'Scale Horizontally (4 Replicas)',
        icon: '📈',
        configPatch: { replicas: 4, maxRequestsPerSecond: 500, avgServiceTimeMs: 50 },
        description:
          'Increase App Server replicas from 1 → 4. Total capacity = 4× original.',
        expectedOutcome: 'Saturation drops to ~25%. Latency returns to baseline.',
        effectiveness: 0.9,
        tradeoff: 'Costs 4× compute. Need load balancer to distribute. Cold-start time for new instances.',
      },
      {
        id: 'add_load_balancer',
        label: 'Add Load Balancer',
        icon: '⚖️',
        addComponentKind: 'load_balancer',
        description:
          'Route traffic across multiple instances. Add more service replicas alongside for full effect.',
        expectedOutcome:
          'Even traffic distribution. No single instance overloaded.',
        effectiveness: 0.7,
        tradeoff: 'LB itself adds ~2ms latency. Single point of failure unless HA LB configured.',
      },
      {
        id: 'add_cache_service',
        label: 'Cache Upstream',
        icon: '⚡',
        addComponentKind: 'cache',
        description:
          'Cache API responses upstream — 80% read hit ratio means 80% fewer service calls.',
        expectedOutcome:
          'Service receives only 20% of original traffic. Saturation drops dramatically.',
        effectiveness: 0.8,
        tradeoff: 'Only helps for cacheable endpoints. Booking/payment writes bypass cache.',
      },
      {
        id: 'fix_service_config',
        label: 'Restore Capacity',
        icon: '🔧',
        configPatch: { maxRequestsPerSecond: 500, avgServiceTimeMs: 50, replicas: 2 },
        description:
          'Restore service to healthy config: 500 RPS capacity, 50ms service time, 2 replicas.',
        expectedOutcome: 'Saturation normalises immediately.',
        effectiveness: 1.0,
        tradeoff: 'Doesn\'t fix the root cause — just resets the simulation parameters.',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.75,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🔥 SERVICE OVERLOAD: maxRPS set to 50, serviceTime 800ms. Requests queuing.',
  },

  {
    id: 'service_crash',
    label: 'Service Instance Crash',
    icon: '💥',
    severity: 'critical',
    targets: ['service', 'api_gateway', 'worker'],
    description:
      'A service instance crashes (OOM, unhandled exception, kill -9). If only one replica, full outage.',
    symptoms: [
      'Service errorRate → 100%',
      'Upstream LB health check fails',
      'Traffic has nowhere to go — 503s',
    ],
    recoveryOptions: [
      {
        id: 'pre_scale_replicas',
        label: 'Run Multiple Replicas',
        icon: '📦',
        configPatch: { replicas: 3 },
        description:
          'With 3 replicas, 1 crash means 2 still serve. LB detects failure and reroutes.',
        expectedOutcome: 'Service continues at 2/3 capacity. No full outage.',
        effectiveness: 0.9,
        tradeoff: '3× compute cost. Must have LB. Stateful services need session affinity.',
      },
      {
        id: 'circuit_breaker_svc',
        label: 'Add Circuit Breaker',
        icon: '🔴',
        addComponentKind: 'circuit_breaker',
        description:
          'Circuit breaker detects crash, opens immediately. Upstream gets fast-fail not 30s timeout.',
        expectedOutcome:
          'Users get fast error. System resources freed from waiting.',
        effectiveness: 0.6,
        tradeoff: 'Still an outage, just faster. Need auto-recovery separately.',
      },
    ],
    validationMetric: 'errorRate',
    validationThreshold: 0.1,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '💥 SERVICE CRASH: Instance killed. errorRate → 100%.',
  },

  // ── CACHE ─────────────────────────────────────────────────────────────────

  {
    id: 'cache_flush',
    label: 'Cache Flush (Cold Start)',
    icon: '🧹',
    severity: 'warning',
    targets: ['cache'],
    description:
      'All cache entries evicted (deploy, Redis restart, or manual flush). Origin traffic spikes as everything misses.',
    symptoms: [
      'Cache hitRatio drops to ~0%',
      'DB receives 5–10× normal query load',
      'DB saturation spikes',
      'App Server latency rises (waiting on DB)',
    ],
    failureConfig: { hitRatioTarget: 0.01, warmupSeconds: 120 },
    recoveryOptions: [
      {
        id: 'cache_warming',
        label: 'Cache Warming Strategy',
        icon: '🔥',
        configPatch: { warmupSeconds: 10, hitRatioTarget: 0.85 },
        description:
          'Pre-warm cache with popular routes before flushing. Set warmupSeconds low to recover fast.',
        expectedOutcome:
          'Hit ratio recovers in 10s instead of 120s. DB spike is shorter.',
        effectiveness: 0.75,
        tradeoff: 'Warming takes time and DB load. Need to know which keys to warm.',
      },
      {
        id: 'rate_limit_on_flush',
        label: 'Rate Limit During Flush',
        icon: '🚦',
        addComponentKind: 'rate_limiter',
        description:
          'Temporarily throttle traffic during flush so DB is not stampeded.',
        expectedOutcome:
          'DB saturation stays bounded. Some users delayed during warm-up.',
        effectiveness: 0.7,
        tradeoff: 'Degrades user experience. Remove rate limit after cache is warm.',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.6,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🧹 CACHE FLUSH: hitRatioTarget set to 1%. Every request hits origin.',
  },

  {
    id: 'cache_stampede',
    label: 'Cache Stampede',
    icon: '🦬',
    severity: 'critical',
    targets: ['cache'],
    description:
      'Popular key expires simultaneously for thousands of users. All requests miss and hammer the DB at once.',
    symptoms: [
      'Sudden DB spike — 10× queries in 1 second',
      'DB connection pool exhausted instantly',
      'App Server latency spike',
      'Cache hit ratio momentarily drops to 0 then recovers',
    ],
    failureConfig: { hitRatioTarget: 0.02, warmupSeconds: 5 },
    recoveryOptions: [
      {
        id: 'cache_ttl_jitter',
        label: 'Add TTL Jitter',
        icon: '⏰',
        configPatch: { ttlSeconds: 180, hitRatioTarget: 0.85, warmupSeconds: 10 },
        description:
          'Randomise TTL within ±20% so popular keys expire at different times.',
        expectedOutcome:
          'Stampedes become gradual cache misses spread over time.',
        effectiveness: 0.85,
        tradeoff: 'Some entries stay stale slightly longer. Acceptable for seat counts.',
      },
      {
        id: 'read_replica_stampede',
        label: 'Add Read Replica',
        icon: '📖',
        addComponentKind: 'read_replica',
        addEdges: [{ from: 'TARGET', to: 'NEW' }],
        description:
          'Replica absorbs the stampede reads, protecting the primary.',
        expectedOutcome:
          'Primary DB unaffected. Replica handles the burst.',
        effectiveness: 0.7,
        tradeoff: 'Replica may also saturate during extreme stampede.',
      },
    ],
    validationMetric: 'avgLatencyMs',
    validationThreshold: 200,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🦬 CACHE STAMPEDE: Popular key expired. 50k users hitting cold cache simultaneously.',
  },

  // ── QUEUE / STREAM ────────────────────────────────────────────────────────

  {
    id: 'queue_consumer_lag',
    label: 'Consumer Lag',
    icon: '📬',
    severity: 'warning',
    targets: ['queue', 'event_stream'],
    description:
      'Producers write faster than consumers read. Queue depth grows unbounded.',
    symptoms: [
      'queueDepth climbs continuously',
      'Saturation rises toward 100%',
      'Notification/confirmation delays increase',
    ],
    failureConfig: { maxDepth: 1000 },
    recoveryOptions: [
      {
        id: 'add_consumer_workers',
        label: 'Add Consumer Workers',
        icon: '👷',
        addComponentKind: 'worker',
        addEdges: [{ from: 'TARGET', to: 'NEW' }],
        description:
          'More workers connected to the queue consume it faster.',
        expectedOutcome:
          'Queue drains. Depth returns to near 0 as consumers catch up.',
        effectiveness: 0.85,
        tradeoff: 'Workers need to be idempotent — same message may be processed twice during scaling.',
      },
      {
        id: 'add_partitions',
        label: 'Add Stream Partitions',
        icon: '🗂️',
        configPatch: { partitions: 8, maxDepth: 1000000 },
        description:
          'More partitions = more consumer parallelism. Each partition can be consumed independently.',
        expectedOutcome:
          'Parallel consumers, up to 8× throughput.',
        effectiveness: 0.9,
        tradeoff: 'Adding partitions mid-flight triggers consumer rebalance. Brief disruption.',
      },
      {
        id: 'rate_limit_producers',
        label: 'Throttle Producers',
        icon: '🚦',
        addComponentKind: 'rate_limiter',
        description:
          'Slow producers to match consumer rate. Backpressure applied upstream.',
        expectedOutcome: 'Queue depth stabilises. No further growth.',
        effectiveness: 0.6,
        tradeoff: 'Upstream requests delayed or rejected during rush.',
      },
    ],
    validationMetric: 'queueDepth',
    validationThreshold: 500,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '📬 CONSUMER LAG: Queue maxDepth set to 1000. Consumers can\'t keep up.',
  },

  {
    id: 'queue_flood',
    label: 'Queue Flood',
    icon: '🌊',
    severity: 'critical',
    targets: ['queue', 'event_stream'],
    description:
      'Producers burst far beyond queue capacity. Messages dropped or DLQ fills up.',
    symptoms: [
      'requestsDropped spikes',
      'Queue saturation = 100%',
      'Dead-letter queue grows (if enabled)',
    ],
    failureConfig: { maxDepth: 100 },
    recoveryOptions: [
      {
        id: 'increase_queue_depth',
        label: 'Increase Queue Capacity',
        icon: '📦',
        configPatch: { maxDepth: 1000000 },
        description:
          'Raise max depth so burst is absorbed, not dropped.',
        expectedOutcome:
          'No messages dropped during burst. Consumers drain at their own pace.',
        effectiveness: 0.7,
        tradeoff: 'Memory-bounded. Very large queues = high RAM.',
      },
      {
        id: 'dlq_monitoring',
        label: 'Monitor Dead-Letter Queue',
        icon: '🔍',
        addComponentKind: 'monitoring',
        description:
          'Alert on DLQ depth. Replay DLQ messages after consumer fix.',
        expectedOutcome:
          'Visibility into dropped messages. Can replay after fixing consumer.',
        effectiveness: 0.5,
        tradeoff: 'Doesn\'t prevent drops. Just makes recovery possible.',
      },
    ],
    validationMetric: 'queueDepth',
    validationThreshold: 5000,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🌊 QUEUE FLOOD: maxDepth set to 100. Messages being dropped.',
  },

  // ── LOAD BALANCER ─────────────────────────────────────────────────────────

  {
    id: 'lb_backend_down',
    label: 'All Backends Down',
    icon: '📡',
    severity: 'catastrophic',
    targets: ['load_balancer'],
    description:
      'Load balancer has no healthy backends. All traffic fails immediately.',
    symptoms: [
      'LB errorRate = 100%',
      'Health checks all failing',
      'requestsDropped = all incoming traffic',
    ],
    recoveryOptions: [
      {
        id: 'restore_services',
        label: 'Add Service Instance',
        icon: '📈',
        addComponentKind: 'service',
        addEdges: [{ from: 'TARGET', to: 'NEW' }],
        description:
          'Add service instance behind the LB. Health checks start passing.',
        expectedOutcome:
          'LB has healthy backends. Traffic flows. Error rate drops.',
        effectiveness: 0.95,
        tradeoff: 'Cold-start time. New instances need to warm up caches, load configs.',
      },
    ],
    validationMetric: 'errorRate',
    validationThreshold: 0.05,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '📡 NO HEALTHY BACKENDS: LB health checks all failing. Complete outage.',
  },

  // ── TRAFFIC ───────────────────────────────────────────────────────────────

  {
    id: 'traffic_surge',
    label: 'Traffic Surge (10× Load)',
    icon: '🌊',
    severity: 'critical',
    targets: ['client'],
    description:
      'Booking rush opens — 1M users hit the site in 60 seconds. 10× normal traffic.',
    symptoms: [
      'All downstream services saturate simultaneously',
      'DB connections exhausted',
      'App Server queues overflow',
      'P99 latency > 10 seconds',
    ],
    failureConfig: { requestsPerSecond: 2000, burstFactor: 10 },
    recoveryOptions: [
      {
        id: 'cdn_static',
        label: 'CDN for Static Assets',
        icon: '🌐',
        addComponentKind: 'cdn',
        description:
          'Serve cacheable requests from edge. Only API calls hit origin.',
        expectedOutcome:
          'Origin traffic drops by hitRatio. Remaining load is manageable.',
        effectiveness: 0.6,
        tradeoff: 'CDN only helps for cacheable static content. API requests always hit origin.',
      },
      {
        id: 'add_rate_limiter_traffic',
        label: 'Rate Limit Incoming Traffic',
        icon: '🚦',
        addComponentKind: 'rate_limiter',
        description:
          'Cap incoming requests at system capacity. Shed load gracefully.',
        expectedOutcome:
          'System never exceeds capacity. Excess traffic gets 429.',
        effectiveness: 0.75,
        tradeoff: 'Users during surge get rejected. Need graceful degradation messaging.',
      },
      {
        id: 'reduce_surge',
        label: 'Restore Normal Traffic',
        icon: '🔧',
        configPatch: { requestsPerSecond: 200, burstFactor: 1 },
        description:
          'Restore client RPS to 200 — end the surge.',
        expectedOutcome: 'System load returns to baseline.',
        effectiveness: 1.0,
        tradeoff: 'Just resets the simulation — useful after observing the failure pattern.',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.75,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🌊 TRAFFIC SURGE: Client RPS set to 2000. System under 10× load.',
  },

  // ── NETWORK ───────────────────────────────────────────────────────────────

  {
    id: 'network_partition',
    label: 'Network Partition',
    icon: '✂️',
    severity: 'catastrophic',
    targets: ['load_balancer', 'cdn', 'api_gateway', 'service'],
    description:
      'Network split between zones. Nodes can\'t talk to each other — partial availability.',
    symptoms: [
      'Intermittent failures (50% error rate on affected paths)',
      'Timeout errors in logs',
      'Some requests succeed (same zone) — confusing for users',
    ],
    recoveryOptions: [
      {
        id: 'multi_region',
        label: 'Multi-Region with CDN',
        icon: '🌐',
        addComponentKind: 'cdn',
        description:
          'Route users to nearest healthy region via CDN/DNS failover.',
        expectedOutcome:
          'Users in healthy regions unaffected. Partitioned region isolated.',
        effectiveness: 0.8,
        tradeoff: 'Costs 2× infra. Data sync across regions is hard. CAP theorem trade-off.',
      },
      {
        id: 'circuit_break_partition',
        label: 'Circuit Break Partitioned Path',
        icon: '🔴',
        addComponentKind: 'circuit_breaker',
        description:
          'Circuit breaker detects timeouts fast and stops retrying partitioned nodes.',
        expectedOutcome:
          'Failures are fast-fail. Resources freed. Remaining regions unaffected.',
        effectiveness: 0.6,
        tradeoff: 'Partitioned users still can\'t access service.',
      },
    ],
    validationMetric: 'errorRate',
    validationThreshold: 0.1,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '✂️ NETWORK PARTITION: Zone A cannot reach Zone B. Partial availability.',
  },

  // ── NETWORKING ────────────────────────────────────────────────────────────

  {
    id: 'lb_connection_exhaustion',
    label: 'LB Connection Pool Exhausted',
    icon: '🕸️',
    severity: 'critical',
    targets: ['load_balancer'],
    description:
      'The load balancer\'s per-backend connection pool is full. New requests queue then timeout — even though app CPU is low. This is a pure networking bottleneck.',
    symptoms: [
      'App CPU stays low — it\'s NOT the bottleneck',
      'LB saturation → 100%',
      'avgLatencyMs spikes (requests queued at LB)',
      'errorRate rises as LB queue timeouts fire',
    ],
    failureConfig: { maxConnectionsPerBackend: 5 },
    recoveryOptions: [
      {
        id: 'increase_lb_pool',
        label: 'Increase LB Connection Pool',
        icon: '📈',
        configPatch: { maxConnectionsPerBackend: 2000 },
        description:
          'Raise maxConnectionsPerBackend from 5 → 2000. The LB can now hold far more concurrent connections.',
        expectedOutcome:
          'LB saturation drops immediately. Latency returns to baseline. App CPU unchanged.',
        effectiveness: 0.95,
        tradeoff: 'Each connection consumes memory. Very large pools on a small LB instance can cause OOM.',
      },
      {
        id: 'add_rate_limiter_lb',
        label: 'Rate Limit at the Edge',
        icon: '🚦',
        addComponentKind: 'rate_limiter',
        description:
          'Place a rate limiter upstream of the LB to cap incoming connections before they fill the pool.',
        expectedOutcome:
          'LB never sees more requests than it can handle. Excess traffic gets 429 at the edge.',
        effectiveness: 0.75,
        tradeoff: 'Users get rejected during peak rather than slow responses. Need good error messaging.',
      },
      {
        id: 'add_cdn_lb',
        label: 'Absorb Traffic with CDN',
        icon: '🌐',
        addComponentKind: 'cdn',
        description:
          'CDN handles cacheable requests at the edge — only misses hit the LB and origin.',
        expectedOutcome:
          'If 60%+ of traffic is cacheable, LB connections drop proportionally.',
        effectiveness: 0.7,
        tradeoff: 'Only helps for cacheable content. API and authenticated requests still hit the LB.',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.65,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🕸️ LB CONNECTION POOL EXHAUSTED: maxConnectionsPerBackend set to 5. Requests queueing at LB.',
  },

  {
    id: 'dns_slow',
    label: 'DNS Resolution Slowdown',
    icon: '🐌',
    severity: 'warning',
    targets: ['cdn', 'load_balancer'],
    description:
      'DNS resolver is slow or unreachable. Every new connection from a cold client must wait for DNS — adding 200–2000ms before the first byte. App CPU looks completely normal.',
    symptoms: [
      'High p99 latency (new connections), normal p50 (keep-alive connections)',
      'CPU on all services is normal — not a compute bottleneck',
      'Errors spike when DNS TTL expires for many users simultaneously',
    ],
    failureConfig: { avgEdgeLatencyMs: 1500 },
    recoveryOptions: [
      {
        id: 'cdn_dns_fix',
        label: 'Use CDN with Short DNS TTL',
        icon: '🌐',
        configPatch: { avgEdgeLatencyMs: 8 },
        description:
          'CDN edge PoPs answer DNS from nearby resolvers. Restore edge latency to 8ms.',
        expectedOutcome:
          'DNS resolution fast from any region. p99 latency drops back to baseline.',
        effectiveness: 0.9,
        tradeoff: 'CDN adds a hop. Costs money. Mis-configuration can route users to wrong region.',
      },
      {
        id: 'increase_dns_ttl',
        label: 'Increase DNS TTL',
        icon: '⏰',
        configPatch: { avgEdgeLatencyMs: 12 },
        description:
          'Higher TTL means resolvers cache the answer longer — fewer resolver round-trips.',
        expectedOutcome:
          'Existing users unaffected. New-user DNS lookup frequency drops.',
        effectiveness: 0.6,
        tradeoff: 'Slower failover during outages. Long TTL means users stuck on old IP during migration.',
      },
    ],
    validationMetric: 'avgLatencyMs',
    validationThreshold: 150,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🐌 DNS SLOWDOWN: DNS resolution time spiked to 1500ms per new connection.',
  },

  // ── OBSERVABILITY ─────────────────────────────────────────────────────────

  {
    id: 'missing_observability',
    label: 'No Monitoring Wired',
    icon: '🔇',
    severity: 'warning',
    targets: ['monitoring'],
    description:
      'Monitoring exists but receives no signals from any component. You\'re flying blind — failures go undetected until users complain.',
    symptoms: [
      'Monitoring node shows 0 incoming metric streams',
      'No alerts fire even when DB saturates',
      'Mean time to detect (MTTD) is "until user files a bug"',
    ],
    failureConfig: { samplingIntervalMs: 999999 },
    recoveryOptions: [
      {
        id: 'wire_monitoring',
        label: 'Wire Metrics to All Nodes',
        icon: '📡',
        configPatch: { samplingIntervalMs: 1000 },
        description:
          'Set samplingIntervalMs to 1000ms. Connect the monitoring node to every component via "metrics" edges.',
        expectedOutcome:
          'All component metrics visible. Alerts can fire within 1–2 sampling intervals of a failure.',
        effectiveness: 1.0,
        tradeoff: 'Metric collection adds ~1–2% CPU overhead per component. High cardinality metrics can be expensive.',
      },
      {
        id: 'add_monitoring',
        label: 'Add Observability Stack',
        icon: '📊',
        addComponentKind: 'monitoring',
        description:
          'Add a dedicated monitoring node and connect it to all components.',
        expectedOutcome:
          'Full visibility into saturation, error rate, latency, and queue depth.',
        effectiveness: 0.9,
        tradeoff: 'Need to draw edges from each component to the monitoring node to activate metrics collection.',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.5,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🔇 MONITORING BLIND: samplingIntervalMs set very high. No signals collected.',
  },

  {
    id: 'alert_storm',
    label: 'Alert Storm (Noisy Alerts)',
    icon: '🔔',
    severity: 'warning',
    targets: ['monitoring'],
    description:
      'Monitoring is firing alerts on every small spike — P99 > 80ms, saturation > 40%. On-call is overwhelmed by noise and misses the real critical alert.',
    symptoms: [
      'Monitoring saturation → 100% (alert processing overwhelmed)',
      'Real signal (DB down) buried in noise',
      'On-call alert fatigue — team starts ignoring alerts',
    ],
    failureConfig: { samplingIntervalMs: 10 },
    recoveryOptions: [
      {
        id: 'tune_thresholds',
        label: 'Tune Alert Thresholds',
        icon: '🎛️',
        configPatch: { samplingIntervalMs: 1000 },
        description:
          'Set meaningful thresholds: saturation > 80%, errorRate > 1%, p99 > 500ms. Sample every 1s not 10ms.',
        expectedOutcome:
          'Alert volume drops. Only actionable events fire. On-call can respond to real incidents.',
        effectiveness: 0.9,
        tradeoff: 'Risk of missing borderline issues. Use error budget burn rate alerts instead of fixed thresholds.',
      },
      {
        id: 'add_rate_limiter_alerts',
        label: 'Alert Rate Limiting',
        icon: '🚦',
        addComponentKind: 'rate_limiter',
        configPatch: { samplingIntervalMs: 5000 },
        description:
          'Group and deduplicate alerts. Only page for sustained issues (> 5 min) not transient spikes.',
        expectedOutcome:
          'Alert noise drops 90%. Only persistent failures trigger pages.',
        effectiveness: 0.85,
        tradeoff: 'Brief failures (< 5min) may go unnoticed. Use dashboards for transient issues.',
      },
    ],
    validationMetric: 'saturation',
    validationThreshold: 0.6,
    validationDirection: 'below',
    engineAction: 'trigger_failure',
    triggerMessage: '🔔 ALERT STORM: samplingIntervalMs at 10ms. Monitoring overloaded with noise.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getFailuresForKind(kind: ComponentKind): FailureScenario[] {
  return FAILURE_PLAYBOOK.filter(f => f.targets.includes(kind));
}

export function getFailureById(id: string): FailureScenario | undefined {
  return FAILURE_PLAYBOOK.find(f => f.id === id);
}

export type { FailureScenario as default };
