import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, Play, Send, Loader2, Download, CheckCircle2, XCircle,
  AlertTriangle, Clock, Lock, RefreshCw, WifiOff, Maximize2, Minimize2,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import clsx from 'clsx';
import { useContestGrader } from '../../sandbox/useContestGrader';
import { clearRuntimeCache } from '../../sandbox/assetCache';
import { CodeEditor } from './CodeEditor';
import { SpeakButton } from '../ui/SpeakButton';
import type { Language } from '../../sandbox/types';
import type { Contest, ContestProblem, SubmissionVerdict } from '../../types';

interface ContestSolverProps {
  contest: Contest;
  problem: ContestProblem;
  onBack: () => void;
}

const VERDICT_META: Record<SubmissionVerdict, { label: string; tone: string; Icon: typeof CheckCircle2 }> = {
  ACCEPTED:      { label: 'Accepted',       tone: 'text-success',  Icon: CheckCircle2 },
  PARTIAL:       { label: 'Partial',        tone: 'text-amber-500', Icon: AlertTriangle },
  WRONG_ANSWER:  { label: 'Wrong Answer',   tone: 'text-danger',   Icon: XCircle },
  TIME_LIMIT:    { label: 'Time Limit',     tone: 'text-danger',   Icon: Clock },
  RUNTIME_ERROR: { label: 'Runtime Error',  tone: 'text-danger',   Icon: XCircle },
  COMPILE_ERROR: { label: 'Compile Error',  tone: 'text-danger',   Icon: XCircle },
  MALFORMED:     { label: 'Rejected',       tone: 'text-danger',   Icon: XCircle },
};

/** Map a contest language token to a supported sandbox language. */
function resolveLanguage(allowed: string): Language {
  const langs = allowed.split(',').map(s => s.trim().toLowerCase());
  if (langs.includes('python')) return 'python';
  if (langs.includes('javascript')) return 'javascript';
  return 'python';
}

function parseStarter(json: string | undefined, lang: Language): string {
  if (!json) return '';
  try {
    const map = JSON.parse(json) as Record<string, string>;
    return map[lang] ?? map.python ?? Object.values(map)[0] ?? '';
  } catch {
    return '';
  }
}

