/**
 * ComponentInspector — right-side panel for the selected topology node.
 *
 * Displays:
 *   - Component kind, label, config
 *   - Live metrics from simulation state
 *   - Quick actions: trigger failure, trigger recovery, scale replicas
 *
 * All actions are routed through the simulation engine, never applied directly
 * to the component config in React state.
 */

import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  RefreshCw, Zap, MinusCircle, TrendingUp,
} from 'lucide-react';
import type {
  TopologyNode,
  ComponentMetrics,
  StudentAction,
  LabScenario,
} from '../engine/types';

interface ComponentInspectorProps {
  node: TopologyNode;
  metrics: ComponentMetrics | undefined;
  scenario: LabScenario;
  onAction: (action: StudentAction) => void;
  onClose: () => void;
}

function makeActionId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function ms(v: number): string {
  return `${Math.round(v)}ms`;
}

const SatBar: React.FC<{ value: number }> = ({ value }) => {
  const color =
    value > 0.9 ? 'var(--ua-danger)' :
    value > 0.7 ? 'var(--ua-warning)' :
    'var(--ua-success)';
  return (
    <div
      className="h-2 rounded-full overflow-hidden"
      style={{ background: 'var(--ua-border)' }}
      role="meter"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: pct(value), background: color }}
      />
    </div>
  );
};

const MetricRow: React.FC<{ label: string; value: string; subtext?: string }> = ({
  label, value, subtext,
}) => (
  <div className="flex items-center justify-between py-1">
    <span className="text-xs text-text-muted">{label}</span>
    <div className="text-right">
      <span className="text-xs font-mono font-medium text-text-primary">{value}</span>
      {subtext && <span className="block text-xs text-text-muted">{subtext}</span>}
    </div>
  </div>
);

