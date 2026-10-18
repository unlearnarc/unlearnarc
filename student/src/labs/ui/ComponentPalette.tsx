/**
 * ComponentPalette — left sidebar.
 *
 * Click any item  → adds node at an auto-staggered position on the canvas.
 * Drag any item   → a ghost follows the cursor; dropping on canvas places it.
 *
 * Groups: Edge / Compute / Data / Messaging / Observe
 * Search: live filter across label + description.
 */

import React, { useState, useRef } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import type { ComponentKind, TopologyNode } from '../engine/types';
import { KIND_META } from './iconMap';
import { KIND_ICONS } from './nodeIcons';

// ─────────────────────────────────────────────────────────────────────────────
// Groups
// ─────────────────────────────────────────────────────────────────────────────
const PALETTE_GROUPS: { group: string; kinds: ComponentKind[] }[] = [
  { group: 'Traffic',   kinds: ['client'] },
  { group: 'Edge',      kinds: ['cdn', 'dns', 'load_balancer', 'api_gateway', 'rate_limiter'] },
  { group: 'Compute',   kinds: ['service', 'worker', 'circuit_breaker'] },
  { group: 'Data',      kinds: ['database', 'read_replica', 'cache', 'object_storage'] },
  { group: 'Messaging', kinds: ['queue', 'event_stream'] },
  { group: 'Observe',   kinds: ['monitoring'] },
];

// ─────────────────────────────────────────────────────────────────────────────
// Default configs (kept here so palette is self-contained)
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_CONFIGS: Record<ComponentKind, Record<string, unknown>> = {
  cdn:             { cacheHitRatio: 0.85, edgePops: 5, avgEdgeLatencyMs: 20 },
  dns:             {},
  load_balancer:   { algorithm: 'round_robin', healthCheckIntervalMs: 5000, maxConnectionsPerBackend: 5000 },
  api_gateway:     { replicas: 1, cpuCores: 2, memoryMb: 512,  maxRequestsPerSecond: 2000, avgServiceTimeMs: 10,  maxConcurrentRequests: 1000 },
  service:         { replicas: 1, cpuCores: 2, memoryMb: 1024, maxRequestsPerSecond: 500,  avgServiceTimeMs: 50,  maxConcurrentRequests: 200 },
  database:        { engine: 'mysql', maxConnections: 100, avgQueryTimeMs: 15, replicationEnabled: false, shardingEnabled: false, shardCount: 1 },
  read_replica:    { replicationLagMs: 50, maxConnections: 100, avgQueryTimeMs: 10, stalereadsAllowed: true },
  cache:           { maxSizeBytes: 1073741824, ttlSeconds: 300, evictionPolicy: 'lru', hitRatioTarget: 0.85, warmupSeconds: 30 },
  queue:           { maxDepth: 100000, visibilityTimeoutSeconds: 30, maxRetries: 3, deadLetterEnabled: true },
  event_stream:    { partitions: 4, replicationFactor: 2, retentionHours: 168, maxBytesPerPartitionMb: 1024 },
  worker:          { replicas: 2, cpuCores: 1, memoryMb: 512, maxRequestsPerSecond: 50, avgServiceTimeMs: 200, maxConcurrentRequests: 20 },
  rate_limiter:    { requestsPerSecond: 1000, burstCapacity: 2000, algorithm: 'token_bucket' },
  circuit_breaker: { errorThresholdPercent: 50, openDurationMs: 30000, halfOpenMaxRequests: 5 },
  monitoring:      { samplingIntervalMs: 1000, alertThresholds: {} },
  object_storage:  {},
  client:          { requestsPerSecond: 100, burstFactor: 1, readRatio: 0.8 },
};

let _seq = 0;
function newId() { return `node-${Date.now()}-${(++_seq).toString(36)}`; }

