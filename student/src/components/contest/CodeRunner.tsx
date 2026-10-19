import React, { useEffect, useRef, useState } from 'react';
import { Play, Loader2, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';
import { useSandbox } from '../../sandbox/useSandbox';
import { CodeEditor } from './CodeEditor';
import type { Language } from '../../sandbox/types';

interface CodeRunnerProps {
  language?: Language;
  initialCode?: string;
  stdin?: string;
  /** Hard wall-clock limit per run. */
  timeoutMs?: number;
}

const DEFAULT_CODE: Record<Language, string> = {
  python: 'print("Hello from Pyodide in a worker!")\n',
  javascript: 'console.log("Hello from the sandbox worker!");\n',
  cpp: '// C++ runtime is a template — wire up your wasm toolchain.\n',
  c: '// C runtime is a template — wire up your wasm toolchain.\n',
};

/**
 * Self-contained contest code runner.
 *   • One-time per-machine WASM install (Cache API), reused forever after.
 *   • All execution happens on a worker thread — the UI never blocks.
 *   • Hard timeout + isolated globals protect the client.
 */
export const CodeRunner: React.FC<CodeRunnerProps> = ({
  language = 'python',
  initialCode,
  stdin,
  timeoutMs = 10_000,
}) => {
  const { status, progress, installedFromCache, error, init, run } = useSandbox(language);
  const [code, setCode] = useState(initialCode ?? DEFAULT_CODE[language]);
  const [output, setOutput] = useState('');
  const [exitOk, setExitOk] = useState<boolean | null>(null);
  const outRef = useRef<HTMLPreElement>(null);

  // Kick off install/warm as soon as the runner mounts.
  useEffect(() => { void init(); }, [init]);

  useEffect(() => {
    outRef.current?.scrollTo({ top: outRef.current.scrollHeight });
  }, [output]);

  const handleRun = async () => {
    setOutput('');
    setExitOk(null);
    const result = await run(code, {
      stdin,
      timeoutMs,
      onStdout: chunk => setOutput(o => o + chunk),
      onStderr: chunk => setOutput(o => o + chunk),
    });
    setExitOk(result.ok && !result.timedOut);
    // Use the final result as well as streaming: startup/worker failures may
    // never emit a stderr event.
    setOutput(result.stdout + result.stderr || result.error || (result.ok ? 'Completed with no output.' : 'Execution failed.'));
  };

  const busy = status === 'installing' || status === 'loading';
  const pct = Math.round(progress * 100);

  return (
    <div className="card p-0 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg-soft">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <span className="w-2.5 h-2.5 rounded-full bg-primary-500" />
          {language.toUpperCase()} Sandbox
        </div>
        <div className="flex items-center gap-2 text-xs">
          {status === 'ready' && installedFromCache && (
            <span className="flex items-center gap-1 text-success">
              <CheckCircle2 size={13} /> Installed locally
            </span>
          )}
          {status === 'error' && (
            <span className="flex items-center gap-1 text-danger">
              <AlertTriangle size={13} /> Runtime error
            </span>
          )}
          <button
            onClick={handleRun}
            disabled={status !== 'ready'}
            className="btn-primary py-1.5 px-3 text-xs disabled:opacity-50"
          >
            {status === 'running'
              ? <><Loader2 size={13} className="animate-spin" /> Running</>
              : <><Play size={13} /> Run</>}
          </button>
        </div>
      </div>

      {/* Install / warm progress */}
      {busy && (
        <div className="px-4 py-3 bg-primary-50 border-b border-primary-200">
          <div className="flex items-center gap-2 text-xs text-primary-600 mb-1.5">
            <Download size={13} className={installedFromCache ? '' : 'animate-bounce'} />
            {installedFromCache
              ? 'Loading runtime from this machine…'
              : `Installing runtime (one-time download)… ${pct}%`}
          </div>
          <div className="h-1 rounded-full bg-primary-100 overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-2 text-xs text-danger bg-danger-soft border-b border-danger/30">
          {error}
        </div>
      )}

      {/* Editor */}
      <div className="bg-[#282c34]">
        <CodeEditor value={code} onChange={setCode} language={language} dark minHeight="14rem" />
      </div>

      {/* Output */}
      <div className="border-t border-border">
        <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-text-muted bg-bg-soft">
          Output
        </div>
        <pre
          ref={outRef}
          className={clsx(
            'm-0 p-4 font-mono text-[12px] leading-relaxed whitespace-pre-wrap min-h-[80px] max-h-56 overflow-auto',
            exitOk === false ? 'text-danger' : 'text-text-primary',
          )}
        >
          {output || <span className="text-text-muted">Run your code to see output…</span>}
        </pre>
      </div>
    </div>
  );
};
