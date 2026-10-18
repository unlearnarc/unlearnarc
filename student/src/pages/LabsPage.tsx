/**
 * LabsPage — entry page for UnlearnARC Engineering Labs (HLD Simulator).
 *
 * Full catalog of simulation labs:
 *   1. HLD Open Canvas (free-form system design)
 *   2. Load Testing & Capacity Planning
 *   3. Database Scaling Lab
 *   4. Caching & CDN Lab
 *   5. Queues & Event-Driven Systems
 *   6. Distributed Systems & Consistency
 *   7. Networking & Traffic Routing
 *   8. Observability & Incident Investigation
 */

import React, { useState } from 'react';
import {
  Network, ArrowLeft, FlaskConical, Gauge, Database,
  Zap, MessageSquare, GitBranch, Radio, Activity,
} from 'lucide-react';
import { LabWorkspace } from '../labs/ui/LabWorkspace';
import { trafficSurgeScenario }        from '../labs/scenarios/trafficSurge';
import { loadTestingScenario }          from '../labs/scenarios/loadTesting';
import { databaseScalingScenario }      from '../labs/scenarios/databaseScaling';
import { cachingCdnScenario }           from '../labs/scenarios/cachingCdn';
import { queuesStreamsScenario }         from '../labs/scenarios/queuesStreams';
import { distributedSystemsScenario }   from '../labs/scenarios/distributedSystems';
import { networkingTrafficScenario }    from '../labs/scenarios/networkingTraffic';
import { observabilityLabScenario }     from '../labs/scenarios/observabilityLab';
import { useFullScreen } from '../components/layout/AppLayout';
import type { LabScenario } from '../labs/engine/types';

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO CATALOG
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioCatalogEntry {
  scenario:         LabScenario;
  tags:             string[];
  difficulty:       'Beginner' | 'Intermediate' | 'Advanced';
  estimatedMinutes: number;
  available:        boolean;
  icon:             React.ReactNode;
  accent:           string;
  accentBg:         string;
  what:             string[];   // bullet points shown on the card
}

