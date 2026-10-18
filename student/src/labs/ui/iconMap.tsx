/**
 * iconMap — Lucide icon + color mapping for every ComponentKind.
 * Used by the palette, canvas nodes, inspector header, and incident panel.
 */
import React from 'react';
import {
  Globe,         // cdn
  Network,       // dns
  Shuffle,       // load_balancer
  Layers,        // api_gateway
  Box,           // service
  Database,      // database
  Copy,          // read_replica
  Zap,           // cache
  Mail,          // queue
  Radio,         // event_stream
  Cpu,           // worker
  HardDrive,     // object_storage
  Gauge,         // rate_limiter
  ShieldAlert,   // circuit_breaker
  Activity,      // monitoring
  Users,         // client
} from 'lucide-react';
import type { ComponentKind } from '../engine/types';

export interface KindMeta {
  Icon: React.FC<{ size?: number; color?: string; strokeWidth?: number }>;
  color: string;          // icon / accent color
  bg: string;             // soft background
  label: string;
  description: string;
}

export const KIND_META: Record<ComponentKind, KindMeta> = {
  client: {
    Icon: Users,
    color: '#6B7280',
    bg: '#F3F4F6',
    label: 'Traffic Client',
    description: 'Generates request traffic towards the system',
  },
  cdn: {
    Icon: Globe,
    color: '#7C3AED',
    bg: '#EDE9FE',
    label: 'CDN / Edge Cache',
    description: 'Edge cache — reduces origin traffic on read-heavy workloads',
  },
  dns: {
    Icon: Network,
    color: '#0891B2',
    bg: '#E0F2FE',
    label: 'DNS',
    description: 'Resolves hostnames — supports routing and failover',
  },
  load_balancer: {
    Icon: Shuffle,
    color: '#0284C7',
    bg: '#E0F2FE',
    label: 'Load Balancer',
    description: 'Distributes traffic across backend replicas',
  },
  api_gateway: {
    Icon: Layers,
    color: '#0EA5E9',
    bg: '#E0F2FE',
    label: 'API Gateway',
    description: 'Centralized API entry-point with auth and routing',
  },
  service: {
    Icon: Box,
    color: '#2563EB',
    bg: '#DBEAFE',
    label: 'App Service',
    description: 'Stateless application replica — horizontally scalable',
  },
  database: {
    Icon: Database,
    color: '#1D4ED8',
    bg: '#DBEAFE',
    label: 'Database',
    description: 'SQL / NoSQL persistent store with connection limits',
  },
  read_replica: {
    Icon: Copy,
    color: '#3B82F6',
    bg: '#DBEAFE',
    label: 'Read Replica',
    description: 'Read-only replica — scales read throughput, may be stale',
  },
  cache: {
    Icon: Zap,
    color: '#0D9488',
    bg: '#CCFBF1',
    label: 'Cache',
    description: 'In-memory key-value store — drastically reduces latency',
  },
  queue: {
    Icon: Mail,
    color: '#D97706',
    bg: '#FEF3C7',
    label: 'Message Queue',
    description: 'Async decoupling — buffers producers from consumers',
  },
  event_stream: {
    Icon: Radio,
    color: '#B45309',
    bg: '#FEF3C7',
    label: 'Event Stream',
    description: 'Kafka-style partitioned stream with consumer groups',
  },
  worker: {
    Icon: Cpu,
    color: '#9333EA',
    bg: '#F3E8FF',
    label: 'Worker',
    description: 'Background processor — consumes queue or stream events',
  },
  object_storage: {
    Icon: HardDrive,
    color: '#6B7280',
    bg: '#F3F4F6',
    label: 'Object Storage',
    description: 'S3-style blob store — cheap, durable, high-latency',
  },
  rate_limiter: {
    Icon: Gauge,
    color: '#DC2626',
    bg: '#FEE2E2',
    label: 'Rate Limiter',
    description: 'Token-bucket / sliding-window — enforces ingress cap',
  },
  circuit_breaker: {
    Icon: ShieldAlert,
    color: '#EF4444',
    bg: '#FEE2E2',
    label: 'Circuit Breaker',
    description: 'Auto-opens on downstream errors — prevents cascade failures',
  },
  monitoring: {
    Icon: Activity,
    color: '#10B981',
    bg: '#D1FAE5',
    label: 'Monitoring',
    description: 'Observability layer — collects metrics, logs, traces',
  },
};

/** Render the icon for a given kind inside a styled badge */
export const KindBadge: React.FC<{
  kind: ComponentKind;
  size?: number;
  iconSize?: number;
}> = ({ kind, size = 36, iconSize = 18 }) => {
  const meta = KIND_META[kind];
  const { Icon, color, bg } = meta;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.28,
        background: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={iconSize} color={color} strokeWidth={1.8} />
    </div>
  );
};