export const ContestSolver: React.FC<ContestSolverProps> = ({ contest, problem, onBack }) => {
  const language = useMemo(() => resolveLanguage(contest.allowedLanguages), [contest.allowedLanguages]);
  const grader = useContestGrader(language);

  const [code, setCode] = useState(() => parseStarter(problem.starterCodeJson, language));
  const [sampleOutput, setSampleOutput] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showDescription, setShowDescription] = useState(true);

  // Allow Esc to exit full-screen and lock body scroll while active.
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullscreen(false); };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Install / warm the runtime once this problem opens.
  useEffect(() => { void grader.prepare(); }, [grader.prepare]);

  const installing = grader.sandboxStatus === 'installing';
  const warming = grader.sandboxStatus === 'loading';
  // `idle` is the pre-init state (before prepare() has flipped the status to
  // installing/loading). Treat it as "busy/starting", NOT as a failure — the
  // worker is about to boot. Only a genuine `error` should block the UI.
  const starting = grader.sandboxStatus === 'idle';
  const busyRuntime = installing || warming || starting;
  const pct = Math.round(grader.sandboxProgress * 100);

  const isSubmitting = grader.phase === 'submitting' || grader.phase === 'fetching-challenge';
  const isRunning = grader.phase === 'running';

  const handleRunSamples = async () => {
    setSampleOutput('');
    const results = await grader.runSamples(code, problem);
    const text = results
      .map((r, i) => {
        const pass = r.localPassed ? '✓ PASS' : r.clientStatus !== 'OK' ? `✗ ${r.clientStatus}` : '✗ FAIL';
        return `Sample ${i + 1}: ${pass}  (${r.runtimeMs}ms)\n  output: ${r.producedOutput || '(empty)'}`;
      })
      .join('\n\n');
    setSampleOutput(text || 'No sample test cases.');
  };

  const handleSubmit = async () => {
    await grader.gradeAndSubmit(code, contest.id, problem);
  };

  // Retry WITHOUT clearing — re-runs init() (reads from cache if present).
  const handleRetry = () => { void grader.prepare(); };

  // Hard reset — wipe the persisted WASM cache so the runtime is re-downloaded
  // from the server on the next init(). Use this when the cache is poisoned
  // (e.g. a 503/partial response got stored during earlier proxy/port issues).
  const [clearing, setClearing] = useState(false);
  const handleClearCacheAndRedownload = async () => {
    setClearing(true);
    try {
      await clearRuntimeCache();
      await grader.prepare();
    } finally {
      setClearing(false);
    }
  };

  const verdict = grader.submission ? VERDICT_META[grader.submission.verdict] : null;
  const canInteract = grader.sandboxStatus === 'ready' || grader.sandboxStatus === 'running';

  // The sandbox (WASM runtime) failed to load / install. Until it is `ready`
  // (or at least `running`) the Run / Submit buttons cannot do anything, so we
  // surface an explicit, actionable banner instead of silently disabled buttons.
  const runtimeFailed = grader.sandboxStatus === 'error';
  // Only block on a *real* error. Anything else (idle/installing/loading) is a
  // transient startup state covered by the progress bar above — showing the red
  // "not loaded" banner during normal boot was the false-alarm bug.
  const showRuntimeBlocker = runtimeFailed;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition"
      >
        <ArrowLeft size={15} /> Back to problems
      </button>

      <div className={clsx('grid gap-4', showDescription && !isFullscreen && 'lg:grid-cols-2')}>
        {/* ── Problem statement ─────────────────────────────────────────── */}
        <div
          className={clsx(
            'card p-6 space-y-4 max-h-[75vh] overflow-auto',
            (!showDescription || isFullscreen) && 'hidden',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-text-primary">{problem.title}</h2>
            <div className="flex items-center gap-2 shrink-0">
              {/* Read-aloud for the dynamic problem statement (+ constraints). */}
              <SpeakButton
                text={[problem.statement, problem.constraints].filter(Boolean).join('. ')}
                id={`problem-${problem.id}`}
              />
              <span className="text-xs font-semibold text-text-muted">{problem.maxPoints} pts</span>
            </div>
          </div>

          <div className="prose prose-sm max-w-none text-text-secondary whitespace-pre-wrap">
            {problem.statement}
          </div>

          {problem.constraints && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">Constraints</h4>
              <pre className="text-xs bg-surface-soft rounded-lg p-3 whitespace-pre-wrap text-text-secondary">
                {problem.constraints}
              </pre>
            </div>
          )}

          {problem.sampleTestCases.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">Samples</h4>
              {problem.sampleTestCases.map((tc, i) => (
                <div key={tc.id} className="rounded-lg border border-border overflow-hidden text-xs">
                  <div className="px-3 py-1.5 bg-surface-soft font-medium text-text-muted">Sample {i + 1}</div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="p-3">
                      <div className="text-[10px] uppercase text-text-muted mb-1">Input</div>
                      <pre className="whitespace-pre-wrap text-text-secondary">{tc.input}</pre>
                    </div>
                    <div className="p-3">
                      <div className="text-[10px] uppercase text-text-muted mb-1">Output</div>
                      <pre className="whitespace-pre-wrap text-text-secondary">{tc.expectedOutput}</pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-[11px] text-text-muted flex items-center gap-1 pt-2 border-t border-border">
            <Lock size={11} /> {problem.hiddenTestCount} hidden test case(s) grade your submission.
          </p>
        </div>

        {/* ── Editor + runner ───────────────────────────────────────────── */}
        <div className="space-y-4">
          <div
            className={clsx(
              'card p-0 overflow-hidden flex flex-col',
              isFullscreen &&
                'fixed inset-0 z-50 m-0 rounded-none max-w-none h-screen w-screen',
            )}
          >
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-surface-soft">
              <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
                {language.toUpperCase()} Sandbox
                {grader.installedFromCache && grader.sandboxStatus === 'ready' && (
                  <span className="flex items-center gap-1 text-success text-xs font-normal">
                    <CheckCircle2 size={12} /> installed locally
                  </span>
                )}
                {showRuntimeBlocker && (
                  <span className="flex items-center gap-1 text-danger text-xs font-normal">
                    <WifiOff size={12} /> not loaded
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!isFullscreen && (
                  <button
                    onClick={() => setShowDescription(d => !d)}
                    title={showDescription ? 'Hide description' : 'Show description'}
                    aria-label={showDescription ? 'Hide description' : 'Show description'}
                    className="btn-secondary py-1.5 px-2 text-xs"
                  >
                    {showDescription ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
                  </button>
                )}
                <button
                  onClick={handleRunSamples}
                  disabled={!canInteract || isRunning || isSubmitting}
                  className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50"
                >
                  {isRunning && !isSubmitting
                    ? <><Loader2 size={13} className="animate-spin" /> Running</>
                    : <><Play size={13} /> Run samples</>}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canInteract || isRunning || isSubmitting}
                  className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50"
                >
                  {isSubmitting
                    ? <><Loader2 size={13} className="animate-spin" /> Submitting</>
                    : <><Send size={13} /> Submit</>}
                </button>
                <button
                  onClick={() => setIsFullscreen(f => !f)}
                  title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen'}
                  aria-label={isFullscreen ? 'Exit full screen' : 'Enter full screen'}
                  className="btn-secondary py-1.5 px-2 text-xs"
                >
                  {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>
              </div>
            </div>

            {/* Runtime install / warm progress */}
            {busyRuntime && (
              <div className="px-4 py-3 bg-primary-50 border-b border-primary-200">
                <div className="flex items-center gap-2 text-xs text-primary-600 mb-1.5">
                  <Download size={13} className={warming ? '' : 'animate-bounce'} />
                  {warming
                    ? 'Loading runtime from this machine…'
                    : `Installing runtime (one-time download)… ${pct}%`}
                </div>
                <div className="h-1 rounded-full bg-primary-100 overflow-hidden">
                  <div className="h-full bg-primary-500 transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            {/* Runtime failed / not loaded — block Run & Submit with a clear message */}
            {showRuntimeBlocker && (
              <div className="px-4 py-3 bg-danger/5 border-b border-danger/30">
                <div className="flex items-start gap-2.5">
                  <WifiOff size={16} className="text-danger mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-danger">
                      {language.toUpperCase()} runtime not loaded
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      The code-execution sandbox (WASM) failed to install. You can’t run or submit
                      until it loads. Check your connection and use “Clear cache &amp; re-download”.
                    </p>
                    {grader.error && (
                      <p className="text-[11px] font-mono text-danger/80 mt-1 break-words">
                        {grader.error}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <button
                        onClick={handleRetry}
                        disabled={clearing}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <RefreshCw size={12} /> Retry loading runtime
                      </button>
                      <button
                        onClick={() => { void handleClearCacheAndRedownload(); }}
                        disabled={clearing}
                        className="btn-secondary py-1 px-2.5 text-xs inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {clearing
                          ? <><Loader2 size={12} className="animate-spin" /> Clearing…</>
                          : <><Download size={12} /> Clear cache &amp; re-download</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {grader.error && !showRuntimeBlocker && (
              <div className="px-4 py-2 text-xs text-danger bg-danger/5 border-b border-danger/30">
                {grader.error}
              </div>
            )}

            <div className={clsx('bg-[#282c34]', isFullscreen && 'flex-1 min-h-0 overflow-auto')}>
              <CodeEditor
                value={code}
                onChange={setCode}
                language={language}
                dark
                minHeight={isFullscreen ? '100%' : '20rem'}
              />
            </div>
          </div>

          {/* Verdict */}
          {verdict && grader.submission && (
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <div className={clsx('flex items-center gap-2 font-semibold', verdict.tone)}>
                  <verdict.Icon size={18} /> {verdict.label}
                </div>
                <div className="text-sm text-text-secondary">
                  {grader.submission.passedTests}/{grader.submission.totalTests} passed ·{' '}
                  <span className="font-semibold text-text-primary">{grader.submission.score}</span>/{grader.submission.maxPoints} pts
                </div>
              </div>
              {grader.submission.scoreDelta > 0 && (
                <p className="text-xs text-success mt-1">+{grader.submission.scoreDelta} added to your total ({grader.submission.participantTotalScore})</p>
              )}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {grader.submission.caseVerdicts.map(cv => (
                  <span
                    key={cv.testCaseId}
                    title={cv.expectedOutput != null ? `expected: ${cv.expectedOutput}\ngot: ${cv.producedOutput}` : 'hidden case'}
                    className={clsx(
                      'w-6 h-6 rounded flex items-center justify-center text-xs font-bold',
                      cv.passed ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger',
                    )}
                  >
                    {cv.passed ? '✓' : '✗'}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Sample run output */}
          {sampleOutput && !verdict && (
            <div className="card p-0 overflow-hidden">
              <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-surface-soft">
                Sample results
              </div>
              <pre className="m-0 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap max-h-56 overflow-auto text-text-primary">
                {sampleOutput}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
