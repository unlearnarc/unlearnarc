import { test, expect, type Page } from '@playwright/test';
const question = { id: 'item', questionId: 'question', topicId: 'topic', topicName: 'Recursion', href: '/courses/course?topic=topic', reason: 'DIAGNOSTIC_ASSESSMENT', selectionExplanation: 'We are still assessing your understanding of this concept.', difficulty: 'EASY', questionType: 'MCQ', text: 'Which case terminates recursion?', options: [{ id: 'a', text: 'Base case' }, { id: 'b', text: 'Recursive case' }], selectedAnswerIds: [] as string[] };
const session = { id: 'session', learningDate: '2025-03-10', timeZone: 'UTC', status: 'GENERATED', ruleVersion: 'daily-v1', correctCount: 0, incorrectCount: 0, questions: [question], notices: ['This short practice does not cover your overall knowledge.'] };
async function setup(page: Page, mode = 'normal') {
  let current: any = mode === 'empty' ? { ...session, questions: [], notices: ['No eligible questions are available.'] } : structuredClone(session);
  const calls: string[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'daily-ui-contract');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'daily-student', name: 'Learner', email: 'learner@example.test' }));
    localStorage.setItem('i18nextLng', 'en'); localStorage.setItem('ua_tour_seen_daily-student', '1');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    calls.push(`${route.request().method()} ${path}`);
    if (path.endsWith('/daily-quiz/today') && mode === 'error') return route.fulfill({ status: 503, json: { success: false } });
    if (path.endsWith('/daily-quiz/today') && mode === 'loading') await new Promise(r => setTimeout(r, 2000));
    if (path.endsWith('/start')) current = { ...current, status: 'IN_PROGRESS', startedAt: '2025-03-10T12:00:00Z' };
    if (path.endsWith('/answers/item')) {
      expect(route.request().postDataJSON()).toEqual({ selectedAnswerIds: ['a'] });
      current = { ...current, correctCount: 1, questions: [{ ...question, selectedAnswerIds: ['a'], correct: true, explanation: 'A base case terminates recursion.', correctAnswerIds: ['a'] }] };
    }
    if (path.endsWith('/complete')) current = { ...current, status: 'COMPLETED' };
    const data = path.endsWith('/user-auth/me') ? { id: 'daily-student', name: 'Learner', email: 'learner@example.test' }
      : path.endsWith('/insights') ? [{ topicId: 'topic', name: 'Recursion', href: question.href, recommendation: question.selectionExplanation, evidence: { state: 'INSUFFICIENT_DATA', distinctQuestions: current.correctCount, confidence: 'LOW' } }]
      : path.endsWith('/history') ? { content: [], last: true }
      : path.includes('/daily-quiz/') ? current : path.includes('streak') ? { currentStreak: 0 } : [];
    await route.fulfill({ json: { success: true, data } });
  });
  return calls;
}
test('start, answer, feedback, completion and persisted refresh', async ({ page }) => {
  const calls = await setup(page); await page.goto('/daily-quiz');
  await expect(page.getByRole('heading', { name: 'Daily Quiz', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Start quiz', exact: true }).click();
  await page.getByRole('radio', { name: 'Base case', exact: true }).check();
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click();
  await expect(page.getByText('A base case terminates recursion.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Complete quiz', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Quiz results' })).toBeVisible();
  await page.reload(); await expect(page.getByRole('heading', { name: 'Quiz results' })).toBeVisible();
  expect(calls.filter(c => c === 'GET /api/v1/daily-quiz/insights').length).toBeGreaterThan(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test('empty state offers courses without fabricated questions', async ({ page }) => {
  await setup(page, 'empty'); await page.goto('/daily-quiz'); await expect(page.getByText('No eligible questions are available.')).toBeVisible(); await expect(page.getByRole('link', { name: 'Explore courses', exact: true })).toHaveAttribute('href', '/explore'); await expect(page.getByRole('button', { name: 'Start quiz', exact: true })).toHaveCount(0);
});
test('load failure exposes retry', async ({ page }) => {
  await setup(page, 'error'); await page.goto('/daily-quiz'); await expect(page.getByRole('alert')).toContainText("couldn't load this quiz"); await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
});
test('loading state is accessible', async ({ page }) => {
  await setup(page, 'loading'); await page.goto('/daily-quiz'); await expect(page.getByRole('status').filter({ hasText: 'Loading your daily quiz' })).toBeVisible();
});
