import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  getRenderer,
  resolveTheme,
  useVisualization,
} from '../components/algoviz';
import type { Algorithm } from '../components/algoviz';
import { algorithmAPI } from '../api/endpoints';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { QuestionModal } from '../components/ui/QuestionModal';
import { AnimationFocus } from '../components/ui/AnimationFocus';
import './visualizer.css';
import { useTheme } from '../context/ThemeContext';
import { CodeEditor } from '../components/contest/CodeEditor';
import { AlgorithmPractice } from '../components/contest/AlgorithmPractice';
import toast from 'react-hot-toast';
import { visualizationPalette } from '../styles/visualizationTheme';
// Temporarily disabled: read-aloud UI.
// import { SpeakButton } from '../components/ui/SpeakButton';
import {
  ArrowLeft,
  Workflow,
  Info,
  Timer,
  HardDrive,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Gauge,
  ChevronDown,
  Code2,
  Activity,
  MapPin,
  CheckCircle2,
  Hash,
  Copy,
  RotateCcw,
  Bookmark,
} from 'lucide-react';

/* ──────────────────────────────────────────────────────────────────────────
   Flood Fill (and every MATRIX/array) visualization — premium learning
   workspace. The playback engine (useVisualization) is the single source of
   truth: the grid, step inspector, and source-line highlight all read from the
   SAME live engine state, so they can never drift out of sync.
   ────────────────────────────────────────────────────────────────────────── */

const SPEED_OPTIONS = [
  { label: '0.5×', ms: 1600 },
  { label: '1×', ms: 900 },
  { label: '2×', ms: 450 },
  { label: '4×', ms: 200 },
];

const CODE_COLLAPSE_KEY = 'ua_algo_code_collapsed';
type WorkspaceTab = 'Visualization' | 'Explanation' | 'Code' | 'Practice';
const WORKSPACE_TABS: WorkspaceTab[] = ['Visualization', 'Explanation', 'Code', 'Practice'];

export const AlgorithmDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['algorithm', slug],
    queryFn: () => algorithmAPI.getBySlug(slug!),
    enabled: !!slug,
  });

  const algo: Algorithm | undefined = data?.data?.data;

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !algo) {
    return (
      <EmptyState
        icon={Workflow}
        title={t('algoDetail.notFound')}
        description={t('algoDetail.notFoundDesc')}
        action={
          <Link to="/algorithms" className="btn-primary text-sm py-2">
            {t('algoDetail.backToAlgorithms')}
          </Link>
        }
      />
    );
  }

  return <AlgorithmWorkspace key={algo.slug} algo={algo} />;
};

/* ========================================================================== */

