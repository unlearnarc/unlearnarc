import React, { useState } from 'react';
import { CodeEditor } from '../contest/CodeEditor';
import { useTheme } from '../../context/ThemeContext';
import { Copy } from 'lucide-react';
import { Code2, Play, Loader2, Info } from 'lucide-react';
import type { CodeLanguage, CodeProgram } from '../../types/animation';
import { activeCodeLines, activeCodeNote } from '../../types/animation';
import { useSandbox } from '../../sandbox/useSandbox';
import type { Language as SandboxLanguage } from '../../sandbox/types';

/* =============================================================================
   CodeProgramPanel — teach source code ALONGSIDE the animation.

   Purpose
   -------
   When a scene carries `programs` (e.g. a LeetCode solution, an SQL query, an
   ML snippet), this panel renders the code with:
     • time-synced line highlighting (the "current" lines light up as the
       playhead advances — driven by CodeProgram.highlights),
     • a tab per program (brute-force vs optimal, SQL variants, …),
     • an optional in-browser "Run" button for runnable languages
       (python / javascript) via the existing worker-isolated sandbox.

   Non-runnable languages (SQL, Java, C++ templates, …) are display-only — the
   highlighting and explanation still work, so you can narrate a query or a
   solution step by step.

   This keeps the code strictly presentational relative to the animation: the
   playhead stays the single source of truth; this panel only *reads* `time`.
   ============================================================================= */

export interface CodeProgramPanelProps {
  programs: CodeProgram[];
  /** Current playhead (ms) — drives line highlighting. */
  time: number;
  className?: string;
}

/** Only these map onto the client sandbox; everything else is display-only. */
const RUNNABLE: Record<string, SandboxLanguage> = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  c: 'c',
};

function isRunnable(lang: CodeLanguage): SandboxLanguage | null {
  return RUNNABLE[lang] ?? null;
}

/** Runnable footer: mounts the sandbox lazily and runs the current program. */
const RunBar: React.FC<{ program: CodeProgram; sandboxLang: SandboxLanguage }> = ({
  program,
  sandboxLang,
}) => {
  const { status, progress, init, run } = useSandbox(sandboxLang);
  const [output, setOutput] = useState('');
  const [ran, setRan] = useState(false);

  const handleRun = async () => {
    setRan(true);
    setOutput('');
    await init();
    const res = await run(program.source, {
      stdin: program.stdin,
      timeoutMs: 10_000,
      onStdout: (c) => setOutput((o) => o + c),
      onStderr: (c) => setOutput((o) => o + c),
    });
    setOutput(res.stdout + res.stderr || res.error || (res.ok ? 'Completed with no output.' : 'Execution failed.'));
  };

  const busy = status === 'installing' || status === 'loading' || status === 'running';
  const pct = Math.round(progress * 100);

  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface-soft">
        <button
          onClick={handleRun}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          {status === 'running' ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Running
            </>
          ) : status === 'installing' || status === 'loading' ? (
            <>
              <Loader2 size={13} className="animate-spin" /> Runtime {pct}%
            </>
          ) : (
            <>
              <Play size={13} /> Run
            </>
          )}
        </button>
        <span className="text-[11px] text-text-muted">
          Runs locally in a sandboxed worker — nothing leaves your browser.
        </span>
      </div>
      {ran && (
        <pre className="m-0 max-h-40 overflow-auto px-3 py-2 text-[12px] leading-relaxed whitespace-pre-wrap text-text-primary border-t border-border">
          {output || <span className="text-text-muted">No output.</span>}
        </pre>
      )}
    </div>
  );
};

export const CodeProgramPanel: React.FC<CodeProgramPanelProps> = ({
  programs,
  time,
  className,
}) => {
  const { theme } = useTheme();
  const [copyStatus, setCopyStatus] = useState('');
  const [activeId, setActiveId] = useState(programs[0]?.id);
  if (!programs || programs.length === 0) return null;

  const program = programs.find((p) => p.id === activeId) ?? programs[0];
  const activeLines = activeCodeLines(program, time);
  const note = activeCodeNote(program, time);
  const sandboxLang = program.runnable ? isRunnable(program.language) : null;

  return (
    <div
      className={`rounded-2xl border border-border overflow-hidden ${className ?? ''}`}
      style={{ background: 'var(--ua-surface)' }}
      aria-label="Program source code"
    >
      {/* header + tabs */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface-soft">
        <Code2 size={15} className="text-primary-500 shrink-0" />
        <h4 className="text-[13px] font-bold text-text-primary shrink-0">Code</h4>
        <div className="ml-auto flex gap-1 overflow-x-auto min-w-0">
          {programs.map((p) => (
            <button
              key={p.id}
              aria-pressed={p.id === program.id}
              onClick={() => { setActiveId(p.id); setCopyStatus(''); }}
              className={`rounded-md px-2.5 py-1 text-[11.5px] font-semibold transition ${
                p.id === program.id
                  ? 'bg-primary-500 text-white'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {p.label}
              <span className="ml-1.5 opacity-60 uppercase text-[10px]">
                {p.language}
              </span>
            </button>
          ))}
        </div>
        <button type="button" aria-label="Copy code" className="shrink-0 text-text-primary p-2" onClick={async () => {
          try { await navigator.clipboard.writeText(program.source); setCopyStatus('Copied'); }
          catch { setCopyStatus('Unable to copy. Select the code to copy manually.'); }
        }}><Copy size={16} /></button>
      </header>
      <span role="status" className="text-xs text-text-secondary px-3">{copyStatus}</span>

      {program.explanation && (
        <p className="px-3 py-2 text-[12px] text-text-secondary leading-relaxed border-b border-border bg-surface-soft">
          {program.explanation}
        </p>
      )}

      <div className="animation-reference-editor">
        <CodeEditor value={program.source} onChange={() => {}} language={program.language}
          dark={theme === 'dark'} readOnly activeLines={activeLines} minHeight="16rem" />
      </div>

      {note && (
        <div className="flex items-start gap-2 px-3 py-2 border-t border-border bg-primary-500/5">
          <Info size={13} className="text-primary-500 mt-0.5 shrink-0" />
          <p className="text-[12px] text-text-secondary leading-relaxed">{note}</p>
        </div>
      )}

      {sandboxLang && <RunBar program={program} sandboxLang={sandboxLang} />}
    </div>
  );
};
