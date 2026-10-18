/**
 * Cost Model — estimates monthly infrastructure cost for a topology.
 *
 * Uses realistic AWS/GCP-style pricing tiers.
 * All costs are illustrative — labeled clearly as estimates.
 * The goal is to teach cost vs performance trade-offs, not quote exact prices.
 */

import type { TopologyNode, ComponentKind } from './types';

// ─── Pricing table (USD / month) ─────────────────────────────────────────────

interface CostEntry {
  baseMonthly: number;         // fixed monthly cost per instance
  perReplicaMonthly: number;   // additional cost per replica beyond 1
  description: string;
  category: 'compute' | 'storage' | 'network' | 'managed';
}

const COST_TABLE: Record<ComponentKind, CostEntry> = {
  client: {
    baseMonthly: 0,
    perReplicaMonthly: 0,
    description: 'Traffic generator (no infra cost)',
    category: 'compute',
  },
  cdn: {
    baseMonthly: 50,
    perReplicaMonthly: 0,
    description: 'CDN (CloudFront/Cloudflare) — ~$0.01/GB, ~50GB/mo base',
    category: 'network',
  },
  dns: {
    baseMonthly: 5,
    perReplicaMonthly: 0,
    description: 'DNS service (Route53/Cloud DNS)',
    category: 'network',
  },
  load_balancer: {
    baseMonthly: 20,
    perReplicaMonthly: 0,
    description: 'Application Load Balancer — $0.008/LCU/hr',
    category: 'network',
  },
  api_gateway: {
    baseMonthly: 80,
    perReplicaMonthly: 60,
    description: 'API Gateway service — 2 vCPU, 4GB RAM per instance',
    category: 'compute',
  },
  service: {
    baseMonthly: 70,
    perReplicaMonthly: 70,
    description: 'App server — c5.large (~2 vCPU, 4GB RAM) $0.085/hr',
    category: 'compute',
  },
  worker: {
    baseMonthly: 40,
    perReplicaMonthly: 40,
    description: 'Worker — t3.medium (2 vCPU, 4GB RAM) $0.052/hr',
    category: 'compute',
  },
  database: {
    baseMonthly: 200,
    perReplicaMonthly: 0,
    description: 'RDS db.r5.large (2 vCPU, 16GB RAM) — Multi-AZ $0.48/hr',
    category: 'managed',
  },
  read_replica: {
    baseMonthly: 140,
    perReplicaMonthly: 0,
    description: 'RDS Read Replica db.r5.large $0.24/hr',
    category: 'managed',
  },
  cache: {
    baseMonthly: 120,
    perReplicaMonthly: 0,
    description: 'ElastiCache Redis r6g.large (2 vCPU, 13GB) $0.166/hr',
    category: 'managed',
  },
  queue: {
    baseMonthly: 15,
    perReplicaMonthly: 0,
    description: 'SQS — $0.40/million requests, ~37M/mo base',
    category: 'managed',
  },
  event_stream: {
    baseMonthly: 180,
    perReplicaMonthly: 0,
    description: 'MSK Kafka — kafka.m5.large × 2 brokers + storage',
    category: 'managed',
  },
  object_storage: {
    baseMonthly: 25,
    perReplicaMonthly: 0,
    description: 'S3 — $0.023/GB, ~1TB/mo base',
    category: 'storage',
  },
  rate_limiter: {
    baseMonthly: 10,
    perReplicaMonthly: 0,
    description: 'Rate limiter (Redis-based) — shared with cache tier typically',
    category: 'compute',
  },
  circuit_breaker: {
    baseMonthly: 5,
    perReplicaMonthly: 0,
    description: 'Circuit breaker (sidecar/library) — minimal compute overhead',
    category: 'compute',
  },
  monitoring: {
    baseMonthly: 50,
    perReplicaMonthly: 0,
    description: 'CloudWatch/Datadog — metrics, logs, traces, alerts',
    category: 'managed',
  },
};

// ─── Per-node cost calculation ───────────────────────────────────────────────

export interface NodeCost {
  nodeId:     string;
  nodeLabel:  string;
  kind:       ComponentKind;
  monthly:    number;
  breakdown:  string;
  category:   CostEntry['category'];
}