const AlgorithmWorkspace: React.FC<{ algo: Algorithm }> = ({ algo }) => {
  const { t } = useTranslation();
  const { state, controls } = useVisualization(algo.spec);
  const step = state.step;
  const pending = state.pendingInput;

  const complexity = (algo.complexity ?? {}) as Record<string, string>;

  const [tab, setTab] = useState<WorkspaceTab>('Visualization');
  const [bookmarked, setBookmarked] = useState(() => localStorage.getItem(`ua_algo_bookmark_${algo.slug}`) === '1');
  const [codeCollapsed, setCodeCollapsed] = useState(() => localStorage.getItem(CODE_COLLAPSE_KEY) === '1');
  useEffect(() => {
    localStorage.setItem(CODE_COLLAPSE_KEY, codeCollapsed ? '1' : '0');
  }, [codeCollapsed]);
  const selectTab = (next: WorkspaceTab) => {
    controls.pause();
    if (next === 'Code') setCodeCollapsed(false);
    setTab(next);
  };

  // ── language + speed ────────────────────────────────────────────────────
  const [lang, setLang] = useState<'java' | 'python'>(
    algo.spec.steps.find((entry) => entry.line && (entry.lang === 'python' ? algo.pythonSource : algo.javaSource))?.lang ??
      (algo.javaSource ? 'java' : 'python')
  );
  const [speed, setSpeed] = useState<number>(900);
  useEffect(() => {
    controls.setSpeed(speed);
  }, [speed, controls]);

  const [inputValue, setInputValue] = useState<string>('');
  const [feedback, setFeedback] = useState<{ index: number; message: string } | null>(null);
  const submit = (raw: unknown) => {
    const result = controls.submitInput(raw);
    setFeedback({
      index: state.index,
      message: result.correct === true
        ? 'Correct! Continue to see the next step.'
        : result.correct === false
        ? `Not quite. Expected answer: ${String(pending?.expected)}. Continue to see why.`
        : 'Answer recorded. Continue to the next step.',
    });
    setInputValue('');
  };

  // ── keyboard controls ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if ((e.target as HTMLElement | null)?.closest('.cm-editor, [contenteditable=true]') || tab !== 'Visualization' || pending || tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (!state.isFinished && !pending) controls.next();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (state.index > 0) controls.prev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (state.isPlaying) controls.pause();
        else if (!pending && !state.isFinished) controls.play();
      } else if (e.key === 'Home') {
        e.preventDefault();
        controls.reset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [controls, state.isFinished, state.isPlaying, state.index, pending, tab]);

  // ── derived live state for the inspector (from the REAL trace) ───────────
  const cursor = step?.state?.['cursor'] as [number, number] | undefined;
  const visited = (step?.state?.['visited'] as Array<[number, number]>) ?? [];
  const visitedCount = Array.isArray(visited) ? visited.length : 0;

  const statusLabel = pending
    ? t('algoDetail.statusAwaiting')
    : state.isPlaying
    ? t('algoDetail.statusPlaying')
    : state.isFinished
    ? t('algoDetail.statusComplete')
    : t('algoDetail.statusPaused');
  const statusColor = pending
    ? 'var(--ua-warning)'
    : state.isFinished
    ? 'var(--ua-success)'
    : state.isPlaying
    ? 'var(--ua-primary)'
    : 'var(--ua-text-secondary)';

  const sourceLines = (
    (lang === 'java' ? algo.javaSource : algo.pythonSource) ?? ''
  ).split('\n');

  return (
    <div className="ua-visualizer space-y-4 animate-fade-in">
      {/* ── Breadcrumb ────────────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px]">
        <Link
          to="/algorithms"
          className="inline-flex items-center gap-1.5 text-text-secondary hover:text-primary-500 transition"
        >
          <ArrowLeft size={14} className="ua-flip-rtl" /> {t('algoDetail.allAlgorithms')}
        </Link>
        <span className="text-text-muted">/</span>
        <span className="text-text-primary font-medium">{algo.title}</span>
      </nav>

      {/* ── Header: compact title + badges + complexity in one band ──── */}
      <header className="ua-algorithm-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl md:text-2xl font-bold text-text-primary flex items-center gap-2">
              <Workflow size={20} className="text-primary-500 shrink-0" />
              {algo.title}
            </h1>
            <div className="flex gap-1.5">
              {algo.difficulty && <Badge label={algo.difficulty} />}
              {algo.category && <Badge label={algo.category} />}
            </div>
          </div>
          {algo.summary && (
            <div className="mt-1.5 max-w-2xl">
              <p className="text-sm text-text-secondary leading-relaxed">
                {algo.summary}
              </p>
              {/* Temporarily disabled: read-aloud for the algorithm summary.
              <div className="mt-2">
                <SpeakButton text={algo.summary} id={`algo-${algo.id ?? algo.slug ?? 'summary'}`} />
              </div>
              */}
            </div>
          )}
        </div>

        {(complexity.time || complexity.space) && (
          <div className="flex gap-2.5">
            {complexity.time && (
              <div className="ua-card px-3.5 py-2 flex items-center gap-2.5">
                <Timer size={15} className="text-warning shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t('algoDetail.time')}
                  </p>
                  <p className="text-[13px] font-mono font-semibold text-text-primary">
                    {complexity.time}
                  </p>
                </div>
              </div>
            )}
            {complexity.space && (
              <div className="ua-card px-3.5 py-2 flex items-center gap-2.5">
                <HardDrive size={15} className="text-achievement shrink-0" />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-text-muted">
                    {t('algoDetail.space')}
                  </p>
                  <p className="text-[13px] font-mono font-semibold text-text-primary">
                    {complexity.space}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      <div className="ua-workspace-nav">
        <div role="tablist" aria-label="Algorithm workspace" className="ua-workspace-tabs">
          {WORKSPACE_TABS.map((name, i) => (
            <button key={name} id={`workspace-tab-${name}`} role="tab" type="button"
              aria-selected={tab === name} aria-controls={`workspace-panel-${name}`}
              tabIndex={tab === name ? 0 : -1}
              onClick={() => selectTab(name)}
              onKeyDown={event => {
                let index = i;
                if (event.key === 'ArrowRight') index = (i + 1) % WORKSPACE_TABS.length;
                else if (event.key === 'ArrowLeft') index = (i + WORKSPACE_TABS.length - 1) % WORKSPACE_TABS.length;
                else if (event.key === 'Home') index = 0;
                else if (event.key === 'End') index = WORKSPACE_TABS.length - 1;
                else return;
                event.preventDefault();
                selectTab(WORKSPACE_TABS[index]);
                document.getElementById(`workspace-tab-${WORKSPACE_TABS[index]}`)?.focus();
              }}>{name}</button>
          ))}
        </div>
        <button type="button" className="ua-bookmark" aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark algorithm'}
          aria-pressed={bookmarked} onClick={() => {
            localStorage.setItem(`ua_algo_bookmark_${algo.slug}`, bookmarked ? '0' : '1');
            setBookmarked(!bookmarked);
          }}><Bookmark size={16} fill={bookmarked ? 'currentColor' : 'none'} /></button>
      </div>

      {tab === 'Explanation' && (
        <section role="tabpanel" id="workspace-panel-Explanation" aria-labelledby="workspace-tab-Explanation" className="ua-card p-5 space-y-4">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2"><Info size={18} /> How it works</h2>
          <p className="text-sm text-text-secondary whitespace-pre-line leading-relaxed">{algo.usage || algo.summary}</p>
          <dl className="text-sm text-text-secondary space-y-2">
            {Object.entries(complexity).map(([key, value]) => <div key={key}><dt className="font-semibold capitalize">{key} complexity</dt><dd>{String(value)}</dd></div>)}
          </dl>
        </section>
      )}
      <div role="tabpanel" id="workspace-panel-Practice" aria-labelledby="workspace-tab-Practice" hidden={tab !== 'Practice'} className="space-y-4">
        <AlgorithmPractice title={algo.title} />

      </div>

      {/* ══ Visualization workspace: two-column on desktop ══════════════ */}
      <div role="tabpanel" id="workspace-panel-Visualization" aria-labelledby="workspace-tab-Visualization" hidden={tab !== 'Visualization'}>
      <div className="ua-workspace-grid">
        <AnimationFocus title={algo.title}>
          <div className="ua-animation-panel">
            <div className="ua-animation-panel-title"><Workflow size={15} /><span>{algo.spec.visualizer.toLowerCase().replace(/_/g, ' ')} visualization</span></div>
            <GridPanel algo={algo} step={step} />
            <PlaybackToolbar state={state} controls={controls} pending={!!pending}
              speed={speed} setSpeed={setSpeed} />
          </div>
        </AnimationFocus>

        {/* RIGHT — step inspector */}
        <StepInspector
          feedback={feedback?.index === state.index && !pending ? feedback.message : undefined}
          step={step}
          index={state.index}
          total={state.total}
          statusLabel={statusLabel}
          statusColor={statusColor}
          cursor={cursor}
          visitedCount={visitedCount}
          pending={pending}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSubmit={submit}
        />
      </div>

      </div>

      {/* ══ Code panel ════════════════════════════════════════════════ */}
      {(algo.javaSource || algo.pythonSource) && (tab === 'Visualization' || tab === 'Code') && (
        <div role={tab === 'Code' ? 'tabpanel' : undefined} id="workspace-panel-Code" aria-labelledby="workspace-tab-Code">
        <CodePanel
          algo={algo}
          lang={lang}
          setLang={setLang}
          sourceLines={sourceLines}
          activeLine={
            step?.line && (step?.lang ?? 'java') === lang ? step.line : null
          }
          collapsed={codeCollapsed}
          setCollapsed={setCodeCollapsed}
        />
        </div>
      )}
    </div>
  );
};

/* ========================================================================== */
/* Grid panel — responsive, square-celled canvas on the visualization surface */
/* ========================================================================== */

const GridPanel: React.FC<{
  algo: Algorithm;
  step: ReturnType<typeof useVisualization>['state']['step'];
}> = ({ algo, step }) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ w: 480, h: 420 });
  const { theme } = useTheme();
  const resolvedTheme = useMemo(
    () => resolveTheme({
      ...visualizationPalette(theme),
      styleColors: theme === 'light'
        ? { VISIT: '#BFDBFE', ACTIVE: '#86EFAC' }
        : { VISIT: '#3288F5', ACTIVE: '#22C55E' },
    }),
    [theme]
  );

  // Observe container width → keep the canvas square-ish & overflow-free.
  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.max(1, Math.floor(el.clientWidth) - 24);
      const h = el.closest('.is-expanded')
        ? Math.max(80, el.clientHeight - 24)
        : Math.max(180, Math.min(w * 0.7, 420));
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Draw the current frame from the REAL engine step.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w: width, h: height } = size;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = resolvedTheme.background;
    ctx.fillRect(0, 0, width, height);
    if (!step) return;

    try {
      const renderer = getRenderer(algo.spec.visualizer);
      renderer({ ctx, width, height, theme: resolvedTheme }, step, algo.spec);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[GridPanel] render failed:', err);
      ctx.fillStyle = resolvedTheme.textColor;
      ctx.font = '13px ui-sans-serif, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Unable to render this step.', width / 2, height / 2);
    }
  }, [step, size, algo.spec, resolvedTheme]);

  return (
    <section
      className="rounded-2xl border border-border overflow-hidden flex flex-col"
      style={{ background: 'var(--ua-surface)' }}
      aria-label="Algorithm grid visualization"
    >
      <div
        ref={wrapRef}
        className="ua-animation-canvas flex-1 flex items-center justify-center p-3 min-h-[180px]"
      >
        <canvas
          ref={canvasRef}
          className="max-w-full"
          role="img"
          aria-label={step?.title ?? 'Algorithm state'}
        />
      </div>
      <Legend isArray={algo.spec.visualizer === 'ARRAY'} />
    </section>
  );
};

