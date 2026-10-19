import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { domainAPI, courseAPI, topicAPI, poolAPI, testAPI } from '../api/endpoints';
import { Badge, ProgressBar, QuizBackground, QuizQuestionCard, Spinner } from '../components/ui';
import { InsightsView } from '../components/insights/InsightsView';
import { SearchableSelect } from '../components/ui/SearchableSelect';
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
  History, Sparkles,
} from 'lucide-react';
import clsx from 'clsx';
import { PracticeStat } from '../components/ui/PracticeLayout';
import { useAuth } from '../context/AuthContext';
import { Flame, Star, Target } from 'lucide-react';

// ── Scope Selector ───────────────────────────────────────────────────────────
type ScopeType = 'DOMAIN' | 'COURSE' | 'TOPIC';

interface ScopeConfig {
  scopeType: ScopeType;
  entityId: string;
  poolId?: string;
  /**
   * Which generation flow to use:
   *  - true  → ADAPTIVE: backend reshapes the difficulty mix from the learner's
   *            past history on this scope (Tests-page "Start test" button).
   *  - false → DIRECT: fixed pool mix drawn from the union of child pools
   *            (deep-linked topic/course quiz from the course page).
   */
  adaptive: boolean;
}

const ScopeSelector: React.FC<{
  onStart: (cfg: ScopeConfig) => void;
  onViewHistory: () => void;
  initialConfig?: ScopeConfig | null;
  initialCourseId?: string;
}> = ({ onStart, onViewHistory, initialConfig, initialCourseId = '' }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [scope, setScope]         = useState<ScopeType>(initialConfig?.scopeType ?? 'COURSE');
  const [domainId, setDomainId]   = useState(initialConfig?.scopeType === 'DOMAIN' ? initialConfig.entityId : '');
  const [courseId, setCourseId]   = useState(initialConfig?.scopeType === 'COURSE' ? initialConfig.entityId : initialCourseId);
  const [topicId, setTopicId]     = useState(initialConfig?.scopeType === 'TOPIC' ? initialConfig.entityId : '');

  const { data: domainsRes, isFetching: domainsLoading, isError: domainsError, refetch: retryDomains } = useQuery({ queryKey: ['domains'],  queryFn: domainAPI.getAll });
  const { data: coursesRes, isFetching: coursesLoading, isError: coursesError, refetch: retryCourses } = useQuery({ queryKey: ['courses'],  queryFn: courseAPI.getAll });
  const { data: topicsRes, isFetching: topicsLoading, isError: topicsError, refetch: retryTopics } = useQuery({
    queryKey: ['topics', courseId],
    queryFn:  () => topicAPI.getByCourse(courseId),
    enabled:  !!courseId && scope === 'TOPIC',
  });
  const poolQueryEnabled = (scope === 'DOMAIN' && !!domainId) || (scope === 'COURSE' && !!courseId) || (scope === 'TOPIC' && !!topicId);
  // We no longer ask the learner to pick a pool — the backend auto-selects the
  // best pool for the chosen scope/tag. We still fetch pools purely to show a
  // readiness hint ("N tests available") and gate the Start button.
  const { data: poolsRes, isFetching: poolsLoading, isError: poolsError, refetch: retryPools } = useQuery({
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
  const canStart = !!entityId && !poolsLoading && !poolsError && pools.length > 0;

  const SCOPES: { type: ScopeType; icon: React.ReactNode; label: string; desc: string }[] = [
    { type: 'DOMAIN', icon: <Globe size={18} />,        label: t('tests.domainTest'),  desc: t('tests.domainTestDesc') },
    { type: 'COURSE', icon: <BookOpen size={18} />,     label: t('tests.courseTest'),  desc: t('tests.courseTestDesc') },
    { type: 'TOPIC',  icon: <Layers size={18} />,       label: t('tests.topicQuiz'),   desc: t('tests.topicQuizDesc') },
  ];

  return (
    <div className="practice-page">
      <header className="flex items-center justify-between gap-3">
        <h1 className="min-w-0 text-xl font-bold tracking-tight sm:text-2xl">{t('tests.takeATest')}</h1>
        <button type="button" onClick={onViewHistory}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold text-primary-500 transition hover:bg-primary-50 sm:text-sm">
          <History size={17} aria-hidden="true" />{t('tests.testHistory')}
        </button>
      </header>
      <div className="practice-stats" role="group" aria-label={t('practice.redesign.stats', 'Your practice at a glance')}>
        <PracticeStat icon={Flame} value={user?.currentStreak ?? '—'} label={t('dashboard.learningHome.dayStreak')} tone="warm" />
        <PracticeStat icon={Star} value={user?.points ?? '—'} label={t('dashboard.learningHome.learningPoints')} tone="gold" />
        <PracticeStat icon={BookOpen} value={coursesRes ? courses.length : '—'} label={t('practice.redesign.courses', 'Courses to explore')} />
        <PracticeStat icon={Globe} value={domainsRes ? domains.length : '—'} label={t('practice.redesign.domains', 'Learning worlds')} tone="mint" />
      </div>
      <section className="space-y-4" aria-labelledby="practice-scope-heading">
        <div className="practice-section-heading"><div><h2 id="practice-scope-heading"><span className="practice-step">1</span>{t('practice.redesign.pick', 'Choose your adventure')}</h2><p>{t('practice.redesign.pickHint', 'Explore a whole world or focus on one small skill.')}</p></div></div>
        <div className="practice-scope-grid">
          {SCOPES.map(({ type, icon, label, desc }) => (
            <button key={type} onClick={() => { setScope(type); setDomainId(''); setCourseId(''); setTopicId(''); }}
              aria-pressed={scope === type} className={clsx('practice-scope', type === 'DOMAIN' && 'practice-tone-mint', type === 'TOPIC' && 'practice-tone-gold')}>
              <span className="practice-scope-heading"><span className="practice-icon">{icon}</span><strong>{label}</strong></span>
              {scope === type && <CheckCircle size={19} className="practice-scope-check" aria-hidden="true" />}
              <p>{desc}</p>
            </button>
          ))}
        </div>
      </section>
      <div className="practice-setup-grid">
        <section className="practice-panel practice-setup" aria-labelledby="practice-setup-heading">
          <h2 id="practice-setup-heading"><span className="practice-step">2</span>{t('practice.redesign.destination', 'Pick your learning destination')}</h2>
          {scope === 'DOMAIN' && <div>
            <label htmlFor="practice-domain" className="text-sm font-semibold block mb-2">{t('tests.selectDomain')}</label>
            <SearchableSelect id="practice-domain" value={domainId} onChange={setDomainId}
              placeholder={t('tests.chooseDomain')} options={domains.map(item => ({ value: item.id, label: item.name }))}
              loading={domainsLoading} error={domainsError} onRetry={() => { void retryDomains(); }} />
          </div>}
          {(scope === 'COURSE' || scope === 'TOPIC') && <div>
            <label htmlFor="practice-course" className="text-sm font-semibold block mb-2">{t('tests.selectCourse')}</label>
            <SearchableSelect id="practice-course" value={courseId} onChange={id => { setCourseId(id); setTopicId(''); }}
              placeholder={t('tests.chooseCourse')} options={courses.map(item => ({ value: item.id, label: item.name }))}
              loading={coursesLoading} error={coursesError} onRetry={() => { void retryCourses(); }} />
          </div>}
          {scope === 'TOPIC' && courseId && <div>
            <label htmlFor="practice-topic" className="text-sm font-semibold block mb-2">{t('tests.selectTopic')}</label>
            <SearchableSelect key={courseId} id="practice-topic" value={topicId} onChange={setTopicId}
              placeholder={t('tests.chooseTopic')} options={topics.map(item => ({ value: item.id, label: item.name }))}
              loading={topicsLoading} error={topicsError} onRetry={() => { void retryTopics(); }} />
          </div>}
          <div aria-live="polite">
            {entityId && poolsLoading && <div className="flex items-center gap-2 text-sm text-text-secondary"><Spinner size="sm" />{t('tests.checkingTests')}</div>}
            {entityId && !poolsLoading && !poolsError && pools.length > 0 && <div className="p-4 bg-primary-50 rounded-2xl space-y-2">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary-500"><CheckCircle size={17} />{pools.length === 1 ? t('tests.testReady') : t('tests.testsAvailable', { count: pools.length })}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{t('tests.autoDrawNote')}</p>
            </div>}
            {entityId && !poolsLoading && !poolsError && !pools.length && <p className="text-sm text-warning">{t('tests.noTests')}</p>}
          </div>
          {entityId && poolsError && <div className="practice-state" role="alert"><p>{t('practice.redesign.poolError', 'We could not check the available tests.')}</p><button className="practice-button" onClick={() => { void retryPools(); }}>{t('dashboard.learningHome.retry')}</button></div>}
          <button disabled={!canStart} onClick={() => onStart({ scopeType: scope, entityId, adaptive: true })} className="practice-button practice-button-primary w-full">{t('tests.startTest')}<ArrowRight size={17} className="ua-flip-rtl" /></button>
        </section>
        <aside className="practice-note">
          <span className="practice-icon"><Sparkles size={25} aria-hidden="true" /></span>
          <h2>{t('practice.redesign.grow', 'A little practice goes a long way')}</h2><p>{t('tests.adaptiveNote')}</p>
          <ol><li>{t('practice.redesign.stepOne', 'Choose something you want to learn.')}</li><li>{t('practice.redesign.stepTwo', 'Give it a go. Every answer helps you grow.')}</li><li>{t('practice.redesign.stepThree', 'Review your discoveries and try again.')}</li></ol>
        </aside>
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
  const answered = session.questions.filter(question => (answers[question.id]?.length ?? 0) > 0).length;
  const progress = session.questions.length ? (answered / session.questions.length) * 100 : 0;

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
        <div className="quiz-session-header flex items-center justify-between">
          <div>
            <div className="quiz-session-title flex items-center gap-2">
              <p className="text-text-on-dark text-sm font-medium">{session.poolName}</p>
              {session.strategy && session.strategy !== 'DEFAULT' && session.strategy !== 'DEFAULT_NO_HISTORY' && (
                <span className={clsx(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold',
                  session.strategy === 'MASTERY'   && 'bg-achievement/20 text-achievement',
                  session.strategy === 'ADVANCING' && 'bg-primary-500/20 text-primary-200',
                  session.strategy === 'REINFORCE' && 'bg-warning/20 text-warning',
                )}>
                  <Sparkles size={10} />
                  {t(`tests.strategy.${session.strategy}`)}
                </span>
              )}
            </div>
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
        <div className="quiz-completion" role="progressbar" aria-label="Questions answered" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={`${answered} of ${session.questions.length} questions answered`}>
          <ProgressBar
            value={progress}
            className="quiz-solid-progress"
            animate={false}
            height="h-2"
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
        <div className="quiz-navigation flex items-center justify-between">
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
    <div className="practice-page practice-result mx-auto animate-slide-up">
      {/* Hero result */}
      <div className="practice-result-hero text-center relative overflow-hidden">
        <div className="relative z-10">
          <div className="result-medal w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5">
            {passed
              ? <Trophy size={36} />
              : <Target size={36} />
            }
          </div>
          <h2 className="text-3xl font-bold mb-1">{pct}%</h2>
          <p className="result-subtitle text-lg mb-3">
            {passed ? t('tests.passed') : t('practice.redesign.resultEncouragement', 'Not there yet — your next discovery is one practice away.')}
          </p>
          <p className="result-meta text-sm">
            {t('tests.pointsSummary', { earned: result.earnedPoints, total: result.totalPoints })} ·&nbsp;
            {t('tests.correctCount', { count: result.correctAnswers })} · {t('tests.wrongCount', { count: result.wrongAnswers })} · {t('tests.skippedCount', { count: result.skippedAnswers })}
          </p>
          <p className="result-meta text-xs mt-1">{t('tests.passMark', { percent: result.passPercentage })}</p>
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
          aria-expanded={showBreakdown}
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
        <button onClick={onRetry} className="practice-button flex-1">
          <RotateCcw size={15} /> {t('tests.tryAgain')}
        </button>
        {onViewHistory && (
          <button onClick={onViewHistory} className="practice-button flex-1">
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
  const [page, setPage] = useState(0);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['test-history', page, 12], queryFn: () => testAPI.history(page, 12),
  });
  const pageData: Page<TestAttemptSummary> | undefined = data?.data?.data;
  const attempts = pageData?.content ?? [];
  const average = attempts.length ? Math.round(attempts.reduce((sum, a) => sum + a.scorePercentage, 0) / attempts.length) : null;
  const best = attempts.length ? Math.round(Math.max(...attempts.map(a => a.scorePercentage))) : null;
  return (
    <div className="practice-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{t('tests.testHistory')}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={onInsights} className="practice-button"><Sparkles size={16} aria-hidden="true" />{t('tests.deepInsights')}</button>
          <button type="button" onClick={onBack} className="practice-button"><Target size={16} aria-hidden="true" />{t('tests.takeATestShort')}</button>
        </div>
      </header>
      <div className="practice-stats">
        <PracticeStat icon={BookOpen} value={pageData?.totalElements ?? '—'} label={t('dashboard.learningHome.practiceRounds')} />
        <PracticeStat icon={Trophy} value={best === null ? '—' : `${best}%`} label={t('practice.redesign.pageBest', 'Best on this page')} tone="gold" />
        <PracticeStat icon={Target} value={average === null ? '—' : `${average}%`} label={t('practice.redesign.pageAverage', 'Average on this page')} tone="mint" />
        <PracticeStat icon={CheckCircle} value={data ? attempts.filter(a => a.passed).length : '—'} label={t('practice.redesign.pagePassed', 'Passed on this page')} tone="warm" />
      </div>
      <section className="space-y-4" aria-labelledby="practice-journal-heading">
        <div className="practice-section-heading"><div><h2 id="practice-journal-heading">{t('practice.redesign.pastAdventures', 'Your practice adventures')}</h2><p>{t('practice.redesign.reviewHint', 'Open a round to discover what clicked and what to try next.')}</p></div></div>
        {isLoading && <div className="practice-state" role="status"><Spinner size="lg" />{t('common.loading')}</div>}
        {isError && <div className="practice-state" role="alert"><p>{t('dashboard.learningHome.loadError')}</p><button className="practice-button" onClick={() => { void refetch(); }}>{t('dashboard.learningHome.retry')}</button></div>}
        {!isLoading && !isError && !attempts.length && <div className="practice-state"><Sparkles size={30} aria-hidden="true" /><p>{t('tests.noAttempts')}</p><button className="practice-button practice-button-primary" onClick={onBack}>{t('tests.takeATestShort')}<ArrowRight size={16} /></button></div>}
        {!isError && <div className="practice-journal">{attempts.map(a => <button key={a.attemptId} onClick={() => onReview(a.attemptId)} className="practice-attempt">
          <div className="practice-attempt-top"><span className={`practice-attempt-score ${a.passed ? 'practice-tone-mint' : ''}`}><span className="practice-icon">{a.passed ? <Trophy size={24} /> : <Target size={24} />}</span>{Math.round(a.scorePercentage)}%</span><Badge label={a.entityType} /></div>
          <div><h3>{a.poolName}</h3><p>{t('tests.correctFraction', { correct: a.correctCount, total: a.totalQuestions })}{a.timeTakenSeconds != null && <> · {t('tests.duration', { m: Math.floor(a.timeTakenSeconds / 60), s: a.timeTakenSeconds % 60 })}</>}</p><p className="font-semibold">{t(a.passed ? 'dashboard.learningHome.wellDone' : 'dashboard.learningHome.keepPracticing')}</p></div>
          <div className="practice-attempt-footer"><time dateTime={a.attemptedAt}>{formatDateTime(a.attemptedAt)}</time><span className="practice-review-label">{t('tests.reviewAnswers')}<ArrowRight size={15} className="ua-flip-rtl" /></span></div>
        </button>)}</div>}
      </section>
      {pageData && pageData.totalPages > 1 && <nav className="practice-pagination" aria-label={t('practice.redesign.pagination', 'Practice history pages')}>
        <button className="practice-button" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} className="ua-flip-rtl" />{t('tests.previous')}</button>
        <span>{page + 1} / {pageData.totalPages}</span>
        <button className="practice-button" disabled={page + 1 >= pageData.totalPages} onClick={() => setPage(p => p + 1)}>{t('tests.next')}<ChevronRight size={16} className="ua-flip-rtl" /></button>
      </nav>}
    </div>
  );
};

// ── Page orchestrator ────────────────────────────────────────────────────────
type Phase = 'select' | 'loading' | 'quiz' | 'result' | 'history' | 'review' | 'insights';

export const TestsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledDeepLink = React.useRef<string | null>(null);
  const [phase,   setPhase]   = useState<Phase>('select');
  const [session, setSession] = useState<TestSession | null>(null);
  const [result,  setResult]  = useState<TestResultResponse | null>(null);
  const [config,  setConfig]  = useState<ScopeConfig | null>(null);
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);

  // Pre-fill from URL params
  const preScope    = searchParams.get('scope')    as ScopeType | null;
  const preEntityId = searchParams.get('entityId');
  const preView     = searchParams.get('view');   // 'insights' | 'history'
  // Deep-links from a course/topic page are the DIRECT flow (fixed pool mix,
  // union of child pools). Opt into the adaptive flow with ?adaptive=1 only.
  const preAdaptive = searchParams.get('adaptive') === '1';

  const queryClient = useQueryClient();
  const { fire } = useMascot();

  const generateMutation = useMutation({
    mutationFn: (cfg: ScopeConfig) => testAPI.generate({
      scopeType: cfg.scopeType,
      entityId:  cfg.entityId,
      // Two flows share this one endpoint, distinguished by `adaptive`:
      //  • ADAPTIVE (true)  — Tests-page "Start test": backend reshapes the
      //    difficulty mix from the learner's past attempts on this scope.
      //  • DIRECT   (false) — deep-linked topic/course quiz from the course page:
      //    fixed pool mix drawn from the union of child pools.
      adaptive:  cfg.adaptive,
    }),
    onSuccess: (res) => {
      setSession(res.data.data ?? res.data);
      setPhase('quiz');
    },
    onError: () => setPhase('select'),
  });

  const gradeMutation = useMutation({
    mutationFn: (payload: { poolId: string; entityId: string; scopeType?: ScopeType; answers: { questionId: string; selectedAnswerIds: string[] }[]; timeTakenSeconds: number }) =>
      testAPI.grade(payload),
    onSuccess: (res) => {
      const graded = res.data.data ?? res.data;
      setResult(graded);
      setPhase('result');
      // Celebrate (or encourage) based on the outcome.
      fire(graded?.passed ? 'TEST_PASSED' : 'TEST_FAILED');
      // The attempt is now persisted server-side — refresh the history list.
      queryClient.invalidateQueries({ queryKey: ['test-history'] });
      queryClient.invalidateQueries({ queryKey: ['insights-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['insights-improvement'] });
      queryClient.invalidateQueries({ queryKey: ['course-progress'] });
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
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
      poolId:    session.poolId,
      entityId:  config.entityId,
      scopeType: config.scopeType,   // record the TRUE tested scope for history/insights
      answers,
      timeTakenSeconds,
    });
  };

  const handleRetry = () => {
    setSearchParams({}, { replace: true });
    setPhase('select');
    setSession(null);
    setResult(null);
    setConfig(null);
    generateMutation.reset();
  };

  // Consume each deep-link once, including React StrictMode's repeated effects.
  // Watching the URL also supports navigation while this page stays mounted.
  useEffect(() => {
    const key = searchParams.toString();
    if (handledDeepLink.current === key) return;
    handledDeepLink.current = key;
    if (preEntityId && (preScope === 'DOMAIN' || preScope === 'COURSE' || preScope === 'TOPIC')) {
      setSession(null);
      setResult(null);
      handleStart({ scopeType: preScope, entityId: preEntityId, adaptive: preAdaptive });
    } else if (preView === 'insights') {
      setPhase('insights');
    } else if (preView === 'history') {
      setPhase('history');
    } else {
      setPhase('select');
    }
    // Startup is URL-driven, not phase-driven: an error must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
      {generateMutation.isError && (
        <div role="alert" className="card mb-4 p-4 space-y-3">
          <p className="text-sm text-text-secondary">{t('tests.quizLoadError', 'Unable to start this quiz. Please try again.')}</p>
          {config && <button type="button" className="btn-secondary" onClick={() => handleStart(config)}>{t('dashboard.learningHome.retry')}</button>}
        </div>
      )}
      <ScopeSelector onStart={handleStart} onViewHistory={() => setPhase('history')}
        initialConfig={config} initialCourseId={searchParams.get('courseId') ?? ''} />
    </div>
  );
};