const CATALOG: ScenarioCatalogEntry[] = [
  {
    scenario: trafficSurgeScenario,
    icon: <Network size={20} />,
    accent: '#6366F1', accentBg: '#EEF2FF',
    tags: ['Free-form Design', 'Failure & Recovery', 'Traffic Surge', 'Slow Queries', 'Cache'],
    difficulty: 'Intermediate',
    estimatedMinutes: 30,
    available: true,
    what: [
      'Start from a minimal 3-node topology and build any system',
      'Name every component — IRCTC, Twitter, YouTube, anything',
      'Trigger 14 real failure scenarios across DB, cache, queue, service',
      'Apply recovery strategies, re-trigger to validate each fix',
    ],
  },
  {
    scenario: loadTestingScenario,
    icon: <Gauge size={20} />,
    accent: '#F59E0B', accentBg: '#FFFBEB',
    tags: ['Ramp-up Traffic', 'Sudden Spike', 'p95/p99 Latency', 'Saturation', 'Cost vs Perf'],
    difficulty: 'Beginner',
    estimatedMinutes: 25,
    available: true,
    what: [
      'Ramp from 50 → 5 000 RPS and watch the first bottleneck appear',
      'Learn the saturation-latency curve: 70% util = 2× latency',
      'Tune replicas, pool sizes, and rate limiters to hit a target RPS',
      'Compare infrastructure cost at each capacity configuration',
    ],
  },
  {
    scenario: databaseScalingScenario,
    icon: <Database size={20} />,
    accent: '#10B981', accentBg: '#ECFDF5',
    tags: ['Read Replicas', 'Replication Lag', 'Connection Pool', 'Failover', 'Sharding'],
    difficulty: 'Intermediate',
    estimatedMinutes: 35,
    available: true,
    what: [
      'Single DB at 400 RPS — watch connection pool saturate',
      'Add read replicas and measure exact load reduction on the primary',
      'Observe replication lag and stale reads in real time',
      'Trigger primary crash and promote a replica — measure recovery time',
    ],
  },
  {
    scenario: cachingCdnScenario,
    icon: <Zap size={20} />,
    accent: '#EC4899', accentBg: '#FDF2F8',
    tags: ['Hit Ratio', 'TTL & Eviction', 'Cache Stampede', 'CDN Edge', 'Stale Data'],
    difficulty: 'Beginner',
    estimatedMinutes: 20,
    available: true,
    what: [
      'Cold start: watch 100% of reads hammer the DB with no cache',
      'Warm up the cache and see DB load drop by 85% instantly',
      'Trigger a cache stampede — popular key expires for 50k users at once',
      'Model CDN edge hit ratio vs origin traffic and tune TTL',
    ],
  },
  {
    scenario: queuesStreamsScenario,
    icon: <MessageSquare size={20} />,
    accent: '#8B5CF6', accentBg: '#F5F3FF',
    tags: ['Consumer Lag', 'Partitions', 'DLQ', 'Backpressure', 'Idempotency'],
    difficulty: 'Intermediate',
    estimatedMinutes: 30,
    available: true,
    what: [
      'Build an event-driven booking confirmation pipeline',
      'Watch queue depth grow unbounded when producers outrun consumers',
      'Scale workers and partitions to drain the backlog',
      'Observe at-least-once delivery, retries, and DLQ behaviour',
    ],
  },
  {
    scenario: distributedSystemsScenario,
    icon: <GitBranch size={20} />,
    accent: '#EF4444', accentBg: '#FEF2F2',
    tags: ['CAP Theorem', 'Split-Brain', 'Replication Lag', 'Circuit Breaker', 'Idempotency'],
    difficulty: 'Advanced',
    estimatedMinutes: 45,
    available: true,
    what: [
      'Multi-zone architecture: Global LB → Zone A + Zone B → Primary + Replica',
      'Trigger network partition — watch split-brain emerge in metrics',
      'Apply circuit breaker to stop cascade failures across zones',
      'Understand CP vs AP trade-offs under partition (CAP theorem in action)',
    ],
  },
  {
    scenario: networkingTrafficScenario,
    icon: <Radio size={20} />,
    accent: '#0EA5E9', accentBg: '#F0F9FF',
    tags: ['DNS & TLS', 'LB Algorithms', 'Regional Outage', 'CDN Edge', 'Connection Limits'],
    difficulty: 'Intermediate',
    estimatedMinutes: 30,
    available: true,
    what: [
      'Trace a request: DNS → CDN → LB → App → DB — see each hop\'s cost',
      'Understand why service is slow even when app CPU is low',
      'Trigger LB health-check failures and watch traffic reroute',
      'Experience regional outage and DNS failover timing',
    ],
  },
  {
    scenario: observabilityLabScenario,
    icon: <Activity size={20} />,
    accent: '#14B8A6', accentBg: '#F0FDFA',
    tags: ['Golden Signals', 'Root Cause', 'Error Budget', 'SLO', 'Incident Timeline'],
    difficulty: 'Advanced',
    estimatedMinutes: 40,
    available: true,
    what: [
      'Wire a monitoring node to every component in your topology',
      'Use the Failures panel as your incident trigger — reproduce real outages',
      'Diagnose root cause from metrics alone before touching anything',
      'Build an incident timeline: detection → diagnosis → fix → postmortem',
    ],
  },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     'var(--ua-level-beginner)',
  Intermediate: 'var(--ua-level-intermediate)',
  Advanced:     'var(--ua-level-advanced)',
};
const DIFFICULTY_BG: Record<string, string> = {
  Beginner:     'var(--ua-level-beginner-soft)',
  Intermediate: 'var(--ua-level-intermediate-soft)',
  Advanced:     'var(--ua-level-advanced-soft)',
};

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIO CARD
// ─────────────────────────────────────────────────────────────────────────────

interface ScenarioCardProps {
  entry: ScenarioCatalogEntry;
  onLaunch: (scenario: LabScenario) => void;
}

