/**
 * LabWorkspace — Engineering Lab shell.
 *
 * Philosophy:
 *   - No locked nodes (student controls everything)
 *   - No mandatory missions / timeline triggers
 *   - Max 16 nodes per canvas
 *   - Full manual control: incidents, resource sliders, scaling
 *   - Resource config: RAM, storage, LB algorithm, cache size, DB pool
 *   - Cursor-centred zoom, free node movement
 */

import React, {
  useState, useCallback, useReducer, useRef, useEffect,
} from 'react';
import {
  Play, Pause, RotateCcw, ChevronRight, FastForward,
  Terminal as TerminalIcon, ScrollText, Gauge,
  Siren, FlaskConical, AlertTriangle, Activity, Zap, RefreshCw,
  Server, Database, HardDrive, Layers, Sliders,
  Save, Upload, Download, FolderOpen, Check, X, Pencil,
} from 'lucide-react';
import { FailurePanel } from './FailurePanel';
import { TopologyCanvas } from './TopologyCanvas';
import { ComponentPalette, buildNode } from './ComponentPalette';
import { SimulationTerminal } from './SimulationTerminal';
import { MetricsPanel } from './MetricsPanel';
import { ResizableVerticalPanel, ResizableBottomPanel } from './ResizablePanel';
import { useSimulation } from '../engine/useSimulation';
import type {
  LabScenario, Topology, TopologyNode, TopologyEdge,
  StudentAction, LogEntry, ComponentKind,
} from '../engine/types';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MAX_NODES = 16;

// ─────────────────────────────────────────────────────────────────────────────
// TOPOLOGY REDUCER
// ─────────────────────────────────────────────────────────────────────────────
type TopoAction =
  | { type: 'ADD_NODE';    node: TopologyNode }
  | { type: 'MOVE_NODE';   id: string; x: number; y: number }
  | { type: 'ADD_EDGE';    edge: TopologyEdge }
  | { type: 'DELETE_NODE'; id: string }
  | { type: 'DELETE_EDGE'; id: string }
  | { type: 'UPDATE_CONFIG'; id: string; patch: Record<string, unknown> }
  | { type: 'RENAME_NODE'; id: string; label: string }
  | { type: 'RESET';       topology: Topology };

function topoReducer(state: Topology, action: TopoAction): Topology {
  switch (action.type) {
    case 'ADD_NODE':
      if (state.nodes.length >= MAX_NODES) return state;
      return { ...state, nodes: [...state.nodes, action.node] };
    case 'MOVE_NODE':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.id ? { ...n, position: { x: action.x, y: action.y } } : n,
        ),
      };
    case 'ADD_EDGE':
      if (state.edges.some(e => e.fromId === action.edge.fromId && e.toId === action.edge.toId)) return state;
      return { ...state, edges: [...state.edges, action.edge] };
    case 'DELETE_NODE':
      return {
        ...state,
        nodes: state.nodes.filter(n => n.id !== action.id),
        edges: state.edges.filter(e => e.fromId !== action.id && e.toId !== action.id),
      };
    case 'DELETE_EDGE':
      return { ...state, edges: state.edges.filter(e => e.id !== action.id) };
    case 'UPDATE_CONFIG':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.id
            ? { ...n, config: { ...(n.config as Record<string, unknown>), ...action.patch } as TopologyNode['config'] }
            : n,
        ),
      };
    case 'RENAME_NODE':
      return {
        ...state,
        nodes: state.nodes.map(n =>
          n.id === action.id ? { ...n, label: action.label } : n,
        ),
      };
    case 'RESET':
      return action.topology;
    default:
      return state;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT DEFINITIONS (all manual / random – no timeline triggers)
// ─────────────────────────────────────────────────────────────────────────────
interface IncidentDef {
  id: string;
  label: string;
  description: string;
  icon: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  targets: ComponentKind[];  // which node kinds this incident applies to
  action: 'trigger_failure' | 'trigger_recovery';
  color: string;
}

const INCIDENTS: IncidentDef[] = [
  {
    id: 'db_crash',
    label: 'Database Down',
    description: 'Simulates a sudden DB instance crash — connection pool exhaustion, data unavailability.',
    icon: '🗄️', severity: 'critical',
    targets: ['database', 'read_replica'],
    action: 'trigger_failure', color: '#EF4444',
  },
  {
    id: 'heavy_load',
    label: 'Heavy Traffic Surge',
    description: '10× traffic burst — stress-tests your load balancer, cache and services.',
    icon: '🌊', severity: 'high',
    targets: ['client'],
    action: 'trigger_failure', color: '#F97316',
  },
  {
    id: 'service_crash',
    label: 'App Server Crash',
    description: 'Kills a running service instance — tests failover and replica resilience.',
    icon: '💥', severity: 'high',
    targets: ['service', 'api_gateway', 'worker'],
    action: 'trigger_failure', color: '#EF4444',
  },
  {
    id: 'network_cut',
    label: 'Network Partition',
    description: 'Simulates a network split — upstream nodes can\'t reach downstream nodes.',
    icon: '✂️', severity: 'critical',
    targets: ['load_balancer', 'cdn', 'api_gateway'],
    action: 'trigger_failure', color: '#DC2626',
  },
  {
    id: 'cache_evict',
    label: 'Cache Flush',
    description: 'Flushes all cache entries — measures cold-start performance and origin load spike.',
    icon: '🧹', severity: 'medium',
    targets: ['cache'],
    action: 'trigger_failure', color: '#D97706',
  },
  {
    id: 'power_cut',
    label: 'Power Cut',
    description: 'Simulates a zone-wide power outage — all nodes in a region fail simultaneously.',
    icon: '⚡', severity: 'critical',
    targets: ['service', 'database', 'cache', 'worker', 'queue'],
    action: 'trigger_failure', color: '#7C3AED',
  },
  {
    id: 'queue_flood',
    label: 'Queue Flood',
    description: 'Producers outpace consumers — backlog grows, latency spikes.',
    icon: '📬', severity: 'high',
    targets: ['queue', 'event_stream'],
    action: 'trigger_failure', color: '#B45309',
  },
  {
    id: 'slow_disk',
    label: 'Disk Saturation',
    description: 'Storage I/O bottleneck — DB queries slow dramatically.',
    icon: '💾', severity: 'medium',
    targets: ['database', 'object_storage'],
    action: 'trigger_failure', color: '#D97706',
  },
  {
    id: 'recover_all',
    label: 'Recover All',
    description: 'Clears all active failures — simulates ops team resolving the incident.',
    icon: '✅', severity: 'low' as const,
    targets: [] as ComponentKind[],
    action: 'trigger_recovery' as const,
    color: '#10B981',
  },
];

