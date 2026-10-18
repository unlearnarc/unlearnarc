/**
 * UnlearnARC Engineering Labs — Core Type System
 *
 * These interfaces define the stable contracts between:
 *   Layer A  — Visual simulation engine (browser)
 *   Layer C  — Learning & orchestration (Spring Boot)
 *   UI       — React lab workspace
 *
 * Version this file. Engine and scenario definitions both carry a semver string
 * so that old attempt replays can be matched to the correct engine version.
 */

// ─────────────────────────────────────────────────────────────────────────────
// VERSIONING
// ─────────────────────────────────────────────────────────────────────────────

export const ENGINE_VERSION = '1.0.0' as const;

/** Scenarios embed this to guarantee replay compatibility. */
export interface VersionedContract {
  engineVersion: string;  // semver, must match ENGINE_VERSION at runtime
  schemaVersion: number;  // integer, bumped on breaking scenario changes
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CATALOG
// ─────────────────────────────────────────────────────────────────────────────

export type ComponentKind =
  | 'client'
  | 'cdn'
  | 'dns'
  | 'load_balancer'
  | 'api_gateway'
  | 'service'
  | 'database'
  | 'read_replica'
  | 'cache'
  | 'queue'
  | 'event_stream'
  | 'worker'
  | 'object_storage'
  | 'rate_limiter'
  | 'circuit_breaker'
  | 'monitoring';

export type ComponentStatus =
  | 'healthy'
  | 'degraded'
  | 'overloaded'
  | 'failed'
  | 'recovering'
  | 'starting';

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT CONFIGURATION (per kind)
// ─────────────────────────────────────────────────────────────────────────────

export interface ClientConfig {
  requestsPerSecond: number;   // peak arrival rate
  burstFactor: number;         // multiplier applied during burst phases (≥1)
  readRatio: number;           // 0–1
}

export interface LoadBalancerConfig {
  algorithm: 'round_robin' | 'least_connections' | 'random' | 'ip_hash';
  healthCheckIntervalMs: number;
  maxConnectionsPerBackend: number;
}

export interface ServiceConfig {
  replicas: number;            // 1–N
  cpuCores: number;
  memoryMb: number;
  maxRequestsPerSecond: number;
  avgServiceTimeMs: number;
  maxConcurrentRequests: number;
}

export interface DatabaseConfig {
  engine: 'mysql' | 'postgres' | 'mongodb' | 'cassandra';
  maxConnections: number;
  avgQueryTimeMs: number;
  replicationEnabled: boolean;
  shardingEnabled: boolean;
  shardCount: number;
  partitionKey?: string;
}

export interface ReadReplicaConfig {
  replicationLagMs: number;    // simulated propagation delay
  maxConnections: number;
  avgQueryTimeMs: number;
  stalereadsAllowed: boolean;
}

export interface CacheConfig {
  maxSizeBytes: number;
  ttlSeconds: number;
  evictionPolicy: 'lru' | 'lfu' | 'fifo';
  hitRatioTarget: number;      // 0–1 (used as starting hit ratio)
  warmupSeconds: number;       // seconds before hit ratio reaches target
}

export interface QueueConfig {
  maxDepth: number;
  visibilityTimeoutSeconds: number;
  maxRetries: number;
  deadLetterEnabled: boolean;
}

export interface EventStreamConfig {
  partitions: number;
  replicationFactor: number;
  retentionHours: number;
  maxBytesPerPartitionMb: number;
}

export interface RateLimiterConfig {
  requestsPerSecond: number;
  burstCapacity: number;
  algorithm: 'token_bucket' | 'fixed_window' | 'sliding_window';
}

export interface CircuitBreakerConfig {
  errorThresholdPercent: number;   // open when error rate > threshold
  openDurationMs: number;          // stay open for this long
  halfOpenMaxRequests: number;     // probe requests in half-open state
}

export interface CdnConfig {
  cacheHitRatio: number;           // 0–1
  edgePops: number;
  avgEdgeLatencyMs: number;
}

export interface MonitoringConfig {
  samplingIntervalMs: number;
  alertThresholds: Record<string, number>;
}

// Discriminated union of all component configs
export type ComponentConfig =
  | { kind: 'client';          config: ClientConfig }
  | { kind: 'cdn';             config: CdnConfig }
  | { kind: 'dns';             config: Record<string, never> }
  | { kind: 'load_balancer';   config: LoadBalancerConfig }
  | { kind: 'api_gateway';     config: ServiceConfig }
  | { kind: 'service';         config: ServiceConfig }
  | { kind: 'database';        config: DatabaseConfig }
  | { kind: 'read_replica';    config: ReadReplicaConfig }
  | { kind: 'cache';           config: CacheConfig }
  | { kind: 'queue';           config: QueueConfig }
  | { kind: 'event_stream';    config: EventStreamConfig }
  | { kind: 'worker';          config: ServiceConfig }
  | { kind: 'object_storage';  config: Record<string, never> }
  | { kind: 'rate_limiter';    config: RateLimiterConfig }
  | { kind: 'circuit_breaker'; config: CircuitBreakerConfig }
  | { kind: 'monitoring';      config: MonitoringConfig };

// ─────────────────────────────────────────────────────────────────────────────
// TOPOLOGY GRAPH
// ─────────────────────────────────────────────────────────────────────────────

export interface TopologyNode {
  id: string;                         // stable UUID-style string
  kind: ComponentKind;
  label: string;
  config: ComponentConfig['config'];  // typed per kind
  position: { x: number; y: number };
  meta?: Record<string, unknown>;
}

export interface TopologyEdge {
  id: string;
  fromId: string;
  toId: string;
  label?: string;
  /** bits/s or requests/s capacity; 0 = unlimited */
  capacityHint?: number;
}

export interface Topology {
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  schemaVersion: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATION STATE
// ─────────────────────────────────────────────────────────────────────────────

export interface ComponentMetrics {
  nodeId: string;
  requestsIn: number;          // requests arrived in last interval
  requestsOut: number;         // requests successfully served
  requestsDropped: number;     // rejected / timed-out
  queueDepth: number;
  avgLatencyMs: number;
  errorRate: number;           // 0–1
  saturation: number;          // 0–1 (utilization)
  cacheHits?: number;
  cacheMisses?: number;
  replicationLagMs?: number;
  connections?: number;
  maxConnections?: number;
}

export interface SimulationState {
  simulationTime: number;      // virtual ms from scenario start
  wallTime: number;            // real ms from worker start (for display only)
  status: 'idle' | 'running' | 'paused' | 'completed' | 'error';
  topology: Topology;
  metrics: Record<string, ComponentMetrics>;  // keyed by nodeId
  logs: LogEntry[];
  events: SimulationEvent[];
  activeIncidents: string[];   // incident IDs currently in effect
  seed: number;
  engineVersion: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS & SCHEDULING
// ─────────────────────────────────────────────────────────────────────────────

export interface SimulationEvent {
  id: string;
  scheduledAt: number;    // virtual ms
  kind: EventKind;
  payload: Record<string, unknown>;
  applied: boolean;
}

export type EventKind =
  | 'workload_change'
  | 'component_failure'
  | 'component_recovery'
  | 'scale_up'
  | 'scale_down'
  | 'cache_invalidation'
  | 'replication_lag_spike'
  | 'network_partition'
  | 'alert_triggered';

// ─────────────────────────────────────────────────────────────────────────────
// LOGS
// ─────────────────────────────────────────────────────────────────────────────

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  id: string;
  simulationTime: number;
  level: LogLevel;
  nodeId?: string;
  message: string;
  meta?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export type StudentActionKind =
  | 'add_node'
  | 'remove_node'
  | 'move_node'
  | 'add_edge'
  | 'remove_edge'
  | 'configure_node'
  | 'scale_replicas'
  | 'trigger_failure'
  | 'trigger_recovery'
  | 'run_load_test'
  | 'reset';

export interface StudentAction {
  id: string;
  kind: StudentActionKind;
  payload: Record<string, unknown>;
  appliedAt: number;    // virtual ms
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC SAMPLES (time-series for chart display)
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricSample {
  simulationTime: number;
  nodeId: string;
  metric: keyof ComponentMetrics;
  value: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVALUATION
// ─────────────────────────────────────────────────────────────────────────────

export type EvaluationResult = 'pass' | 'fail' | 'partial' | 'pending';

export interface EvaluationRule {
  id: string;
  description: string;
  /** Returns 'pass' | 'fail' | 'partial' from the final simulation state. */
  evaluate: (state: SimulationState) => EvaluationResult;
}

export interface ScoreCard {
  ruleId: string;
  description: string;
  result: EvaluationResult;
  pointsAwarded: number;
  maxPoints: number;
  hint?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// LAB SCENARIO
// ─────────────────────────────────────────────────────────────────────────────

export type ExecutionMode = 'simulation' | 'real';

export type LabDomain =
  | 'system_design'
  | 'databases'
  | 'networking'
  | 'operating_systems'
  | 'distributed_systems'
  | 'messaging'
  | 'performance'
  | 'cloud'
  | 'observability';

export interface WorkloadConfig {
  baseRequestsPerSecond: number;
  burstMultiplier: number;
  burstAtMs: number;
  burstDurationMs: number;
  readRatio: number;
  totalDurationMs: number;
}

export interface LabScenario extends VersionedContract {
  id: string;
  slug: string;
  version: number;
  domain: LabDomain;
  title: string;
  description: string;

  /** Learning objectives shown to the student. */
  objectives: string[];

  /** Initial topology for this scenario. */
  initialTopology: Topology;

  /** Deterministic workload definition. */
  workload: WorkloadConfig;

  /** Pre-scheduled events (failures, surges, etc.). */
  scheduledEvents: Omit<SimulationEvent, 'applied'>[];

  /** Available actions the student may take. */
  availableActions: StudentActionKind[];

  /** Constraints on topology editing. */
  constraints: {
    maxNodes: number;
    maxEdges: number;
    allowedKinds: ComponentKind[];
    lockedNodeIds?: string[];  // IDs the student cannot remove/reconfigure
  };

  /** Evaluation rules for scoring. */
  evaluationRules: Omit<EvaluationRule, 'evaluate'>[];

  /** Seed for deterministic randomness. */
  seed: number;

  /** Debrief content shown after completion. */
  debrief: {
    title: string;
    markdown: string;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKER MESSAGES (simulation runs in a Web Worker)
// ─────────────────────────────────────────────────────────────────────────────

export type WorkerInbound =
  | { type: 'INIT';    scenario: LabScenario; mode: ExecutionMode }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESET' }
  | { type: 'STEP';    deltaMs: number }
  | { type: 'ACTION';  action: StudentAction }
  | { type: 'DISPOSE' };

export type WorkerOutbound =
  | { type: 'SNAPSHOT';  state: SimulationState }
  | { type: 'METRICS';   samples: MetricSample[] }
  | { type: 'LOG';       entries: LogEntry[] }
  | { type: 'READY' }
  | { type: 'ERROR';     message: string };

// ─────────────────────────────────────────────────────────────────────────────
// ATTEMPT PERSISTENCE (sent to Spring Boot)
// ─────────────────────────────────────────────────────────────────────────────

export interface LabAttemptRequest {
  scenarioId: string;
  scenarioVersion: number;
  engineVersion: string;
  executionMode: ExecutionMode;
}

export interface LabAttemptResult {
  attemptId: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  scoreCard: ScoreCard[];
  totalPoints: number;
  maxPoints: number;
}
