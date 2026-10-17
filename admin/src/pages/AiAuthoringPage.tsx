import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { authoringAPI, type AuthoringJob, type AuthoringKind } from '../api/authoring';
import { animationSceneAPI, courseAPI } from '../api/endpoints';
import { AnimationPreview } from '../components/animations/AnimationPreview';
import type { AnimationTrace } from '../types/animation';

interface Course { id: string; name: string; }
interface Simulator { kind: string; displayName: string; }
const inputClass = 'w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500';
const buttonClass = 'rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed';

function errorMessage(error: unknown) {
  if (isAxiosError(error)) return error.response?.data?.error ?? 'Request failed. Check your connection and try again.';
  return error instanceof Error ? error.message : 'Something went wrong.';
}

export function AiAuthoringPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<AuthoringKind>('TOPICS');
  const [courseId, setCourseId] = useState('');
  const [count, setCount] = useState(5);
  const [prompt, setPrompt] = useState('');
  const [job, setJob] = useState<AuthoringJob | null>(null);
  const [editor, setEditor] = useState('');
  const [validatedEditor, setValidatedEditor] = useState<string | null>(null);
  const [preview, setPreview] = useState<AnimationTrace | null>(null);
  const [approved, setApproved] = useState(false);
  const [busy, setBusy] = useState<'generate' | 'review' | 'save' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const status = useQuery({ queryKey: ['ai-authoring-status'], queryFn: authoringAPI.status });
  const history = useQuery({ queryKey: ['ai-authoring-jobs'], queryFn: authoringAPI.history });
  const courses = useQuery({ queryKey: ['courses'], queryFn: async () => (await courseAPI.getAll()).data.data as Course[] });
  const simulators = useQuery({ queryKey: ['ai-authoring-simulators'], queryFn: async () => (await animationSceneAPI.simulators()).data.data as Simulator[] });

  function selectJob(next: AuthoringJob) {
    setJob(next);
    setEditor(JSON.stringify(next.proposal, null, 2));
    setValidatedEditor(null);
    setPreview(null);
    setApproved(false);
    setError('');
    setNotice('');
  }
  function edit(value: string) {
    setEditor(value);
    setValidatedEditor(null);
    setApproved(false);
    setPreview(null);
    setNotice('');
  }
  async function generate() {
    setBusy('generate'); setError(''); setNotice('');
    try {
      const next = await authoringAPI.generate({ kind, prompt: prompt.trim(), count, courseId: kind === 'TOPICS' ? courseId : undefined });
      selectJob(next);
      setNotice('Draft generated. Review the JSON, then validate it before approval.');
      await qc.invalidateQueries({ queryKey: ['ai-authoring-jobs'] });
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(null); }
  }
  async function review() {
    if (!job) return;
    setBusy('review'); setError(''); setNotice('');
    try {
      let proposal: unknown;
      try { proposal = JSON.parse(editor); }
      catch { throw new Error('Invalid JSON. Fix the proposal before validating.'); }
      const result = await authoringAPI.review(job.id, proposal);
      const formatted = JSON.stringify(result.job.proposal, null, 2);
      setJob(result.job); setEditor(formatted); setValidatedEditor(formatted);
      setPreview(result.preview); setApproved(false);
      setNotice('Validated and draft saved. Check teaching accuracy before approving.');
      await qc.invalidateQueries({ queryKey: ['ai-authoring-jobs'] });
    } catch (err) { setValidatedEditor(null); setPreview(null); setApproved(false); setError(errorMessage(err)); }
    finally { setBusy(null); }
  }
  async function save() {
    if (!job || !approved || validatedEditor !== editor) return;
    setBusy('save'); setError(''); setNotice('');
    try {
      const result = await authoringAPI.save(job.id);
      setJob(result); setApproved(false);
      setNotice(result.kind === 'TOPICS' ? 'Topics created successfully in the selected course.' : 'Animation saved unpublished. Publish it separately in Canvas Animations.');
      await qc.invalidateQueries();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(null); }
  }
  const saved = job?.status === 'SAVED';
  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-2xl font-bold text-white"><Sparkles className="text-violet-400" />AI Content Assistant</h1>
        <p className="mt-2 text-sm text-slate-400">Generate → edit → validate and preview → approve. The AI cannot publish or overwrite content.</p>
      </header>
      {status.isLoading && <p className="text-sm text-slate-400">Checking AI configuration…</p>}
      {status.isError && <p role="alert" className="text-rose-300">Could not load AI status. <button className="underline" onClick={() => void status.refetch()}>Retry</button></p>}
      {status.data && !status.data.configured && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">AI generation is not configured. Set <code>AI_API_KEY</code> and optionally <code>AI_MODEL</code> in the backend environment, then restart the backend. Never put the key in the admin frontend. Existing drafts can still be reviewed.</div>}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-6 min-w-0">
          <section aria-label="Generate content" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm text-slate-300"><span>Content type</span><select className={inputClass} value={kind} disabled={!!busy} onChange={e => setKind(e.target.value as AuthoringKind)}><option value="TOPICS">Course topics</option><option value="ANIMATION">Canvas animation</option></select></label>
              {kind === 'TOPICS' && <label className="space-y-2 text-sm text-slate-300"><span>Course</span><select className={inputClass} value={courseId} disabled={!!busy} onChange={e => setCourseId(e.target.value)}><option value="">Choose a course</option>{courses.data?.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>}
            </div>
            {kind === 'TOPICS' && <>
              {courses.isError && <p role="alert" className="text-sm text-rose-300">Could not load courses. <button className="underline" onClick={() => void courses.refetch()}>Retry</button></p>}
              <label className="block space-y-2 text-sm text-slate-300"><span>Number of topics (1–12)</span><input className={inputClass} type="number" min={1} max={12} value={count} disabled={!!busy} onChange={e => setCount(Number(e.target.value))} /></label>
              <p className="text-xs text-amber-200">Topics have no unpublished state: approval creates live course topics. Existing topics are never overwritten.</p>
            </>}
            {kind === 'ANIMATION' && <div className="text-xs text-slate-400 space-y-1"><p>This version uses supported simulators only; it does not invent arbitrary animation traces.</p><p>Available: {simulators.data?.map(s => s.displayName).join(' · ') || 'Loading simulator catalog…'}</p>{simulators.isError && <p role="alert" className="text-rose-300">Could not load simulator catalog.</p>}</div>}
            <label className="block space-y-2 text-sm text-slate-300"><span>What should the AI create?</span><textarea className={inputClass} rows={4} maxLength={3000} value={prompt} disabled={!!busy} onChange={e => setPrompt(e.target.value)} placeholder={kind === 'TOPICS' ? 'Create a beginner learning path covering arrays, indexing, traversal and common mistakes.' : 'Teach Two Sum with a small array and explain complement lookups.'} /></label>
            <button className={buttonClass} disabled={!!busy || !status.data?.configured || !prompt.trim() || !Number.isInteger(count) || count < 1 || count > 12 || (kind === 'TOPICS' && !courseId)} onClick={() => void generate()}>{busy === 'generate' ? 'Generating draft…' : 'Generate draft'}</button>
          </section>
          {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}
          {notice && <div role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">{notice}</div>}
          {job && <section aria-label="Review proposal" className="rounded-2xl border border-white/10 p-5 space-y-4">
            <h2 className="text-lg font-semibold text-white">{saved ? 'Saved content' : 'Review & edit proposal'} <span className="text-xs text-violet-300">{job.kind} · {job.status}</span></h2>
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{job.prompt}</p>
            {job.courseId && <p className="text-xs text-slate-400">Target course: {courses.data?.find(c => c.id === job.courseId)?.name ?? job.courseId}</p>}
            <label className="block space-y-2 text-sm text-slate-300"><span>Proposal JSON</span><textarea spellCheck={false} className={`${inputClass} font-mono text-xs`} rows={18} value={editor} disabled={!!busy || saved} onChange={e => edit(e.target.value)} /></label>
            {!saved && <>
              <button className={buttonClass} disabled={!!busy} onClick={() => void review()}>{busy === 'review' ? 'Validating…' : 'Validate & preview draft'}</button>
              {preview && <AnimationPreview key={validatedEditor} trace={preview} />}
              <label className="flex gap-3 items-start text-sm text-slate-300"><input type="checkbox" className="mt-1" checked={approved} disabled={!!busy || validatedEditor !== editor} onChange={e => setApproved(e.target.checked)} /><span>I reviewed the content for correctness. {job.kind === 'TOPICS' ? 'I approve creating these live topics in the selected course.' : 'I approve saving this animation as an unpublished draft.'}</span></label>
              <button className={buttonClass} disabled={!!busy || !approved || validatedEditor !== editor} onClick={() => void save()}>{busy === 'save' ? 'Saving approved content…' : job.kind === 'TOPICS' ? 'Approve & create topics' : 'Approve & save unpublished animation'}</button>
            </>}
            {saved && <>
              <Link className="inline-block text-sm text-violet-300 underline" to={job.kind === 'TOPICS' ? '/courses' : '/animations'}>Open {job.kind === 'TOPICS' ? 'Courses' : 'Canvas Animations'}</Link>
              <details className="text-sm text-slate-400"><summary>Created records</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(job.result, null, 2)}</pre></details>
            </>}
          </section>}
        </div>
        <aside className="space-y-3">
          <h2 className="text-sm font-semibold text-white">Recent proposals</h2>
          <p className="text-xs text-slate-500">Drafts are stored on the server. Saving is atomic; retrying the same job does not create duplicates.</p>
          {history.isLoading && <p className="text-sm text-slate-400">Loading history…</p>}
          {history.isError && <p role="alert" className="text-sm text-rose-300">History unavailable. <button className="underline" onClick={() => void history.refetch()}>Retry</button></p>}
          {history.data?.length === 0 && <p className="text-sm text-slate-500">No proposals yet.</p>}
          {history.data?.map(item => <button key={item.id} disabled={!!busy} onClick={() => { if (job?.status === 'DRAFT' && editor !== JSON.stringify(job.proposal, null, 2) && !window.confirm('Discard unsaved edits and open this proposal?')) return; selectJob(item); }} className={`w-full text-left rounded-xl border p-3 disabled:opacity-40 ${job?.id === item.id ? 'border-violet-500 bg-violet-500/10' : 'border-white/10 hover:bg-white/5'}`}><span className="block text-xs text-violet-300">{item.kind} · {item.status}</span><span className="mt-1 block text-sm text-slate-300 line-clamp-2">{item.prompt}</span><time className="mt-2 block text-xs text-slate-500">{new Date(item.createdAt).toLocaleString()}</time></button>)}
        </aside>
      </div>
    </div>
  );
}