const SEVERITY_COLORS: Record<string, string> = {
  low: '#10B981', medium: '#EAB308', high: '#F97316', critical: '#EF4444',
};

// ─────────────────────────────────────────────────────────────────────────────
// INLINE RENAME — used in the inspector header
// ─────────────────────────────────────────────────────────────────────────────
const InlineRename: React.FC<{
  label: string;
  onRename: (label: string) => void;
}> = ({ label, onRename }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(label);
  useEffect(() => { setVal(label); }, [label]);

  if (editing) {
    return (
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { onRename(val.trim() || label); setEditing(false); }
            if (e.key === 'Escape') { setVal(label); setEditing(false); }
          }}
          style={{
            flex: 1, border: '1.5px solid var(--ua-primary-400)', borderRadius: 6,
            padding: '3px 7px', fontSize: 12, fontWeight: 700, outline: 'none',
            background: 'var(--ua-background)', color: 'var(--ua-text-primary)',
          }}
        />
        <button onClick={() => { onRename(val.trim() || label); setEditing(false); }}
          style={{ border: 'none', background: '#10B981', color: '#fff', borderRadius: 5,
            width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Check size={11} />
        </button>
        <button onClick={() => { setVal(label); setEditing(false); }}
          style={{ border: '1px solid var(--ua-border)', background: 'none', color: 'var(--ua-text-muted)',
            borderRadius: 5, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <X size={11} />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      title="Click to rename"
      style={{
        display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none',
        cursor: 'pointer', padding: 0, textAlign: 'left', maxWidth: '100%',
      }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ua-text-primary)',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <Pencil size={10} color="var(--ua-text-muted)" style={{ flexShrink: 0 }} />
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RESOURCE INSPECTOR — per-node config sliders
// ─────────────────────────────────────────────────────────────────────────────
interface ResourceSlider {
  key: string;
  label: string;
  icon: React.ReactNode;
  unit: string;
  min: number;
  max: number;
  step: number;
}

function getSliders(kind: string): ResourceSlider[] {
  switch (kind) {
    case 'service':
    case 'api_gateway':
    case 'worker':
      return [
        { key: 'replicas',             label: 'Replicas',       icon: <Server size={12} />,   unit: '',     min: 1,  max: 20,     step: 1 },
        { key: 'memoryMb',             label: 'RAM',            icon: <HardDrive size={12} />, unit: 'MB',   min: 128, max: 32768, step: 128 },
        { key: 'maxRequestsPerSecond', label: 'Max RPS',        icon: <Activity size={12} />, unit: '/s',   min: 50, max: 10000,  step: 50 },
        { key: 'avgServiceTimeMs',     label: 'Service Time',   icon: <Gauge size={12} />,    unit: 'ms',   min: 5,  max: 2000,   step: 5 },
      ];
    case 'database':
      return [
        { key: 'maxConnections',  label: 'Connection Pool', icon: <Database size={12} />, unit: '',    min: 10,  max: 2000, step: 10 },
        { key: 'avgQueryTimeMs',  label: 'Query Time',      icon: <Gauge size={12} />,    unit: 'ms',  min: 1,   max: 500,  step: 1 },
      ];
    case 'read_replica':
      return [
        { key: 'maxConnections',   label: 'Connection Pool', icon: <Database size={12} />, unit: '',   min: 10, max: 2000, step: 10 },
        { key: 'replicationLagMs', label: 'Replication Lag', icon: <Gauge size={12} />,   unit: 'ms', min: 0,  max: 2000, step: 10 },
      ];
    case 'cache':
      return [
        { key: 'maxSizeBytes',  label: 'Cache Size',   icon: <HardDrive size={12} />, unit: 'MB',  min: 64, max: 65536, step: 64,
          // displayed as MB, stored as bytes — handled in render
        },
        { key: 'hitRatioTarget', label: 'Target Hit %', icon: <Activity size={12} />, unit: '%',   min: 10, max: 99,    step: 1 },
        { key: 'ttlSeconds',     label: 'TTL',          icon: <Gauge size={12} />,    unit: 's',   min: 1,  max: 86400, step: 1 },
      ];
    case 'load_balancer':
      return [
        { key: 'maxConnectionsPerBackend', label: 'Max Connections/Backend', icon: <Layers size={12} />, unit: '', min: 100, max: 50000, step: 100 },
      ];
    case 'rate_limiter':
      return [
        { key: 'requestsPerSecond', label: 'RPS Limit',     icon: <Gauge size={12} />,    unit: '/s', min: 10,  max: 100000, step: 10 },
        { key: 'burstCapacity',     label: 'Burst Capacity', icon: <Activity size={12} />, unit: '',   min: 10,  max: 200000, step: 10 },
      ];
    case 'queue':
    case 'event_stream':
      return [
        { key: 'maxDepth', label: 'Max Depth', icon: <HardDrive size={12} />, unit: '', min: 100, max: 1000000, step: 100 },
      ];
    case 'client':
      return [
        { key: 'requestsPerSecond', label: 'Base RPS',    icon: <Activity size={12} />, unit: '/s',   min: 10, max: 50000, step: 10 },
        { key: 'burstFactor',       label: 'Burst Factor', icon: <Zap size={12} />,      unit: '×',    min: 1,  max: 20,    step: 0.5 },
      ];
    default:
      return [];
  }
}

const ResourceInspector: React.FC<{
  node: TopologyNode;
  metrics: Record<string, import('../engine/types').ComponentMetrics>;
  onUpdateConfig: (id: string, patch: Record<string, unknown>) => void;
  onAction: (action: StudentAction) => void;
  onDeselect: () => void;
}> = ({ node, metrics, onUpdateConfig, onAction, onDeselect }) => {
  const sliders = getSliders(node.kind);
  const cfg = node.config as Record<string, unknown>;
  const m = metrics[node.id];
  const sat = m?.saturation ?? 0;

  const satColor = sat > 0.9 ? '#EF4444' : sat > 0.7 ? '#F97316' : '#22C55E';

  const makeActionId = () => `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const displayValue = (slider: ResourceSlider): number => {
    let v = (cfg[slider.key] as number) ?? slider.min;
    if (slider.key === 'maxSizeBytes') v = v / (1024 * 1024);   // bytes → MB
    if (slider.key === 'hitRatioTarget') v = Math.round(v * 100);
    return v;
  };

  const storeValue = (slider: ResourceSlider, displayV: number): number => {
    if (slider.key === 'maxSizeBytes') return displayV * 1024 * 1024;
    if (slider.key === 'hitRatioTarget') return displayV / 100;
    return displayV;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, height: '100%' }}>
      {/* Header with inline rename */}
      <div style={{
        padding: '12px 14px 10px',
        borderBottom: '1px solid var(--ua-border)',
        display: 'flex', alignItems: 'flex-start', gap: 10, flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9, color: 'var(--ua-text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.08em', margin: '0 0 4px' }}>
            {node.kind.replace(/_/g, ' ')}
          </p>
          <InlineRename label={node.label} onRename={label => onUpdateConfig(node.id, { _label: label })} />
        </div>
        <button onClick={onDeselect} style={{
          border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 15, color: 'var(--ua-text-muted)', padding: '0 2px', lineHeight: 1,
        }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Live metrics */}
        {m && (
          <section>
            <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--ua-text-muted)', margin: '0 0 8px' }}>
              Live Metrics
              <span style={{ marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 4,
                background: '#EEF2FF', color: '#4F46E5', fontWeight: 700 }}>SIM</span>
            </p>

            {/* Sat bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: 'var(--ua-text-muted)' }}>Saturation</span>
                <span style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: satColor }}>
                  {Math.round(sat * 100)}%
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: 'var(--ua-border)', overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(sat * 100, 100)}%`,
                  background: satColor, transition: 'width 0.35s' }} />
              </div>
            </div>

            {/* Metric rows */}
            {[
              ['RPS In/Out', `${Math.round(m.requestsIn)} / ${Math.round(m.requestsOut)}`],
              ['Dropped', `${Math.round(m.requestsDropped)}`],
              ['Latency', `${Math.round(m.avgLatencyMs)}ms`],
              ['Error Rate', `${Math.round(m.errorRate * 100)}%`],
              m.queueDepth ? ['Queue Depth', `${m.queueDepth}`] : null,
              m.connections != null ? ['Connections', `${m.connections} / ${m.maxConnections ?? '?'}`] : null,
              (m.cacheHits ?? 0) + (m.cacheMisses ?? 0) > 0
                ? ['Cache Hit Rate', `${Math.round((m.cacheHits ?? 0) / ((m.cacheHits ?? 0) + (m.cacheMisses ?? 0)) * 100)}%`]
                : null,
              (m.replicationLagMs ?? 0) > 0 ? ['Replica Lag', `${Math.round(m.replicationLagMs!)}ms`] : null,
            ].filter((row): row is string[] => row !== null).map(([label, value], i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0',
                borderBottom: '1px solid var(--ua-border)' }}>
                <span style={{ fontSize: 10, color: 'var(--ua-text-muted)' }}>{label}</span>
                <span style={{ fontSize: 10, fontWeight: 600, fontFamily: 'monospace', color: 'var(--ua-text-primary)' }}>
                  {value}
                </span>
              </div>
            ))}
          </section>
        )}

        {/* Resource sliders */}
        {sliders.length > 0 && (
          <section>
            <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--ua-text-muted)', margin: '0 0 10px',
              display: 'flex', alignItems: 'center', gap: 5 }}>
              <Sliders size={11} />
              Resources
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sliders.map(slider => {
                const dv = displayValue(slider);
                return (
                  <div key={slider.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <label style={{ fontSize: 10.5, color: 'var(--ua-text-secondary)',
                        display: 'flex', alignItems: 'center', gap: 4 }}>
                        {slider.icon} {slider.label}
                      </label>
                      <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'monospace',
                        color: 'var(--ua-text-primary)' }}>
                        {slider.unit === 'MB' && slider.key === 'maxSizeBytes'
                          ? `${dv >= 1024 ? (dv / 1024).toFixed(1) + ' GB' : dv + ' MB'}`
                          : `${dv}${slider.unit}`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={slider.min} max={slider.max} step={slider.step}
                      value={dv}
                      onChange={e => {
                        const displayed = Number(e.target.value);
                        const stored = storeValue(slider, displayed);
                        onUpdateConfig(node.id, { [slider.key]: stored });
                        onAction({
                          id: makeActionId(), kind: 'configure_node',
                          payload: { nodeId: node.id, key: slider.key, value: stored },
                          appliedAt: Date.now(),
                        });
                      }}
                      style={{ width: '100%', accentColor: 'var(--ua-primary-500)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 8.5,
                      color: 'var(--ua-text-muted)' }}>
                      <span>{slider.min}{slider.unit}</span>
                      <span>{slider.max >= 1000 ? (slider.max / 1000) + 'k' : slider.max}{slider.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Failure / recovery */}
        <section>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--ua-text-muted)', margin: '0 0 8px' }}>
            Quick Actions
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => onAction({
              id: makeActionId(), kind: 'trigger_failure',
              payload: { nodeId: node.id }, appliedAt: Date.now(),
            })}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#FEE2E2', color: '#EF4444', fontSize: 11, fontWeight: 600,
              }}>
              <Zap size={12} /> Kill
            </button>
            <button onClick={() => onAction({
              id: makeActionId(), kind: 'trigger_recovery',
              payload: { nodeId: node.id }, appliedAt: Date.now(),
            })}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '7px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: '#D1FAE5', color: '#10B981', fontSize: 11, fontWeight: 600,
              }}>
              <RefreshCw size={12} /> Revive
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT PANEL
// ─────────────────────────────────────────────────────────────────────────────
const IncidentPanel: React.FC<{
  nodes: TopologyNode[];
  activeIncidents: string[];
  isRunning: boolean;
  simTime: number;
  onAction: (action: StudentAction) => void;
}> = ({ nodes, activeIncidents, isRunning, simTime, onAction }) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const makeActionId = () => `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const fire = (incident: IncidentDef) => {
    if (!isRunning) return;

    if (incident.action === 'trigger_recovery' && incident.targets.length === 0) {
      // Recover all nodes
      for (const n of nodes) {
        onAction({ id: makeActionId(), kind: 'trigger_recovery', payload: { nodeId: n.id }, appliedAt: simTime });
      }
      return;
    }

    // Power cut — affect all matching nodes
    if (incident.id === 'power_cut') {
      const targets = nodes.filter(n => incident.targets.includes(n.kind as ComponentKind));
      for (const t of targets) {
        onAction({ id: makeActionId(), kind: 'trigger_failure', payload: { nodeId: t.id }, appliedAt: simTime });
      }
      return;
    }

    // Pick a random node of matching kind
    const matching = nodes.filter(n => incident.targets.includes(n.kind as ComponentKind));
    if (!matching.length) {
      // No matching node — pick any non-client node
      const fallback = nodes.filter(n => n.kind !== 'client');
      if (fallback.length) {
        const t = fallback[Math.floor(Math.random() * fallback.length)];
        onAction({ id: makeActionId(), kind: incident.action, payload: { nodeId: t.id }, appliedAt: simTime });
      }
      return;
    }
    const target = matching[Math.floor(Math.random() * matching.length)];
    onAction({ id: makeActionId(), kind: incident.action, payload: { nodeId: target.id }, appliedAt: simTime });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {!isRunning && (
        <div style={{
          margin: '0 0 10px', padding: '8px 12px', borderRadius: 8,
          background: '#FEF3C7', border: '1px solid #FDE68A',
          fontSize: 10.5, color: '#92400E',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <AlertTriangle size={12} />
          Start the simulation first to fire incidents
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {INCIDENTS.map(inc => {
          const isActive = activeIncidents.some(i => i.includes(inc.id));
          const hovered = hoveredId === inc.id;
          return (
            <button
              key={inc.id}
              disabled={!isRunning}
              onClick={() => fire(inc)}
              onMouseEnter={() => setHoveredId(inc.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '9px 11px', borderRadius: 10, textAlign: 'left', width: '100%',
                border: `1.5px solid ${isActive ? inc.color : hovered && isRunning ? inc.color + '88' : 'var(--ua-border)'}`,
                background: isActive ? inc.color + '18' : hovered && isRunning ? inc.color + '0C' : 'var(--ua-surface)',
                cursor: isRunning ? 'pointer' : 'not-allowed',
                opacity: isRunning ? 1 : 0.5,
                transition: 'all 0.15s',
              }}>
              <span style={{ fontSize: 18, lineHeight: 1.2, flexShrink: 0 }}>{inc.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ua-text-primary)' }}>
                    {inc.label}
                  </span>
                  <span style={{
                    fontSize: 8.5, padding: '1px 5px', borderRadius: 20, fontWeight: 700,
                    background: SEVERITY_COLORS[inc.severity] + '22',
                    color: SEVERITY_COLORS[inc.severity],
                    textTransform: 'uppercase', letterSpacing: '0.05em',
                  }}>
                    {inc.severity}
                  </span>
                  {isActive && (
                    <span style={{
                      fontSize: 8.5, padding: '1px 5px', borderRadius: 20, fontWeight: 700,
                      background: '#FEE2E2', color: '#EF4444',
                      animation: 'pulse 1.5s infinite',
                    }}>ACTIVE</span>
                  )}
                </div>
                <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', margin: 0, lineHeight: 1.5 }}>
                  {inc.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SIM CONTROLS TOOLBAR
// ─────────────────────────────────────────────────────────────────────────────
interface SimControlsProps {
  status: string;
  simTime: number;
  speed: number;
  onStart: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  onSpeedChange: (v: number) => void;
}

const SimControls: React.FC<SimControlsProps> = ({
  status, simTime, speed, onStart, onPause, onStep, onReset, onSpeedChange,
}) => {
  const isRunning   = status === 'running';
  const isCompleted = status === 'completed';
  const isPaused    = status === 'paused';

  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 46, flexShrink: 0,
      background: 'var(--ua-surface)', borderBottom: '1px solid var(--ua-border)',
    }}>
      {/* Play / Pause */}
      {!isCompleted && (
        isRunning ? (
          <button onClick={onPause} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8,
            border: 'none', background: '#FEF3C7', color: '#D97706', fontSize: 12, fontWeight: 600, cursor: 'pointer',
          }}>
            <Pause size={13} /> Pause
          </button>
        ) : (
          <button onClick={onStart} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 14px', borderRadius: 8,
            border: 'none', background: 'var(--ua-primary-500)', color: '#fff',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37,99,235,.35)',
          }}>
            <Play size={13} /> {isPaused ? 'Resume' : 'Start'}
          </button>
        )
      )}

      {/* Step */}
      {!isRunning && !isCompleted && (
        <button onClick={onStep} style={{
          display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8,
          border: '1px solid var(--ua-border)', background: 'var(--ua-surface)',
          color: 'var(--ua-text-secondary)', fontSize: 12, cursor: 'pointer',
        }}>
          <ChevronRight size={13} /> Step
        </button>
      )}

      {/* Reset */}
      <button onClick={onReset} style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 8,
        border: '1px solid var(--ua-border)', background: 'var(--ua-surface)',
        color: 'var(--ua-text-secondary)', fontSize: 12, cursor: 'pointer',
      }}>
        <RotateCcw size={12} /> Reset
      </button>

      {/* Speed */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        <FastForward size={11} color="var(--ua-text-muted)" />
        <select value={speed} onChange={e => onSpeedChange(Number(e.target.value))} style={{
          fontSize: 11, borderRadius: 6, padding: '3px 6px',
          border: '1px solid var(--ua-border)',
          background: 'var(--ua-surface)', color: 'var(--ua-text-primary)', cursor: 'pointer',
        }}>
          {[0.5, 1, 2, 4, 8].map(v => <option key={v} value={v}>{v}×</option>)}
        </select>
      </div>

      {/* Elapsed time — always climbing, no cap */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {isRunning && (
          <div style={{
            height: 4, borderRadius: 2, flex: 1, overflow: 'hidden',
            background: 'var(--ua-border)',
          }}>
            <div style={{
              height: '100%', borderRadius: 2,
              background: 'var(--ua-primary-500)',
              width: '100%',
              animation: 'shimmer 2s linear infinite',
            }} />
          </div>
        )}
        <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: 'var(--ua-text-muted)', flexShrink: 0 }}>
          {fmt(simTime)} elapsed
        </span>
      </div>

      {/* Status chip */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20,
        background: isRunning ? '#D1FAE5' : isPaused ? '#FEF3C7' : 'var(--ua-surface-soft)',
        border: '1px solid',
        borderColor: isRunning ? '#10B981' : isPaused ? '#D97706' : 'var(--ua-border)',
        fontSize: 10, fontWeight: 700,
        color: isRunning ? '#10B981' : isPaused ? '#D97706' : 'var(--ua-text-muted)',
      }}>
        {isRunning && (
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981', animation: 'pulse 1.5s infinite' }} />
        )}
        {isRunning ? 'RUNNING' : isPaused ? 'PAUSED' : 'IDLE'}
      </div>

      {/* Simulated badge */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 6,
        background: '#EEF2FF', color: '#4F46E5', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
        border: '1px solid #C7D2FE', flexShrink: 0,
      }}>
        <FlaskConical size={10} /> SIMULATED
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LOG VIEWER
// ─────────────────────────────────────────────────────────────────────────────
const LogViewer: React.FC<{ logs: LogEntry[] }> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, overflowY: 'auto', fontFamily: 'monospace', fontSize: 10.5,
        background: 'var(--ua-surface-soft)', borderRadius: 8, padding: '8px 10px' }}>
        {logs.length === 0 && <p style={{ color: 'var(--ua-text-muted)', margin: 0 }}>No logs — start the simulation.</p>}
        {logs.map(entry => (
          <div key={entry.id} style={{ display: 'flex', gap: 6, lineHeight: 1.6, marginBottom: 1,
            color: entry.level === 'error' ? '#EF4444' : entry.level === 'warn' ? '#D97706' : 'var(--ua-text-secondary)' }}>
            <span style={{ flexShrink: 0, color: 'var(--ua-text-muted)' }}>
              [{Math.round(entry.simulationTime / 1000).toString().padStart(3, ' ')}s]
            </span>
            <span style={{ flexShrink: 0 }}>
              {entry.level === 'error' ? '✗' : entry.level === 'warn' ? '⚠' : '·'}
            </span>
            {entry.nodeId && (
              <span style={{ flexShrink: 0, color: 'var(--ua-text-muted)' }}>[{entry.nodeId.slice(0, 10)}]</span>
            )}
            <span>{entry.message}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// SAVE / LOAD MODAL
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'hld_simulator_designs';

interface SavedDesign {
  id: string;
  name: string;
  savedAt: number;
  topologyJson: string;
}

function loadSavedDesigns(): SavedDesign[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch { return []; }
}

function persistDesigns(designs: SavedDesign[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
}

const SaveLoadModal: React.FC<{
  topology: Topology;
  designName: string;
  onNameChange: (n: string) => void;
  onSave: (name: string) => void;
  onLoad: (d: SavedDesign) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}> = ({ topology, designName, onNameChange, onSave, onLoad, onDelete, onClose }) => {
  const designs = loadSavedDesigns();
  const [tab, setTab] = useState<'save' | 'load'>('save');
  const [name, setName] = useState(designName || 'My HLD Design');
  const [saved, setSaved] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleSave = () => {
    const n = name.trim() || 'My HLD Design';
    onNameChange(n);
    onSave(n);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const fmt = (ts: number) => new Date(ts).toLocaleString();

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 600,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--ua-surface)', borderRadius: 16,
        boxShadow: '0 24px 64px rgba(0,0,0,.3)',
        width: 480, maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        border: '1px solid var(--ua-border)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px 12px',
          borderBottom: '1px solid var(--ua-border)' }}>
          <FolderOpen size={16} color="var(--ua-primary-500)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--ua-text-primary)', flex: 1 }}>
            Designs
          </span>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--ua-text-muted)', fontSize: 16, padding: '0 4px' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--ua-border)' }}>
          {(['save', 'load'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              flex: 1, padding: '9px 0', border: 'none', background: 'none',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              borderBottom: `2px solid ${tab === t ? 'var(--ua-primary-500)' : 'transparent'}`,
              color: tab === t ? 'var(--ua-primary-500)' : 'var(--ua-text-muted)',
              textTransform: 'capitalize',
            }}>
              {t === 'save' ? '💾 Save' : '📂 Load'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {tab === 'save' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 11, color: 'var(--ua-text-muted)', margin: 0 }}>
                Saves a snapshot of your current canvas ({topology.nodes.length} nodes,{' '}
                {topology.edges.length} edges) to browser storage.
              </p>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--ua-text-secondary)',
                  display: 'block', marginBottom: 5 }}>Design name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  style={{
                    width: '100%', border: '1.5px solid var(--ua-border)', borderRadius: 8,
                    padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
                    background: 'var(--ua-background)', color: 'var(--ua-text-primary)',
                  }}
                  placeholder="e.g. IRCTC with CDN and Read Replica"
                />
              </div>
              <button onClick={handleSave} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 20px', borderRadius: 10, border: 'none',
                background: saved ? '#10B981' : 'var(--ua-primary-500)', color: '#fff',
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.2s',
              }}>
                {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Design</>}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {designs.length === 0 ? (
                <p style={{ fontSize: 12, color: 'var(--ua-text-muted)', textAlign: 'center', padding: '24px 0' }}>
                  No saved designs yet — save your current canvas first
                </p>
              ) : designs.map(d => (
                <div key={d.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                  borderRadius: 10, border: '1px solid var(--ua-border)',
                  background: 'var(--ua-surface-soft)',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--ua-text-primary)',
                      margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.name}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', margin: '2px 0 0' }}>
                      {fmt(d.savedAt)} · {JSON.parse(d.topologyJson).nodes?.length ?? '?'} nodes
                    </p>
                  </div>
                  <button onClick={() => { onLoad(d); onClose(); }} style={{
                    padding: '5px 12px', borderRadius: 7, border: 'none',
                    background: 'var(--ua-primary-500)', color: '#fff',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  }}>Load</button>
                  {deletingId === d.id ? (
                    <>
                      <button onClick={() => { onDelete(d.id); setDeletingId(null); }} style={{
                        padding: '5px 10px', borderRadius: 7, border: 'none',
                        background: '#FEE2E2', color: '#EF4444', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      }}>Confirm</button>
                      <button onClick={() => setDeletingId(null)} style={{
                        padding: '5px 8px', borderRadius: 7, border: '1px solid var(--ua-border)',
                        background: 'none', color: 'var(--ua-text-muted)', fontSize: 11, cursor: 'pointer',
                      }}>✕</button>
                    </>
                  ) : (
                    <button onClick={() => setDeletingId(d.id)} style={{
                      padding: '5px 8px', borderRadius: 7, border: '1px solid var(--ua-border)',
                      background: 'none', color: 'var(--ua-text-muted)', fontSize: 11, cursor: 'pointer',
                    }}>🗑</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────
type BottomTab = 'metrics' | 'terminal' | 'logs' | 'incidents';
type RightTab  = 'inspector' | 'incidents' | 'failures';

function makeEdgeId() { return `edge-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`; }

export const LabWorkspace: React.FC<{ scenario: LabScenario }> = ({ scenario }) => {
  // Remove lockedNodeIds constraint — student controls everything
  const freeScenario: LabScenario = {
    ...scenario,
    constraints: { ...scenario.constraints, lockedNodeIds: [], maxNodes: MAX_NODES },
    // Strip timeline-based scheduled events (student triggers manually)
    scheduledEvents: [],
  };

  const [topology, dispatchTopo] = useReducer(topoReducer, {
    ...scenario.initialTopology,
    nodes: scenario.initialTopology.nodes.map(n => ({ ...n })),
    edges: scenario.initialTopology.edges.map(e => ({ ...e })),
  });

  const { state, samples, logs, error, ready, controls } = useSimulation(freeScenario);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BottomTab>('metrics');
  const [rightTab,  setRightTab]  = useState<RightTab>('inspector');
  const [speed, setSpeed] = useState(1);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [designName, setDesignName] = useState('');

  const isRunning   = state?.status === 'running';
  const simTime     = state?.simulationTime ?? 0;
  // Always use LOCAL topology for canvas rendering (positions).
  // Worker snapshot topology is only for metrics — never for positions.
  const liveMetrics = state?.metrics ?? {};
  const activeIncidents = state?.activeIncidents ?? [];
  const selectedNode = topology.nodes.find(n => n.id === selectedNodeId);

  // ── Topology mutations ──────────────────────────────────────────────────
  const handleNodeMove = useCallback((id: string, x: number, y: number) => {
    dispatchTopo({ type: 'MOVE_NODE', id, x, y });
    controls.applyAction({ id: `a-${Date.now()}`, kind: 'move_node', payload: { nodeId: id, x, y }, appliedAt: simTime });
  }, [controls, simTime]);

  const handleAddNode = useCallback((node: TopologyNode) => {
    if (topology.nodes.length >= MAX_NODES) return;
    dispatchTopo({ type: 'ADD_NODE', node });
    controls.applyAction({ id: `a-${Date.now()}`, kind: 'add_node', payload: { node }, appliedAt: simTime });
  }, [controls, simTime, topology.nodes.length]);

  const handleAddEdge = useCallback((fromId: string, toId: string) => {
    const edge: TopologyEdge = { id: makeEdgeId(), fromId, toId, label: 'HTTP' };
    dispatchTopo({ type: 'ADD_EDGE', edge });
    controls.applyAction({ id: `a-${Date.now()}`, kind: 'add_edge', payload: { edge }, appliedAt: simTime });
  }, [controls, simTime]);

  const handleDeleteNode = useCallback((id: string) => {
    dispatchTopo({ type: 'DELETE_NODE', id });
    controls.applyAction({ id: `a-${Date.now()}`, kind: 'remove_node', payload: { nodeId: id }, appliedAt: simTime });
    if (selectedNodeId === id) setSelectedNodeId(null);
  }, [controls, simTime, selectedNodeId]);

  const handleDeleteEdge = useCallback((id: string) => {
    dispatchTopo({ type: 'DELETE_EDGE', id });
    controls.applyAction({ id: `a-${Date.now()}`, kind: 'remove_edge', payload: { edgeId: id }, appliedAt: simTime });
  }, [controls, simTime]);

  const handleDuplicateNode = useCallback((id: string) => {
    if (topology.nodes.length >= MAX_NODES) return;
    const src = topology.nodes.find(n => n.id === id);
    if (!src) return;
    const node: TopologyNode = {
      ...src,
      id: `node-dup-${Date.now()}`,
      label: src.label + ' 2',
      position: { x: src.position.x + 210, y: src.position.y + 30 },
    };
    handleAddNode(node);
  }, [handleAddNode, topology.nodes]);

  const handleUpdateConfig = useCallback((id: string, patch: Record<string, unknown>) => {
    if ('_label' in patch) {
      // Special key — triggers a label rename, not a config change
      dispatchTopo({ type: 'RENAME_NODE', id, label: patch['_label'] as string });
      controls.applyAction({
        id: `a-${Date.now()}`, kind: 'configure_node',
        payload: { nodeId: id, key: 'label', value: patch['_label'] }, appliedAt: simTime,
      });
      return;
    }
    dispatchTopo({ type: 'UPDATE_CONFIG', id, patch });
    // Send every changed key as a configure_node action so the engine sees it
    for (const [key, value] of Object.entries(patch)) {
      controls.applyAction({
        id: `a-${Date.now()}-${key}`, kind: 'configure_node',
        payload: { nodeId: id, [key]: value }, appliedAt: simTime,
      });
    }
  }, [controls, simTime]);

  const handleRenameNode = useCallback((id: string, label: string) => {
    dispatchTopo({ type: 'RENAME_NODE', id, label });
    controls.applyAction({
      id: `a-${Date.now()}`, kind: 'configure_node',
      payload: { nodeId: id, key: 'label', value: label }, appliedAt: simTime,
    });
  }, [controls, simTime]);

  const handleAction = useCallback((action: StudentAction) => {
    controls.applyAction(action);
  }, [controls]);

  const handleReset = () => {
    dispatchTopo({ type: 'RESET', topology: scenario.initialTopology });
    setSelectedNodeId(null);
    controls.reset(freeScenario);
  };

  // ── Save / Load / Import / Export ────────────────────────────────────────
  const handleSaveDesign = useCallback((name: string) => {
    const designs = loadSavedDesigns();
    const existing = designs.findIndex(d => d.name === name);
    const entry: SavedDesign = {
      id: existing >= 0 ? designs[existing].id : `design-${Date.now()}`,
      name,
      savedAt: Date.now(),
      topologyJson: JSON.stringify(topology),
    };
    if (existing >= 0) designs[existing] = entry;
    else designs.unshift(entry);
    persistDesigns(designs);
  }, [topology]);

  const handleLoadDesign = useCallback((d: SavedDesign) => {
    try {
      const topo: Topology = JSON.parse(d.topologyJson);
      dispatchTopo({ type: 'RESET', topology: topo });
      setSelectedNodeId(null);
      setDesignName(d.name);
    } catch { /* ignore corrupt JSON */ }
  }, []);

  const handleDeleteDesign = useCallback((id: string) => {
    persistDesigns(loadSavedDesigns().filter(d => d.id !== id));
  }, []);

  const handleExport = useCallback(() => {
    const blob = new Blob([JSON.stringify({ name: designName || 'HLD Design', topology }, null, 2)],
      { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${(designName || 'hld-design').toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [topology, designName]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(reader.result as string);
          const topo: Topology = parsed.topology ?? parsed;
          if (topo.nodes && topo.edges) {
            dispatchTopo({ type: 'RESET', topology: topo });
            setDesignName(parsed.name ?? '');
            setSelectedNodeId(null);
          }
        } catch { /* invalid file */ }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  // Bottom tabs
  const BTABS: { id: BottomTab; label: string; icon: typeof Activity; badge?: number }[] = [
    { id: 'metrics',   label: 'Metrics',   icon: Gauge },
    { id: 'terminal',  label: 'Terminal',  icon: TerminalIcon },
    { id: 'logs',      label: 'Logs',      icon: ScrollText },
    { id: 'incidents', label: 'Incidents', icon: Siren,
      badge: activeIncidents.length > 0 ? activeIncidents.length : undefined },
  ];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 60px)',
      background: 'var(--ua-background)',
      overflow: 'hidden', position: 'relative',
    }}>
      {/* ── Title bar ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px', height: 44, flexShrink: 0,
        background: 'var(--ua-surface)', borderBottom: '1px solid var(--ua-border)',
      }}>
        <div style={{ width: 26, height: 26, borderRadius: 7, background: '#EFF6FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FlaskConical size={13} color="var(--ua-primary-500)" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ua-text-primary)',
            margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            HLD Simulator
            {designName && (
              <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ua-text-muted)', marginLeft: 8 }}>
                — {designName}
              </span>
            )}
          </h1>
          <p style={{ fontSize: 9.5, color: 'var(--ua-text-muted)', margin: 0 }}>
            {topology.nodes.length}/{MAX_NODES} nodes · right-click any node to rename · no time limit
          </p>
        </div>

        {/* Save / Load / Import / Export */}
        <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
          <button onClick={() => setShowDesignModal(true)} title="Save / Load designs" style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8,
            border: '1px solid var(--ua-border)', background: 'var(--ua-surface)',
            color: 'var(--ua-text-secondary)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
            <FolderOpen size={12} /> Designs
          </button>
          <button onClick={handleExport} title="Export as JSON" style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8,
            border: '1px solid var(--ua-border)', background: 'var(--ua-surface)',
            color: 'var(--ua-text-secondary)', fontSize: 11, cursor: 'pointer',
          }}>
            <Download size={12} /> Export
          </button>
          <button onClick={handleImport} title="Import JSON" style={{
            display: 'flex', alignItems: 'center', gap: 4, padding: '5px 9px', borderRadius: 8,
            border: '1px solid var(--ua-border)', background: 'var(--ua-surface)',
            color: 'var(--ua-text-secondary)', fontSize: 11, cursor: 'pointer',
          }}>
            <Upload size={12} /> Import
          </button>
        </div>

        {activeIncidents.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20,
            background: '#FEE2E2', border: '1px solid #EF4444', animation: 'pulse 2s infinite',
          }}>
            <AlertTriangle size={11} color="#EF4444" />
            <span style={{ fontSize: 10, fontWeight: 700, color: '#EF4444' }}>
              {activeIncidents.length} INCIDENT{activeIncidents.length > 1 ? 'S' : ''}
            </span>
          </div>
        )}

        {error && (
          <span style={{ fontSize: 10.5, padding: '3px 10px', borderRadius: 8,
            background: '#FEE2E2', color: '#EF4444' }}>{error}</span>
        )}
        {!ready && !error && (
          <span style={{ fontSize: 10, color: 'var(--ua-text-muted)' }}>Initialising…</span>
        )}
      </div>

      {/* ── Sim controls ──────────────────────────────────────────────── */}
      <SimControls
        status={state?.status ?? 'idle'}
        simTime={simTime}
        speed={speed}
        onStart={controls.start}
        onPause={controls.pause}
        onStep={() => controls.step(500)}
        onReset={handleReset}
        onSpeedChange={setSpeed}
      />

      {/* ── Main 3-col layout ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* LEFT: Component palette — resizable */}
        <ResizableVerticalPanel
          side="left"
          defaultWidth={200}
          minWidth={160}
          maxWidth={320}
          style={{ background: 'var(--ua-surface)', borderRight: '1px solid var(--ua-border)' }}
        >
          <ComponentPalette
            allowedKinds={freeScenario.constraints.allowedKinds}
            existingCount={topology.nodes.length}
            maxNodes={MAX_NODES}
            onAddNode={handleAddNode}
          />
        </ResizableVerticalPanel>

        {/* CENTER: Canvas */}
        <div
          style={{ flex: 1, minWidth: 0, position: 'relative' }}
          ref={el => {
            if (el) {
              (el as HTMLDivElement & { _dropCallback?: unknown })._dropCallback =
                (kind: ComponentKind, x: number, y: number) => handleAddNode(buildNode(kind, x, y));
            }
          }}
        >
          <TopologyCanvas
            topology={topology}
            metrics={liveMetrics}
            selectedNodeId={selectedNodeId}
            simTime={simTime}
            isRunning={isRunning}
            onSelectNode={id => {
              setSelectedNodeId(id);
              if (id) setRightTab('inspector');
            }}
            onNodeMove={handleNodeMove}
            onAddEdge={handleAddEdge}
            onDeleteNode={handleDeleteNode}
            onDeleteEdge={handleDeleteEdge}
            onDuplicateNode={handleDuplicateNode}
            onRenameNode={handleRenameNode}
            onTriggerFailure={id => {
              handleAction({ id: `a-${Date.now()}`, kind: 'trigger_failure', payload: { nodeId: id }, appliedAt: simTime });
              setRightTab('failures');
            }}
            onTriggerRecovery={id => {
              handleAction({ id: `a-${Date.now()}`, kind: 'trigger_recovery', payload: { nodeId: id }, appliedAt: simTime });
            }}
          />
        </div>

        {/* RIGHT: Inspector / Failures / Chaos — resizable */}
        <ResizableVerticalPanel
          side="right"
          defaultWidth={320}
          minWidth={260}
          maxWidth={520}
          style={{ background: 'var(--ua-surface)', borderLeft: '1px solid var(--ua-border)' }}
        >
          {/* Right panel tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--ua-border)', flexShrink: 0 }}>
            {([
              { id: 'inspector', label: 'Inspector', icon: Sliders },
              { id: 'failures',  label: 'Failures',  icon: Zap },
              { id: 'incidents', label: 'Chaos',     icon: Siren },
            ] as { id: RightTab; label: string; icon: typeof Sliders }[]).map(tab => {
              const Icon = tab.icon;
              const active = rightTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setRightTab(tab.id)} style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  padding: '9px 4px', fontSize: 11, fontWeight: 600, border: 'none', background: 'none',
                  borderBottom: `2px solid ${active ? 'var(--ua-primary-500)' : 'transparent'}`,
                  color: active ? 'var(--ua-primary-500)' : 'var(--ua-text-muted)',
                  cursor: 'pointer', whiteSpace: 'nowrap',
                }}>
                  <Icon size={12} /> {tab.label}
                  {tab.id === 'incidents' && activeIncidents.length > 0 && (
                    <span style={{ width: 15, height: 15, borderRadius: '50%', background: '#EF4444',
                      color: '#fff', fontSize: 8.5, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {activeIncidents.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right panel body */}
          <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {rightTab === 'inspector' ? (
              selectedNode ? (
                <ResourceInspector
                  node={selectedNode}
                  metrics={liveMetrics}
                  onUpdateConfig={handleUpdateConfig}
                  onAction={handleAction}
                  onDeselect={() => setSelectedNodeId(null)}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', height: '100%', gap: 10, padding: 20, textAlign: 'center' }}>
                  <Sliders size={28} color="var(--ua-text-muted)" />
                  <p style={{ fontSize: 12, color: 'var(--ua-text-muted)', margin: 0 }}>
                    Click any node to adjust its resources
                  </p>
                  <p style={{ fontSize: 10.5, color: 'var(--ua-text-muted)', margin: 0 }}>
                    RAM · Storage · RPS · Pool size · Cache size
                  </p>
                </div>
              )
            ) : rightTab === 'failures' ? (
              <FailurePanel
                nodes={topology.nodes}
                edges={topology.edges}
                metrics={liveMetrics}
                isRunning={isRunning}
                simTime={simTime}
                onAction={handleAction}
                onAddNode={handleAddNode}
                onAddEdge={handleAddEdge}
                onApplyConfig={handleUpdateConfig}
              />
            ) : (
              <div style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
                <IncidentPanel
                  nodes={topology.nodes}
                  activeIncidents={activeIncidents}
                  isRunning={isRunning}
                  simTime={simTime}
                  onAction={handleAction}
                />
              </div>
            )}
          </div>
        </ResizableVerticalPanel>
      </div>

      {/* ── Bottom panel — resizable ───────────────────────────────────── */}
      <ResizableBottomPanel defaultHeight={240} minHeight={38} maxHeight={520}>
        {/* Tab bar */}
        <div style={{ display: 'flex', padding: '0 8px', borderBottom: '1px solid var(--ua-border)',
          flexShrink: 0, overflowX: 'auto', background: 'var(--ua-surface)' }}>
          {BTABS.map(tab => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', flexShrink: 0,
                border: 'none', borderBottom: `2px solid ${active ? 'var(--ua-primary-500)' : 'transparent'}`,
                background: 'none', color: active ? 'var(--ua-primary-500)' : 'var(--ua-text-muted)',
                fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              }}>
                <Icon size={12} /> {tab.label}
                {tab.badge != null && (
                  <span style={{ fontSize: 8.5, fontWeight: 800, padding: '0 4px', borderRadius: 10,
                    background: '#EF4444', color: '#fff', minWidth: 14, textAlign: 'center' }}>
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'hidden', padding: '8px 12px' }}>
          {activeTab === 'metrics'   && <div style={{ height: '100%', overflowY: 'auto' }}><MetricsPanel state={state} samples={samples} /></div>}
          {activeTab === 'terminal'  && <div style={{ height: '100%' }}><SimulationTerminal state={state} className="h-full" /></div>}
          {activeTab === 'logs'      && <div style={{ height: '100%' }}><LogViewer logs={logs} /></div>}
          {activeTab === 'incidents' && (
            <div style={{ height: '100%', overflowY: 'auto' }}>
              <IncidentPanel
                nodes={topology.nodes}
                activeIncidents={activeIncidents}
                isRunning={isRunning}
                simTime={simTime}
                onAction={handleAction}
              />
            </div>
          )}
        </div>
      </ResizableBottomPanel>

      {/* ── Save/Load Modal ────────────────────────────────────────────── */}
      {showDesignModal && (
        <SaveLoadModal
          topology={topology}
          designName={designName}
          onNameChange={setDesignName}
          onSave={handleSaveDesign}
          onLoad={handleLoadDesign}
          onDelete={handleDeleteDesign}
          onClose={() => setShowDesignModal(false)}
        />
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes shimmer {
          0%   { transform: translateX(-100%); opacity: 0.6; }
          50%  { opacity: 1; }
          100% { transform: translateX(200%); opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};
