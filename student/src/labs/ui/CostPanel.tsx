/**
 * CostPanel — Live infrastructure cost estimator.
 *
 * Calculates and displays the monthly cost of the current topology.
 * Updates in real-time as the student adds/removes/configures nodes.
 *
 * Philosophy:
 *   - Clearly labeled as estimates (not actual AWS billing)
 *   - Shows cost breakdown by category and per node
 *   - Surfaces optimization insights automatically
 *   - Teaches cost vs performance trade-offs
 */

import React, { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, Info, ChevronDown, ChevronRight } from 'lucide-react';
import type { TopologyNode } from '../engine/types';
import { calculateTopologyCost, fmtCost } from '../engine/costModel';

interface CostPanelProps {
  nodes: TopologyNode[];
}

const CATEGORY_COLORS: Record<string, string> = {
  compute:  '#6366F1',
  storage:  '#10B981',
  network:  '#F59E0B',
  managed:  '#EC4899',
};

const CATEGORY_LABELS: Record<string, string> = {
  compute:  '⚙️ Compute',
  storage:  '💾 Storage',
  network:  '🌐 Network',
  managed:  '☁️ Managed Services',
};

export const CostPanel: React.FC<CostPanelProps> = ({ nodes }) => {
  const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const summary = useMemo(() => calculateTopologyCost(nodes), [nodes]);
  const displayNodes = showAll ? summary.nodes : summary.nodes.slice(0, 6);

  // Category breakdown bar widths
  const cats = Object.entries(summary.byCategory).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '10px 13px 8px',
        borderBottom: '1px solid var(--ua-border)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <DollarSign size={13} color="#10B981" />
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--ua-text-primary)', margin: 0 }}>
            Infrastructure Cost Estimator
          </p>
        </div>
        <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', margin: 0, lineHeight: 1.5 }}>
          Illustrative monthly estimates based on AWS pricing. Updates as you design.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Total cost hero */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'linear-gradient(135deg, #EEF2FF, #F0FDF4)',
          border: '1px solid #C7D2FE',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <p style={{ fontSize: 10, color: '#6366F1', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.07em', margin: '0 0 4px' }}>
              Est. Monthly Cost
            </p>
            <p style={{ fontSize: 28, fontWeight: 900, color: '#1E1B4B', margin: 0, fontFamily: 'monospace' }}>
              {fmtCost(summary.totalMonthly)}
            </p>
            <p style={{ fontSize: 10, color: '#6366F1', margin: '3px 0 0' }}>
              {fmtCost(summary.totalYearly)} / year
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 10, color: 'var(--ua-text-muted)', margin: '0 0 4px' }}>
              {summary.nodes.length} components
            </p>
            <div style={{
              padding: '4px 10px', borderRadius: 20,
              background: '#D1FAE5', color: '#059669',
              fontSize: 10, fontWeight: 700,
            }}>
              ≈ estimates only
            </div>
          </div>
        </div>

        {/* Category breakdown */}
        {cats.length > 0 && (
          <div>
            <p style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: 'var(--ua-text-muted)', margin: '0 0 8px' }}>
              Cost by Category
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {cats.map(([cat, cost]) => {
                const pct = Math.round(cost / summary.totalMonthly * 100);
                const color = CATEGORY_COLORS[cat] ?? '#94A3B8';
                return (
                  <div key={cat}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10.5, color: 'var(--ua-text-secondary)' }}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </span>
                      <span style={{ fontSize: 10.5, fontWeight: 700, fontFamily: 'monospace', color }}>
                        {fmtCost(cost)} · {pct}%
                      </span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--ua-border)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%', borderRadius: 3, background: color,
                        width: `${pct}%`, transition: 'width 0.4s',
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Per-node breakdown */}
        <div>
          <p style={{ fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
            letterSpacing: '0.07em', color: 'var(--ua-text-muted)', margin: '0 0 8px' }}>
            Per Component
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {displayNodes.map(nc => {
              const expanded = expandedNodeId === nc.nodeId;
              const color = CATEGORY_COLORS[nc.category] ?? '#94A3B8';
              const pct = summary.totalMonthly > 0
                ? Math.round(nc.monthly / summary.totalMonthly * 100)
                : 0;
              return (
                <div
                  key={nc.nodeId}
                  style={{
                    borderRadius: 9, border: `1.5px solid ${expanded ? color + '80' : 'var(--ua-border)'}`,
                    background: expanded ? color + '08' : 'var(--ua-surface)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setExpandedNodeId(expanded ? null : nc.nodeId)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', background: 'none', border: 'none', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    {/* Kind badge */}
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                    }} />

                    {/* Label */}
                    <span style={{
                      flex: 1, fontSize: 11, fontWeight: 600,
                      color: 'var(--ua-text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {nc.nodeLabel}
                    </span>

                    {/* Cost */}
                    <span style={{
                      fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
                      color, flexShrink: 0,
                    }}>
                      {fmtCost(nc.monthly)}/mo
                    </span>

                    {/* % bar */}
                    <div style={{
                      width: 36, height: 4, borderRadius: 2, background: 'var(--ua-border)',
                      overflow: 'hidden', flexShrink: 0,
                    }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: color,
                        width: `${pct}%`,
                      }} />
                    </div>

                    {expanded
                      ? <ChevronDown size={12} color="var(--ua-text-muted)" style={{ flexShrink: 0 }} />
                      : <ChevronRight size={12} color="var(--ua-text-muted)" style={{ flexShrink: 0 }} />
                    }
                  </button>

                  {expanded && (
                    <div style={{
                      padding: '0 10px 10px',
                      borderTop: `1px solid ${color}30`,
                    }}>
                      <p style={{
                        fontSize: 10.5, color: 'var(--ua-text-muted)',
                        margin: '8px 0 0', lineHeight: 1.6,
                      }}>
                        {nc.breakdown}
                      </p>
                      <div style={{
                        display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap',
                      }}>
                        <span style={{
                          fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                          background: color + '20', color,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>
                          {nc.category}
                        </span>
                        <span style={{
                          fontSize: 9, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                          background: 'var(--ua-surface-soft)', color: 'var(--ua-text-muted)',
                        }}>
                          {pct}% of total
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {summary.nodes.length > 6 && (
              <button
                onClick={() => setShowAll(v => !v)}
                style={{
                  padding: '7px 0', borderRadius: 8, border: '1px dashed var(--ua-border)',
                  background: 'none', color: 'var(--ua-text-muted)', fontSize: 11,
                  cursor: 'pointer', fontWeight: 600,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}
              >
                {showAll
                  ? <><ChevronDown size={12} /> Show Less</>
                  : <><ChevronRight size={12} /> Show {summary.nodes.length - 6} More</>
                }
              </button>
            )}
          </div>
        </div>

        {/* Cost insights */}
        {summary.highlights.length > 0 && (
          <div style={{
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--ua-surface-soft)', border: '1px solid var(--ua-border)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 8 }}>
              <TrendingUp size={12} color="#6366F1" />
              <p style={{
                fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: 'var(--ua-text-muted)', margin: 0,
              }}>
                Cost Insights
              </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {summary.highlights.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <Info size={11} color="#6366F1" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontSize: 10.5, color: 'var(--ua-text-secondary)', margin: 0, lineHeight: 1.55 }}>
                    {h}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p style={{
          fontSize: 9, color: 'var(--ua-text-muted)', margin: 0,
          padding: '0 4px', lineHeight: 1.55,
          borderTop: '1px solid var(--ua-border)', paddingTop: 8,
        }}>
          ⚠️ Estimates are illustrative and based on approximate on-demand AWS pricing as of 2024.
          Actual costs depend on region, reserved/spot pricing, data transfer and usage patterns.
          Use for trade-off comparison only — not for actual budget planning.
        </p>
      </div>
    </div>
  );
};
