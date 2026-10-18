/**
 * FailurePanel — Failure → Observe → Fix → Validate
 *
 * State machine per failure card:
 *   idle      → user clicks "Trigger Failure"
 *   active    → failure is running, user picks a recovery option
 *   choosing  → user has selected a recovery option, not yet applied
 *   applied   → fix applied, user can re-trigger to validate
 *   validating→ measuring improvement (3s window)
 *   done      → verdict shown, always recovered
 */

import React, {
  useState, useCallback, useRef, useEffect, useMemo,
} from 'react';
import {
  Zap, CheckCircle2, AlertTriangle, RotateCcw,
  FlaskConical, ChevronDown, ChevronRight,
  Wrench, TrendingUp, TrendingDown, Activity,
} from 'lucide-react';
import {
  FAILURE_PLAYBOOK,
  type FailureScenario,
  type RecoveryOption,
  type FailureSeverity,
} from '../engine/failurePlaybook';
import { KIND_META } from './iconMap';
import type {
  TopologyNode, TopologyEdge, StudentAction,
  ComponentKind, ComponentMetrics,
} from '../engine/types';

// ─────────────────────────────────────────────────────────────────────────────
// PROPS
// ─────────────────────────────────────────────────────────────────────────────

export interface FailurePanelProps {
  nodes:         TopologyNode[];
  edges:         TopologyEdge[];
  metrics:       Record<string, ComponentMetrics>;
  isRunning:     boolean;
  simTime:       number;
  onAction:      (action: StudentAction) => void;
  onAddNode:     (node: TopologyNode) => void;
  onAddEdge:     (fromId: string, toId: string) => void;
  onApplyConfig: (nodeId: string, patch: Record<string, unknown>) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const SEVERITY_STYLE: Record<FailureSeverity, {
  bg: string; border: string; text: string; badge: string;
}> = {
  warning:      { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', badge: '⚠ Warning'      },
  critical:     { bg: '#FEF2F2', border: '#EF4444', text: '#7F1D1D', badge: '🔴 Critical'     },
  catastrophic: { bg: '#F5F3FF', border: '#8B5CF6', text: '#3B0764', badge: '💀 Catastrophic' },
};

function fmt(metric: string, v: number): string {
  if (metric === 'saturation' || metric === 'errorRate') return `${Math.round(v * 100)}%`;
  if (metric === 'avgLatencyMs') return `${Math.round(v)}ms`;
  if (metric === 'queueDepth') return String(Math.round(v));
  return String(Math.round(v * 100) / 100);
}

let _seq = 0;
function uid(): string { return `fp-${Date.now()}-${(++_seq).toString(36)}`; }
function newNodeId(): string { return `nr-${Date.now()}-${(++_seq).toString(36)}`; }

const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
  cdn:             { cacheHitRatio: 0.85, edgePops: 5, avgEdgeLatencyMs: 20 },
  load_balancer:   { algorithm: 'round_robin', healthCheckIntervalMs: 5000, maxConnectionsPerBackend: 5000 },
  api_gateway:     { replicas: 1, cpuCores: 2, memoryMb: 1024, maxRequestsPerSecond: 1000, avgServiceTimeMs: 20, maxConcurrentRequests: 500 },
  service:         { replicas: 2, cpuCores: 2, memoryMb: 1024, maxRequestsPerSecond: 500, avgServiceTimeMs: 50, maxConcurrentRequests: 200 },
  database:        { engine: 'mysql', maxConnections: 100, avgQueryTimeMs: 15, replicationEnabled: false, shardingEnabled: false, shardCount: 1 },
  read_replica:    { replicationLagMs: 50, maxConnections: 100, avgQueryTimeMs: 10, stalereadsAllowed: true },
  cache:           { maxSizeBytes: 1073741824, ttlSeconds: 300, evictionPolicy: 'lru', hitRatioTarget: 0.85, warmupSeconds: 20 },
  queue:           { maxDepth: 100000, visibilityTimeoutSeconds: 30, maxRetries: 3, deadLetterEnabled: true },
  event_stream:    { partitions: 8, replicationFactor: 2, retentionHours: 168, maxBytesPerPartitionMb: 1024 },
  worker:          { replicas: 3, cpuCores: 1, memoryMb: 512, maxRequestsPerSecond: 100, avgServiceTimeMs: 200, maxConcurrentRequests: 50 },
  rate_limiter:    { requestsPerSecond: 500, burstCapacity: 1000, algorithm: 'token_bucket' },
  circuit_breaker: { errorThresholdPercent: 50, openDurationMs: 30000, halfOpenMaxRequests: 5 },
  monitoring:      { samplingIntervalMs: 1000, alertThresholds: {} },
  object_storage:  {},
};

function placeNode(nodes: TopologyNode[]): { x: number; y: number } {
  if (!nodes.length) return { x: 600, y: 300 };
  const maxX = Math.max(...nodes.map(n => n.position.x));
  const avgY  = nodes.reduce((s, n) => s + n.position.y, 0) / nodes.length;
  return { x: maxX + 260, y: avgY };
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC BAR — live mini-bar showing current value
// ─────────────────────────────────────────────────────────────────────────────
const MetricBar: React.FC<{
  label: string; value: number; metric: string; alert?: boolean;
}> = ({ label, value, metric, alert }) => {
  const pct =
    metric === 'saturation' || metric === 'errorRate'
      ? Math.min(value * 100, 100)
      : metric === 'avgLatencyMs'
      ? Math.min((value / 2000) * 100, 100)
      : Math.min((value / 100000) * 100, 100);

  const color = alert ? '#EF4444' : pct > 70 ? '#F97316' : '#22C55E';

  return (
    <div style={{ padding: '4px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span style={{ fontSize: 10.5, color: 'var(--ua-text-muted)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace',
          color: alert ? '#EF4444' : 'var(--ua-text-primary)' }}>
          {fmt(metric, value)}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--ua-border)' }}>
        <div style={{ height: '100%', borderRadius: 3, width: `${pct}%`,
          background: color, transition: 'width 0.4s, background 0.3s' }} />
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY OPTION CARD
// Always at least 60px tall. Click header to expand. Apply visible when expanded.
// ─────────────────────────────────────────────────────────────────────────────
const RecoveryCard: React.FC<{
  option:   RecoveryOption;
  selected: boolean;
  applied:  boolean;
  disabled: boolean;
  onSelect: () => void;
  onApply:  () => void;
}> = ({ option, selected, applied, disabled, onSelect, onApply }) => {
  const expanded = selected || applied;
  const effColor = option.effectiveness >= 0.85 ? '#059669' : option.effectiveness >= 0.65 ? '#D97706' : '#EF4444';
  const effLabel = option.effectiveness >= 0.85 ? 'High' : option.effectiveness >= 0.65 ? 'Medium' : 'Low';

  function handleHeaderClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (!disabled || applied) onSelect();
  }

  function handleApplyClick(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    onApply();
  }

  return (
    <div
      style={{
        borderRadius: 10,
        border: `2px solid ${applied ? '#10B981' : selected ? '#6366F1' : 'var(--ua-border)'}`,
        background: applied ? '#F0FDF4' : selected ? '#EEF2FF' : 'var(--ua-surface)',
        opacity: disabled && !applied && !selected ? 0.5 : 1,
        transition: 'all 0.15s',
        overflow: 'visible',
        marginBottom: 4,
        minHeight: 64,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Header — always visible, min-height 64px ─── */}
      <div
        onClick={handleHeaderClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 12px',
          cursor: disabled && !applied ? 'not-allowed' : 'pointer',
          userSelect: 'none',
          minHeight: 64,
          height: 64,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Icon */}
        <div style={{
          width: 36, height: 36, borderRadius: 9, flexShrink: 0,
          background: selected ? '#C7D2FE' : 'var(--ua-surface-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, lineHeight: 1,
        }}>
          {option.icon ?? '🔧'}
        </div>

        {/* Label + badges */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 12, fontWeight: 700, margin: '0 0 4px',
            color: 'var(--ua-text-primary)', lineHeight: 1.3 }}>
            {option.label}
          </p>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: 9.5, padding: '2px 7px', borderRadius: 20, fontWeight: 700,
              background: option.effectiveness >= 0.85 ? '#DCFCE7'
                : option.effectiveness >= 0.65 ? '#FEF9C3' : '#FEE2E2',
              color: effColor,
            }}>
              {effLabel} · {Math.round(option.effectiveness * 100)}%
            </span>
            {applied && (
              <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 20,
                fontWeight: 800, background: '#D1FAE5', color: '#059669' }}>
                ✓ Applied
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        {!applied && (
          <div style={{
            transform: expanded ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}>
            <ChevronDown size={14} color="var(--ua-text-muted)" />
          </div>
        )}
      </div>

      {/* ── Expanded body ── */}
      {expanded && (
        <div style={{
          padding: '0 12px 12px',
          borderTop: `1px solid ${applied ? '#A7F3D0' : '#C7D2FE'}`,
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Description */}
          <p style={{ fontSize: 11.5, color: 'var(--ua-text-secondary)',
            margin: '8px 0 0', lineHeight: 1.65 }}>
            {option.description}
          </p>

          {/* What this fix does */}
          {!applied && (option.addComponentKind || option.configPatch) && (
            <div style={{
              padding: '8px 10px', borderRadius: 8,
              background: '#EEF2FF', border: '1px solid #C7D2FE',
              display: 'flex', flexDirection: 'column', gap: 4,
            }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#4338CA',
                margin: 0, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                What this does
              </p>
              {option.addComponentKind && (
                <p style={{ fontSize: 11, color: '#4F46E5', margin: 0 }}>
                  ➕ Adds <strong>{option.addComponentKind.replace(/_/g, ' ')}</strong> node and wires it in
                </p>
              )}
              {option.configPatch && Object.entries(option.configPatch).map(([k, v]) => (
                <p key={k} style={{ fontSize: 11, color: '#4F46E5', margin: 0 }}>
                  ⚙ <code style={{ background: '#C7D2FE', borderRadius: 3, padding: '0 4px' }}>{k}</code> → <strong>{String(v)}</strong>
                </p>
              ))}
            </div>
          )}

          {/* Expected result */}
          <div style={{
            padding: '7px 10px', borderRadius: 8,
            background: '#F0FDF4', border: '1px solid #A7F3D0',
          }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: '#065F46',
              margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Expected result
            </p>
            <p style={{ fontSize: 11, color: '#047857', margin: 0, lineHeight: 1.6 }}>
              {option.expectedOutcome}
            </p>
          </div>

          {/* Trade-off */}
          {option.tradeoff && (
            <div style={{
              padding: '7px 10px', borderRadius: 8,
              background: '#FFFBEB', border: '1px solid #FDE68A',
            }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#92400E',
                margin: '0 0 3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Trade-off
              </p>
              <p style={{ fontSize: 11, color: '#78350F', margin: 0, lineHeight: 1.6 }}>
                {option.tradeoff}
              </p>
            </div>
          )}

          {/* Apply button */}
          {!applied && (
            <button
              onClick={handleApplyClick}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px', borderRadius: 9, border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                color: '#fff', fontSize: 12.5, fontWeight: 700, marginTop: 2,
                boxShadow: '0 2px 8px rgba(99,102,241,.35)',
              }}
            >
              <Wrench size={13} /> Apply This Fix
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE CARD STATE MACHINE
// ─────────────────────────────────────────────────────────────────────────────
type Step = 'idle' | 'active' | 'applied' | 'validating' | 'done';

interface CardState {
  step:             Step;
  targetNodeId:     string | null;
  appliedRecovId:   string | null;
  addedNodeId:      string | null;
  metricBefore:     number;
  verdict:          string | null;
  verdictPassed:    boolean;
}

const INIT_STATE: CardState = {
  step: 'idle', targetNodeId: null, appliedRecovId: null,
  addedNodeId: null, metricBefore: 0, verdict: null, verdictPassed: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE CARD
// ─────────────────────────────────────────────────────────────────────────────
const FailureCard: React.FC<{
  failure:       FailureScenario;
  nodes:         TopologyNode[];
  edges:         TopologyEdge[];
  metrics:       Record<string, ComponentMetrics>;
  isRunning:     boolean;
  simTime:       number;
  onAction:      (a: StudentAction) => void;
  onAddNode:     (n: TopologyNode) => void;
  onAddEdge:     (fromId: string, toId: string) => void;
  onApplyConfig: (nodeId: string, patch: Record<string, unknown>) => void;
}> = ({ failure, nodes, edges: _edges, metrics, isRunning, simTime, onAction, onAddNode, onAddEdge, onApplyConfig }) => {

  const [open,       setOpen]  = useState(false);
  const [selRecovId, setSel]   = useState<string | null>(null);
  const [cs,         setCs]    = useState<CardState>(INIT_STATE);

  // Always-fresh refs — safe to use inside setTimeout
  const metricsRef = useRef(metrics);
  useEffect(() => { metricsRef.current = metrics; }, [metrics]);
  const simTimeRef = useRef(simTime);
  useEffect(() => { simTimeRef.current = simTime; }, [simTime]);
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  const csRef = useRef(cs);
  useEffect(() => { csRef.current = cs; }, [cs]);

  const sev = SEVERITY_STYLE[failure.severity];

  // Which nodes in the current topology can receive this failure
  const targetNodes = useMemo(
    () => nodes.filter(n => failure.targets.includes(n.kind as ComponentKind)),
    [nodes, failure.targets],
  );
  const hasTargets = targetNodes.length > 0;

  // The target node for this card (first matching, or previously selected)
  const targetNode = useMemo(
    () => (cs.targetNodeId
      ? nodesRef.current.find(n => n.id === cs.targetNodeId)
      : targetNodes[0]) ?? null,
    [cs.targetNodeId, targetNodes],
  );

  // Live metric value for target node
  const liveVal = useMemo(() => {
    if (!targetNode) return null;
    const m = metrics[targetNode.id];
    return m ? ((m[failure.validationMetric as keyof typeof m] as number) ?? null) : null;
  }, [metrics, targetNode, failure.validationMetric]);

  // ── Action helper ──────────────────────────────────────────────────────────
  const act = useCallback((a: Omit<StudentAction, 'appliedAt'>) => {
    onAction({ ...a, appliedAt: simTimeRef.current });
  }, [onAction]);

  // ── Step 1: Trigger ────────────────────────────────────────────────────────
  const handleTrigger = useCallback(() => {
    if (!isRunning || !hasTargets) return;
    const target = targetNodes[0];

    // Read baseline metric BEFORE failure
    const before = (metricsRef.current[target.id]?.[failure.validationMetric as keyof ComponentMetrics] as number) ?? 0;

    // Apply the failure (degradation mode: node stays alive but degraded)
    act({
      id: uid(), kind: 'trigger_failure',
      payload: { nodeId: target.id, failureConfig: failure.failureConfig ?? {} },
    });

    setCs({ ...INIT_STATE, step: 'active', targetNodeId: target.id, metricBefore: before });
    setSel(null);
    setOpen(true);
  }, [isRunning, hasTargets, targetNodes, failure, act]);

  // ── Step 2: Apply Recovery ──────────────────────────────────────────────────
  const handleApply = useCallback((option: RecoveryOption) => {
    const target = nodesRef.current.find(n => n.id === csRef.current.targetNodeId) ?? targetNodes[0];
    if (!target) return;

    // 1. Restore node to healthy state
    act({ id: uid(), kind: 'trigger_recovery', payload: { nodeId: target.id } });

    // 2. Apply recovery configPatch on top of restored healthy config
    if (option.configPatch) {
      onApplyConfig(target.id, option.configPatch);
      act({ id: uid(), kind: 'configure_node', payload: { nodeId: target.id, ...option.configPatch } });
    }

    // 3. Add new component if needed
    let addedId: string | null = null;
    if (option.addComponentKind) {
      const kind = option.addComponentKind;
      const pos  = placeNode(nodesRef.current);
      const newNode: TopologyNode = {
        id:       newNodeId(),
        kind,
        label:    KIND_META[kind]?.label ?? kind.replace(/_/g, ' '),
        config:   { ...(DEFAULT_CONFIGS[kind] ?? {}) } as TopologyNode['config'],
        position: pos,
      };
      onAddNode(newNode);
      addedId = newNode.id;

      // 4. Wire edges immediately
      if (option.addEdges) {
        for (const e of option.addEdges) {
          const fromId = e.from === 'TARGET' ? target.id : addedId;
          const toId   = e.to   === 'TARGET' ? target.id : addedId;
          if (fromId && toId && fromId !== toId) {
            setTimeout(() => onAddEdge(fromId, toId), 50);
          }
        }
      }
    }

    setCs(prev => ({
      ...prev,
      step: 'applied',
      appliedRecovId: option.id,
      addedNodeId: addedId,
    }));
    setSel(null);
  }, [targetNodes, act, onApplyConfig, onAddNode, onAddEdge]);

  // ── Step 3: Re-trigger to validate ────────────────────────────────────────
  const handleValidate = useCallback(() => {
    const target = nodesRef.current.find(n => n.id === csRef.current.targetNodeId) ?? targetNodes[0];
    if (!target || !isRunning) return;

    setCs(prev => ({ ...prev, step: 'validating', verdict: null }));

    // 2s settle with the fix in place, then re-trigger, 3s measure, then recover
    setTimeout(() => {
      // Capture baseline after fix has settled
      const before = (metricsRef.current[target.id]?.[failure.validationMetric as keyof ComponentMetrics] as number) ?? 0;

      // Re-apply the failure (degradation mode)
      onAction({
        id: uid(), kind: 'trigger_failure',
        payload: { nodeId: target.id, failureConfig: failure.failureConfig ?? {} },
        appliedAt: simTimeRef.current,
      });

      setTimeout(() => {
        // Read metric after 3s of the failure running through fixed topology
        const after = (metricsRef.current[target.id]?.[failure.validationMetric as keyof ComponentMetrics] as number) ?? 0;

        const passed = failure.validationDirection === 'below'
          ? after < failure.validationThreshold
          : after > failure.validationThreshold;

        const improved = failure.validationDirection === 'below'
          ? after < before * 0.85
          : after > before * 1.15;

        const mName = failure.validationMetric.replace(/([A-Z])/g, ' $1').toLowerCase();
        const opt = failure.recoveryOptions.find(o => o.id === csRef.current.appliedRecovId);

        let verdict: string;
        if (passed) {
          verdict = `✅ ${opt?.label ?? 'Fix'} worked! ${mName}: ${fmt(failure.validationMetric, before)} → ${fmt(failure.validationMetric, after)} (below ${fmt(failure.validationMetric, failure.validationThreshold)} threshold).`;
        } else if (improved) {
          verdict = `🟡 Partial improvement — ${mName}: ${fmt(failure.validationMetric, before)} → ${fmt(failure.validationMetric, after)}. Still above threshold. Try combining strategies or adjusting sliders.`;
        } else {
          verdict = `⚠️ No improvement — ${mName} at ${fmt(failure.validationMetric, after)}. Check that new components are connected with edges — disconnected nodes receive zero traffic.`;
        }

        // ALWAYS recover after validation — failure never stays permanently
        onAction({
          id: uid(), kind: 'trigger_recovery',
          payload: { nodeId: target.id },
          appliedAt: simTimeRef.current,
        });

        setCs(prev => ({ ...prev, step: 'done', verdict, verdictPassed: passed }));
      }, 3000);
    }, 2000);
  }, [targetNodes, isRunning, failure, onAction]);

  // ── Reset card ─────────────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    const target = nodesRef.current.find(n => n.id === csRef.current.targetNodeId);
    if (target) {
      onAction({ id: uid(), kind: 'trigger_recovery', payload: { nodeId: target.id }, appliedAt: simTimeRef.current });
    }
    setCs(INIT_STATE);
    setSel(null);
  }, [onAction]);

  const isActive = cs.step === 'active' || cs.step === 'applied';
  const canTrigger = isRunning && hasTargets;

  // Step header labels
  const stepLabel: Record<Step, string> = {
    idle:       'Not triggered',
    active:     '● ACTIVE — pick a recovery',
    applied:    '✓ Fix applied — validate it',
    validating: '⏳ Measuring (5s)…',
    done:       cs.verdictPassed ? '✅ Fixed!' : '🟡 Check result',
  };

  return (
    <div style={{
      borderRadius: 12,
      border: `1.5px solid ${isActive ? sev.border : 'var(--ua-border)'}`,
      background: isActive ? sev.bg : 'var(--ua-surface)',
      transition: 'border-color 0.2s, background 0.2s',
      overflow: 'visible',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>

      {/* ── Card header — always visible ── */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '14px 13px',
          cursor: 'pointer', userSelect: 'none',
          minHeight: 64,
          height: 64,
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* Failure icon */}
        <span style={{
          fontSize: 22, lineHeight: 1, flexShrink: 0,
          width: 38, height: 38, borderRadius: 10,
          background: isActive ? sev.border + '22' : 'var(--ua-surface-soft)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {failure.icon}
        </span>

        {/* Title + step status */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, margin: 0, color: 'var(--ua-text-primary)' }}>
              {failure.label}
            </p>
            <span style={{
              fontSize: 9, padding: '1.5px 6px', borderRadius: 10, fontWeight: 700,
              background: sev.border + '22', color: sev.text, border: `1px solid ${sev.border}44`,
            }}>
              {sev.badge}
            </span>
          </div>
          {/* No target nodes warning */}
          {!hasTargets && (
            <p style={{ fontSize: 10, color: '#F97316', margin: '3px 0 0',
              display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={10} /> Add a {failure.targets.join(' or ')} to the canvas first
            </p>
          )}
          {/* Step label */}
          {cs.step !== 'idle' && (
            <p style={{ fontSize: 10, color: isActive ? sev.text : 'var(--ua-text-muted)', margin: '2px 0 0', fontWeight: 600 }}>
              {stepLabel[cs.step]}
            </p>
          )}
        </div>

        {/* Chevron */}
        <div style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', flexShrink: 0 }}>
          <ChevronDown size={14} color="var(--ua-text-muted)" />
        </div>
      </div>

      {/* ── Expanded body ── */}
      {open && (
        <div style={{
          padding: '0 13px 13px',
          borderTop: '1px solid var(--ua-border)',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>

          {/* Description */}
          <p style={{ fontSize: 11.5, color: 'var(--ua-text-secondary)', margin: '8px 0 0', lineHeight: 1.65 }}>
            {failure.description}
          </p>

          {/* Symptoms */}
          <div style={{
            padding: '8px 10px', borderRadius: 8,
            background: 'var(--ua-surface-soft)', border: '1px solid var(--ua-border)',
          }}>
            <p style={{ fontSize: 9, fontWeight: 800, color: 'var(--ua-text-muted)',
              margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              Symptoms to watch
            </p>
            <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {failure.symptoms.map((s, i) => (
                <li key={i} style={{ fontSize: 10.5, color: 'var(--ua-text-secondary)', lineHeight: 1.5 }}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Live metric bar — shows when failure is active */}
          {isActive && targetNode && liveVal !== null && (
            <div style={{
              padding: '8px 10px', borderRadius: 8,
              background: '#FEF2F2', border: '1px solid #FCA5A5',
            }}>
              <p style={{ fontSize: 9, fontWeight: 800, color: '#7F1D1D',
                margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Live — {targetNode.label}
              </p>
              <MetricBar
                label={failure.validationMetric.replace(/([A-Z])/g, ' $1')}
                value={liveVal}
                metric={failure.validationMetric}
                alert={liveVal > failure.validationThreshold}
              />
            </div>
          )}

          {/* ── STEP 1: Trigger button ── */}
          {cs.step === 'idle' && (
            <button
              onClick={e => { e.stopPropagation(); handleTrigger(); }}
              disabled={!canTrigger}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px', borderRadius: 9, border: 'none',
                cursor: canTrigger ? 'pointer' : 'not-allowed',
                background: canTrigger
                  ? `linear-gradient(135deg, ${sev.border}, ${sev.border}cc)`
                  : 'var(--ua-border)',
                color: canTrigger ? '#fff' : 'var(--ua-text-muted)',
                fontSize: 12.5, fontWeight: 700,
                opacity: canTrigger ? 1 : 0.7,
              }}
            >
              <Zap size={13} />
              {!isRunning ? 'Start simulation first' : !hasTargets ? `Add ${failure.targets[0]?.replace(/_/g, ' ')} node first` : `Trigger: ${failure.label}`}
            </button>
          )}

          {/* ── STEP 2: Recovery options (shown when active or applied) ── */}
          {(cs.step === 'active' || cs.step === 'applied') && (
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'var(--ua-text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 8px',
                display: 'flex', alignItems: 'center', gap: 5 }}>
                <Wrench size={11} />
                Recovery options
                <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 500,
                  color: 'var(--ua-text-muted)' }}>
                  ({cs.step === 'applied' ? '✓ applied' : 'click to expand'})
                </span>
              </p>

              <div style={{
                display: 'flex', flexDirection: 'column', gap: 8,
                minHeight: 64, flexShrink: 0,
              }}>
                {failure.recoveryOptions.map(opt => {
                  const isApplied   = cs.appliedRecovId === opt.id;
                  const isSelected  = selRecovId === opt.id;
                  // Once one option is applied, others are disabled
                  const isDisabled  = cs.step === 'applied' && !isApplied;

                  return (
                    <RecoveryCard
                      key={opt.id}
                      option={opt}
                      selected={isSelected || isApplied}
                      applied={isApplied}
                      disabled={isDisabled}
                      onSelect={() => setSel(prev => prev === opt.id ? null : opt.id)}
                      onApply={() => handleApply(opt)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP 3: Validate button ── */}
          {cs.step === 'applied' && (
            <button
              onClick={e => { e.stopPropagation(); handleValidate(); }}
              disabled={!isRunning}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                padding: '10px', borderRadius: 9, border: 'none',
                cursor: isRunning ? 'pointer' : 'not-allowed',
                background: isRunning
                  ? 'linear-gradient(135deg, #10B981, #059669)'
                  : 'var(--ua-border)',
                color: '#fff', fontSize: 12.5, fontWeight: 700,
              }}
            >
              <FlaskConical size={13} />
              Re-trigger & Validate Fix
            </button>
          )}

          {/* ── Validating spinner ── */}
          {cs.step === 'validating' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 12px', borderRadius: 9,
              background: '#EEF2FF', border: '1px solid #C7D2FE',
            }}>
              <Activity size={14} color="#6366F1" style={{ animation: 'spin 1s linear infinite' }} />
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: '#4F46E5', margin: 0 }}>
                  Measuring impact…
                </p>
                <p style={{ fontSize: 10, color: '#6366F1', margin: '2px 0 0' }}>
                  2s settle + 3s measurement window
                </p>
              </div>
            </div>
          )}

          {/* ── Verdict ── */}
          {cs.step === 'done' && cs.verdict && (
            <div style={{
              padding: '10px 12px', borderRadius: 9,
              background: cs.verdictPassed ? '#F0FDF4' : '#FFFBEB',
              border: `1px solid ${cs.verdictPassed ? '#A7F3D0' : '#FDE68A'}`,
            }}>
              <p style={{ fontSize: 11.5, color: cs.verdictPassed ? '#065F46' : '#78350F',
                margin: 0, lineHeight: 1.65 }}>
                {cs.verdict}
              </p>
            </div>
          )}

          {/* Reset / Try again */}
          {cs.step !== 'idle' && cs.step !== 'validating' && (
            <button
              onClick={e => { e.stopPropagation(); handleReset(); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '7px', borderRadius: 8,
                border: '1px solid var(--ua-border)',
                background: 'var(--ua-surface)', cursor: 'pointer',
                color: 'var(--ua-text-muted)', fontSize: 11, fontWeight: 500,
              }}
            >
              <RotateCcw size={11} /> Reset & try again
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// FAILURE PANEL — groups failures by target component kind
// ─────────────────────────────────────────────────────────────────────────────
export const FailurePanel: React.FC<FailurePanelProps> = ({
  nodes, edges, metrics, isRunning, simTime,
  onAction, onAddNode, onAddEdge, onApplyConfig,
}) => {

  if (!isRunning) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 12,
        padding: '0 20px', textAlign: 'center',
      }}>
        <FlaskConical size={32} color="var(--ua-text-muted)" />
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--ua-text-primary)', margin: '0 0 4px' }}>
            Start the simulation first
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--ua-text-muted)', lineHeight: 1.6, margin: 0 }}>
            Failures need live traffic flowing through your topology to have a measurable effect.
          </p>
        </div>
      </div>
    );
  }

  // Group available failures by which nodes are present on the canvas
  const availableKinds = new Set(nodes.map(n => n.kind as ComponentKind));
  const available = FAILURE_PLAYBOOK.filter(f =>
    f.targets.length === 0 || f.targets.some(t => availableKinds.has(t)),
  );
  const unavailable = FAILURE_PLAYBOOK.filter(f =>
    f.targets.length > 0 && !f.targets.some(t => availableKinds.has(t)),
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '10px 13px 8px',
        borderBottom: '1px solid var(--ua-border)',
        flexShrink: 0,
      }}>
        <p style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--ua-text-primary)', margin: '0 0 2px' }}>
          Failure & Recovery Lab
        </p>
        <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', margin: 0 }}>
          Trigger → Observe → Fix → Validate. Failure clears automatically after validation.
        </p>
      </div>

      {/* Failure list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '10px 10px 16px',
        display: 'flex', flexDirection: 'column', gap: 10,
        alignItems: 'stretch',
      }}>

        {available.map(f => (
          <FailureCard
            key={f.id}
            failure={f}
            nodes={nodes}
            edges={edges}
            metrics={metrics}
            isRunning={isRunning}
            simTime={simTime}
            onAction={onAction}
            onAddNode={onAddNode}
            onAddEdge={onAddEdge}
            onApplyConfig={onApplyConfig}
          />
        ))}

        {/* Failures unavailable until relevant component is added */}
        {unavailable.length > 0 && (
          <div>
            <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.07em', margin: '8px 0 6px',
              display: 'flex', alignItems: 'center', gap: 5 }}>
              <AlertTriangle size={10} /> Add component to unlock
            </p>
            {unavailable.map(f => (
              <div key={f.id} style={{
                borderRadius: 10, border: '1px dashed var(--ua-border)',
                background: 'var(--ua-surface-soft)',
                padding: '10px 12px', marginBottom: 6, opacity: 0.6,
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ua-text-muted)', margin: '0 0 2px' }}>
                    {f.label}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', margin: 0 }}>
                    Needs: {f.targets.map(t => t.replace(/_/g, ' ')).join(' or ')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