const LEGEND_ITEMS = [
  { label: 'Unvisited', color: 'var(--ua-surface-soft)', border: 'var(--ua-border-strong)' },
  { label: 'Blocked', color: 'var(--ua-surface-soft)', border: 'var(--ua-border-strong)' },
  { label: 'Visited', color: 'var(--ua-viz-visited)' },
  { label: 'Active', color: 'var(--ua-viz-active)' },
];

const ARRAY_LEGEND_ITEMS = [
  { label: 'Compare', color: '#f59e0b' },
  { label: 'Active', color: 'var(--ua-viz-active)' },
  { label: 'Swap', color: '#ef4444' },
  { label: 'Final', color: '#64748b' },
];

const Legend: React.FC<{ isArray: boolean }> = ({ isArray }) => (
  <div
    className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 md:px-6 py-3 border-t border-border"
    style={{ background: 'rgba(255,255,255,0.02)' }}
  >
    {(isArray ? ARRAY_LEGEND_ITEMS : LEGEND_ITEMS).map((item: { label: string; color: string; border?: string }) => (
      <span key={item.label} className="inline-flex items-center gap-1.5 text-[11.5px]">
        <span
          className="w-3 h-3 rounded-[4px] shrink-0"
          style={{
            background: item.color,
            border: `1px solid ${item.border ?? item.color}`,
          }}
        />
        <span style={{ color: 'var(--ua-text-secondary)' }}>{item.label}</span>
      </span>
    ))}
  </div>
);

