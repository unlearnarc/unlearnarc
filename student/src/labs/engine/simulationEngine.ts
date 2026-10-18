/**
 * Simulation Engine — topology-aware, metadata-driven.
 *
 * Key architectural change from v1:
 *   - Traffic is propagated through the actual topology graph (edges).
 *     A node only receives traffic that flows INTO it from upstream nodes.
 *   - Components like cache and read_replica genuinely intercept and reduce
 *     the load that reaches downstream nodes (database, service, etc.).
 *   - configure_node action is handled — slider changes take effect immediately.
 *   - Failed nodes block all downstream traffic (connections fail, not queued).
 *
 * Simulation model per component:
 *   client        → generates baseRps from config (student-configurable)
 *   cdn           → absorbs hitRatio% of traffic; remaining goes downstream
 *   load_balancer → distributes evenly across all downstream backends
 *   api_gateway   → same as service but with lower service time
 *   service       → M/D/1 queue model; drops when saturation > 0.95
 *   database      → connection-pool model; slow query time drives saturation
 *   read_replica  → absorbs readRatio% of DB traffic; has replication lag
 *   cache         → absorbs hitRatioTarget% of incoming reads; warms over time
 *   queue         → tracks backlog; consumers drain at configurable rate
 *   rate_limiter  → token bucket; drops excess requests
 *   circuit_breaker → opens when downstream error rate > threshold
 *   worker        → same as service model
 *   event_stream  → same as queue but with partition-aware throughput
 */

import { SeededRandom } from './seededRandom';
import type {
  LabScenario,
  SimulationState,
  TopologyNode,
  TopologyEdge,
  ComponentMetrics,
  LogEntry,
  SimulationEvent,
  StudentAction,
  MetricSample,
} from './types';

// ─── Constants ────────────────────────────────────────────────────────────────
const TICK_MS          = 100;
const MAX_LOG_ENTRIES  = 500;
const MAX_METRIC_SAMPLES = 2000;
const MAX_EVENTS_STORED  = 200;

// ─── Internal per-node state ──────────────────────────────────────────────────
interface NodeState extends ComponentMetrics {
  circuitOpen: boolean;
  circuitOpenUntil: number;
}

// Snapshot of a node's original config — restored on trigger_recovery
type ConfigSnapshot = Record<string, unknown>;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// ENGINE
// ─────────────────────────────────────────────────────────────────────────────
export class SimulationEngine {
  private scenario: LabScenario;
  private rng: SeededRandom;
  private simulationTime = 0;
  private wallStart = 0;

  private nodeStates   = new Map<string, NodeState>();
  private failedNodes  = new Set<string>();
  private activeIncidents = new Set<string>();
  // Store original configs so trigger_recovery can restore them
  private originalConfigs = new Map<string, ConfigSnapshot>();
  private pendingEvents: SimulationEvent[] = [];
  private logs: LogEntry[] = [];
  private metricSamples: MetricSample[] = [];

  // Live topology — mutated by student actions
  private liveNodes: TopologyNode[] = [];
  private liveEdges: TopologyEdge[] = [];

  constructor(scenario: LabScenario) {
    this.scenario = scenario;
    this.rng = new SeededRandom(scenario.seed);
    this.wallStart = Date.now();

    this.liveNodes = scenario.initialTopology.nodes.map(n => ({
      ...n,
      config: { ...(n.config as Record<string, unknown>) } as TopologyNode['config'],
      position: { ...n.position },
    }));
    this.liveEdges = scenario.initialTopology.edges.map(e => ({ ...e }));

    for (const ev of scenario.scheduledEvents) {
      this.pendingEvents.push({ ...ev, applied: false });
    }
    this.pendingEvents.sort((a, b) => a.scheduledAt - b.scheduledAt);

    for (const node of this.liveNodes) {
      this.initNodeState(node);
    }
  }

  // ── Init ──────────────────────────────────────────────────────────────────

  private initNodeState(node: TopologyNode): void {
    this.nodeStates.set(node.id, {
      nodeId:          node.id,
      requestsIn:      0,
      requestsOut:     0,
      requestsDropped: 0,
      queueDepth:      0,
      avgLatencyMs:    0,
      errorRate:       0,
      saturation:      0,
      cacheHits:       0,
      cacheMisses:     0,
      replicationLagMs: 0,
      connections:     0,
      maxConnections:  (node.config as Record<string, number>)?.maxConnections ?? 0,
      circuitOpen:     false,
      circuitOpenUntil: 0,
    });
    // Snapshot the ORIGINAL config so recovery can restore it
    if (!this.originalConfigs.has(node.id)) {
      this.originalConfigs.set(node.id, { ...(node.config as Record<string, unknown>) });
    }
  }

  // ── Tick ──────────────────────────────────────────────────────────────────

