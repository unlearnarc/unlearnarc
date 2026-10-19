import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { dailyQuizAPI } from '../api/dailyQuiz';
import type { DailySession, DailyQuestion } from '../api/dailyQuiz';
import { RichTextContent } from '../components/ui/RichTextContent';
import './daily-quiz.css';

function Question({ question: q, busy, submit }: { question: DailyQuestion; busy: boolean; submit: (ids: string[]) => void }) {
  const [selected, setSelected] = useState<string[]>(q.selectedAnswerIds);
  const answered = q.correct !== undefined && q.correct !== null;
  return <section className="daily-panel" aria-labelledby="daily-question">
    <p>{q.topicName} · {q.difficulty.toLowerCase()}</p><p className="text-text-secondary">{q.selectionExplanation}</p>
    <h2 id="daily-question"><RichTextContent html={q.text} /></h2>
    <form onSubmit={e => { e.preventDefault(); submit(selected); }}>
      <fieldset disabled={busy || answered}><legend className="sr-only">{q.questionType === 'MCQ' ? 'Choose one answer' : 'Choose all correct answers'}</legend>
        {q.options.map(o => <label className="daily-option" key={o.id}>
          <input type={q.questionType === 'MCQ' ? 'radio' : 'checkbox'} name={q.id} checked={selected.includes(o.id)} onChange={() => setSelected(q.questionType === 'MCQ' ? [o.id] : selected.includes(o.id) ? selected.filter(id => id !== o.id) : [...selected, o.id])} />
          <RichTextContent html={o.text} />
        </label>)}
      </fieldset>
      {!answered && <button className="btn-primary" disabled={busy || !selected.length} type="submit">{busy ? 'Submitting…' : 'Submit answer'}</button>}
    </form>
    {answered && <div className="daily-feedback" role="status"><strong>{q.correct ? 'Correct' : 'Not quite — review the reasoning below.'}</strong>
      {q.explanation ? <RichTextContent html={q.explanation} /> : <p>An explanation is not available for this question yet.</p>}
      <p>Correct {q.correctAnswerIds?.length === 1 ? 'answer' : 'answers'}:</p>{q.options.filter(o => q.correctAnswerIds?.includes(o.id)).map(o => <RichTextContent key={o.id} html={o.text} />)}
      {q.href && <Link to={q.href}>Revisit the lesson</Link>}
    </div>}
  </section>;
}

