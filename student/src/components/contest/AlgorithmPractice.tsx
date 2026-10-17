import { useState } from 'react';
import { Code2, Copy, Play, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { CodeEditor } from './CodeEditor';
import { AnimationFocus } from '../ui/AnimationFocus';
import { useSandbox } from '../../sandbox/useSandbox';

type PracticeLanguage = 'python' | 'javascript';
const STARTERS: Record<PracticeLanguage, string> = {
  python: '# Write your implementation here.\n# Add a function call and print the result to test it.\n\n',
  javascript: '// Write your implementation here.\n// Add a function call and console.log the result to test it.\n\n',
};

/** Learner-owned drafts, separate from the reference source and recorded trace. */
export function AlgorithmPractice({ title }: { title: string }) {
  const [language, setLanguage] = useState<PracticeLanguage>('python');
  const [drafts, setDrafts] = useState({ ...STARTERS });
  return (
    <section aria-label="Coding practice" className="ua-source-panel ua-card overflow-hidden">
      <AnimationFocus title={`${title} coding practice`}>
        <div className="ua-editor-toolbar">
          <h2 className="flex items-center gap-2 text-sm font-semibold"><Code2 size={16} /> Write your own code</h2>
          <label className="text-sm flex items-center gap-2">Language
            <select aria-label="Practice language" className="bg-bg-soft text-text-primary rounded p-2"
              value={language} onChange={event => setLanguage(event.target.value as PracticeLanguage)}>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
            </select>
          </label>
          <div className="ua-editor-actions">
            <button type="button" aria-label="Copy practice code" onClick={async () => {
              try { await navigator.clipboard.writeText(drafts[language]); toast.success('Code copied'); }
              catch { toast.error('Could not copy code'); }
            }}><Copy size={16} /> Copy</button>
            <button type="button" aria-label="Reset practice code" onClick={() => {
              if (window.confirm('Reset your code for this language? This will discard your changes.')) {
                setDrafts(current => ({ ...current, [language]: STARTERS[language] }));
              }
            }}><RotateCcw size={16} /> Reset</button>
          </div>
        </div>
        <PracticeSession key={language} language={language} code={drafts[language]}
          onChange={code => setDrafts(current => ({ ...current, [language]: code }))} />
        <p className="ua-source-note">Run your own implementation in the Contest sandbox. Output is not automatically graded and does not change the recorded visualization. Python and JavaScript are the available execution languages.</p>
      </AnimationFocus>
    </section>
  );
}

function PracticeSession({ language, code, onChange }: {
  language: PracticeLanguage; code: string; onChange: (code: string) => void;
}) {
  const sandbox = useSandbox(language);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState(false);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setOutput('');
    setFailed(false);
    try {
      if (sandbox.status !== 'ready') await sandbox.init();
      const result = await sandbox.run(code, { timeoutMs: 10_000 });
      setFailed(!result.ok || result.timedOut);
      setOutput([result.stdout, result.stderr, result.error && !result.stderr.includes(result.error) ? result.error : ''].filter(Boolean).join('\n') || (result.ok ? 'Completed with no output.' : 'Execution failed.'));
    } catch (error) {
      setFailed(true);
      setOutput(error instanceof Error ? error.message : String(error));
    } finally {
      setRunning(false);
    }
  };

  return <>
    <div className="ua-code-viewport"><CodeEditor value={code} onChange={onChange} language={language} dark minHeight="20rem" /></div>
    <div className="p-4 space-y-3 border-t border-border">
      <div className="flex items-center flex-wrap gap-3">
        <button type="button" className="btn-primary text-sm" disabled={running} onClick={() => void run()}>
          <Play size={16} /> {running ? 'Running…' : 'Run code'}
        </button>
        <span role="status" className="text-xs text-text-secondary">
          {sandbox.status === 'installing' || sandbox.status === 'loading'
            ? `Preparing runtime… ${Math.round(sandbox.progress * 100)}%` : running ? 'Executing…' : '10-second execution limit'}
        </span>
      </div>
      {sandbox.error && <p role="alert" className="text-sm text-danger">{sandbox.error} Try running again to retry.</p>}
      <h3 className="text-sm font-semibold">Output</h3>
      <pre aria-label="Practice output" aria-live="polite" className={`whitespace-pre-wrap break-words max-h-56 overflow-auto text-sm font-mono ${failed ? 'text-danger' : 'text-text-primary'}`}>
        {output || 'Run your code to see output.'}
      </pre>
    </div>
  </>;
}
