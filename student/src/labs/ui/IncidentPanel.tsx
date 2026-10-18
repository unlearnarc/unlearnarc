/**
 * IncidentPanel — Real-time incident control center.
 *
 * Two sections:
 *   1. Pre-test configuration (before sim starts): choose which random incidents to arm
 *   2. Live incident triggers (during sim): fire NOW buttons for each armed incident
 *
 * All incidents are routed through StudentAction → engine.
 */

import React, { useState } from 'react';
import {
  Zap, Database, Server, Wifi, AlertTriangle,
  Flame, RefreshCw, ShieldOff, Activity, Clock,
  ChevronDown, ChevronUp, Siren,
} from 'lucide-react';
import type { StudentAction, TopologyNode } from '../engine/types';

// ─────────────────────────────────────────────────────────────────────────────
// INCIDENT CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

export interface IncidentTemplate {
  id:          string;
  label:       string;
  description: string;
  icon:        React.FC<{ size?: number; color?: string }>;
  color:       string;
  bg:          string;
  targetKinds: string[];   // which component kinds this applies to ('*' = all)
  actionKind:  string;
  severity:    'low' | 'medium' | 'high' | 'critical';
}

export const INCIDENT_TEMPLATES: IncidentTemplate[] = [
  {
    id: 'power_cut',
    label: 'Power Cut',
    description: 'Total component failure — simulates a power outage or hard crash',
    icon: Zap,
    color: '#F59E0B',
    bg: '#FEF3C7',
    targetKinds: ['*'],
    actionKind: 'trigger_failure',
    severity: 'critical',
  },
  {
    id: 'db_down',
    label: 'Database Down',
    description: 'Primary database becomes unavailable — triggers connection pool exhaustion',
    icon: Database,
    color: '#EF4444',
    bg: '#FEE2E2',
    targetKinds: ['database'],
    actionKind: 'trigger_failure',
    severity: 'critical',
  },
  {
    id: 'heavy_load',
    label: 'Heavy Traffic Surge',
    description: 'Unexpected 10× traffic spike — stress-tests capacity and autoscaling',
    icon: Flame,
    color: '#F97316',
    bg: '#FFF7ED',
    targetKinds: ['*'],
    actionKind: 'traffic_surge',
    severity: 'high',
  },
  {
    id: 'service_crash',
    label: 'Service Crash',
    description: 'Application server process crashes — tests failover and recovery',
    icon: Server,
    color: '#DC2626',
    bg: '#FEE2E2',
    targetKinds: ['service', 'api_gateway', 'worker'],
    actionKind: 'trigger_failure',
    severity: 'high',
  },
  {
    id: 'network_partition',
    label: 'Network Partition',
    description: 'Network split between services — tests distributed system fault tolerance',
    icon: Wifi,
    color: '#7C3AED',
    bg: '#EDE9FE',
    targetKinds: ['*'],
    actionKind: 'trigger_failure',
    severity: 'high',
  },
  {
    id: 'cache_invalidation',
    label: 'Cache Flush',
    description: 'Entire cache is flushed — causes a thundering herd on the origin',
    icon: RefreshCw,
    color: '#0891B2',
    bg: '#E0F2FE',
    targetKinds: ['cache', 'cdn'],
    actionKind: 'trigger_failure',
    severity: 'medium',
  },
  {
    id: 'circuit_open',
    label: 'Circuit Breaker Open',
    description: 'Circuit breaker trips open — downstream services stop receiving traffic',
    icon: ShieldOff,
    color: '#9333EA',
    bg: '#F3E8FF',
    targetKinds: ['circuit_breaker'],
    actionKind: 'trigger_failure',
    severity: 'medium',
  },
  {
    id: 'memory_leak',
    label: 'Memory Leak',
    description: 'Service memory climbs over time — watch latency degrade slowly',
    icon: Activity,
    color: '#16A34A',
    bg: '#D1FAE5',
    targetKinds: ['service', 'api_gateway'],
    actionKind: 'trigger_failure',
    severity: 'medium',
  },
  {
    id: 'slow_query',
    label: 'Slow Query Spike',
    description: 'Database query time spikes — connection pool queues back up',
    icon: Clock,
    color: '#B45309',
    bg: '#FEF3C7',
    targetKinds: ['database', 'read_replica'],
    actionKind: 'trigger_failure',
    severity: 'low',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEVERITY BADGE
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<IncidentTemplate['severity'], { bg: string; text: string; label: string }> = {
  critical: { bg: '#FEE2E2', text: '#DC2626', label: 'CRITICAL' },
  high:     { bg: '#FFF7ED', text: '#F97316', label: 'HIGH' },
  medium:   { bg: '#FEF3C7', text: '#B45309', label: 'MEDIUM' },
  low:      { bg: '#D1FAE5', text: '#065F46', label: 'LOW' },
};

const SeverityBadge: React.FC<{ severity: IncidentTemplate['severity'] }> = ({ severity }) => {
  const s = SEVERITY_COLORS[severity];
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, letterSpacing: '0.05em',
      padding: '1px 5px', borderRadius: 4,
      background: s.bg, color: s.text,
    }}>
      {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PRE-TEST CONFIG (arms incidents for random firing during run)
// ─────────────────────────────────────────────────────────────────────────────

interface PreTestConfigProps {
  armed:    Set<string>;
  onToggle: (id: string) => void;
}

export const IncidentPreTestConfig: React.FC<PreTestConfigProps> = ({ armed, onToggle }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 7,
      padding: '8px 12px', borderRadius: 10,
      background: 'var(--ua-warning-soft)',
      border: '1px solid var(--ua-warning)',
      marginBottom: 4,
    }}>
      <AlertTriangle size={13} color="var(--ua-warning)" />
      <p style={{ fontSize: 11, color: 'var(--ua-warning)', margin: 0, fontWeight: 500 }}>
        Armed incidents fire automatically at random times during the simulation.
      </p>
    </div>

    {INCIDENT_TEMPLATES.map(tmpl => {
      const isArmed = armed.has(tmpl.id);
      const Icon = tmpl.icon;
      return (
        <button
          key={tmpl.id}
          onClick={() => onToggle(tmpl.id)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', borderRadius: 10,
            border: '1.5px solid',
            borderColor: isArmed ? tmpl.color : 'var(--ua-border)',
            background: isArmed ? tmpl.bg : 'var(--ua-surface)',
            cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s',
          }}
          aria-pressed={isArmed}
        >
          {/* Toggle */}
          <div style={{
            width: 18, height: 18, borderRadius: '50%',
            border: '2px solid',
            borderColor: isArmed ? tmpl.color : 'var(--ua-border)',
            background: isArmed ? tmpl.color : 'transparent',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.12s',
          }}>
            {isArmed && <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>✓</span>}
          </div>

          {/* Icon */}
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: tmpl.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Icon size={15} color={tmpl.color} />
          </div>

          {/* Text */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5, marginBottom: 1,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ua-text-primary)' }}>
                {tmpl.label}
              </span>
              <SeverityBadge severity={tmpl.severity} />
            </div>
            <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', margin: 0, lineHeight: 1.4 }}>
              {tmpl.description}
            </p>
          </div>
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// LIVE INCIDENT TRIGGERS (during run)
// ─────────────────────────────────────────────────────────────────────────────

interface LiveIncidentPanelProps {
  nodes:          TopologyNode[];
  lockedNodeIds:  string[];
  activeIncidents:string[];
  onAction:       (action: StudentAction) => void;
  simTime:        number;
  isRunning:      boolean;
}

function makeActionId() { return `action-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }

export const LiveIncidentPanel: React.FC<LiveIncidentPanelProps> = ({
  nodes, lockedNodeIds, activeIncidents, onAction, simTime, isRunning,
}) => {
  const [selectedTmpl, setSelectedTmpl] = useState<string>('power_cut');
  const [selectedNode, setSelectedNode] = useState<string>('');
  const [recentFired, setRecentFired] = useState<{ id: string; at: number }[]>([]);
  const [showRecovery, setShowRecovery] = useState(false);

  const tmpl = INCIDENT_TEMPLATES.find(t => t.id === selectedTmpl)!;

  // Eligible nodes for this incident type
  const eligibleNodes = nodes.filter(n =>
    !lockedNodeIds.includes(n.id) &&
    (tmpl.targetKinds.includes('*') || tmpl.targetKinds.includes(n.kind))
  );

  const canFire = isRunning && (
    tmpl.actionKind === 'traffic_surge' || (selectedNode !== '' && eligibleNodes.some(n => n.id === selectedNode))
  );

  const fireIncident = () => {
    if (!isRunning) return;
    const now = Date.now();

    if (tmpl.actionKind === 'traffic_surge') {
      onAction({
        id: makeActionId(),
        kind: 'trigger_failure',
        payload: { type: 'traffic_surge', multiplier: 10 },
        appliedAt: simTime,
      });
      setRecentFired(p => [{ id: tmpl.id, at: now }, ...p.slice(0, 9)]);
      return;
    }

    if (!selectedNode) return;
    onAction({
      id: makeActionId(),
      kind: 'trigger_failure',
      payload: { nodeId: selectedNode },
      appliedAt: simTime,
    });
    setRecentFired(p => [{ id: tmpl.id + ':' + selectedNode, at: now }, ...p.slice(0, 9)]);
  };

  const recoverAll = () => {
    nodes.filter(n => !lockedNodeIds.includes(n.id)).forEach(n => {
      if (activeIncidents.some(i => i.includes(n.id))) {
        onAction({
          id: makeActionId(),
          kind: 'trigger_recovery',
          payload: { nodeId: n.id },
          appliedAt: simTime,
        });
      }
    });
  };

  const Icon = tmpl.icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Active incidents banner */}
      {activeIncidents.length > 0 && (
        <div style={{
          padding: '8px 12px', borderRadius: 10,
          background: 'var(--ua-danger-soft)',
          border: '1px solid var(--ua-danger)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Siren size={14} color="var(--ua-danger)" />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--ua-danger)', margin: 0 }}>
              {activeIncidents.length} active incident{activeIncidents.length > 1 ? 's' : ''}
            </p>
            <p style={{ fontSize: 10, color: 'var(--ua-danger)', margin: 0, opacity: 0.8 }}>
              {activeIncidents.slice(0, 3).map(i => i.replace('failure_', '')).join(', ')}
            </p>
          </div>
          <button
            onClick={recoverAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 6,
              border: 'none', background: 'var(--ua-danger)',
              color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <RefreshCw size={11} />
            Recover All
          </button>
        </div>
      )}

      {/* Not running warning */}
      {!isRunning && (
        <div style={{
          padding: '7px 10px', borderRadius: 8,
          background: 'var(--ua-surface-soft)',
          border: '1px solid var(--ua-border)',
          fontSize: 11, color: 'var(--ua-text-muted)', textAlign: 'center',
        }}>
          ▶ Start the simulation to fire incidents
        </div>
      )}

      {/* Incident type picker */}
      <div>
        <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.06em', color: 'var(--ua-text-muted)', marginBottom: 6 }}>
          Incident Type
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {INCIDENT_TEMPLATES.map(t => {
            const TIcon = t.icon;
            const selected = t.id === selectedTmpl;
            return (
              <button
                key={t.id}
                onClick={() => { setSelectedTmpl(t.id); setSelectedNode(''); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 9px', borderRadius: 8,
                  border: '1.5px solid',
                  borderColor: selected ? t.color : 'transparent',
                  background: selected ? t.bg : 'transparent',
                  cursor: 'pointer', textAlign: 'left',
                  transition: 'all 0.12s',
                }}
                aria-pressed={selected}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7,
                  background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <TIcon size={13} color={t.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 11, fontWeight: selected ? 600 : 500, color: 'var(--ua-text-primary)' }}>
                      {t.label}
                    </span>
                    <SeverityBadge severity={t.severity} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Target node picker (skip for traffic_surge) */}
      {tmpl.actionKind !== 'traffic_surge' && eligibleNodes.length > 0 && (
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--ua-text-muted)', marginBottom: 6 }}>
            Target Component
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {eligibleNodes.map(n => (
              <button key={n.id}
                onClick={() => setSelectedNode(n.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 9px', borderRadius: 7,
                  border: '1.5px solid',
                  borderColor: selectedNode === n.id ? tmpl.color : 'var(--ua-border)',
                  background: selectedNode === n.id ? tmpl.bg : 'transparent',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.12s',
                }}
              >
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: selectedNode === n.id ? tmpl.color : 'var(--ua-border)',
                }} />
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--ua-text-primary)' }}>
                  {n.label}
                </span>
                <span style={{ fontSize: 9.5, color: 'var(--ua-text-muted)', marginLeft: 'auto' }}>
                  {n.kind.replace(/_/g, ' ')}
                </span>
              </button>
            ))}
          </div>
          {eligibleNodes.length === 0 && (
            <p style={{ fontSize: 10.5, color: 'var(--ua-text-muted)' }}>
              No eligible components for this incident type.
            </p>
          )}
        </div>
      )}

      {/* Fire button */}
      <button
        onClick={fireIncident}
        disabled={!canFire}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          padding: '10px 16px', borderRadius: 10,
          border: 'none',
          background: canFire ? tmpl.color : 'var(--ua-surface-soft)',
          color: canFire ? '#fff' : 'var(--ua-text-muted)',
          fontSize: 12.5, fontWeight: 700, cursor: canFire ? 'pointer' : 'not-allowed',
          boxShadow: canFire ? `0 4px 16px ${tmpl.color}55` : 'none',
          transition: 'all 0.15s',
          transform: canFire ? 'translateY(0)' : 'none',
        }}
        onMouseEnter={e => { if (canFire) (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; }}
      >
        <Icon size={15} />
        Fire: {tmpl.label}
      </button>

      {/* Recovery toggle */}
      <button
        onClick={() => setShowRecovery(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          fontSize: 10.5, fontWeight: 600, color: 'var(--ua-text-muted)',
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
        }}
      >
        {showRecovery ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        Recovery actions
      </button>

      {showRecovery && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {eligibleNodes.map(n => (
            <button key={n.id}
              onClick={() => onAction({ id: makeActionId(), kind: 'trigger_recovery',
                payload: { nodeId: n.id }, appliedAt: simTime })}
              disabled={!isRunning}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '6px 10px', borderRadius: 8,
                border: '1px solid var(--ua-border)',
                background: 'var(--ua-success-soft)',
                color: 'var(--ua-success)',
                fontSize: 11, fontWeight: 500,
                cursor: isRunning ? 'pointer' : 'not-allowed',
                opacity: isRunning ? 1 : 0.5,
                textAlign: 'left',
              }}
            >
              <RefreshCw size={11} />
              Recover {n.label}
            </button>
          ))}
        </div>
      )}

      {/* Recent fired */}
      {recentFired.length > 0 && (
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'var(--ua-text-muted)', marginBottom: 4 }}>
            Recently Fired
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {recentFired.slice(0, 5).map((f, i) => (
              <div key={i} style={{
                fontSize: 10, color: 'var(--ua-text-muted)',
                display: 'flex', justifyContent: 'space-between',
                padding: '2px 0',
              }}>
                <span>⚡ {f.id.split(':')[0]}</span>
                <span>{new Date(f.at).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
