/**
 * MetricsPanel — real-time sparkline metrics from the simulation.
 *
 * Shows per-component saturation and latency trends using plain SVG
 * sparklines (no external charting library needed).
 */

import React, { useMemo } from 'react';
import type { MetricSample, SimulationState } from '../engine/types';

// ─────────────────────────────────────────────────────────────────────────────
// SVG SPARKLINE
// ─────────────────────────────────────────────────────────────────────────────

interface SparklineProps {
  samples: number[];
  color: string;
  width?: number;
  height?: number;
  label?: string;
}

const Sparkline: React.FC<SparklineProps> = ({
  samples, color, width = 120, height = 30, label,
}) => {
  const points = useMemo(() => {
    if (samples.length < 2) return '';
    const max = Math.max(...samples, 0.001);
    return samples
      .map((v, i) => {
        const x = (i / (samples.length - 1)) * width;
        const y = height - (v / max) * height;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [samples, width, height]);

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label={label ?? 'sparkline'}
      style={{ overflow: 'visible' }}
    >
      {points && (
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PER-NODE METRIC CARD
// ─────────────────────────────────────────────────────────────────────────────

interface NodeMetricCardProps {
  nodeId: string;
  label: string;
  kind: string;
  satSamples: number[];
  latSamples: number[];
  currentSat: number;
  currentLat: number;
  currentErr: number;
}

function statusColor(saturation: number): string {
  if (saturation > 0.9) return 'var(--ua-danger)';
  if (saturation > 0.7) return 'var(--ua-warning)';
  return 'var(--ua-success)';
}

const NodeMetricCard: React.FC<NodeMetricCardProps> = ({
  label, kind, satSamples, latSamples, currentSat, currentLat, currentErr,
}) => {
  const color = statusColor(currentSat);

  return (
    <div
      className="rounded-xl p-3"
      style={{
        background: 'var(--ua-surface)',
        border: '1px solid var(--ua-border)',
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-text-primary truncate max-w-[120px]">{label}</p>
          <p className="text-xs text-text-muted">{kind.replace(/_/g, ' ')}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold" style={{ color }}>
            {Math.round(currentSat * 100)}%
          </p>
          <p className="text-xs text-text-muted">sat.</p>
        </div>
      </div>

      <div className="flex gap-3 mb-2">
        <div>
          <p className="text-xs text-text-muted mb-0.5">Saturation</p>
          <Sparkline
            samples={satSamples}
            color={color}
            width={100}
            height={24}
            label={`${label} saturation trend`}
          />
        </div>
        <div>
          <p className="text-xs text-text-muted mb-0.5">Latency</p>
          <Sparkline
            samples={latSamples}
            color="var(--ua-accent-cyan)"
            width={100}
            height={24}
            label={`${label} latency trend`}
          />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <span className="text-text-muted">
          Lat: <span className="font-mono text-text-primary">{Math.round(currentLat)}ms</span>
        </span>
        <span className="text-text-muted">
          Err: <span
            className="font-mono"
            style={{ color: currentErr > 0.05 ? 'var(--ua-danger)' : 'var(--ua-text-primary)' }}
          >
            {(currentErr * 100).toFixed(1)}%
          </span>
        </span>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// METRICS PANEL
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricsPanelProps {
  state: SimulationState | null;
  samples: MetricSample[];
  className?: string;
}

const SPARKLINE_WINDOW = 30; // data points

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  state, samples, className,
}) => {
  const nodeCards = useMemo(() => {
    if (!state) return [];
    return state.topology.nodes
      .filter(n => n.kind !== 'client') // client is the source, less interesting to chart
      .map(node => {
        const satHistory = samples
          .filter(s => s.nodeId === node.id && s.metric === 'saturation')
          .slice(-SPARKLINE_WINDOW)
          .map(s => s.value);
        const latHistory = samples
          .filter(s => s.nodeId === node.id && s.metric === 'avgLatencyMs')
          .slice(-SPARKLINE_WINDOW)
          .map(s => s.value);
        const m = state.metrics[node.id];
        return {
          nodeId: node.id,
          label: node.label,
          kind: node.kind,
          satSamples: satHistory,
          latSamples: latHistory,
          currentSat: m?.saturation ?? 0,
          currentLat: m?.avgLatencyMs ?? 0,
          currentErr: m?.errorRate ?? 0,
        };
      });
  }, [state, samples]);

  const simTime = state ? Math.round(state.simulationTime / 1000) : 0;
  const status  = state?.status ?? 'idle';

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-primary">Component Metrics</h3>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono"
            style={{
              background: status === 'running' ? 'var(--ua-success-soft)' :
                          status === 'paused'  ? 'var(--ua-warning-soft)' :
                          'var(--ua-border)',
              color: status === 'running' ? 'var(--ua-success)' :
                     status === 'paused'  ? 'var(--ua-warning)' :
                     'var(--ua-text-muted)',
            }}
          >
            {status.toUpperCase()}
          </span>
          {state && (
            <span className="text-xs font-mono text-text-muted">
              t={simTime}s
            </span>
          )}
          <span
            className="text-xs px-1.5 py-0.5 rounded"
            style={{ background: 'var(--ua-primary-50)', color: 'var(--ua-primary-500)' }}
          >
            SIMULATED
          </span>
        </div>
      </div>

      {/* Cards grid */}
      {nodeCards.length === 0 ? (
        <div
          className="rounded-xl p-6 text-center text-sm text-text-muted"
          style={{ border: '1px dashed var(--ua-border)' }}
        >
          Start the simulation to see live metrics.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {nodeCards.map(card => (
            <NodeMetricCard key={card.nodeId} {...card} />
          ))}
        </div>
      )}

      {/* Active incidents */}
      {state && state.activeIncidents.length > 0 && (
        <div
          className="mt-4 rounded-xl px-4 py-3 flex items-start gap-2"
          style={{ background: 'var(--ua-danger-soft)', color: 'var(--ua-danger)' }}
          role="alert"
        >
          <span className="text-base">⚠</span>
          <div>
            <p className="text-xs font-semibold">Active Incidents</p>
            <ul className="mt-1 text-xs space-y-0.5">
              {state.activeIncidents.map(inc => (
                <li key={inc}>• {inc.replace(/_/g, ' ')}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