function buildNode(kind: ComponentKind, x: number, y: number): TopologyNode {
  return {
    id:       newId(),
    kind,
    label:    KIND_META[kind].label,
    config:   { ...(DEFAULT_CONFIGS[kind] ?? {}) } as TopologyNode['config'],
    position: { x, y },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface ComponentPaletteProps {
  allowedKinds:  ComponentKind[];
  existingCount: number;
  maxNodes:      number;
  onAddNode:     (node: TopologyNode) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette item
// ─────────────────────────────────────────────────────────────────────────────
interface PaletteItemProps {
  kind:      ComponentKind;
  available: boolean;
  reason:    string;
  onClick:   () => void;
  onDragStart: (e: React.DragEvent, kind: ComponentKind) => void;
}

const PaletteItem: React.FC<PaletteItemProps> = ({ kind, available, reason, onClick, onDragStart }) => {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const meta = KIND_META[kind];
  const Icon = KIND_ICONS[kind];

  return (
    <button
      onClick={available ? onClick : undefined}
      disabled={!available}
      draggable={available}
      onDragStart={e => available && onDragStart(e, kind)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      title={available ? meta.description : reason}
      aria-label={`Add ${meta.label}${!available ? ` — ${reason}` : ''}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        width: '100%', padding: '7px 8px',
        borderRadius: 10, border: '1px solid',
        borderColor: hover && available ? 'var(--ua-border-strong)' : 'transparent',
        background: press && available ? 'var(--ua-primary-50)' :
                    hover && available ? 'var(--ua-surface-soft)' : 'transparent',
        cursor: available ? 'grab' : 'not-allowed',
        opacity: available ? 1 : 0.35,
        transition: 'background 0.1s, border-color 0.1s, transform 0.08s, opacity 0.1s',
        transform: press && available ? 'scale(0.97)' : 'scale(1)',
        textAlign: 'left',
      }}
    >
      {/* Custom SVG icon badge */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: available ? meta.bg : 'var(--ua-surface-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: hover && available ? `0 0 0 2px ${meta.color}33` : 'none',
        transition: 'box-shadow 0.15s',
      }}>
        <Icon size={22} color={available ? meta.color : 'var(--ua-text-muted)'} />
      </div>

      {/* Label + description */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11.5, fontWeight: 600,
          color: available ? 'var(--ua-text-primary)' : 'var(--ua-text-muted)',
          lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {meta.label}
        </div>
        <div style={{
          fontSize: 9.5, color: 'var(--ua-text-muted)', lineHeight: 1.3,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          opacity: hover ? 1 : 0.6, transition: 'opacity 0.12s',
        }}>
          {meta.description.slice(0, 38)}{meta.description.length > 38 ? '…' : ''}
        </div>
      </div>

      {/* Drag handle hint */}
      {available && hover && (
        <div style={{ fontSize: 14, color: 'var(--ua-text-muted)', flexShrink: 0, lineHeight: 1 }}>
          ⠿
        </div>
      )}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main palette
// ─────────────────────────────────────────────────────────────────────────────
export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  allowedKinds, existingCount, maxNodes, onAddNode,
}) => {
  const [query, setQuery] = useState('');
  const dragKindRef = useRef<ComponentKind | null>(null);
  const atCap = existingCount >= maxNodes;
  const q = query.toLowerCase();

  const groups = query
    ? [{ group: 'Results', kinds: PALETTE_GROUPS.flatMap(g => g.kinds).filter(k =>
        KIND_META[k].label.toLowerCase().includes(q) ||
        KIND_META[k].description.toLowerCase().includes(q)) }]
    : PALETTE_GROUPS;

  const handleAdd = (kind: ComponentKind, idx: number) => {
    if (!allowedKinds.includes(kind) || atCap) return;
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    onAddNode(buildNode(kind, 200 + col * 200, 80 + row * 130));
  };

  const handleDragStart = (e: React.DragEvent, kind: ComponentKind) => {
    dragKindRef.current = kind;
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/x-lab-kind', kind);
  };

  return (
    <aside
      aria-label="Component palette"
      style={{
        width: 200, minWidth: 188, flexShrink: 0,
        background: 'var(--ua-surface)',
        borderRight: '1px solid var(--ua-border)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ padding: '10px 10px 0', flexShrink: 0 }}>
        <p style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: 'var(--ua-text-muted)', margin: '0 0 8px',
        }}>
          Components
        </p>

        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 8px', borderRadius: 8,
          border: '1px solid var(--ua-border)',
          background: 'var(--ua-surface-soft)', marginBottom: 6,
        }}>
          <Search size={11} color="var(--ua-text-muted)" />
          <input
            type="text" placeholder="Search…" value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              flex: 1, border: 'none', outline: 'none',
              background: 'transparent', fontSize: 11,
              color: 'var(--ua-text-primary)',
            }}
          />
          {query && (
            <button onClick={() => setQuery('')}
              style={{ border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 11, color: 'var(--ua-text-muted)', padding: 0 }}>
              ✕
            </button>
          )}
        </div>

        {atCap && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 8px', borderRadius: 8, marginBottom: 6,
            background: 'var(--ua-warning-soft)', color: 'var(--ua-warning)', fontSize: 10,
          }}>
            <AlertCircle size={11} />
            Max {maxNodes} nodes reached
          </div>
        )}
      </div>

      {/* Groups */}
      <div style={{ flex: 1, padding: '2px 6px 16px', overflowY: 'auto' }}>
        {groups.map(({ group, kinds }) => {
          if (!kinds.length) return null;
          return (
            <div key={group} style={{ marginBottom: 4 }}>
              <p style={{
                fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: 'var(--ua-text-muted)',
                padding: '7px 4px 3px', margin: 0,
              }}>
                {group}
              </p>
              {kinds.map((kind) => {
                const avail = allowedKinds.includes(kind) && !atCap;
                const reason = !allowedKinds.includes(kind)
                  ? 'Not available in this scenario'
                  : 'Node limit reached';
                return (
                  <PaletteItem
                    key={kind}
                    kind={kind}
                    available={avail}
                    reason={reason}
                    onClick={() => handleAdd(kind, existingCount)}
                    onDragStart={handleDragStart}
                  />
                );
              })}
            </div>
          );
        })}

        {groups.every(g => !g.kinds.length) && (
          <p style={{ fontSize: 11, color: 'var(--ua-text-muted)', padding: '12px 4px' }}>
            No components match "{query}"
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid var(--ua-border)',
        background: 'var(--ua-surface)', flexShrink: 0,
      }}>
        <p style={{ fontSize: 9.5, color: 'var(--ua-text-muted)', margin: 0 }}>
          {existingCount} / {maxNodes} nodes · click or drag to add
        </p>
      </div>
    </aside>
  );
};

export { buildNode };