/* ========================================================================== */
/* Step inspector — live algorithm state from the real execution trace        */
/* ========================================================================== */

const StepInspector: React.FC<{
  feedback?: string;
  step: ReturnType<typeof useVisualization>['state']['step'];
  index: number;
  total: number;
  statusLabel: string;
  statusColor: string;
  cursor?: [number, number];
  visitedCount: number;
  pending: ReturnType<typeof useVisualization>['state']['pendingInput'];
  inputValue: string;
  setInputValue: (v: string) => void;
  onSubmit: (raw: unknown) => void;
}> = ({
  feedback,
  step,
  index,
  total,
  statusLabel,
  statusColor,
  cursor,
  visitedCount,
  pending,
  inputValue,
  setInputValue,
  onSubmit,
}) => {
  const { t } = useTranslation();
  return (
    <aside
      className="ua-step-inspector rounded-2xl border border-border p-3 sm:p-4 flex flex-col gap-3 overflow-y-auto overscroll-contain [overflow-anchor:none]"
      style={{ background: 'var(--ua-surface)' }}
      aria-label="Step inspector"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
        <h2 className="text-sm font-semibold text-text-primary">Walkthrough</h2>
        <span className="text-xs text-text-muted">{index + 1} / {total}</span>
      </div>
      {/* current action */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={14} className="text-primary-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {t('algoDetail.currentAction')}
          </span>
        </div>
        <h2 className="text-base font-bold text-text-primary leading-snug">
          {step?.title ?? t('algoDetail.stepN', { num: index + 1 })}
        </h2>
        {step?.explanation && (
          <p className="text-[13px] text-text-secondary leading-relaxed mt-1.5">
            {step.explanation}
          </p>
        )}
      </div>

      {/* live state grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {cursor && <>
          <StatCard icon={<MapPin size={13} />} label={t('algoDetail.rowCol')}
            value={`(${cursor[0]}, ${cursor[1]})`} />
          <StatCard icon={<CheckCircle2 size={13} />} label={t('algoDetail.visitedCells')}
            value={String(visitedCount)} />
        </>}
        <StatCard
          icon={<Hash size={13} />}
          label={t('algoDetail.step')}
          value={`${index + 1} / ${total}`}
        />
        <StatCard
          icon={
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: statusColor }}
            />
          }
          label={t('algoDetail.status')}
          value={statusLabel}
          valueColor={statusColor}
        />
      </div>

      {/* custom variables from the spec, if any */}
      {step?.variables && Object.keys(step.variables).length > 0 && (
        <div
          className="rounded-xl border border-border p-3 flex flex-col gap-1.5"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          {Object.entries(step.variables).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between text-[12.5px]">
              <span className="text-text-muted">{k}</span>
              <span className="font-mono font-semibold text-text-primary">
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      )}

      {feedback && (
        <p role="status" className="text-sm text-text-primary rounded-xl border border-border p-3">
          {feedback}
        </p>
      )}

      {/* input prompt — tied to the real engine pending input */}
      {pending && (
        <QuestionModal label="Animation checkpoint question">
        <div className="space-y-4">
          <div className="text-base font-semibold text-text-primary leading-relaxed">
            {pending.prompt}
          </div>
          {pending.type === 'CHOICE' ? (
            <div className="flex flex-wrap gap-2">
              {pending.options?.map((o, i) => (
                <button
                  key={i}
                  className="btn-primary text-[13px] py-1.5 px-3.5"
                  onClick={() => onSubmit(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          ) : pending.type === 'BOOLEAN' ? (
            <div className="flex gap-2">
              <button
                className="btn-primary text-[13px] py-1.5 px-4"
                onClick={() => onSubmit(true)}
              >
                {t('algoDetail.true')}
              </button>
              <button
                className="btn-primary text-[13px] py-1.5 px-4"
                onClick={() => onSubmit(false)}
              >
                {t('algoDetail.false')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                className="flex-1 rounded-lg border border-border bg-background text-text-primary text-[13px] px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                type={pending.type === 'NUMBER' ? 'number' : 'text'}
                placeholder={pending.placeholder}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    onSubmit(
                      pending.type === 'NUMBER' ? Number(inputValue) : inputValue
                    );
                }}
              />
              <button
                className="btn-primary text-[13px] py-1.5 px-4"
                onClick={() =>
                  onSubmit(
                    pending.type === 'NUMBER' ? Number(inputValue) : inputValue
                  )
                }
              >
                Submit
              </button>
            </div>
          )}
        </div>
        </QuestionModal>
      )}
    </aside>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}> = ({ icon, label, value, valueColor }) => (
  <div
    className="rounded-xl border border-border px-3 py-2.5"
    style={{ background: 'rgba(255,255,255,0.02)' }}
  >
    <div className="flex items-center gap-1.5 text-text-muted mb-1">
      {icon}
      <span className="text-[10px] font-semibold uppercase tracking-wider">
        {label}
      </span>
    </div>
    <p
      className="text-sm font-mono font-semibold truncate"
      style={{ color: valueColor ?? 'var(--ua-text-primary)' }}
      title={value}
    >
      {value}
    </p>
  </div>
);

/* ========================================================================== */
/* Playback toolbar                                                           */
/* ========================================================================== */

const PlaybackToolbar: React.FC<{
  state: ReturnType<typeof useVisualization>['state'];
  controls: ReturnType<typeof useVisualization>['controls'];
  pending: boolean;
  speed: number;
  setSpeed: (ms: number) => void;
}> = ({ state, controls, pending, speed, setSpeed }) => {
  const atStart = state.index === 0;
  return (
    <div
      className="rounded-2xl border border-border p-2.5 md:p-3 flex flex-wrap items-center gap-2 md:gap-3"
      style={{ background: 'var(--ua-surface)' }}
      role="group"
      aria-label="Playback controls"
    >
      <div className="flex items-center gap-1.5">
        <IconBtn
          onClick={controls.reset}
          disabled={atStart && !state.isPlaying}
          title="Restart (Home)"
          label="Restart"
        >
          <SkipBack size={16} aria-hidden />
        </IconBtn>
        <IconBtn
          onClick={controls.prev}
          disabled={atStart}
          title="Previous step (←)"
          label="Previous step"
        >
          <ChevronLeft size={16} aria-hidden />
        </IconBtn>

        {state.isPlaying ? (
          <IconBtn
            primary
            onClick={controls.pause}
            title="Pause (Space)"
            label="Pause"
            wide
          >
            <Pause size={16} aria-hidden />
            <span className="text-[13px] font-semibold">Pause</span>
          </IconBtn>
        ) : (
          <IconBtn
            primary
            onClick={controls.play}
            disabled={pending || state.isFinished}
            title={
              pending
                ? 'Answer the question to continue'
                : state.isFinished
                ? 'Reached the end — press Restart'
                : 'Play (Space)'
            }
            label="Play"
            wide
          >
            <Play size={16} aria-hidden />
            <span className="text-[13px] font-semibold">Play</span>
          </IconBtn>
        )}

        <IconBtn
          onClick={() => { if (!pending) controls.next(); }}
          disabled={state.isFinished}
          title={pending ? 'Answer the question to continue' : 'Next step (→)'}
          label="Next step"
        >
          <ChevronRight size={16} aria-hidden />
        </IconBtn>
      </div>

      {/* timeline */}
      <div className="flex items-center gap-3 flex-1 min-w-[180px]">
        <input
          type="range"
          min={0}
          max={Math.max(0, state.total - 1)}
          value={state.index}
          onChange={(e) => controls.seek(Number(e.target.value))}
          className="flex-1 cursor-pointer"
          style={{ accentColor: 'var(--ua-primary-500)' }}
          title="Drag to jump to any step"
          aria-label="Step timeline"
          aria-valuetext={`Step ${state.index + 1} of ${state.total}`}
        />
        <span className="text-[12px] font-mono font-semibold text-text-secondary whitespace-nowrap min-w-[78px] text-right">
          {state.index + 1} / {state.total}
        </span>
      </div>

      {/* speed */}
      <label
        className="flex items-center gap-1.5 shrink-0"
        title="Playback speed"
      >
        <Gauge size={15} className="text-text-muted" aria-hidden />
        <select
          value={speed}
          onChange={(e) => setSpeed(Number(e.target.value))}
          className="rounded-lg border border-border text-[12.5px] font-semibold text-text-primary px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
          style={{ background: 'rgba(255,255,255,0.04)' }}
          aria-label="Playback speed"
        >
          {SPEED_OPTIONS.map((o) => (
            <option key={o.ms} value={o.ms}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
};

const IconBtn: React.FC<{
  onClick: () => void;
  disabled?: boolean;
  title: string;
  label: string;
  primary?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ onClick, disabled, title, label, primary, wide, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    aria-label={label}
    className={`inline-flex items-center justify-center gap-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-primary-500 ${
      wide ? 'px-4 py-2 min-w-[92px]' : 'w-9 h-9'
    } ${
      primary
        ? 'bg-primary-500 border-primary-500 text-white hover:brightness-110'
        : 'border-border text-text-secondary hover:text-text-primary'
    }`}
    style={
      primary
        ? undefined
        : { background: 'rgba(255,255,255,0.04)' }
    }
  >
    {children}
  </button>
);

/* ========================================================================== */
/* Code panel — collapsible, synced active-line highlight                      */
/* ========================================================================== */

const CodePanel: React.FC<{
  algo: Algorithm;
  lang: 'java' | 'python';
  setLang: (l: 'java' | 'python') => void;
  sourceLines: string[];
  activeLine: number | null;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}> = ({ algo, lang, setLang, sourceLines, activeLine, collapsed, setCollapsed }) => {
  const [editorVersion, setEditorVersion] = useState(0);
  const source = sourceLines.join('\n');
  const copy = async () => {
    try { await navigator.clipboard.writeText(source); toast.success('Source copied'); }
    catch { toast.error('Could not copy source. Select the code and copy manually.'); }
  };
  return (
    <section className="ua-source-panel rounded-2xl border border-border overflow-hidden" aria-label="Source code">
      <div className="ua-editor-toolbar">
        <span className="flex items-center gap-2 text-sm font-semibold"><Code2 size={16} /> Source</span>
        <div className="ua-language-tabs" role="group" aria-label="Source language">
          {algo.javaSource && <TabBtn active={lang === 'java'} onClick={() => setLang('java')}>Java</TabBtn>}
          {algo.pythonSource && <TabBtn active={lang === 'python'} onClick={() => setLang('python')}>Python</TabBtn>}
        </div>
        <div className="ua-editor-actions">
          <button type="button" onClick={copy} aria-label="Copy source" title="Copy source"><Copy size={15} /></button>
          <button type="button" onClick={() => { setEditorVersion(v => v + 1); setCollapsed(false); }} aria-label="Reset source view" title="Reset source view"><RotateCcw size={15} /></button>
          <button type="button" onClick={() => setCollapsed(!collapsed)} aria-expanded={!collapsed}>
            {collapsed ? 'Show code' : 'Hide code'}<ChevronDown size={15} className={collapsed ? '' : 'rotate-180'} />
          </button>
        </div>
      </div>
      {!collapsed && <AnimationFocus title={`${algo.title} source code`}>
        <div className="ua-code-viewport" role="region" aria-label="Source code listing">
          <CodeEditor key={editorVersion} value={source} onChange={() => {}} language={lang} dark readOnly
            activeLine={activeLine} minHeight="20rem" />
        </div>
      </AnimationFocus>}
      {!collapsed && <p className="ua-source-note">Read-only reference · {activeLine ? `Execution line ${activeLine}` : 'Equivalent implementation'} · Playback follows the recorded algorithm trace, not edited code.</p>}
    </section>
  );
};

const TabBtn: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={active} className={active ? 'is-active' : ''}>
    {children}
  </button>
);
