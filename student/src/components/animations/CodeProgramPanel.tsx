import React, { useMemo, useState } from 'react';
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

/** A tiny, dependency-free, tokenless code renderer with line highlighting.
 *  We keep it monospace + line-numbered rather than pulling CodeMirror here,
 *  because this panel is read-only and must highlight arbitrary line sets. */
const CodeView: React.FC<{
  source: string;
  activeLines: number[];
}> = ({ source, activeLines }) => {
  const lines = useMemo(() => source.replace(/\n$/, '').split('\n'), [source]);
  const active = useMemo(() => new Set(activeLines), [activeLines]);
  const gutterWidth = String(lines.length).length;

  return (
    <pre className="m-0 overflow-auto max-h-[22rem] text-[12.5px] leading-[1.65] font-mono">
      <code className="block">
        {lines.map((ln, i) => {
          const no = i + 1;
          const on = active.has(no);
          return (
            <div
              key={no}
              className={`flex ${on ? 'bg-primary-500/15' : ''}`}
              style={
                on ? { boxShadow: 'inset 3px 0 0 var(--ua-primary-500)' } : undefined
              }
            >
              <span
                className="select-none pr-3 pl-3 text-right text-text-muted/70 shrink-0"
                style={{ minWidth: `${gutterWidth + 2}ch` }}
              >
                {no}
              </span>
              <span
                className={`pr-4 whitespace-pre ${on ? 'text-text-primary' : 'text-text-secondary'}`}
              >
                {ln || ' '}
              </span>
            </div>
          );
        })}
      </code>
    </pre>
  );
};

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
    if (res.timedOut) setOutput((o) => o + `\n⏱ ${res.error ?? 'timed out'}\n`);
  };

  const busy = status === 'installing' || status === 'loading' || status === 'running';
  const pct = Math.round(progress * 100);

  return (
    <div className="border-t border-border">
      <div className="flex items-center gap-2 px-3 py-2 bg-black/20">
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
  const [activeId, setActiveId] = useState(programs[0]?.id);
  if (!programs || programs.length === 0) return null;

  const program = programs.find((p) => p.id === activeId) ?? programs[0];
  const activeLines = activeCodeLines(program, time);
  const note = activeCodeNote(program, time);
  const sandboxLang = program.runnable ? isRunnable(program.language) : null;

  return (
    <div
      className={`rounded-2xl border border-border overflow-hidden ${className ?? ''}`}
      style={{ background: '#0F172A' }}
      aria-label="Program source code"
    >
      {/* header + tabs */}
      <header className="flex items-center gap-2 px-3 py-2 border-b border-border bg-[#16232E]">
        <Code2 size={15} className="text-primary-500 shrink-0" />
        <h4 className="text-[13px] font-bold text-text-primary shrink-0">Code</h4>
        <div className="ml-auto flex flex-wrap gap-1 justify-end">
          {programs.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveId(p.id)}
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
      </header>

      {program.explanation && (
        <p className="px-3 py-2 text-[12px] text-text-secondary leading-relaxed border-b border-border bg-black/10">
          {program.explanation}
        </p>
      )}

      <CodeView source={program.source} activeLines={activeLines} />

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
