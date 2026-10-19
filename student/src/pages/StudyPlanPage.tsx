import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, ChevronLeft, ChevronRight, Settings2, RefreshCw, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { NoteReader } from '../components/notes/NoteReader';
import { studyPlanAPI, type StudyPreferences, type StudyCatalog, type StudyTask } from '../api/studyPlan';
import './study-plan.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const GOALS = [['PROJECTS', 'Build practical projects'], ['INTERVIEWS', 'Prepare for coding interviews'], ['FUNDAMENTALS', 'Understand computer science fundamentals'], ['CAREER', 'Prepare for a developer career']];
const toggle = <T,>(values: T[], item: T) => values.includes(item) ? values.filter(v => v !== item) : [...values, item];
const errorMessage = (error: unknown) => (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not update your study plan. Please try again.';
function shift(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10);
}
function monday(date: string) { return shift(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7)); }
function dateLabel(date: string) { return new Date(`${date}T12:00:00Z`).toLocaleDateString(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', weekday: 'short' }); }

function Setup({ catalog, initial, busy, onSave, onCancel }: {
  catalog: StudyCatalog; initial?: StudyPreferences; busy: boolean;
  onSave: (p: StudyPreferences) => void; onCancel?: () => void;
}) {
  const [p, setP] = useState<StudyPreferences>(() => initial ? structuredClone(initial) : {
    domainIds: [], goal: '', skillLevel: '', dailyMinutes: 30, studyDays: [1, 2, 3, 4, 5],
    courseMode: 'RECOMMEND', courseIds: [], timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  });
  const [error, setError] = useState('');
  const eligible = catalog.courses.filter(c => c.domainIds.some(id => p.domainIds.includes(id)));
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!p.domainIds.length) return setError('Choose at least one domain interest.');
    if (!p.goal || !p.skillLevel) return setError('Choose your learning goal and current skill level.');
    if (!p.studyDays.length) return setError('Choose at least one available study day.');
    if (p.courseMode === 'MANUAL' && !p.courseIds.length) return setError('Select at least one course.');
    setError(''); onSave(p);
  };
  return <form className="study-setup ua-card" onSubmit={submit} aria-label="Study Plan preferences">
    <div><h2>{initial ? 'Edit study preferences' : 'Create your personalized study plan'}</h2>
      <p className="text-text-secondary">Choose what to learn and when. Learn once, then revise after 1, 3, 5 and 7 days.</p></div>
    <fieldset disabled={busy}><legend>Domain interests</legend>
      {!catalog.domains.length && <p>No supported domains are available yet. <Link to="/explore">Explore the catalog</Link> or try again later.</p>}
      <div className="study-choices">{catalog.domains.map(d => <label key={d.id}><input type="checkbox" checked={p.domainIds.includes(d.id)} onChange={() => {
        const domainIds = toggle(p.domainIds, d.id);
        setP({ ...p, domainIds, courseIds: p.courseIds.filter(id => catalog.courses.some(c => c.id === id && c.domainIds.some(x => domainIds.includes(x)))) });
      }} />{d.name}</label>)}</div>
    </fieldset>
    <div className="study-form-grid">
      <label className="ua-label">Primary learning goal<select className="ua-select" value={p.goal} disabled={busy} onChange={e => setP({ ...p, goal: e.target.value })}><option value="">Choose your goal</option>{GOALS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
      <label className="ua-label">Current skill level<select className="ua-select" value={p.skillLevel} disabled={busy} onChange={e => setP({ ...p, skillLevel: e.target.value })}><option value="">Choose your level</option>{['Beginner', 'Intermediate', 'Advanced'].map(level => <option key={level} value={level.toUpperCase()}>{level}</option>)}</select></label>
      <label className="ua-label">Available study time<select className="ua-select" value={p.dailyMinutes} disabled={busy} onChange={e => setP({ ...p, dailyMinutes: Number(e.target.value) })}>{[15, 30, 45, 60, 90].map(n => <option key={n} value={n}>{n === 90 ? '90 minutes or more' : `${n} minutes`} per day</option>)}</select></label>
      <label className="ua-label">Course selection<select className="ua-select" value={p.courseMode} disabled={busy} onChange={e => setP({ ...p, courseMode: e.target.value })}><option value="RECOMMEND">Recommend courses based on interests</option><option value="MANUAL">Select specific courses</option><option value="ALL">Include all relevant available courses</option></select></label>
    </div>
    <fieldset disabled={busy}><legend>Weekly availability</legend><div className="study-choices">{DAYS.map((day, i) => <label key={day}><input type="checkbox" checked={p.studyDays.includes(i + 1)} onChange={() => setP({ ...p, studyDays: toggle(p.studyDays, i + 1) })} />{day}</label>)}</div></fieldset>
    {p.courseMode === 'MANUAL' && <fieldset disabled={busy}><legend>Choose courses</legend><div className="study-course-options">{eligible.map(c => <label key={c.id}><input type="checkbox" checked={p.courseIds.includes(c.id)} onChange={() => setP({ ...p, courseIds: toggle(p.courseIds, c.id) })} /><span><strong>{c.name}</strong><small>{c.description}</small><small>{c.level.toLowerCase()} · {c.topics} topics</small></span></label>)}{!eligible.length && <p>No courses match these interests. Choose another domain.</p>}</div></fieldset>}
    <p className="text-sm text-text-secondary">Calendar time zone: {p.timeZone}. Revisions on unavailable or full days move forward. Long topics are budgeted as a focused study session; 90+ uses a 90-minute daily budget.</p>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <div className="study-actions"><button className="ua-btn ua-btn--primary" disabled={busy || !catalog.domains.length}>{busy ? 'Saving and scheduling…' : initial ? 'Save preferences & update plan' : 'Generate My Study Plan'}</button>{onCancel && <button type="button" className="ua-btn ua-btn--secondary" disabled={busy} onClick={onCancel}>Cancel</button>}</div>
  </form>;
}

export function StudyPlanPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [week, setWeek] = useState<string>();
  const [noteId, setNoteId] = useState<string | null>(null);
  const queryKey = ['study-plan', user?.id, week];
  const dashboard = useQuery({ queryKey, queryFn: () => studyPlanAPI.dashboard(week) });
  const catalog = useQuery({ queryKey: ['study-plan-catalog'], queryFn: studyPlanAPI.catalog });
  const data = dashboard.data;
  const refresh = () => qc.invalidateQueries({ queryKey: ['study-plan', user?.id] });
  const save = useMutation({ mutationFn: async (p: StudyPreferences) => {
    await studyPlanAPI.save(p, !!data?.generationVersion);
    await studyPlanAPI.generate();
  }, onSuccess: async () => { await refresh(); setEditing(false); toast.success('Your study plan is ready'); }, onError: e => toast.error(errorMessage(e)) });
  const generate = useMutation({ mutationFn: () => studyPlanAPI.generate(true), onSuccess: async () => { await refresh(); toast.success('Future tasks rescheduled; completed history preserved'); }, onError: e => toast.error(errorMessage(e)) });
  const complete = useMutation({ mutationFn: studyPlanAPI.complete, onSuccess: async () => { await refresh(); toast.success('Task completed'); }, onError: e => toast.error(errorMessage(e)) });
  const busy = save.isPending || generate.isPending || complete.isPending;
  if (dashboard.isLoading || catalog.isLoading) return <div className="py-24 flex justify-center" aria-label="Loading study plan"><Spinner /></div>;
  if (dashboard.isError || catalog.isError || !data || !catalog.data) return <section className="ua-card study-section"><h1>Study Plan</h1><p role="alert">Unable to load your study plan. Your saved progress has not changed.</p><button className="ua-btn ua-btn--secondary" onClick={() => { void dashboard.refetch(); void catalog.refetch(); }}>Try again</button></section>;
  const start = week ?? monday(data.today);
  const savePreferences = (p: StudyPreferences) => {
    if (data.generationVersion > 0 && !window.confirm('Update preferences and reschedule incomplete tasks? Completed tasks, revision history and quiz results will be kept.')) return;
    save.mutate(p);
  };
  function taskList(list: StudyTask[], empty: string, showDate = false) {
    return list.length ? <ul className="study-task-list">{list.map(task => <li key={task.id} className={task.completedAt ? 'study-task is-complete' : 'study-task'}>
      <div className="study-task-copy"><div className="study-task-meta"><span>{task.taskType}{task.revisionInterval > 0 ? ` · Day ${task.revisionInterval}` : ''}</span><span>{task.estimatedMinutes} min</span>{showDate && <time dateTime={task.scheduledDate}>{dateLabel(task.scheduledDate)}</time>}</div>
        <h3>{task.title}</h3><p>{task.courseName}</p><p>{task.activity}</p>
        {!task.available && <p className="text-danger">This lesson is no longer available. Edit preferences to refresh your plan.</p>}</div>
      <div className="study-actions">{task.available && (task.noteId && task.taskType !== 'Test' ? <button className="ua-btn ua-btn--secondary ua-btn--sm" onClick={() => setNoteId(task.noteId!)}>Start activity</button> : task.href && <Link className="ua-btn ua-btn--secondary ua-btn--sm" to={task.href}>Start activity</Link>)}
        {task.completedAt ? <span className="study-done"><Check size={16} aria-hidden="true" /> Completed</span> : <button className="ua-btn ua-btn--primary ua-btn--sm" disabled={busy || !task.available || task.scheduledDate > data!.today} onClick={() => complete.mutate(task.id)} aria-label={`Complete ${task.taskType.toLowerCase()}: ${task.title}`}>Mark complete</button>}</div>
    </li>)}</ul> : <p className="study-empty">{empty}</p>;
  }
  return <div className="study-plan">
    <header className="study-header"><div><h1><CalendarDays size={26} aria-hidden="true" /> Study Plan</h1><p>{user?.name ? `${user.name}, make room for steady progress.` : 'Make room for steady progress.'} Learn, recall, practice, repeat.</p></div>
      {!!data.generationVersion && !editing && <div className="study-actions"><button className="ua-btn ua-btn--secondary" onClick={() => setEditing(true)} disabled={busy}><Settings2 size={16} />Edit Preferences</button><button className="ua-btn ua-btn--secondary" disabled={busy} onClick={() => { if (window.confirm('Reschedule incomplete learning and revision tasks from today? All completed history and quiz results will be kept.')) generate.mutate(); }}><RefreshCw size={16} />Regenerate</button></div>}</header>
    {editing || !data.generationVersion ? <Setup catalog={catalog.data} initial={data.preferences} busy={busy} onSave={savePreferences} onCancel={data.generationVersion ? () => setEditing(false) : undefined} /> : <>
      <div className="study-summary">{[[data.summary.completed, 'Tasks completed'], [data.summary.remaining, 'Tasks remaining'], [`${data.summary.revisionCompletionRate}%`, 'Revisions completed'], [data.summary.activeTopics, 'Topics in your plan']].map(([value, label]) => <div className="ua-card" key={label}><strong>{value}</strong><span>{label}</span></div>)}</div>
      {!data.summary.remaining && <section className="ua-card study-section"><h2>{data.summary.completed ? 'You have completed your plan!' : 'No lessons ready to schedule'}</h2><p>{data.summary.completed ? 'Your completed learning and revision history is saved. Add more courses when you are ready.' : 'Matching courses may have no published lessons, or you may already have mastered their topics. Choose other interests or courses.'}</p><button className="ua-btn ua-btn--secondary" onClick={() => setEditing(true)}>Choose courses</button></section>}
      {data.overdueTasks.length > 0 && <section className="ua-card study-section"><h2>Missed tasks</h2><p className="text-text-secondary">Catch up here, or regenerate to spread incomplete tasks across available days. Late learning moves its revisions forward.</p>{taskList(data.overdueTasks, '', true)}</section>}
      <section className="ua-card study-section"><h2>Today's learning tasks</h2><p className="text-text-secondary">{dateLabel(data.today)} · {data.preferences?.timeZone}</p>{taskList(data.todayTasks, 'No tasks due today. Enjoy your break or check the weekly schedule.')}{data.todayTasks.length > 0 && data.todayTasks.every(t => t.completedAt) && <p className="study-done">All tasks for today are complete.</p>}</section>
      <section className="ua-card study-section"><div className="study-section-header"><h2>Weekly schedule</h2><div className="study-actions"><button className="ua-btn ua-btn--secondary ua-btn--sm" aria-label="Previous week" disabled={busy} onClick={() => setWeek(shift(start, -7))}><ChevronLeft size={16} /></button><button className="ua-btn ua-btn--secondary ua-btn--sm" onClick={() => setWeek(undefined)}>This week</button><button className="ua-btn ua-btn--secondary ua-btn--sm" aria-label="Next week" disabled={busy} onClick={() => setWeek(shift(start, 7))}><ChevronRight size={16} /></button></div></div>
        <p>{dateLabel(start)} – {dateLabel(shift(start, 6))}</p><div className="study-week">{DAYS.map((day, i) => { const date = shift(start, i); return <div className="study-day" key={day}><h3>{dateLabel(date)}</h3>{taskList(data.weekTasks.filter(t => t.scheduledDate === date), 'No tasks')}</div>; })}</div></section>
      <section className="ua-card study-section"><h2>Upcoming revisions</h2>{taskList(data.upcomingRevisions, 'No upcoming revisions. Complete a learning task or add another course.', true)}</section>
    </>}
    {noteId && <NoteReader noteId={noteId} onClose={() => setNoteId(null)} />}
  </div>;
}