export function DailyQuizPage() {
  const qc = useQueryClient();
  const [index, setIndex] = useState(0);
  const [active, setActive] = useState(false);
  const [reviewId, setReviewId] = useState<string>();
  const [page, setPage] = useState(0);
  const today = useQuery({ queryKey: ['daily-quiz', 'today'], queryFn: dailyQuizAPI.today });
  const review = useQuery({ queryKey: ['daily-quiz', 'session', reviewId], queryFn: () => dailyQuizAPI.get(reviewId!), enabled: !!reviewId });
  const insights = useQuery({ queryKey: ['daily-insights'], queryFn: dailyQuizAPI.insights });
  const history = useQuery({ queryKey: ['daily-history', page], queryFn: () => dailyQuizAPI.history(page) });
  const s = reviewId ? review.data : today.data;
  const mutation = useMutation({ mutationFn: (action: () => Promise<DailySession>) => action(), onSuccess: result => {
    qc.setQueryData(reviewId ? ['daily-quiz', 'session', reviewId] : ['daily-quiz', 'today'], result);
    for (const key of ['daily-insights', 'daily-history', 'streak', 'me', 'user']) void qc.invalidateQueries({ queryKey: [key] });
  } });
  const run = (action: () => Promise<DailySession>) => mutation.mutate(action);
  const q = s?.questions[index];
  const answered = s?.questions.filter(q => q.correct !== undefined && q.correct !== null).length ?? 0;
  const allAnswered = !!s?.questions.length && answered === s.questions.length;
  const completed = s?.status === 'COMPLETED';
  return <main className="daily-page">
    <header><h1>Daily Quiz</h1><p>Short, focused retrieval practice from your learning history. Initial diagnostics collect evidence, not mastery claims.</p></header>
    {(today.isPending || (reviewId && review.isPending)) && <div className="daily-panel animate-pulse" role="status">Loading your daily quiz…</div>}
    {(today.isError || review.isError) && <div role="alert" className="daily-panel">We couldn't load this quiz. <button onClick={() => { void today.refetch(); if (reviewId) void review.refetch(); }}>Retry</button></div>}
    {mutation.isError && <p role="alert">{mutation.error instanceof Error ? mutation.error.message : 'The request failed. Please retry.'}</p>}
    {reviewId && <button className="btn-secondary" onClick={() => { setReviewId(undefined); setActive(false); setIndex(0); }}>Back to today</button>}
    {today.isSuccess && !s && !reviewId && <section className="daily-panel"><h2>Your practice for today</h2><p>Up to 10 relevant questions, usually 10–15 minutes. The available question bank may result in a shorter quiz.</p><button className="btn-primary" disabled={mutation.isPending} onClick={() => run(dailyQuizAPI.generate)}>Prepare today's quiz</button></section>}
    {s && <>
      <section className="daily-panel"><h2>{completed ? 'Quiz results' : `${s.learningDate} · ${s.status === 'IN_PROGRESS' ? 'In progress' : 'Ready to practice'}`}</h2>
        <p>{s.questions.length} questions · {answered} answered · Learning day: {s.timeZone}</p>
        {!!s.questions.length && <><p>Topics: {[...new Set(s.questions.map(q => q.topicName))].join(', ')}</p><p>Difficulty: {['EASY', 'MEDIUM', 'HARD'].map(d => `${s.questions.filter(q => q.difficulty === d).length} ${d.toLowerCase()}`).join(' · ')}</p></>}
        {s.notices.map((n, i) => <p key={i}>{n}</p>)}
        {!s.questions.length && <Link to="/explore">Explore courses</Link>}
        {completed && <><p>{s.correctCount} correct · {s.incorrectCount} incorrect</p>{[...new Set(s.questions.map(q => q.topicId))].map(topic => {
          const qs = s.questions.filter(q => q.topicId === topic); return <p key={topic}>{qs[0].topicName}: {qs.filter(q => q.correct).length}/{qs.length} correct {qs.some(q => !q.correct) && qs[0].href && <Link to={qs[0].href}>Revisit lesson</Link>}</p>;
        })}</>}
        {!!s.questions.length && !active && <button className="btn-primary" disabled={mutation.isPending} onClick={() => { setIndex(Math.max(0, s.questions.findIndex(q => q.correct === undefined || q.correct === null))); setActive(true); if (!completed) run(() => dailyQuizAPI.start(s.id)); }}>{completed ? 'Review questions' : s.startedAt ? 'Resume quiz' : 'Start quiz'}</button>}
      </section>
      {active && q && <>
        <p aria-live="polite">Question {index + 1} of {s.questions.length}</p><progress aria-label="Quiz progress" value={answered} max={s.questions.length} />
        <Question key={q.id} question={q} busy={mutation.isPending} submit={ids => run(() => dailyQuizAPI.answer(s.id, q.id, ids))} />
        <nav className="daily-actions" aria-label="Question navigation"><button className="btn-secondary" disabled={!index} onClick={() => setIndex(index - 1)}>Previous</button><button className="btn-secondary" disabled={index >= s.questions.length - 1} onClick={() => setIndex(index + 1)}>Next</button>
          {allAnswered && !completed && <button className="btn-primary" disabled={mutation.isPending} onClick={() => run(() => dailyQuizAPI.complete(s.id))}>Complete quiz</button>}
        </nav>
      </>}
    </>}
    <section className="daily-panel"><h2>Learning insights and revision</h2>
      {insights.isPending && <p role="status">Loading learning evidence…</p>}
      {insights.isError && <p role="alert">Insights are unavailable. <button onClick={() => void insights.refetch()}>Retry</button></p>}
      {insights.data?.length === 0 && <p>Explore a course to start building your learning profile.</p>}
      {insights.data?.map(i => <article key={i.topicId}><h3>{i.name}</h3><p>{i.recommendation} {i.evidence.improving && 'Your latest answer improved on an earlier mistake.'}</p><p>{i.evidence.distinctQuestions} distinct questions · {i.evidence.confidence.toLowerCase()} evidence confidence{i.evidence.nextReview && ` · Recommended review: ${i.evidence.nextReview}`}</p><Link to={i.href}>Open lesson</Link></article>)}
    </section>
    <section className="daily-panel"><h2>Previous sessions</h2>{history.isPending && <p role="status">Loading history…</p>}{history.isError && <p role="alert">History is unavailable. <button onClick={() => void history.refetch()}>Retry</button></p>}
      {history.data?.content.map(h => <button className="daily-history" key={h.id} onClick={() => { setReviewId(h.id); setActive(false); setIndex(0); }}>{h.learningDate} · {h.status.toLowerCase()} · {h.questions.length} questions</button>)}
      {history.data?.content.length === 0 && <p>No sessions yet.</p>}
      <div className="daily-actions"><button disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</button><button disabled={!history.data || history.data.last} onClick={() => setPage(page + 1)}>Older</button></div>
    </section>
  </main>;
}