const ScenarioCard: React.FC<ScenarioCardProps> = ({ entry, onLaunch }) => {
  const { scenario, icon, accent, accentBg, tags, difficulty, estimatedMinutes, available, what } = entry;

  return (
    <div
      className="rounded-2xl flex flex-col transition"
      style={{
        background: 'var(--ua-surface)',
        border: `1.5px solid var(--ua-border)`,
        opacity: available ? 1 : 0.55,
        overflow: 'hidden',
      }}
    >
      {/* Accent top bar */}
      <div style={{ height: 4, background: accent, flexShrink: 0 }} />

      <div className="flex flex-col gap-3 p-5">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: accentBg, color: accent }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold" style={{ color: 'var(--ua-text-primary)' }}>
                {scenario.title}
              </h3>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{
                  background: DIFFICULTY_BG[difficulty],
                  color: DIFFICULTY_COLORS[difficulty],
                }}
              >
                {difficulty}
              </span>
            </div>
            <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--ua-text-muted)' }}>
              {scenario.description}
            </p>
          </div>
        </div>

        {/* What you'll learn */}
        <ul className="flex flex-col gap-1.5 m-0 p-0" style={{ listStyle: 'none' }}>
          {what.map((point, i) => (
            <li key={i} className="flex items-start gap-2">
              <span style={{ color: accent, fontSize: 11, marginTop: 2, flexShrink: 0 }}>▸</span>
              <span className="text-xs leading-relaxed" style={{ color: 'var(--ua-text-secondary)' }}>
                {point}
              </span>
            </li>
          ))}
        </ul>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {tags.map(tag => (
            <span
              key={tag}
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: accentBg,
                color: accent,
                fontWeight: 500,
                border: `1px solid ${accent}33`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 pt-1">
          <span className="text-xs" style={{ color: 'var(--ua-text-muted)' }}>
            ⏱ ~{estimatedMinutes} min
          </span>
          <button
            onClick={() => available && onLaunch(scenario)}
            disabled={!available}
            className="ml-auto text-xs px-4 py-2 rounded-xl font-semibold transition"
            style={{
              background: available ? accent : 'var(--ua-border)',
              color: available ? '#fff' : 'var(--ua-text-muted)',
              cursor: available ? 'pointer' : 'not-allowed',
              boxShadow: available ? `0 2px 8px ${accent}44` : 'none',
            }}
            aria-label={`${available ? 'Launch' : 'Coming soon'}: ${scenario.title}`}
          >
            {available ? 'Launch Lab →' : 'Coming Soon'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LABS PAGE
// ─────────────────────────────────────────────────────────────────────────────

export const LabsPage: React.FC = () => {
  const [activeScenario, setActiveScenario] = useState<LabScenario | null>(null);

  // Use full-screen mode when a lab is active (fills the viewport)
  useFullScreen(!!activeScenario);

  if (activeScenario) {
    return (
      <div className="fixed inset-0 z-[100]" style={{ background: 'var(--ua-background)' }}>
        <div
          className="flex items-center gap-2 px-4 h-8 shrink-0"
          style={{
            background: 'var(--ua-surface)',
            borderBottom: '1px solid var(--ua-border)',
          }}
        >
          <button
            onClick={() => setActiveScenario(null)}
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary transition"
            aria-label="Exit lab"
          >
            <ArrowLeft size={12} />
            Exit Lab
          </button>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs text-text-muted">Engineering Labs</span>
          <span className="text-xs text-text-muted">·</span>
          <span className="text-xs font-medium text-text-primary">HLD Simulator</span>
        </div>
        <LabWorkspace scenario={activeScenario} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <header className="flex items-start gap-4 mb-8">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'var(--ua-primary-50)' }}
        >
          <FlaskConical size={24} style={{ color: 'var(--ua-primary-500)' }} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">CS Lab</h1>
        </div>
      </header>



      {/* Scenario catalog */}
      <section aria-labelledby="catalog-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="catalog-heading" className="text-base font-semibold text-text-primary">
            Available Labs
          </h2>
          <span className="text-xs" style={{ color: 'var(--ua-text-muted)' }}>
            {CATALOG.filter(e => e.available).length} of {CATALOG.length} available
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CATALOG.map(entry => (
            <ScenarioCard
              key={entry.scenario.id}
              entry={entry}
              onLaunch={setActiveScenario}
            />
          ))}
        </div>
      </section>
    </div>
  );
};
