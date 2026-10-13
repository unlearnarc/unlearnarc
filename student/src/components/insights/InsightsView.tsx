import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { testAPI } from '../../api/endpoints';
import { Badge, ProgressBar, Spinner } from '../ui';
import type {
  InsightsDashboard, ImprovementReport, InsightSeverity, TrendLabel,
} from '../../types';
import {
  TrendingUp, TrendingDown, Minus, Target, Award, Clock, CheckCircle,
  AlertTriangle, Flame, BarChart3, Lightbulb, ArrowRight, Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

// ── Small helpers ──────────────────────────────────────────────────────────────
const fmtTime = (s: number) => {
  if (!s) return '0m';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const severityStyles: Record<InsightSeverity, { bar: string; chip: string; label: string }> = {
  CRITICAL:   { bar: 'bg-danger',  chip: 'bg-danger-soft text-danger',   label: 'Critical' },
  NEEDS_WORK: { bar: 'bg-warning', chip: 'bg-warning-soft text-warning', label: 'Needs work' },
  ON_TRACK:   { bar: 'bg-success', chip: 'bg-success-soft text-success', label: 'On track' },
};

const scoreBar = (pct: number) =>
  pct < 50 ? 'bg-danger' : pct < 70 ? 'bg-warning' : 'bg-success';

// ── Flat section shell — a titled, flat (shadowless) panel ───────────────────────
const Panel: React.FC<{
  title?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}> = ({ title, icon, action, className, bodyClassName, children }) => (
  <section className={clsx('card card--flat border border-border rounded-[14px] p-4 sm:p-5', className)}>
    {(title || action) && (
      <header className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          {title && <h3 className="text-sm font-semibold text-text-primary truncate">{title}</h3>}
        </div>
        {action}
      </header>
    )}
    <div className={bodyClassName}>{children}</div>
  </section>
);

const TrendPill: React.FC<{ label: TrendLabel; delta: number }> = ({ label, delta }) => {
  const cfg = {
    IMPROVING:         { icon: TrendingUp,   cls: 'bg-success-soft text-success', text: 'Improving' },
    DECLINING:         { icon: TrendingDown, cls: 'bg-danger-soft text-danger',   text: 'Declining' },
    STEADY:            { icon: Minus,        cls: 'bg-surface-soft text-text-secondary', text: 'Steady' },
    INSUFFICIENT_DATA: { icon: Minus,        cls: 'bg-surface-soft text-text-muted', text: 'Not enough data' },
  }[label];
  const Icon = cfg.icon;
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold', cfg.cls)}>
      <Icon size={13} />
      {cfg.text}
      {label !== 'INSUFFICIENT_DATA' && delta !== 0 && (
        <span className="opacity-80">{delta > 0 ? '+' : ''}{Math.round(delta)}%</span>
      )}
    </span>
  );
};

// ── Sparkline (dependency-free SVG, stretches to container) ──────────────────────
const Sparkline: React.FC<{ points: number[] }> = ({ points }) => {
  if (points.length < 2) return null;
  const w = 100, h = 36, pad = 2; // viewBox units; CSS stretches width to 100%
  const step = (w - pad * 2) / (points.length - 1);
  const y = (v: number) => h - pad - (v / 100) * (h - pad * 2);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * step},${y(p)}`).join(' ');
  const area = `${d} L ${pad + (points.length - 1) * step},${h - pad} L ${pad},${h - pad} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="w-full h-10">
      <path d={area} className="fill-primary-500/10" />
      <path d={d} className="stroke-primary-500" strokeWidth={1.2} fill="none"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

// ── KPI tile (compact, flat) ─────────────────────────────────────────────────────
const Kpi: React.FC<{ icon: React.ElementType; label: string; value: string; color: string }> =
  ({ icon: Icon, label, value, color }) => (
    <div className="card card--flat border border-border rounded-[12px] p-3.5 flex items-center gap-3">
      <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', color)}>
        <Icon size={16} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-text-primary leading-none">{value}</p>
        <p className="text-[11px] text-text-muted mt-1 truncate">{label}</p>
      </div>
    </div>
  );

// ── Dashboard section ───────────────────────────────────────────────────────────
const DashboardSection: React.FC<{ data: InsightsDashboard }> = ({ data }) => {
  const series = [...data.recentScores].reverse().map(p => p.scorePercentage);
  const kpis = [
    { icon: Target, label: 'Avg score', value: `${Math.round(data.averageScore)}%`, color: 'bg-primary-50 text-primary-500' },
    { icon: Award,  label: 'Best score', value: `${Math.round(data.bestScore)}%`,   color: 'bg-achievement-soft text-achievement' },
    { icon: CheckCircle, label: 'Pass rate', value: `${Math.round(data.passRate)}%`, color: 'bg-success-soft text-success' },
    { icon: Clock,  label: 'Time spent', value: fmtTime(data.totalTimeSeconds),      color: 'bg-surface-soft text-text-secondary' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI grid — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(k => <Kpi key={k.label} {...k} />)}
      </div>

      {/* 2-col content grid, single col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Score trend */}
        <Panel
          title="Score trend"
          icon={<BarChart3 size={16} className="text-primary-500" />}
          action={<TrendPill label={data.trendLabel} delta={data.trendDelta} />}
        >
          {series.length >= 2 ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-2xl font-bold text-text-primary">{Math.round(data.latestScore)}%</p>
                <p className="text-[11px] text-text-muted">latest · {data.totalAttempts} attempts</p>
              </div>
              <Sparkline points={series} />
            </>
          ) : (
            <p className="text-xs text-text-muted py-3">Take a few more tests to see your trend.</p>
          )}
        </Panel>

        {/* Difficulty accuracy */}
        <Panel title="Accuracy by difficulty" icon={<Target size={16} className="text-primary-500" />}>
          <div className="space-y-3">
            {data.difficultyAccuracy.map(d => (
              <div key={d.difficulty}>
                <div className="flex items-center justify-between mb-1">
                  <Badge label={d.difficulty} />
                  <span className="text-xs font-medium text-text-secondary">
                    {Math.round(d.accuracy)}% · {d.correct}/{d.total}
                  </span>
                </div>
                <ProgressBar value={d.accuracy} height="h-2" color={scoreBar(d.accuracy)} />
              </div>
            ))}
            {data.difficultyAccuracy.length === 0 && (
              <p className="text-xs text-text-muted">No graded questions yet.</p>
            )}
          </div>
        </Panel>

        {/* Top weak area — spans both columns on desktop */}
        {data.topWeakArea && (
          <Panel className="lg:col-span-2 border-warning/30 bg-warning-soft/30">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-warning-soft text-warning flex items-center justify-center shrink-0">
                <AlertTriangle size={17} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-text-muted mb-0.5">Your weakest area right now</p>
                <p className="text-sm font-semibold text-text-primary">
                  {data.topWeakArea.entityName}
                  <span className="ml-2"><Badge label={data.topWeakArea.entityType} /></span>
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Averaging {Math.round(data.topWeakArea.averageScore)}% over {data.topWeakArea.attempts} attempt(s).
                  Check the <span className="font-medium text-primary-500">Improvement</span> tab for a plan.
                </p>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </div>
  );
};

// ── Improvement section ─────────────────────────────────────────────────────────
const WeakAreaCard: React.FC<{ w: ImprovementReport['weakAreas'][number] }> = ({ w }) => {
  const sv = severityStyles[w.severity];
  return (
    <div className="card card--flat border border-border rounded-[12px] p-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate">{w.entityName}</span>
          <Badge label={w.entityType} />
        </div>
        <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0', sv.chip)}>{sv.label}</span>
      </div>
      <ProgressBar value={w.averageScore} height="h-2" color={sv.bar} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted mt-1.5">
        <span>Avg {Math.round(w.averageScore)}%</span>
        <span>Best {Math.round(w.bestScore)}%</span>
        <span>Accuracy {Math.round(w.accuracy)}%</span>
        <span>{w.attempts} attempt(s)</span>
      </div>
      <div className="mt-2.5 flex items-start gap-1.5 p-2.5 bg-surface-soft rounded-[8px]">
        <Lightbulb size={13} className="text-achievement shrink-0 mt-0.5" />
        <p className="text-[11px] text-text-secondary leading-relaxed">{w.recommendation}</p>
      </div>
    </div>
  );
};

const ImprovementSection: React.FC<{ data: ImprovementReport }> = ({ data }) => (
  <div className="space-y-4">
    {/* Summary banner — full width */}
    <Panel className="flex items-start gap-3 bg-primary-50/40 border-primary-200">
      <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center shrink-0">
        <Sparkles size={17} />
      </div>
      <div>
        <p className="text-sm font-semibold text-text-primary">Your improvement plan</p>
        <p className="text-xs text-text-secondary mt-0.5">{data.summary}</p>
        <p className="text-[11px] text-text-muted mt-1">Based on {data.attemptsAnalyzed} attempt(s).</p>
      </div>
    </Panel>

    {/* 2-col: weak areas (left) | difficulty gaps + recurring (right) */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      {/* Weak areas */}
      <Panel title="Weak areas" icon={<TrendingDown size={16} className="text-warning" />}>
        {data.weakAreas.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle size={22} className="text-success mx-auto mb-2" />
            <p className="text-sm text-text-secondary">No weak areas detected — great work! 🎉</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {data.weakAreas.map(w => <WeakAreaCard key={`${w.entityType}-${w.entityId}`} w={w} />)}
          </div>
        )}
      </Panel>

      {/* Right column: difficulty gaps + recurring mistakes stacked */}
      <div className="space-y-4">
        {data.difficultyGaps.length > 0 && (
          <Panel title="Difficulty gaps" icon={<BarChart3 size={16} className="text-primary-500" />}>
            <div className="space-y-2.5">
              {data.difficultyGaps.map(g => {
                const sv = severityStyles[g.severity];
                return (
                  <div key={g.difficulty} className="card card--flat border border-border rounded-[12px] p-3.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge label={g.difficulty} />
                        <span className="text-xs text-text-muted">{g.correct}/{g.totalAnswered} correct</span>
                      </div>
                      <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', sv.chip)}>{sv.label}</span>
                    </div>
                    <ProgressBar value={g.accuracy} height="h-2" color={sv.bar} />
                    <p className="text-[11px] text-text-secondary mt-1.5">{g.recommendation}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        )}

        {data.recurringMistakes.length > 0 && (
          <Panel title="Questions you keep missing" icon={<Flame size={16} className="text-danger" />}>
            <div className="space-y-2.5">
              {data.recurringMistakes.map(m => (
                <div key={m.questionId} className="card card--flat border border-border rounded-[12px] p-3.5">
                  <div className="flex items-start gap-2 mb-1.5">
                    <Badge label={m.difficulty} />
                    <span className="text-[11px] font-medium text-danger ml-auto shrink-0">
                      wrong {m.timesWrong}/{m.timesSeen}× ({Math.round(m.wrongRate)}%)
                    </span>
                  </div>
                  <p className="text-sm text-text-primary leading-snug">{m.questionText}</p>
                  <p className="text-[11px] text-text-muted mt-1">{m.poolName}</p>
                  <p className="text-[11px] text-text-secondary mt-1.5">{m.recommendation}</p>
                </div>
              ))}
            </div>
          </Panel>
        )}
      </div>
    </div>
  </div>
);

// ── Window selector ─────────────────────────────────────────────────────────────
const WINDOWS: { label: string; value?: number }[] = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
  { label: 'All', value: undefined },
];

// ── Public component ────────────────────────────────────────────────────────────
type Tab = 'dashboard' | 'improvement';

export const InsightsView: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [windowDays, setWindowDays] = useState<number | undefined>(30);

  const dashboardQ = useQuery({
    queryKey: ['insights-dashboard', windowDays],
    queryFn: () => testAPI.insightsDashboard(windowDays),
  });
  const improvementQ = useQuery({
    queryKey: ['insights-improvement', windowDays],
    queryFn: () => testAPI.improvementReport(windowDays),
    enabled: tab === 'improvement',
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dashboard: InsightsDashboard | undefined = (dashboardQ.data as any)?.data?.data;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const report: ImprovementReport | undefined = (improvementQ.data as any)?.data?.data;

  const noData = tab === 'dashboard' && !dashboardQ.isLoading && dashboard && dashboard.totalAttempts === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-slide-up">
      {/* Header + controls — single flat toolbar row, wraps on mobile */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <Sparkles size={20} className="text-primary-500" />
          <h1 className="text-xl font-bold text-text-primary">Deep Insights</h1>
        </div>

        <div className="inline-flex rounded-[10px] bg-surface-soft p-1">
          {([['dashboard', 'Dashboard'], ['improvement', 'Improvement']] as const).map(([k, lbl]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={clsx(
                'px-4 py-1.5 rounded-[8px] text-sm font-medium transition',
                tab === k ? 'bg-surface text-primary-500 shadow-sm' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {lbl}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-[10px] bg-surface-soft p-1">
          {WINDOWS.map(w => (
            <button
              key={w.label}
              onClick={() => setWindowDays(w.value)}
              className={clsx(
                'px-3 py-1.5 rounded-[8px] text-xs font-medium transition',
                windowDays === w.value ? 'bg-surface text-primary-500 shadow-sm' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              {w.label}
            </button>
          ))}
        </div>

        {onBack && (
          <button onClick={onBack} className="btn-secondary text-sm">
            <ArrowRight size={14} className="rotate-180" /> Back
          </button>
        )}
      </div>

      {/* Empty state */}
      {noData && (
        <div className="card card--flat border border-border rounded-[14px] p-10 text-center">
          <BarChart3 size={28} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary">No test data in this window yet.</p>
          <p className="text-xs text-text-muted mt-1">Take a test or widen the time range.</p>
        </div>
      )}

      {/* Content */}
      {tab === 'dashboard' && !noData && (
        dashboardQ.isLoading
          ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          : dashboard && <DashboardSection data={dashboard} />
      )}

      {tab === 'improvement' && (
        improvementQ.isLoading
          ? <div className="flex justify-center py-16"><Spinner size="lg" /></div>
          : report && <ImprovementSection data={report} />
      )}
    </div>
  );
};