export interface TopologyCostSummary {
  nodes:        NodeCost[];
  totalMonthly: number;
  totalYearly:  number;
  byCategory:   Record<string, number>;
  highlights:   string[];      // notable observations
}

export function calculateTopologyCost(nodes: TopologyNode[]): TopologyCostSummary {
  const nodeCosts: NodeCost[] = [];

  for (const node of nodes) {
    const entry = COST_TABLE[node.kind];
    if (!entry) continue;

    const cfg = node.config as Record<string, unknown>;
    const replicas = (cfg['replicas'] as number | undefined) ?? 1;

    // Base + replica cost
    const monthly = entry.baseMonthly + Math.max(0, replicas - 1) * entry.perReplicaMonthly;

    // Memory-adjusted cost for cache (8GB base, +$20 per extra 8GB)
    let adjustedMonthly = monthly;
    if (node.kind === 'cache') {
      const sizeMB = ((cfg['maxSizeBytes'] as number | undefined) ?? 1073741824) / (1024 * 1024);
      const extraTiers = Math.max(0, Math.floor(sizeMB / 8192) - 1);
      adjustedMonthly += extraTiers * 120;
    }

    // Connection-pool adjusted DB cost (>200 connections = larger instance)
    if (node.kind === 'database' || node.kind === 'read_replica') {
      const maxConn = (cfg['maxConnections'] as number | undefined) ?? 100;
      if (maxConn > 500) adjustedMonthly *= 2;
      else if (maxConn > 200) adjustedMonthly *= 1.5;
    }

    nodeCosts.push({
      nodeId:    node.id,
      nodeLabel: node.label,
      kind:      node.kind,
      monthly:   Math.round(adjustedMonthly),
      breakdown: `${entry.description}${replicas > 1 ? ` × ${replicas} replicas` : ''}`,
      category:  entry.category,
    });
  }

  const totalMonthly = nodeCosts.reduce((s, n) => s + n.monthly, 0);

  const byCategory: Record<string, number> = {};
  for (const n of nodeCosts) {
    byCategory[n.category] = (byCategory[n.category] ?? 0) + n.monthly;
  }

  // Generate meaningful highlights
  const highlights: string[] = [];

  const topNode = [...nodeCosts].sort((a, b) => b.monthly - a.monthly)[0];
  if (topNode) {
    highlights.push(`Biggest cost: ${topNode.nodeLabel} at $${topNode.monthly}/mo (${Math.round(topNode.monthly / totalMonthly * 100)}%)`);
  }

  const managedCost = byCategory['managed'] ?? 0;
  if (managedCost > totalMonthly * 0.6) {
    highlights.push(`Managed services dominate (${Math.round(managedCost / totalMonthly * 100)}%) — high convenience, low ops overhead`);
  }

  const computeCost = byCategory['compute'] ?? 0;
  if (computeCost > totalMonthly * 0.5) {
    highlights.push(`Compute-heavy topology (${Math.round(computeCost / totalMonthly * 100)}%) — consider Reserved Instances for 30–40% savings`);
  }

  const hasCache = nodeCosts.some(n => n.kind === 'cache');
  const dbCost   = nodeCosts.filter(n => n.kind === 'database' || n.kind === 'read_replica')
    .reduce((s, n) => s + n.monthly, 0);
  if (!hasCache && dbCost > 200) {
    highlights.push(`💡 Add a cache layer — at $120/mo it would reduce DB load by ~80%, potentially allowing a smaller DB instance`);
  }

  const services = nodeCosts.filter(n => n.kind === 'service' || n.kind === 'api_gateway');
  if (services.length > 0) {
    const svcTotal = services.reduce((s, n) => s + n.monthly, 0);
    highlights.push(`Spot/preemptible instances for stateless services could save $${Math.round(svcTotal * 0.6)}/mo (60% off)`);
  }

  return {
    nodes:        nodeCosts,
    totalMonthly,
    totalYearly:  totalMonthly * 12,
    byCategory,
    highlights,
  };
}

// ─── Human-readable formatting ───────────────────────────────────────────────

export function fmtCost(usd: number): string {
  if (usd >= 10000) return `$${(usd / 1000).toFixed(1)}k`;
  if (usd >= 1000)  return `$${(usd / 1000).toFixed(2)}k`;
  return `$${usd}`;
}
