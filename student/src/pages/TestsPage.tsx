import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainAPI, courseAPI, topicAPI, poolAPI, testAPI } from '../api/endpoints';
import { Badge, ProgressBar, QuizBackground, QuizQuestionCard, Spinner } from '../components/ui';
import { InsightsView } from '../components/insights/InsightsView';
import { useFullScreen } from '../components/layout/AppLayout';
import { useMascot } from '../components/mascot';
import { formatDateTime } from '../i18n/format';
import type {
  TestSession, TestQuestion, TestResultResponse, Domain, Course, Topic, QuestionPool,
  TestAttemptSummary, TestAttemptDetail, Page,
} from '../types';
import {
  Trophy, CheckCircle,
  XCircle, ChevronRight, ChevronLeft,
  RotateCcw, ArrowRight, BookOpen, Globe, Layers, Timer,
  History, AlertTriangle, Sparkles,
} from 'lucide-react';
import clsx from 'clsx';

// ── Scope Selector ───────────────────────────────────────────────────────────
type ScopeType = 'DOMAIN' | 'COURSE' | 'TOPIC';

interface ScopeConfig {
  scopeType: ScopeType;
  entityId: string;
  poolId?: string;
}

const ScopeSelector: React.FC<{
  onStart: (cfg: ScopeConfig) => void;
  onViewHistory: () => void;
}> = ({ onStart, onViewHistory }) => {
  const { t } = useTranslation();
  const [scope, setScope]         = useState<ScopeType>('COURSE');
  const [domainId, setDomainId]   = useState('');
  const [courseId, setCourseId]   = useState('');
  const [topicId, setTopicId]     = useState('');

  const { data: domainsRes } = useQuery({ queryKey: ['domains'],  queryFn: domainAPI.getAll });
  const { data: coursesRes } = useQuery({ queryKey: ['courses'],  queryFn: courseAPI.getAll });
  const { data: topicsRes }  = useQuery({
    queryKey: ['topics', courseId],
    queryFn:  () => topicAPI.getByCourse(courseId),
    enabled:  !!courseId && scope === 'TOPIC',
  });
  const poolQueryEnabled = (scope === 'DOMAIN' && !!domainId) || (scope === 'COURSE' && !!courseId) || (scope === 'TOPIC' && !!topicId);
  // We no longer ask the learner to pick a pool — the backend auto-selects the
  // best pool for the chosen scope/tag. We still fetch pools purely to show a
  // readiness hint ("N tests available") and gate the Start button.
  const { data: poolsRes, isFetching: poolsLoading } = useQuery({
    queryKey: ['pools', scope, domainId, courseId, topicId],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queryFn:  (): Promise<any> => {
      if (scope === 'DOMAIN' && domainId)  return poolAPI.getByDomain(domainId);
      if (scope === 'COURSE' && courseId)  return poolAPI.getByCourse(courseId);
      if (scope === 'TOPIC'  && topicId)   return poolAPI.getByTopic(topicId);
      return Promise.resolve({ data: { data: [] } });
    },
    enabled: poolQueryEnabled,
  });

  const domains: Domain[]      = domainsRes?.data?.data ?? [];
  const courses: Course[]      = coursesRes?.data?.data ?? [];
  const topics: Topic[]        = topicsRes?.data?.data  ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pools: QuestionPool[]  = (poolsRes as any)?.data?.data ?? [];

  const entityId = scope === 'DOMAIN' ? domainId : scope === 'COURSE' ? courseId : topicId;
  const canStart = !!entityId && pools.length > 0;

  const SCOPES: { type: ScopeType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'DOMAIN', icon: <Globe size={18} />,        label: t('tests.domainTest'),  desc: t('tests.domainTestDesc') },
    { type: 'COURSE', icon: <BookOpen size={18} />,     label: t('tests.courseTest'),  desc: t('tests.courseTestDesc') },
    { type: 'TOPIC',  icon: <Layers size={18} />,       label: t('tests.topicQuiz'),   desc: t('tests.topicQuizDesc') },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">
      {/* Flat header row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="mr-auto text-left">
          <h1 className="text-xl font-bold text-text-primary">{t('tests.takeATest')}</h1>
          <p className="text-xs text-text-secondary">{t('tests.subtitle')}</p>
        </div>
        <button
          onClick={onViewHistory}
          className="btn-secondary text-sm"
        >
          <History size={14} /> {t('tests.testHistory')}
        </button>
      </div>

      {/* 2-col: scope picker (left) | config (right); single col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Scope choices — vertical flat list */}
        <div className="space-y-2.5">
          {SCOPES.map(({ type, icon, label, desc }) => (
            <button
              key={type}
              onClick={() => { setScope(type); setDomainId(''); setCourseId(''); setTopicId(''); }}
              className={clsx(
                'card card--flat border rounded-[12px] p-4 w-full text-left flex items-center gap-3 transition-colors',
                scope === type ? 'border-primary-500 bg-primary-50' : 'border-border hover:border-primary-300'
              )}
            >
              <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                scope === type ? 'bg-primary-500 text-white' : 'bg-surface-soft text-text-secondary')}>
                {icon}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary">{label}</p>
                <p className="text-[11px] text-text-muted mt-0.5 leading-snug">{desc}</p>
              </div>
            </button>
          ))}
        </div>

      {/* Entity pickers */}
      <div className="card card--flat border border-border rounded-[14px] p-5 space-y-4">
        {(scope === 'DOMAIN') && (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">{t('tests.selectDomain')}</label>
            <select
              value={domainId}
              onChange={e => { setDomainId(e.target.value); }}
              className="input"
            >
              <option value="">{t('tests.chooseDomain')}</option>
              {domains.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        )}

        {(scope === 'COURSE' || scope === 'TOPIC') && (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">{t('tests.selectCourse')}</label>
            <select
              value={courseId}
              onChange={e => { setCourseId(e.target.value); setTopicId(''); }}
              className="input"
            >
              <option value="">{t('tests.chooseCourse')}</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        {scope === 'TOPIC' && courseId && (
          <div>
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider block mb-2">{t('tests.selectTopic')}</label>
            <select
              value={topicId}
              onChange={e => { setTopicId(e.target.value); }}
              className="input"
            >
              <option value="">{t('tests.chooseTopic')}</option>
              {topics.map(tp => <option key={tp.id} value={tp.id}>{tp.name}</option>)}
            </select>
          </div>
        )}

        {/* Readiness hint — the learner never picks a pool; the engine auto-selects
            the best one for the chosen scope. We just reassure them a test exists. */}
        {entityId && poolsLoading && (
          <div className="bg-surface-soft rounded-[10px] p-4 border border-border flex items-center gap-2">
            <Spinner size="sm" />
            <p className="text-xs text-text-secondary">{t('tests.checkingTests')}</p>
          </div>
        )}

        {entityId && !poolsLoading && pools.length > 0 && (
          <div className="bg-primary-50 rounded-[10px] p-4 border border-primary-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-primary-500" />
              <p className="text-xs font-semibold text-primary-500">
                {pools.length === 1
                  ? t('tests.testReady')
                  : t('tests.testsAvailable', { count: pools.length })}
              </p>
            </div>
            <p className="text-[11px] text-text-muted leading-snug">
              {t('tests.autoDrawNote')}
            </p>
          </div>
        )}

        {entityId && !poolsLoading && pools.length === 0 && (
          <div className="bg-warning-soft rounded-[10px] p-4 border border-warning/30">
            <p className="text-xs text-warning font-medium">
              {t('tests.noTests')}
            </p>
          </div>
        )}

        <button
          disabled={!canStart}
          onClick={() => onStart({ scopeType: scope, entityId })}
          className="btn-primary w-full justify-center py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {t('tests.startTest')} <ArrowRight size={16} className="ua-flip-rtl" />
        </button>
      </div>
      </div>
    </div>
  );
};

// ── Quiz Interface ───────────────────────────────────────────────────────────
const QuizInterface: React.FC<{
  session: TestSession;
  onSubmit: (answers: { questionId: string; selectedAnswerIds: string[] }[], timeTakenSeconds: number) => void;
  isSubmitting: boolean;
}> = ({ session, onSubmit, isSubmitting }) => {
  useFullScreen();
  const { t } = useTranslation();
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [timeLeft, setTimeLeft] = useState(
    session.timeLimitMinutes ? session.timeLimitMinutes * 60 : null
  );
  // Wall-clock start so we can report how long the attempt actually took,
  // independent of whether a countdown limit is configured.
  const startedAtRef = React.useRef(Date.now());

  // Timer
  useEffect(() => {
    if (!timeLeft) return;
    if (timeLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setInterval(() => setTimeLeft(v => (v ?? 1) - 1), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  const q: TestQuestion = session.questions[current];
  const selected = answers[q.id] ?? [];
  const answered = Object.keys(answers).length;
  const progress = ((current + 1) / session.questions.length) * 100;

  const toggleAnswer = (answerId: string) => {
    if (q.questionType === 'MCQ') {
      setAnswers(prev => ({ ...prev, [q.id]: [answerId] }));
    } else {
      setAnswers(prev => {
        const cur = prev[q.id] ?? [];
        return {
          ...prev,
          [q.id]: cur.includes(answerId) ? cur.filter(a => a !== answerId) : [...cur, answerId],
        };
      });
    }
  };

  const handleSubmit = useCallback(() => {
    const payload = session.questions.map(sq => ({
      questionId:        sq.id,
      selectedAnswerIds: answers[sq.id] ?? [],
    }));
    const timeTakenSeconds = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    onSubmit(payload, timeTakenSeconds);
  }, [session.questions, answers, onSubmit]);

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const urgentTimer = timeLeft !== null && timeLeft < 60;

  return (
    <QuizBackground>

        {/* Header bar */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-on-dark text-sm font-medium">{session.poolName}</p>
            <p className="text-text-muted text-xs mt-0.5">
              {t('tests.questionOf', { current: current + 1, total: session.totalQuestions })}
              · {t('tests.answeredCount', { count: answered })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {timeLeft !== null && (
              <div className={clsx(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-sm font-semibold',
                urgentTimer ? 'bg-danger/20 text-danger' : 'glass-card text-white'
              )}>
                <Timer size={14} />
                {fmt(timeLeft)}
              </div>
            )}
            <Badge label={session.scopeType} />
          </div>
        </div>

        {/* Progress */}
        <div>
          <ProgressBar
            value={progress}
            color={urgentTimer ? 'bg-danger' : 'bg-primary-500'}
            height="h-1"
          />
          <div className="flex justify-between text-[11px] text-text-secondary mt-1">
            <span>{t('tests.percentComplete', { percent: Math.round(progress) })}</span>
            <span>{t('tests.totalPoints', { points: session.totalPoints })}</span>
          </div>
        </div>

        {/* Question card */}
        <QuizQuestionCard
          question={q}
          selected={selected}
          onToggleAnswer={toggleAnswer}
        />

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrent(v => Math.max(0, v - 1))}
            disabled={current === 0}
            className="btn-ghost text-text-on-dark disabled:opacity-30"
          >
            <ChevronLeft size={16} className="ua-flip-rtl" /> {t('tests.previous')}
          </button>

          {/* Question dots */}
          <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-center max-w-xs">
            {session.questions.map((sq, i) => (
              <button
                key={sq.id}
                onClick={() => setCurrent(i)}
                className={clsx(
                  'w-7 h-7 rounded-md text-[10px] font-medium transition',
                  i === current
                    ? 'bg-primary-500 text-white'
                    : answers[sq.id]?.length
                    ? 'bg-white/20 text-white'
                    : 'bg-white/8 text-text-secondary hover:bg-white/15'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>

          {current < session.questions.length - 1 ? (
            <button
              onClick={() => setCurrent(v => Math.min(session.questions.length - 1, v + 1))}
              className="btn-ghost text-text-on-dark"
            >
              {t('tests.next')} <ChevronRight size={16} className="ua-flip-rtl" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? <Spinner size="sm" /> : <><CheckCircle size={15} /> {t('tests.submit')}</>}
            </button>
          )}
        </div>
    </QuizBackground>
  );
};

// ── Results View ──────────────────────────────────────────────────────────────
const ResultsView: React.FC<{
  result: TestResultResponse;
  onRetry: () => void;
  onViewHistory?: () => void;
}> = ({ result, onRetry, onViewHistory }) => {
  const { t } = useTranslation();
  const [showBreakdown, setShowBreakdown] = useState(false);
  const pct = Math.round(result.percentageScore);
  const passed = result.passed;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
      {/* Hero result */}
      <div className={clsx(
        'rounded-[20px] p-8 sm:p-10 text-center text-white relative overflow-hidden',
        passed
          ? 'bg-gradient-to-br from-success to-success'
          : 'bg-gradient-to-br from-danger to-danger'
      )}>
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-5">
            {passed
              ? <Trophy size={36} className="text-white" />
              : <XCircle size={36} className="text-white" />
            }
          </div>
          <h2 className="text-3xl font-bold mb-1">{pct}%</h2>
          <p className="text-white/80 text-lg mb-3">
            {passed ? t('tests.passed') : t('tests.notPassed')}
          </p>
          <p className="text-white/70 text-sm">
            {t('tests.pointsSummary', { earned: result.earnedPoints, total: result.totalPoints })} ·&nbsp;
            {t('tests.correctCount', { count: result.correctAnswers })} · {t('tests.wrongCount', { count: result.wrongAnswers })} · {t('tests.skippedCount', { count: result.skippedAnswers })}
          </p>
          <p className="text-white/60 text-xs mt-1">{t('tests.passMark', { percent: result.passPercentage })}</p>
        </div>
        <div className="absolute -right-12 -top-12 w-48 h-48 rounded-full bg-white/10" />
        <div className="absolute -left-8 bottom-4 w-28 h-28 rounded-full bg-white/10" />
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('tests.correct'),  value: result.correctAnswers,  color: 'bg-success-soft text-success' },
          { label: t('tests.wrong'),    value: result.wrongAnswers,    color: 'bg-danger-soft text-danger' },
          { label: t('tests.skipped'),  value: result.skippedAnswers,  color: 'bg-warning-soft text-warning' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={`text-xl font-bold ${color.split(' ')[1]}`}>{value}</p>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Score bar */}
      <div className="card p-5">
        <div className="flex justify-between text-sm font-medium text-text-primary mb-2">
          <span>{t('tests.yourScore')}</span>
          <span>{pct}%</span>
        </div>
        <ProgressBar
          value={pct}
          height="h-3"
          color={passed ? 'bg-success' : 'bg-danger'}
        />
        <div className="flex justify-between text-xs text-text-muted mt-1.5">
          <span>0%</span>
          <span className="text-warning">{t('tests.passLabel', { percent: result.passPercentage })}</span>
          <span>100%</span>
        </div>
      </div>

      {/* Breakdown toggle */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setShowBreakdown(v => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-sm font-semibold text-text-primary hover:bg-bg-soft transition"
        >
          {t('tests.reviewAnswers')}
          {showBreakdown ? <ChevronLeft size={16} className="rotate-90" /> : <ChevronRight size={16} className="rotate-90" />}
        </button>

        {showBreakdown && (
          <div className="border-t border-border divide-y divide-border">
            {result.breakdown.map((item, i) => (
              <div key={item.questionId} className="px-5 py-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                    item.isCorrect ? 'bg-success-soft' : 'bg-danger-soft'
                  }`}>
                    {item.isCorrect
                      ? <CheckCircle size={13} className="text-success" />
                      : <XCircle    size={13} className="text-danger" />
                    }
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-text-muted">Q{i + 1}</span>
                      <Badge label={item.difficulty} />
                      <span className="text-xs text-text-muted ml-auto">
                        {t('tests.ptsFraction', { earned: item.earnedPoints, total: item.points })}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary font-medium mb-2">{item.questionText}</p>

                    {/* Answers */}
                    <div className="space-y-1.5">
                      {item.answers.map(ans => {
                        const userSelected = item.selectedAnswerIds.includes(ans.id);
                        const isCorrect    = ans.isCorrect;
                        return (
                          <div
                            key={ans.id}
                            className={clsx(
                              'flex items-center gap-2 px-3 py-2 rounded-[8px] text-xs',
                              isCorrect && userSelected && 'bg-success-soft text-success',
                              isCorrect && !userSelected && 'bg-primary-50 text-primary-500',
                              !isCorrect && userSelected && 'bg-danger-soft text-danger',
                              !isCorrect && !userSelected && 'text-text-muted',
                            )}
                          >
                            {isCorrect && userSelected && <CheckCircle size={11} />}
                            {isCorrect && !userSelected && <CheckCircle size={11} />}
                            {!isCorrect && userSelected && <XCircle size={11} />}
                            {!isCorrect && !userSelected && <div className="w-2.5 h-2.5 rounded-full border border-current" />}
                            <span>{ans.answerText}</span>
                          </div>
                        );
                      })}
                    </div>

                    {item.explanation && (
                      <div className="mt-2.5 p-2.5 bg-achievement-soft rounded-[8px]">
                        <p className="text-xs text-achievement leading-relaxed">
                          💡 {item.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button onClick={onRetry} className="btn-secondary flex-1 justify-center py-3">
          <RotateCcw size={15} /> {t('tests.tryAgain')}
        </button>
        {onViewHistory && (
          <button onClick={onViewHistory} className="btn-ghost flex-1 justify-center py-3">
            <History size={15} /> {t('tests.history')}
          </button>
        )}
      </div>
    </div>
  );
};

// ── Review View (a past attempt, reconstructed from stored snapshot) ──────────
const ReviewView: React.FC<{
  attemptId: string;
  onBack: () => void;
}> = ({ attemptId, onBack }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['test-attempt', attemptId],
    queryFn:  () => testAPI.attempt(attemptId),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const detail: TestAttemptDetail | undefined = (data as any)?.data?.data;

  if (isLoading) return (
    <div className="flex justify-center py-32"><Spinner size="lg" /></div>
  );
  if (!detail) return (
    <div className="max-w-2xl mx-auto card p-10 text-center">
      <p className="text-sm text-text-secondary">{t('tests.attemptNotFound')}</p>
      <button onClick={onBack} className="btn-secondary mt-4 mx-auto">{t('tests.back')}</button>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <button onClick={onBack} className="btn-ghost text-sm text-primary-500">
        <ArrowRight size={14} className="rotate-180 ua-flip-rtl" /> {t('tests.backToHistory')}
      </button>
      <p className="text-xs text-text-muted">
        {t('tests.attemptedAt', { at: formatDateTime(detail.attemptedAt) })}
      </p>
      {/* Reuse the exact same results UI; onRetry just returns to history. */}
      <ResultsView result={detail.result} onRetry={onBack} />
    </div>
  );
};

// ── History View ──────────────────────────────────────────────────────────────
const HistoryView: React.FC<{
  onBack: () => void;
  onReview: (attemptId: string) => void;
  onInsights: () => void;
}> = ({ onBack, onReview, onInsights }) => {
  const { t } = useTranslation();
  const { data, isLoading } = useQuery({
    queryKey: ['test-history', 0],
    queryFn:  () => testAPI.history(0, 50),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageData: Page<TestAttemptSummary> | undefined = (data as any)?.data?.data;
  const attempts = pageData?.content ?? [];

  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-slide-up">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <History size={20} className="text-primary-500" />
          <h1 className="text-xl font-bold text-text-primary">{t('tests.testHistory')}</h1>
        </div>
        <button onClick={onBack} className="btn-secondary text-sm">
          <ArrowRight size={14} className="rotate-180 ua-flip-rtl" /> {t('tests.takeATestShort')}
        </button>
      </div>

      {/* Deep-insights entry point — the heavy analysis is computed server-side. */}
      <button
        onClick={onInsights}
        className="card card--flat border border-primary-200 rounded-[14px] p-4 w-full text-left hover:border-primary-400 transition flex items-center gap-3 bg-primary-50/50"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-500 text-white flex items-center justify-center shrink-0">
          <Sparkles size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary">{t('tests.deepInsights')}</p>
          <p className="text-xs text-text-muted mt-0.5">
            {t('tests.deepInsightsDesc')}
          </p>
        </div>
        <ChevronRight size={16} className="text-primary-500 shrink-0 ua-flip-rtl" />
      </button>

      {isLoading && (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      )}

      {!isLoading && attempts.length === 0 && (
        <div className="card card--flat border border-border rounded-[14px] p-10 text-center">
          <AlertTriangle size={28} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary">{t('tests.noAttempts')}</p>
        </div>
      )}

      {/* Attempt list — 2-col grid on desktop, single col on mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
        {attempts.map(a => (
          <button
            key={a.attemptId}
            onClick={() => onReview(a.attemptId)}
            className="card card--flat border border-border rounded-[12px] p-4 w-full text-left hover:border-primary-300 transition flex items-center gap-4"
          >
            <div className={clsx(
              'w-11 h-11 rounded-xl flex flex-col items-center justify-center shrink-0 text-xs font-bold',
              a.passed ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'
            )}>
              {Math.round(a.scorePercentage)}%
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-text-primary truncate">{a.poolName}</p>
                <Badge label={a.entityType} />
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                {t('tests.correctFraction', { correct: a.correctCount, total: a.totalQuestions })}
                {a.improvementNeeded && <span className="text-warning"> · {t('tests.needsImprovement')}</span>}
                {a.timeTakenSeconds != null && <span> · {t('tests.duration', { m: Math.floor(a.timeTakenSeconds / 60), s: a.timeTakenSeconds % 60 })}</span>}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {formatDateTime(a.attemptedAt)}
              </p>
            </div>
            <ChevronRight size={16} className="text-text-muted shrink-0 ua-flip-rtl" />
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Page orchestrator ────────────────────────────────────────────────────────
type Phase = 'select' | 'loading' | 'quiz' | 'result' | 'history' | 'review' | 'insights';

export const TestsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [phase,   setPhase]   = useState<Phase>('select');
  const [session, setSession] = useState<TestSession | null>(null);
  const [result,  setResult]  = useState<TestResultResponse | null>(null);
  const [config,  setConfig]  = useState<ScopeConfig | null>(null);
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);

  // Pre-fill from URL params
  const preScope    = searchParams.get('scope')    as ScopeType | null;
  const preEntityId = searchParams.get('entityId');
  const preView     = searchParams.get('view');   // 'insights' | 'history'

  const queryClient = useQueryClient();
  const { fire } = useMascot();

  const generateMutation = useMutation({
    mutationFn: (cfg: ScopeConfig) => testAPI.generate({
      scopeType: cfg.scopeType,
      entityId:  cfg.entityId,
    }),
    onSuccess: (res) => {
      setSession(res.data.data ?? res.data);
      setPhase('quiz');
    },
    onError: () => setPhase('select'),
  });

  const gradeMutation = useMutation({
    mutationFn: (payload: { poolId: string; entityId: string; answers: { questionId: string; selectedAnswerIds: string[] }[]; timeTakenSeconds: number }) =>
      testAPI.grade(payload),
    onSuccess: (res) => {
      const graded = res.data.data ?? res.data;
      setResult(graded);
      setPhase('result');
      // Celebrate (or encourage) based on the outcome.
      fire(graded?.passed ? 'TEST_PASSED' : 'TEST_FAILED');
      // The attempt is now persisted server-side — refresh the history list.
      queryClient.invalidateQueries({ queryKey: ['test-history'] });
    },
  });

  const handleStart = (cfg: ScopeConfig) => {
    setConfig(cfg);
    setPhase('loading');
    generateMutation.mutate(cfg);
  };

  const handleSubmit = (
    answers: { questionId: string; selectedAnswerIds: string[] }[],
    timeTakenSeconds: number,
  ) => {
    if (!session || !config) return;
    gradeMutation.mutate({
      poolId:   session.poolId,
      entityId: config.entityId,
      answers,
      timeTakenSeconds,
    });
  };

  const handleRetry = () => {
    setPhase('select');
    setSession(null);
    setResult(null);
    setConfig(null);
  };

  // Auto-start / deep-link on mount from URL params
  useEffect(() => {
    if (preScope && preEntityId && phase === 'select') {
      handleStart({ scopeType: preScope, entityId: preEntityId });
    } else if (preView === 'insights') {
      setPhase('insights');
    } else if (preView === 'history') {
      setPhase('history');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'loading') return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <Spinner size="lg" />
      <p className="text-sm text-text-secondary font-medium">{t('tests.preparingTest')}</p>
    </div>
  );

  if (phase === 'quiz' && session) return (
    <QuizInterface
      session={session}
      onSubmit={handleSubmit}
      isSubmitting={gradeMutation.isPending}
    />
  );

  if (phase === 'result' && result) return (
    <div className="animate-slide-up">
      <ResultsView
        result={result}
        onRetry={handleRetry}
        onViewHistory={() => setPhase('history')}
      />
    </div>
  );

  if (phase === 'history') return (
    <div className="animate-fade-in">
      <HistoryView
        onBack={handleRetry}
        onReview={(id) => { setReviewAttemptId(id); setPhase('review'); }}
        onInsights={() => setPhase('insights')}
      />
    </div>
  );

  if (phase === 'insights') return (
    <div className="animate-fade-in">
      <InsightsView onBack={() => setPhase('history')} />
    </div>
  );

  if (phase === 'review' && reviewAttemptId) return (
    <div className="animate-fade-in">
      <ReviewView
        attemptId={reviewAttemptId}
        onBack={() => setPhase('history')}
      />
    </div>
  );

  return (
    <div className="animate-fade-in">
      <ScopeSelector onStart={handleStart} onViewHistory={() => setPhase('history')} />
    </div>
  );
};