export const ComponentInspector: React.FC<ComponentInspectorProps> = ({
  node, metrics, scenario, onAction, onClose,
}) => {
  const [replicasInput, setReplicasInput] = useState<number>(
    (node.config as Record<string, number>)?.['replicas'] ?? 1,
  );
  const [showConfig, setShowConfig] = useState(false);

  const isLocked = (scenario.constraints.lockedNodeIds ?? []).includes(node.id);

  const handleFailure = () => {
    onAction({
      id: makeActionId(),
      kind: 'trigger_failure',
      payload: { nodeId: node.id },
      appliedAt: Date.now(),
    });
  };

  const handleRecovery = () => {
    onAction({
      id: makeActionId(),
      kind: 'trigger_recovery',
      payload: { nodeId: node.id },
      appliedAt: Date.now(),
    });
  };

  const handleScale = () => {
    onAction({
      id: makeActionId(),
      kind: 'scale_replicas',
      payload: { nodeId: node.id, replicas: replicasInput },
      appliedAt: Date.now(),
    });
  };

  const cfg = node.config as Record<string, unknown>;
  const supportsReplicas = ['service', 'api_gateway', 'worker'].includes(node.kind);
  const saturation = metrics?.saturation ?? 0;

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      aria-label={`${node.label} configuration`}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingBottom: 10, borderBottom: '1px solid var(--ua-border)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 9.5, color: 'var(--ua-text-muted)', textTransform: 'uppercase',
            letterSpacing: '0.06em', margin: 0 }}>
            {node.kind.replace(/_/g, ' ')}
          </p>
          <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--ua-text-primary)', margin: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {node.label}
          </h3>
        </div>
        {isLocked && (
          <span style={{
            fontSize: 9.5, padding: '1px 6px', borderRadius: 6,
            background: 'var(--ua-warning-soft)', color: 'var(--ua-warning)', fontWeight: 600,
          }}>
            locked
          </span>
        )}
        <button onClick={onClose} style={{
          border: 'none', background: 'none', cursor: 'pointer',
          fontSize: 14, color: 'var(--ua-text-muted)', padding: 2, lineHeight: 1,
        }} aria-label="Deselect node">
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Live Metrics */}
        {metrics ? (
          <section aria-labelledby="metrics-heading">
            <h4 id="metrics-heading" className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Live Metrics
              <span
                className="ml-2 text-xs px-1 rounded"
                style={{ background: 'var(--ua-primary-50)', color: 'var(--ua-primary-500)' }}
              >
                SIMULATED
              </span>
            </h4>

            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Saturation</span>
                <span
                  className="font-mono font-medium"
                  style={{
                    color: saturation > 0.9 ? 'var(--ua-danger)' :
                           saturation > 0.7 ? 'var(--ua-warning)' : 'var(--ua-success)',
                  }}
                >
                  {pct(saturation)}
                </span>
              </div>
              <SatBar value={saturation} />
            </div>

            <div className="divide-y" style={{ borderColor: 'var(--ua-border)' }}>
              <MetricRow label="RPS in / out"
                value={`${Math.round(metrics.requestsIn)} / ${Math.round(metrics.requestsOut)}`} />
              <MetricRow label="Dropped" value={String(Math.round(metrics.requestsDropped))} />
              <MetricRow label="Avg latency" value={ms(metrics.avgLatencyMs)} />
              <MetricRow label="Error rate" value={pct(metrics.errorRate)} />
              {metrics.queueDepth > 0 && (
                <MetricRow label="Queue depth" value={String(metrics.queueDepth)} />
              )}
              {metrics.connections != null && (
                <MetricRow
                  label="Connections"
                  value={`${metrics.connections} / ${metrics.maxConnections ?? '-'}`}
                />
              )}
              {metrics.cacheHits != null && metrics.cacheMisses != null && (
                <MetricRow
                  label="Cache hit rate"
                  value={pct(
                    (metrics.cacheHits + metrics.cacheMisses) > 0
                      ? metrics.cacheHits / (metrics.cacheHits + metrics.cacheMisses)
                      : 0,
                  )}
                  subtext={`${Math.round(metrics.cacheHits)} hits / ${Math.round(metrics.cacheMisses)} misses`}
                />
              )}
              {(metrics.replicationLagMs ?? 0) > 0 && (
                <MetricRow label="Replica lag" value={ms(metrics.replicationLagMs!)} />
              )}
            </div>
          </section>
        ) : (
          <p className="text-xs text-text-muted">No metrics yet — start the simulation.</p>
        )}

        {/* Status badge */}
        {metrics && (
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{
              background: saturation > 0.9 ? 'var(--ua-danger-soft)' :
                          saturation > 0.7 ? 'var(--ua-warning-soft)' : 'var(--ua-success-soft)',
              color: saturation > 0.9 ? 'var(--ua-danger)' :
                     saturation > 0.7 ? 'var(--ua-warning)' : 'var(--ua-success)',
            }}
          >
            {saturation > 0.9
              ? <AlertTriangle size={14} />
              : saturation > 0.7
              ? <TrendingUp size={14} />
              : <CheckCircle size={14} />
            }
            {saturation > 0.9
              ? 'Component overloaded'
              : saturation > 0.7
              ? 'High utilization'
              : 'Healthy'}
          </div>
        )}

        {/* Scale Replicas */}
        {supportsReplicas && !isLocked && (
          <section aria-labelledby="scale-heading">
            <h4 id="scale-heading" className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Scale
            </h4>
            <div className="flex items-center gap-2">
              <label htmlFor="replicas-input" className="text-xs text-text-secondary">Replicas</label>
              <input
                id="replicas-input"
                type="number"
                min={1}
                max={20}
                value={replicasInput}
                onChange={e => setReplicasInput(parseInt(e.target.value, 10) || 1)}
                className="w-16 text-center text-sm rounded border px-2 py-1"
                style={{
                  background: 'var(--ua-surface-soft)',
                  border: '1px solid var(--ua-border)',
                  color: 'var(--ua-text-primary)',
                }}
              />
              <button
                onClick={handleScale}
                className="flex items-center gap-1 text-xs px-2 py-1.5 rounded transition"
                style={{
                  background: 'var(--ua-primary-50)',
                  color: 'var(--ua-primary-500)',
                }}
                aria-label={`Scale ${node.label} to ${replicasInput} replicas`}
              >
                <TrendingUp size={12} />
                Apply
              </button>
            </div>
          </section>
        )}

        {/* Failure / Recovery Actions */}
        {!isLocked && (
          <section aria-labelledby="actions-heading">
            <h4 id="actions-heading" className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
              Failure Testing
            </h4>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleFailure}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition text-left"
                style={{
                  background: 'var(--ua-danger-soft)',
                  color: 'var(--ua-danger)',
                }}
                aria-label={`Trigger failure on ${node.label}`}
              >
                <MinusCircle size={13} />
                Trigger Failure
              </button>
              <button
                onClick={handleRecovery}
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition text-left"
                style={{
                  background: 'var(--ua-success-soft)',
                  color: 'var(--ua-success)',
                }}
                aria-label={`Trigger recovery on ${node.label}`}
              >
                <RefreshCw size={13} />
                Trigger Recovery
              </button>
            </div>
          </section>
        )}

        {/* Config (collapsible) */}
        <section>
          <button
            onClick={() => setShowConfig(v => !v)}
            className="flex items-center gap-2 w-full text-left text-xs font-semibold uppercase tracking-wider text-text-muted mb-1"
            aria-expanded={showConfig}
          >
            Configuration
            {showConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {showConfig && (
            <div
              className="rounded-lg p-3 text-xs font-mono overflow-auto"
              style={{
                background: 'var(--ua-surface-soft)',
                color: 'var(--ua-text-secondary)',
                maxHeight: 200,
              }}
            >
              {Object.entries(cfg).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 py-0.5">
                  <span className="text-text-muted">{k}</span>
                  <span className="font-semibold text-text-primary">
                    {typeof v === 'boolean' ? (v ? 'true' : 'false') : String(v)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Footer */}
      <div style={{
        fontSize: 9.5, color: 'var(--ua-text-muted)',
        paddingTop: 8, borderTop: '1px solid var(--ua-border)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <Zap size={10} />
        Actions apply to the simulated engine
      </div>
    </div>
  );
};