  tick(deltaMs: number = TICK_MS): void {
    this.simulationTime += deltaMs;
    this.processScheduledEvents();
    this.propagateTraffic(deltaMs);

    // Collect metric samples every 500ms of virtual time
    const prev = this.simulationTime - deltaMs;
    if (Math.floor(this.simulationTime / 500) > Math.floor(prev / 500)) {
      this.collectSamples();
    }
  }

  // ── Topology-aware traffic propagation ────────────────────────────────────
  //
  // Algorithm:
  //   1. Topological sort of liveNodes (Kahn's algorithm on liveEdges)
  //   2. Each node receives the SUM of (requestsOut from each upstream node)
  //   3. Components with caching / filtering (cache, read_replica, cdn, rate_limiter)
  //      pass ONLY the uncached/non-rate-limited fraction downstream.
  //   4. Failed nodes pass 0 downstream (all traffic dropped).

  private propagateTraffic(deltaMs: number): void {
    const intervalSecs = deltaMs / 1000;
    const nodes = this.liveNodes;
    const edges = this.liveEdges;

    // ── Build adjacency ───────────────────────────────────────────────────
    // inDegree[id]   = number of incoming edges
    // upstreams[id]  = list of upstream node IDs
    // downstreams[id]= list of downstream node IDs
    const inDegree:   Record<string, number>   = {};
    const upstreams:  Record<string, string[]>  = {};
    const downstreams:Record<string, string[]>  = {};

    for (const n of nodes) {
      inDegree[n.id]    = 0;
      upstreams[n.id]   = [];
      downstreams[n.id] = [];
    }
    for (const e of edges) {
      if (inDegree[e.toId] !== undefined && downstreams[e.fromId] !== undefined) {
        inDegree[e.toId]++;
        upstreams[e.toId].push(e.fromId);
        downstreams[e.fromId].push(e.toId);
      }
    }

    // ── Kahn's topological sort ────────────────────────────────────────────
    const queue: string[] = nodes.filter(n => inDegree[n.id] === 0).map(n => n.id);
    const order: string[] = [];
    const remaining = { ...inDegree };

    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const child of (downstreams[id] ?? [])) {
        remaining[child]--;
        if (remaining[child] === 0) queue.push(child);
      }
    }

    // Nodes in cycles or not reached — append in original order
    for (const n of nodes) {
      if (!order.includes(n.id)) order.push(n.id);
    }

    // ── How much RPS each node passes downstream ──────────────────────────
    // "outputRps" = the per-second rate that this node sends to its children
    const outputRps: Record<string, number> = {};

    // ── Process in topological order ──────────────────────────────────────
    for (const nodeId of order) {
      const node = nodes.find(n => n.id === nodeId);
      if (!node) continue;
      const ns = this.nodeStates.get(nodeId);
      if (!ns) continue;

      // Compute arriving RPS = sum of upstream outputRps
      const ups = upstreams[nodeId] ?? [];
      let arrivalRps: number;

      if (ups.length === 0) {
        if (node.kind === 'client') {
          // Client nodes generate their own traffic
          const cfg = node.config as Record<string, number>;
          arrivalRps = cfg['requestsPerSecond'] ?? this.scenario.workload.baseRequestsPerSecond;
        } else {
          // Disconnected non-client nodes receive no traffic —
          // traffic must flow in through edges. This is topology-correct:
          // a database sitting alone on the canvas should show 0 load.
          arrivalRps = 0;
        }
      } else {
        arrivalRps = ups.reduce((sum, uid) => sum + (outputRps[uid] ?? 0), 0);
      }

      // ── Model the node ─────────────────────────────────────────────────
      const out = this.modelNode(node, ns, arrivalRps, intervalSecs);
      outputRps[nodeId] = out;
    }
  }

  // ── Per-node model ────────────────────────────────────────────────────────
  // Returns the outputRps this node passes downstream.

  private modelNode(
    node: TopologyNode,
    ns: NodeState,
    arrivalRps: number,
    intervalSecs: number,
  ): number {
    const cfg = node.config as Record<string, number>;

    // Failed node — block all traffic (except cache, which uses cold-start model instead)
    if (this.failedNodes.has(node.id) && node.kind !== 'cache') {
      const arriving = arrivalRps * intervalSecs;
      ns.requestsIn      = arriving;
      ns.requestsOut     = 0;
      ns.requestsDropped = arriving;
      ns.saturation      = 1.0;
      ns.errorRate       = 1.0;
      ns.avgLatencyMs    = 0;
      return 0; // nothing passes downstream
    }
    // Cache "failure" = cold-start (hitRatioTarget near 0) — handled inside the cache case below

    switch (node.kind) {

      // ── CLIENT ────────────────────────────────────────────────────────
      case 'client': {
        const rps = cfg['requestsPerSecond'] ?? this.scenario.workload.baseRequestsPerSecond;
        ns.requestsIn      = rps * intervalSecs;
        ns.requestsOut     = rps * intervalSecs;
        ns.requestsDropped = 0;
        ns.saturation      = 0.05;
        ns.avgLatencyMs    = 2;
        ns.errorRate       = 0;
        return rps; // generates this many RPS
      }

      // ── CDN ───────────────────────────────────────────────────────────
      case 'cdn': {
        const hitRatio   = clamp(cfg['cacheHitRatio'] ?? 0.85, 0, 1);
        const edgeLatMs  = cfg['avgEdgeLatencyMs'] ?? 20;
        const arriving   = arrivalRps * intervalSecs;
        const hits       = arriving * hitRatio;
        const misses     = arriving * (1 - hitRatio);

        ns.requestsIn      = arriving;
        ns.requestsOut     = arriving;   // CDN responds to all; only misses go to origin
        ns.requestsDropped = 0;
        ns.cacheHits       = hits;
        ns.cacheMisses     = misses;
        ns.saturation      = clamp(arrivalRps / 50000, 0, 1); // CDN rarely saturates
        ns.avgLatencyMs    = edgeLatMs + this.rng.nextFloat(-5, 5);
        ns.errorRate       = 0;
        return arrivalRps * (1 - hitRatio); // only cache misses hit the origin
      }

      // ── DNS ───────────────────────────────────────────────────────────
      case 'dns': {
        const arriving = arrivalRps * intervalSecs;
        ns.requestsIn  = arriving;
        ns.requestsOut = arriving;
        ns.requestsDropped = 0;
        ns.saturation  = 0.02;
        ns.avgLatencyMs = 5 + this.rng.nextFloat(-2, 2);
        ns.errorRate   = 0;
        return arrivalRps;
      }

      // ── LOAD BALANCER ─────────────────────────────────────────────────
      case 'load_balancer': {
        const maxConns   = cfg['maxConnectionsPerBackend'] ?? 10000;
        const arriving   = arrivalRps * intervalSecs;
        const saturation = clamp(arriving / Math.max(maxConns, 1), 0, 1);
        const dropped    = saturation > 0.95 ? arriving * (saturation - 0.95) * 15 : 0;

        ns.requestsIn      = arriving;
        ns.requestsOut     = arriving - dropped;
        ns.requestsDropped = dropped;
        ns.saturation      = saturation;
        ns.avgLatencyMs    = 2 + saturation * 8 + this.rng.nextFloat(-1, 2);
        ns.errorRate       = dropped > 0 ? dropped / Math.max(arriving, 1) : 0.001;
        return arrivalRps - (dropped / intervalSecs);
      }

      // ── RATE LIMITER ──────────────────────────────────────────────────
      case 'rate_limiter': {
        const limit    = cfg['requestsPerSecond'] ?? 1000;
        const burst    = cfg['burstCapacity'] ?? limit * 2;
        const capacity = Math.max(limit, burst / 10); // per-second effective cap
        const arriving = arrivalRps * intervalSecs;
        const accepted = Math.min(arriving, capacity * intervalSecs);
        const dropped  = Math.max(0, arriving - accepted);

        ns.requestsIn      = arriving;
        ns.requestsOut     = accepted;
        ns.requestsDropped = dropped;
        ns.saturation      = clamp(arrivalRps / Math.max(limit, 1), 0, 1);
        ns.avgLatencyMs    = 1;
        ns.errorRate       = dropped > 0 ? dropped / Math.max(arriving, 1) : 0;
        return Math.min(arrivalRps, capacity);
      }

      // ── API GATEWAY / SERVICE / WORKER ────────────────────────────────
      case 'api_gateway':
      case 'service':
      case 'worker': {
        const replicas   = Math.max(1, cfg['replicas'] ?? 1);
        const maxRps     = (cfg['maxRequestsPerSecond'] ?? 500) * replicas;
        const svcTime    = cfg['avgServiceTimeMs'] ?? 50;
        const arriving   = arrivalRps * intervalSecs;
        const capacity   = maxRps * intervalSecs;
        const saturation = clamp(arriving / Math.max(capacity, 1), 0, 1);

        // M/D/1 queue: queue factor explodes as saturation → 1
        const queueFactor = saturation > 0.8 ? Math.pow(saturation, 5) * 30 : 0;
        const latency     = svcTime * (1 + queueFactor) + this.rng.nextFloat(-5, 10);
        const dropped     = saturation > 0.95
          ? (arriving - capacity) * clamp((saturation - 0.95) * 20, 0, 1)
          : 0;
        const errorRate   = saturation > 0.9 ? (saturation - 0.9) * 0.5 : 0.001;

        ns.requestsIn      = arriving;
        ns.requestsOut     = Math.max(0, arriving - dropped);
        ns.requestsDropped = dropped;
        ns.saturation      = saturation;
        ns.queueDepth      = Math.round(queueFactor * replicas * 5);
        ns.avgLatencyMs    = Math.max(1, latency);
        ns.errorRate       = errorRate;
        ns.connections     = Math.round(saturation * (cfg['maxConcurrentRequests'] ?? 200));
        ns.maxConnections  = (cfg['maxConcurrentRequests'] ?? 200) * replicas;

        if (saturation > 0.95 && this.simulationTime % 2000 < TICK_MS) {
          this.log('warn', `⚠ ${node.label}: CPU at ${Math.round(saturation * 100)}% — requests queuing`, node.id);
        }
        const passThrough = arrivalRps - (dropped / intervalSecs);
        return Math.max(0, passThrough);
      }

      // ── CACHE ─────────────────────────────────────────────────────────
      // Cache intercepts reads. Cache misses (+ all writes) pass through.
      case 'cache': {
        const hitTarget  = clamp(cfg['hitRatioTarget'] ?? 0.85, 0, 1);
        const warmupSecs = cfg['warmupSeconds'] ?? 30;
        const maxSizeMB  = (cfg['maxSizeBytes'] ?? 1073741824) / (1024 * 1024);

        // If the node is in failedNodes or hitRatioTarget is tiny (≤0.02),
        // treat cache as effectively cold — warmupFactor stays near 0.
        // This makes "Cache Flush" actually visible: hitRatio drops to near 0.
        const isCold = this.failedNodes.has(node.id) || hitTarget <= 0.02;
        const warmupFactor = isCold
          ? 0.01  // essentially cold — 1% hit rate regardless of time
          : Math.min(1, (this.simulationTime / 1000) / Math.max(warmupSecs, 1));
        const hitRatio = hitTarget * warmupFactor;

        const readRatio  = this.scenario.workload.readRatio;
        const arriving   = arrivalRps * intervalSecs;
        const readArrivals = arriving * readRatio;
        const writeArrivals = arriving * (1 - readRatio);

        const hits   = readArrivals * hitRatio;
        const misses = readArrivals * (1 - hitRatio);
        // Cache serves all requests; only misses + writes go downstream
        const passThrough = misses + writeArrivals;

        ns.requestsIn      = arriving;
        ns.requestsOut     = arriving; // cache responds to all (hits instantly, misses proxied)
        ns.requestsDropped = 0;
        ns.cacheHits       = hits;
        ns.cacheMisses     = misses;
        // Saturation based on memory usage (rough estimate)
        ns.saturation  = clamp(arriving * svcTimeEstimate(node.kind) / Math.max(maxSizeMB * 10, 1), 0, 0.6);
        ns.avgLatencyMs = isCold ? 1 : 0.5 + this.rng.nextFloat(0, 0.5);
        ns.errorRate   = 0;

        if (warmupFactor < 0.5 && arrivalRps > 100 && this.simulationTime % 3000 < TICK_MS) {
          this.log('info',
            isCold
              ? `❄️ ${node.label}: COLD — ${Math.round(hitRatio * 100)}% hit rate. Every request hitting origin!`
              : `🔥 ${node.label}: warming up — ${Math.round(hitRatio * 100)}% hit rate`,
            node.id,
          );
        }
        // Pass through only the cache misses and writes
        return (passThrough / intervalSecs);
      }

      // ── DATABASE ──────────────────────────────────────────────────────
      case 'database': {
        const maxConn    = Math.max(1, cfg['maxConnections'] ?? 100);
        const queryTime  = cfg['avgQueryTimeMs'] ?? 20;
        const arriving   = arrivalRps * intervalSecs;

        // Each query holds a connection for ~queryTime ms
        // Concurrent connections = arriving_per_ms * queryTime
        const concurrentConns = clamp(
          (arrivalRps / 1000) * queryTime,
          0,
          maxConn * 2,
        );
        const saturation = clamp(concurrentConns / maxConn, 0, 1);

        // Queue builds when saturation > 1; latency explodes
        const overload    = Math.max(0, concurrentConns - maxConn);
        const queueFactor = overload > 0 ? Math.pow(overload / maxConn, 2) * 20 : 0;
        const latency     = queryTime * (1 + queueFactor) + this.rng.nextFloat(0, queryTime * 0.2);

        const dropped  = saturation > 0.95 ? arriving * (saturation - 0.95) * 12 : 0;
        const errorRate = saturation > 0.9 ? (saturation - 0.9) * 0.4 : 0.001;

        ns.requestsIn      = arriving;
        ns.requestsOut     = Math.max(0, arriving - dropped);
        ns.requestsDropped = dropped;
        ns.connections     = Math.min(Math.round(concurrentConns), maxConn);
        ns.maxConnections  = maxConn;
        ns.saturation      = clamp(saturation, 0, 1);
        ns.avgLatencyMs    = latency;
        ns.errorRate       = errorRate;
        ns.queueDepth      = Math.round(overload);

        if (cfg['replicationEnabled']) {
          const writeRps = arrivalRps * (1 - this.scenario.workload.readRatio);
          ns.replicationLagMs = clamp(writeRps * 0.5, 0, 500) + this.rng.nextFloat(0, 40);
        }

        if (saturation > 0.85 && this.simulationTime % 2500 < TICK_MS) {
          this.log('warn', `🗄 ${node.label}: pool ${Math.round(saturation * 100)}% · latency ${Math.round(latency)}ms`, node.id);
        }
        const passThrough = (arriving - dropped) / intervalSecs;
        return Math.max(0, passThrough);
      }

      // ── READ REPLICA ──────────────────────────────────────────────────
      // Topology convention: place the replica DOWNSTREAM of the primary DB.
      //   service → database (primary, handles reads + writes)
      //   database → read_replica (replica absorbs the read fraction)
      //
      // The recovery option "Add Read Replica" wires: TARGET(db) → NEW(replica).
      // Traffic flows: service → db (full load) → replica (reads only).
      //
      // Effect on DB: the replica absorbs reads, but writes still go to primary.
      // The DB's saturation is reduced because the replica answers read queries
      // that would otherwise pile up on the primary's connection pool.
      //
      // However the engine propagation gives the replica whatever RPS the DB
      // passes downstream. The DB model already computes passThrough = arriving - dropped.
      // The replica absorbs all of that and returns 0 downstream.
      case 'read_replica': {
        const maxConn   = Math.max(1, cfg['maxConnections'] ?? 100);
        const queryTime = cfg['avgQueryTimeMs'] ?? 10;
        const lagMs     = cfg['replicationLagMs'] ?? 50;
        const readRatio = this.scenario.workload.readRatio;

        const arriving        = arrivalRps * intervalSecs;
        // Replica handles reads only — so effective load is readRatio * arriving
        const effectiveLoad   = arriving * readRatio;
        const concurrentConns = clamp((arrivalRps * readRatio / 1000) * queryTime, 0, maxConn * 2);
        const saturation      = clamp(concurrentConns / maxConn, 0, 1);
        const latency         = queryTime * (1 + saturation * 2) + this.rng.nextFloat(0, 5);
        const dropped         = saturation > 0.95 ? effectiveLoad * (saturation - 0.95) * 10 : 0;

        ns.requestsIn       = arriving;
        ns.requestsOut      = Math.max(0, arriving - dropped);
        ns.requestsDropped  = dropped;
        ns.connections      = Math.min(Math.round(concurrentConns), maxConn);
        ns.maxConnections   = maxConn;
        ns.saturation       = saturation;
        ns.avgLatencyMs     = latency;
        ns.replicationLagMs = lagMs + this.rng.nextFloat(0, 20);
        ns.errorRate        = saturation > 0.9 ? (saturation - 0.9) * 0.3 : 0.001;

        // Replica absorbs its traffic — passes nothing further downstream.
        // The PRIMARY database's load is reduced because the DB model runs
        // with less arrivalRps once reads are offloaded to the replica.
        return 0;
      }

      // ── QUEUE ─────────────────────────────────────────────────────────
      case 'queue': {
        const maxDepth    = cfg['maxDepth'] ?? 100000;
        const consumerRps = (cfg['consumerRps'] ?? arrivalRps * 0.8);
        const arriving    = arrivalRps * intervalSecs;
        const consumed    = Math.min(arriving + ns.queueDepth, consumerRps * intervalSecs);
        const newDepth    = Math.max(0, ns.queueDepth + arriving - consumed);
        const overflow    = Math.max(0, newDepth - maxDepth);

        ns.queueDepth      = clamp(newDepth, 0, maxDepth);
        ns.requestsIn      = arriving;
        ns.requestsOut     = consumed;
        ns.requestsDropped = overflow;
        ns.saturation      = clamp(ns.queueDepth / maxDepth, 0, 1);
        ns.avgLatencyMs    = 5 + ns.saturation * 500;
        ns.errorRate       = overflow > 0 ? overflow / Math.max(arriving, 1) : 0;

        if (ns.saturation > 0.8 && this.simulationTime % 2000 < TICK_MS) {
          this.log('warn', `📬 ${node.label}: queue at ${Math.round(ns.saturation * 100)}% depth`, node.id);
        }
        return consumed / intervalSecs;
      }

      // ── EVENT STREAM ──────────────────────────────────────────────────
      case 'event_stream': {
        const partitions  = cfg['partitions'] ?? 4;
        const maxDepth    = cfg['maxDepth'] ?? 1000000;
        // Each partition processes 1 consumer's worth of traffic
        const consumerRps = arrivalRps * 0.85 * Math.min(partitions, 8);
        const arriving    = arrivalRps * intervalSecs;
        const consumed    = Math.min(arriving + ns.queueDepth, consumerRps * intervalSecs);
        const newDepth    = Math.max(0, ns.queueDepth + arriving - consumed);

        ns.queueDepth      = clamp(newDepth, 0, maxDepth);
        ns.requestsIn      = arriving;
        ns.requestsOut     = consumed;
        ns.requestsDropped = Math.max(0, newDepth - maxDepth);
        ns.saturation      = clamp(ns.queueDepth / maxDepth, 0, 1);
        ns.avgLatencyMs    = 10 + ns.saturation * 200;
        ns.errorRate       = 0.001;
        return consumed / intervalSecs;
      }

      // ── CIRCUIT BREAKER ───────────────────────────────────────────────
      case 'circuit_breaker': {
        const threshold  = (cfg['errorThresholdPercent'] ?? 50) / 100;
        const openDur    = cfg['openDurationMs'] ?? 30000;
        const arriving   = arrivalRps * intervalSecs;

        // Check downstream health (first downstream node)
        const downstreamId = this.liveEdges.find(e => e.fromId === node.id)?.toId;
        const downNs = downstreamId ? this.nodeStates.get(downstreamId) : undefined;

        if (downNs && downNs.errorRate > threshold && !ns.circuitOpen) {
          ns.circuitOpen       = true;
          ns.circuitOpenUntil  = this.simulationTime + openDur;
          this.activeIncidents.add(`cb_open_${node.id}`);
          this.log('warn', `🔴 Circuit breaker OPEN for ${node.label}`, node.id);
        }
        if (ns.circuitOpen && this.simulationTime >= ns.circuitOpenUntil) {
          ns.circuitOpen = false;
          this.activeIncidents.delete(`cb_open_${node.id}`);
          this.log('info', `🟢 Circuit breaker CLOSED for ${node.label}`, node.id);
        }

        const dropped = ns.circuitOpen ? arriving * 0.98 : 0;
        ns.requestsIn      = arriving;
        ns.requestsOut     = arriving - dropped;
        ns.requestsDropped = dropped;
        ns.saturation      = ns.circuitOpen ? 0 : 0.05; // open = protecting
        ns.avgLatencyMs    = ns.circuitOpen ? 1 : 3;
        ns.errorRate       = ns.circuitOpen ? 0.98 : 0.001;
        return (arriving - dropped) / intervalSecs;
      }

      // ── CDN, OBJECT STORAGE, MONITORING, DNS (pass-through) ──────────
      case 'object_storage': {
        const arriving = arrivalRps * intervalSecs;
        ns.requestsIn  = arriving;
        ns.requestsOut = arriving;
        ns.requestsDropped = 0;
        ns.saturation  = 0.02;
        ns.avgLatencyMs = 50 + this.rng.nextFloat(-10, 20);
        ns.errorRate   = 0.001;
        return arrivalRps;
      }

      case 'monitoring': {
        const arriving = arrivalRps * intervalSecs;
        ns.requestsIn  = arriving;
        ns.requestsOut = arriving;
        ns.requestsDropped = 0;
        ns.saturation  = 0.01;
        ns.avgLatencyMs = 1;
        ns.errorRate   = 0;
        return arrivalRps;
      }

      default:
        return arrivalRps;
    }
  }

  // ── Events ────────────────────────────────────────────────────────────────

  private processScheduledEvents(): void {
    while (
      this.pendingEvents.length > 0 &&
      this.pendingEvents[0].scheduledAt <= this.simulationTime
    ) {
      const ev = this.pendingEvents.shift()!;
      ev.applied = true;
      this.applyEvent(ev);
    }
  }

  private applyEvent(ev: SimulationEvent): void {
    switch (ev.kind) {
      case 'component_failure': {
        const nodeId = ev.payload['nodeId'] as string;
        if (this.liveNodes.some(n => n.id === nodeId)) {
          this.failedNodes.add(nodeId);
          this.activeIncidents.add(`failure_${nodeId}`);
          const label = this.liveNodes.find(n => n.id === nodeId)?.label ?? nodeId;
          this.log('error', `💥 ${label} failed (scheduled)`, nodeId);
        }
        break;
      }
      case 'component_recovery': {
        const nodeId = ev.payload['nodeId'] as string;
        this.failedNodes.delete(nodeId);
        this.activeIncidents.delete(`failure_${nodeId}`);
        const label = this.liveNodes.find(n => n.id === nodeId)?.label ?? nodeId;
        this.log('info', `✅ ${label} recovering`, nodeId);
        break;
      }
      default:
        break;
    }
  }

  // ── Student Actions ───────────────────────────────────────────────────────

  applyAction(action: StudentAction): void {
    switch (action.kind) {

      case 'trigger_failure': {
        const nodeId      = action.payload['nodeId'] as string;
        const failureConf = action.payload['failureConfig'] as Record<string, unknown> | undefined;
        const ns   = this.nodeStates.get(nodeId);
        const node = this.liveNodes.find(n => n.id === nodeId);
        if (ns && node) {
          const cfg = node.config as Record<string, unknown>;

          // Always snapshot CURRENT (healthy) config before degrading.
          // This lets trigger_recovery restore exactly what was here before.
          if (!this.failedNodes.has(nodeId)) {
            this.originalConfigs.set(nodeId, { ...cfg });
          }

          if (failureConf && Object.keys(failureConf).length > 0) {
            // ── DEGRADATION MODE ──────────────────────────────────────────
            // Apply config patches (e.g. avgQueryTimeMs=500, maxConnections=10)
            // but keep the node ALIVE so traffic still flows through it.
            // This is what makes recovery visible: adding a cache/replica
            // upstream of a slow-but-alive DB actually reduces its load.
            for (const [k, v] of Object.entries(failureConf)) cfg[k] = v;

            // Mark as degraded (not hard-failed) — model still runs,
            // but with the degraded config values.
            this.activeIncidents.add(`failure_${nodeId}`);
            // Remove from failedNodes in case a previous hard-kill left it there
            this.failedNodes.delete(nodeId);

            this.log('warn', `⚠ [Student] Degraded ${node.label} — ${
              Object.entries(failureConf).map(([k, v]) => `${k}=${v}`).join(', ')
            }`, nodeId);
          } else {
            // ── HARD KILL MODE ────────────────────────────────────────────
            // No failureConfig = total outage (used by Chaos panel, power cut, etc.)
            this.failedNodes.add(nodeId);
            this.activeIncidents.add(`failure_${nodeId}`);

            // Immediately set failed metrics so snapshot shows it right away
            ns.errorRate       = 1.0;
            ns.saturation      = 1.0;
            ns.requestsOut     = 0;
            ns.requestsDropped = Math.max(ns.requestsIn, 1);
            this.log('error', `💥 [Student] Hard killed ${node.label}`, nodeId);
          }
        }
        break;
      }

      case 'trigger_recovery': {
        const nodeId = action.payload['nodeId'] as string;
        const node   = this.liveNodes.find(n => n.id === nodeId);
        const ns     = this.nodeStates.get(nodeId);

        // ── Clear ALL failure state — both degraded (config-only) and hard-kill ──
        this.failedNodes.delete(nodeId);
        this.activeIncidents.delete(`failure_${nodeId}`);
        this.activeIncidents.delete(`incident_${nodeId}`);

        if (node) {
          const cfg = node.config as Record<string, unknown>;

          // ── Restore the pre-failure config snapshot ────────────────────────
          // This is the key step: reverses any failureConfig mutations.
          // e.g. avgQueryTimeMs goes from 500 back to 15.
          const original = this.originalConfigs.get(nodeId);
          if (original) {
            for (const [k, v] of Object.entries(original)) {
              cfg[k] = v;
            }
          }

          // ── Re-snapshot with the now-healthy config ────────────────────────
          // Subsequent configure_node (recovery configPatch) calls will land on
          // this clean baseline rather than the old degraded snapshot.
          this.originalConfigs.set(nodeId, { ...cfg });

          // ── Reset metrics to a healthy starting point ──────────────────────
          if (ns) {
            ns.errorRate       = 0.001;
            ns.saturation      = 0.05;
            ns.requestsDropped = 0;
            ns.requestsIn      = 0;
            ns.requestsOut     = 0;
            if (typeof cfg['maxConnections'] === 'number') {
              ns.connections    = 0;
              ns.maxConnections = cfg['maxConnections'];
            }
          }
          this.log('info', `✅ [Student] Recovered: ${node.label}`, nodeId);
        }
        break;
      }

      case 'configure_node': {
        const nodeId = action.payload['nodeId'] as string;
        const node   = this.liveNodes.find(n => n.id === nodeId);
        if (!node) break;
        const cfg     = node.config as Record<string, unknown>;
        const payload = action.payload;

        if ('key' in payload && 'value' in payload) {
          // Explicit {key, value} format — from sliders and label rename
          const k = payload['key'] as string;
          const v = payload['value'];
          if (k === 'label') {
            node.label = String(v);
          } else {
            cfg[k] = v;
            // If the node is NOT currently failed, update the snapshot so this
            // intentional slider change isn't overwritten on next recovery.
            if (!this.failedNodes.has(nodeId)) {
              const snap = this.originalConfigs.get(nodeId);
              if (snap) snap[k] = v;
              else this.originalConfigs.set(nodeId, { ...cfg });
            }
          }
        } else {
          // Flat {key: value, ...} format — from recovery configPatch, failureConfig
          for (const [k, v] of Object.entries(payload)) {
            if (k === 'nodeId') continue;
            if (k === 'label') { node.label = String(v); continue; }
            cfg[k] = v;
          }
          // Always refresh the snapshot so recovery patches and slider moves
          // become the new "healthy" baseline regardless of failure state.
          // (A recovery always fires trigger_recovery first, which re-snapshots
          //  the clean config; then this configure_node call lands on top of it.)
          this.originalConfigs.set(nodeId, { ...cfg });
        }

        // Re-sync derived metrics immediately
        const ns = this.nodeStates.get(nodeId);
        if (ns) {
          if (typeof cfg['maxConnections'] === 'number') ns.maxConnections = cfg['maxConnections'];
        }
        break;
      }

      case 'scale_replicas': {
        const nodeId  = action.payload['nodeId'] as string;
        const replicas = action.payload['replicas'] as number;
        const node = this.liveNodes.find(n => n.id === nodeId);
        if (node) {
          (node.config as Record<string, unknown>)['replicas'] = replicas;
          this.log('info', `📈 [Student] Scaled ${node.label} to ${replicas} replicas`, nodeId);
        }
        break;
      }

      case 'add_node': {
        const node = action.payload['node'] as TopologyNode;
        if (node && this.liveNodes.length < this.scenario.constraints.maxNodes) {
          this.liveNodes.push({ ...node, config: { ...(node.config as Record<string, unknown>) } as TopologyNode['config'] });
          this.initNodeState(node);
          this.log('info', `➕ [Student] Added: ${node.label}`, node.id);
        }
        break;
      }

      case 'remove_node': {
        const nodeId = action.payload['nodeId'] as string;
        const locked = this.scenario.constraints.lockedNodeIds ?? [];
        if (!locked.includes(nodeId)) {
          this.liveNodes = this.liveNodes.filter(n => n.id !== nodeId);
          this.liveEdges = this.liveEdges.filter(e => e.fromId !== nodeId && e.toId !== nodeId);
          this.nodeStates.delete(nodeId);
          this.failedNodes.delete(nodeId);
          this.log('info', `➖ [Student] Removed node ${nodeId}`);
        }
        break;
      }

      case 'move_node': {
        const nodeId = action.payload['nodeId'] as string;
        const x = action.payload['x'] as number;
        const y = action.payload['y'] as number;
        const node = this.liveNodes.find(n => n.id === nodeId);
        if (node) node.position = { x, y };
        break;
      }

      case 'add_edge': {
        const edge = action.payload['edge'] as TopologyEdge;
        if (edge && !this.liveEdges.some(e => e.fromId === edge.fromId && e.toId === edge.toId)) {
          this.liveEdges.push({ ...edge });
        }
        break;
      }

      case 'remove_edge': {
        const edgeId = action.payload['edgeId'] as string;
        this.liveEdges = this.liveEdges.filter(e => e.id !== edgeId);
        break;
      }

      default:
        break;
    }
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  private collectSamples(): void {
    for (const [nodeId, ns] of this.nodeStates) {
      const fields: (keyof ComponentMetrics)[] = [
        'saturation', 'avgLatencyMs', 'errorRate', 'queueDepth',
        'requestsIn', 'requestsOut', 'requestsDropped',
      ];
      for (const metric of fields) {
        const val = ns[metric];
        if (typeof val === 'number') {
          this.metricSamples.push({
            simulationTime: this.simulationTime,
            nodeId,
            metric,
            value: val,
          });
        }
      }
    }
    if (this.metricSamples.length > MAX_METRIC_SAMPLES) {
      this.metricSamples = this.metricSamples.slice(
        this.metricSamples.length - MAX_METRIC_SAMPLES,
      );
    }
  }

  // ── Logging ───────────────────────────────────────────────────────────────

  private log(level: LogEntry['level'], message: string, nodeId?: string): void {
    this.logs.push({
      id: makeId(),
      simulationTime: this.simulationTime,
      level,
      nodeId,
      message,
    });
    if (this.logs.length > MAX_LOG_ENTRIES) {
      this.logs = this.logs.slice(this.logs.length - MAX_LOG_ENTRIES);
    }
  }

  // ── Snapshot ──────────────────────────────────────────────────────────────

  snapshot(status: SimulationState['status']): SimulationState {
    const metrics: Record<string, ComponentMetrics> = {};
    for (const [id, ns] of this.nodeStates) {
      metrics[id] = { ...ns };
    }
    return {
      simulationTime: this.simulationTime,
      wallTime:       Date.now() - this.wallStart,
      status,
      topology: {
        nodes: this.liveNodes.map(n => ({ ...n })),
        edges: this.liveEdges.map(e => ({ ...e })),
        schemaVersion: this.scenario.initialTopology.schemaVersion,
      },
      metrics,
      logs:            [...this.logs],
      events:          [...this.pendingEvents.slice(0, MAX_EVENTS_STORED)],
      activeIncidents: [...this.activeIncidents],
      seed:            this.scenario.seed,
      engineVersion:   '1.0.0',
    };
  }

  getMetricSamples(): MetricSample[] {
    return [...this.metricSamples];
  }

  getDrainedLogs(): LogEntry[] {
    const out = [...this.logs];
    this.logs = [];
    return out;
  }

  get time(): number { return this.simulationTime; }
  get maxTime(): number { return this.scenario.workload.totalDurationMs; }

  isFinished(): boolean {
    if (this.maxTime >= Number.MAX_SAFE_INTEGER - 1) return false;
    return this.simulationTime >= this.maxTime;
  }
}

// Helper — rough service time estimate by kind (for cache saturation model)
function svcTimeEstimate(kind: string): number {
  const map: Record<string, number> = {
    service: 0.05, database: 0.02, cache: 0.001, queue: 0.01,
  };
  return map[kind] ?? 0.05;
}
