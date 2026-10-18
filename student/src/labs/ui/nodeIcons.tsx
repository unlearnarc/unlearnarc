/**
 * nodeIcons — Custom SVG icons for every ComponentKind.
 * Each icon is a self-contained SVG component designed to be
 * rendered at 36×36 inside node cards on the topology canvas.
 *
 * Design language:
 *   - 2px stroked outlines, rounded caps
 *   - Single accent color passed as `color` prop
 *   - Transparent fill backgrounds (parent provides the badge bg)
 *   - Every path uses relative commands so they scale cleanly
 */
import React from 'react';

interface IconProps {
  size?: number;
  color?: string;
}

// ── CDN / Edge Cache ─────────────────────────────────────────────────────────
export const CdnIcon: React.FC<IconProps> = ({ size = 36, color = '#7C3AED' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <circle cx={18} cy={18} r={12} stroke={color} strokeWidth={1.8} />
    <ellipse cx={18} cy={18} rx={5} ry={12} stroke={color} strokeWidth={1.5} />
    <line x1={6} y1={18} x2={30} y2={18} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <line x1={8} y1={13} x2={28} y2={13} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
    <line x1={8} y1={23} x2={28} y2={23} stroke={color} strokeWidth={1.2} strokeLinecap="round" />
  </svg>
);

// ── DNS ──────────────────────────────────────────────────────────────────────
export const DnsIcon: React.FC<IconProps> = ({ size = 36, color = '#0891B2' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <rect x={5} y={8} width={26} height={6} rx={2} stroke={color} strokeWidth={1.8} />
    <rect x={5} y={16} width={26} height={6} rx={2} stroke={color} strokeWidth={1.8} />
    <rect x={5} y={24} width={26} height={4} rx={2} stroke={color} strokeWidth={1.8} />
    <circle cx={27} cy={11} r={1.5} fill={color} />
    <circle cx={27} cy={19} r={1.5} fill={color} />
  </svg>
);

// ── Load Balancer ─────────────────────────────────────────────────────────────
export const LoadBalancerIcon: React.FC<IconProps> = ({ size = 36, color = '#0284C7' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <circle cx={18} cy={10} r={3.5} stroke={color} strokeWidth={1.8} />
    <circle cx={9} cy={26} r={3.5} stroke={color} strokeWidth={1.8} />
    <circle cx={18} cy={26} r={3.5} stroke={color} strokeWidth={1.8} />
    <circle cx={27} cy={26} r={3.5} stroke={color} strokeWidth={1.8} />
    <line x1={18} y1={13.5} x2={9} y2={22.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <line x1={18} y1={13.5} x2={18} y2={22.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <line x1={18} y1={13.5} x2={27} y2={22.5} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);

// ── API Gateway ───────────────────────────────────────────────────────────────
export const ApiGatewayIcon: React.FC<IconProps> = ({ size = 36, color = '#0EA5E9' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <rect x={4} y={4} width={28} height={28} rx={4} stroke={color} strokeWidth={1.8} />
    <line x1={4} y1={13} x2={32} y2={13} stroke={color} strokeWidth={1.4} />
    <text x={18} y={25} textAnchor="middle" fill={color} fontSize={8} fontFamily="monospace" fontWeight="bold">API</text>
    <circle cx={10} cy={8.5} r={1.5} fill={color} />
    <circle cx={15} cy={8.5} r={1.5} fill={color} />
    <circle cx={20} cy={8.5} r={1.5} fill={color} />
  </svg>
);

// ── App Service ───────────────────────────────────────────────────────────────
export const ServiceIcon: React.FC<IconProps> = ({ size = 36, color = '#2563EB' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <rect x={6} y={6} width={24} height={24} rx={4} stroke={color} strokeWidth={1.8} />
    <rect x={10} y={14} width={7} height={7} rx={1.5} stroke={color} strokeWidth={1.5} />
    <line x1={20} y1={16} x2={27} y2={16} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <line x1={20} y1={19} x2={25} y2={19} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
    <line x1={10} y1={25} x2={26} y2={25} stroke={color} strokeWidth={1.4} strokeLinecap="round" />
  </svg>
);

// ── Database ──────────────────────────────────────────────────────────────────
export const DatabaseIcon: React.FC<IconProps> = ({ size = 36, color = '#1D4ED8' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <ellipse cx={18} cy={10} rx={11} ry={4} stroke={color} strokeWidth={1.8} />
    <path d="M7 10 Q7 18 18 18 Q29 18 29 10" stroke={color} strokeWidth={1.8} fill="none" />
    <path d="M7 18 Q7 26 18 26 Q29 26 29 18" stroke={color} strokeWidth={1.8} fill="none" />
    <line x1={7} y1={18} x2={7} y2={26} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <line x1={29} y1={18} x2={29} y2={26} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

// ── Read Replica ─────────────────────────────────────────────────────────────
export const ReadReplicaIcon: React.FC<IconProps> = ({ size = 36, color = '#3B82F6' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    {/* Primary cylinder (small, left) */}
    <ellipse cx={11} cy={11} rx={7} ry={3} stroke={color} strokeWidth={1.5} />
    <path d="M4 11 Q4 19 11 19 Q18 19 18 11" stroke={color} strokeWidth={1.5} fill="none" />
    <line x1={4} y1={11} x2={4} y2={19} stroke={color} strokeWidth={1.5} />
    <line x1={18} y1={11} x2={18} y2={19} stroke={color} strokeWidth={1.5} />
    {/* Arrow */}
    <line x1={19} y1={18} x2={24} y2={18} stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="2 2" />
    <polygon points="24,15.5 27.5,18 24,20.5" fill={color} />
    {/* Replica cylinder (right) */}
    <ellipse cx={28} cy={22} rx={5} ry={2} stroke={color} strokeWidth={1.5} />
    <path d="M23 22 Q23 28 28 28 Q33 28 33 22" stroke={color} strokeWidth={1.5} fill="none" />
    <line x1={23} y1={22} x2={23} y2={28} stroke={color} strokeWidth={1.5} />
    <line x1={33} y1={22} x2={33} y2={28} stroke={color} strokeWidth={1.5} />
  </svg>
);

// ── Cache ─────────────────────────────────────────────────────────────────────
export const CacheIcon: React.FC<IconProps> = ({ size = 36, color = '#0D9488' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <rect x={5} y={5} width={26} height={26} rx={4} stroke={color} strokeWidth={1.8} />
    {/* Lightning bolt fill */}
    <path d="M20 6 L12 19 H19 L16 30 L24 17 H17 Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill={`${color}22`} />
  </svg>
);

// ── Message Queue ─────────────────────────────────────────────────────────────
export const QueueIcon: React.FC<IconProps> = ({ size = 36, color = '#D97706' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    {/* Envelope */}
    <rect x={4} y={10} width={28} height={18} rx={3} stroke={color} strokeWidth={1.8} />
    <path d="M4 13 L18 21 L32 13" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    {/* Stack lines suggesting queue */}
    <line x1={6} y1={8} x2={30} y2={8} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    <line x1={9} y1={6} x2={27} y2={6} stroke={color} strokeWidth={1} strokeLinecap="round" />
  </svg>
);

// ── Event Stream ──────────────────────────────────────────────────────────────
export const EventStreamIcon: React.FC<IconProps> = ({ size = 36, color = '#B45309' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    {/* Partitions */}
    <rect x={4} y={8} width={8} height={20} rx={2} stroke={color} strokeWidth={1.6} />
    <rect x={14} y={8} width={8} height={20} rx={2} stroke={color} strokeWidth={1.6} />
    <rect x={24} y={8} width={8} height={20} rx={2} stroke={color} strokeWidth={1.6} />
    {/* Data blocks */}
    <rect x={5.5} y={11} width={5} height={3} rx={1} fill={color} />
    <rect x={5.5} y={16} width={5} height={3} rx={1} fill={`${color}88`} />
    <rect x={15.5} y={11} width={5} height={3} rx={1} fill={color} />
    <rect x={25.5} y={11} width={5} height={3} rx={1} fill={color} />
    <rect x={25.5} y={16} width={5} height={3} rx={1} fill={`${color}88`} />
    <rect x={25.5} y={21} width={5} height={3} rx={1} fill={`${color}44`} />
  </svg>
);

// ── Worker ────────────────────────────────────────────────────────────────────
export const WorkerIcon: React.FC<IconProps> = ({ size = 36, color = '#9333EA' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <rect x={7} y={10} width={22} height={16} rx={3} stroke={color} strokeWidth={1.8} />
    {/* Gear teeth */}
    <circle cx={18} cy={18} r={5} stroke={color} strokeWidth={1.5} />
    <circle cx={18} cy={18} r={2} fill={color} />
    <line x1={18} y1={11} x2={18} y2={13} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <line x1={18} y1={23} x2={18} y2={25} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <line x1={11} y1={18} x2={13} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <line x1={23} y1={18} x2={25} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
    {/* Legs */}
    <line x1={11} y1={26} x2={11} y2={30} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <line x1={25} y1={26} x2={25} y2={30} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

// ── Object Storage ────────────────────────────────────────────────────────────
export const ObjectStorageIcon: React.FC<IconProps> = ({ size = 36, color = '#6B7280' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <path d="M18 5 L31 12 V24 L18 31 L5 24 V12 Z" stroke={color} strokeWidth={1.8} strokeLinejoin="round" fill={`${color}11`} />
    <path d="M18 5 L31 12 L18 19 L5 12 Z" stroke={color} strokeWidth={1.5} strokeLinejoin="round" fill={`${color}22`} />
    <line x1={18} y1={19} x2={18} y2={31} stroke={color} strokeWidth={1.5} strokeLinecap="round" />
  </svg>
);

// ── Rate Limiter ──────────────────────────────────────────────────────────────
export const RateLimiterIcon: React.FC<IconProps> = ({ size = 36, color = '#DC2626' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    {/* Gauge face */}
    <path d="M6 24 A13 13 0 0 1 30 24" stroke={color} strokeWidth={2} strokeLinecap="round" fill="none" />
    {/* Tick marks */}
    <line x1={6} y1={24} x2={8.5} y2={20} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    <line x1={18} y1={11} x2={18} y2={14} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    <line x1={30} y1={24} x2={27.5} y2={20} stroke={color} strokeWidth={1.3} strokeLinecap="round" />
    {/* Needle — pointing near red zone */}
    <line x1={18} y1={24} x2={26} y2={14} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <circle cx={18} cy={24} r={2.5} fill={color} />
    {/* Red zone arc */}
    <path d="M24 15 A13 13 0 0 1 30 24" stroke="#EF4444" strokeWidth={3} strokeLinecap="round" fill="none" />
  </svg>
);

// ── Circuit Breaker ───────────────────────────────────────────────────────────
export const CircuitBreakerIcon: React.FC<IconProps> = ({ size = 36, color = '#EF4444' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    {/* Wire in */}
    <line x1={4} y1={18} x2={12} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
    {/* Switch (open) */}
    <circle cx={14} cy={18} r={2} fill={color} />
    <line x1={16} y1={18} x2={22} y2={12} stroke={color} strokeWidth={2} strokeLinecap="round" />
    <circle cx={22} cy={12} r={1.5} fill={color} />
    {/* Wire out */}
    <line x1={22} y1={18} x2={32} y2={18} stroke={color} strokeWidth={2} strokeLinecap="round" />
    {/* Arc flash */}
    <path d="M18 10 L14 16 L20 14 L16 22" stroke="#F97316" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    {/* Shield */}
    <path d="M18 27 L13 24 V20 L18 18 L23 20 V24 Z" stroke={color} strokeWidth={1.5} fill={`${color}22`} strokeLinejoin="round" />
  </svg>
);

// ── Monitoring ────────────────────────────────────────────────────────────────
export const MonitoringIcon: React.FC<IconProps> = ({ size = 36, color = '#10B981' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    <rect x={4} y={6} width={28} height={18} rx={3} stroke={color} strokeWidth={1.8} />
    {/* Screen chart */}
    <polyline points="8,20 12,15 16,18 21,10 26,14" stroke={color} strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    {/* Stand */}
    <line x1={18} y1={24} x2={18} y2={29} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <line x1={12} y1={29} x2={24} y2={29} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </svg>
);

// ── Traffic Client ────────────────────────────────────────────────────────────
export const ClientIcon: React.FC<IconProps> = ({ size = 36, color = '#6B7280' }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none">
    {/* Person */}
    <circle cx={14} cy={10} r={4} stroke={color} strokeWidth={1.8} />
    <path d="M6 26 Q6 18 14 18 Q22 18 22 26" stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" />
    {/* Arrow indicating traffic */}
    <line x1={24} y1={16} x2={32} y2={16} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <line x1={24} y1={20} x2={32} y2={20} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <line x1={24} y1={24} x2={30} y2={24} stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    <polygon points="31,13.5 35,18 31,22.5" fill={color} />
  </svg>
);

// ── Icon map by kind ──────────────────────────────────────────────────────────
import type { ComponentKind } from '../engine/types';

export const KIND_ICONS: Record<ComponentKind, React.FC<IconProps>> = {
  client:          ClientIcon,
  cdn:             CdnIcon,
  dns:             DnsIcon,
  load_balancer:   LoadBalancerIcon,
  api_gateway:     ApiGatewayIcon,
  service:         ServiceIcon,
  database:        DatabaseIcon,
  read_replica:    ReadReplicaIcon,
  cache:           CacheIcon,
  queue:           QueueIcon,
  event_stream:    EventStreamIcon,
  worker:          WorkerIcon,
  object_storage:  ObjectStorageIcon,
  rate_limiter:    RateLimiterIcon,
  circuit_breaker: CircuitBreakerIcon,
  monitoring:      MonitoringIcon,
};
