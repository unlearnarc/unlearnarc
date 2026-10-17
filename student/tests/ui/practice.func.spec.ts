import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const user = { id: 'practice-learner', name: 'Alex Learner', email: 'alex@example.test', points: 320, currentStreak: 5 };
const attempts = [
  { attemptId: 'round-1', poolName: 'Programming basics and a long learning adventure title that should wrap', entityType: 'COURSE', scorePercentage: 80, passed: true, totalQuestions: 10, correctCount: 8, timeTakenSeconds: 125, attemptedAt: '2026-10-10T10:00:00Z' },
  { attemptId: 'round-2', poolName: 'Loops', entityType: 'TOPIC', scorePercentage: 40, passed: false, totalQuestions: 10, correctCount: 4, attemptedAt: '2026-10-09T10:00:00Z' },
];
const dashboard = { totalAttempts: 15, totalQuestionsAnswered: 150, totalCorrect: 100, averageScore: 65, bestScore: 90, latestScore: 80, passRate: 60, trendDelta: 15, trendLabel: 'IMPROVING', totalTimeSeconds: 1800,
  difficultyAccuracy: [{ difficulty: 'EASY', total: 20, correct: 16, accuracy: 80 }, { difficulty: 'HARD', total: 10, correct: 4, accuracy: 40 }],
  recentScores: [{ scorePercentage: 80 }, { scorePercentage: 60 }, { scorePercentage: 40 }],
  topWeakArea: { entityName: 'Loops', entityType: 'TOPIC', averageScore: 40, attempts: 3 },
};
const report = { attemptsAnalyzed: 15, summary: 'Practice loops and work up to harder questions.',
  weakAreas: [{ entityId: 'loops', entityName: 'Loops', entityType: 'TOPIC', severity: 'NEEDS_WORK', averageScore: 40, bestScore: 60, accuracy: 40, attempts: 3, recommendation: 'Trace each iteration before choosing an answer.' }],
  difficultyGaps: [{ difficulty: 'HARD', severity: 'CRITICAL', totalAnswered: 10, correct: 4, accuracy: 40, recommendation: 'Build confidence with smaller examples.' }],
  recurringMistakes: [{ questionId: 'q1', difficulty: 'HARD', questionText: 'How many times does this loop run?', timesWrong: 2, timesSeen: 3, wrongRate: 66, poolName: 'Loops', recommendation: 'Write out the values of the loop variable.' }],
};
const result = { poolName: 'Programming basics', percentageScore: 80, passed: true, earnedPoints: 8, totalPoints: 10, correctAnswers: 8, wrongAnswers: 2, skippedAnswers: 0, passPercentage: 60, breakdown: [] };

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(profile => {
    localStorage.setItem('ua_user_token', 'practice-test');
    localStorage.setItem('ua_user', JSON.stringify(profile));
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_theme', 'light');
  }, user);
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = user;
    else if (path.includes('/streak')) data = { ...user, activeToday: true };
    else if (path === '/courses') data = [{ id: 'intro', name: 'Programming basics' }];
    else if (path === '/domains') data = [{ id: 'cs', name: 'Computer science' }];
    else if (path.includes('/topics/')) data = [{ id: 'loops', name: 'Loops' }];
    else if (path.includes('/question-pools/')) data = [{ id: 'pool-1' }];
    else if (path === '/tests/history') data = { content: url.searchParams.get('page') === '1' ? [attempts[1]] : attempts, totalElements: 15, totalPages: 2 };
    else if (path.startsWith('/tests/history/')) data = { attemptedAt: attempts[0].attemptedAt, result };
    else if (path === '/tests/insights/dashboard') data = dashboard;
    else if (path === '/tests/insights/improvement') data = report;
    else if (path === '/tests/generate') data = { poolId: 'pool-1', poolName: 'Programming basics', totalQuestions: 1, totalPoints: 1, scopeType: 'COURSE', questions: [{ id: 'q1', questionText: 'Which value is a number?', questionType: 'MCQ', difficulty: 'EASY', answers: [{ id: 'a1', answerText: '42' }, { id: 'a2', answerText: 'hello' }] }] };
    else if (path === '/tests/grade') data = result;
    await route.fulfill({ json: { data } });
  });
});

test('practice setup keeps scope selection and the quiz flow working', async ({ page }) => {
  await page.goto('/tests');
  await expect(page.getByRole('heading', { name: 'Take a Test', exact: true })).toBeVisible();
  await expect(page.locator('.practice-hero')).toHaveCount(0);
  const start = page.getByRole('button', { name: /Start test/i });
  await expect(start).toBeDisabled();
  await page.getByRole('combobox', { name: 'Select Course', exact: true }).fill('program');
  await page.getByRole('option', { name: 'Programming basics', exact: true }).click();
  await expect(start).toBeEnabled();
  const generated = page.waitForRequest(r => r.url().includes('/tests/generate'));
  await start.click();
  expect((await generated).postDataJSON()).toMatchObject({ scopeType: 'COURSE', entityId: 'intro', adaptive: true });
  await expect(page.getByText('Which value is a number?')).toBeVisible();
  await page.getByText('42', { exact: true }).click();
  await page.getByRole('button', { name: /Submit/i }).click();
  await expect(page.locator('.practice-result-hero')).toContainText('80%');
  await page.getByRole('button', { name: /Review answers/i }).click();
  await expect(page.getByRole('button', { name: /Review answers/i })).toHaveAttribute('aria-expanded', 'true');
});

test('test history is accessible beside the simple page heading', async ({ page }) => {
  await page.goto('/tests');
  const header = page.locator('.practice-page > header');
  await expect(header.getByRole('heading', { level: 1 })).toBeVisible();
  await header.getByRole('button', { name: /test history/i }).click();
  await expect(page.locator('.practice-attempt')).toHaveCount(2);
  await page.getByRole('button', { name: /Take a test/i }).first().click();
  await expect(header).toBeVisible();
  await expect(page.locator('.practice-hero')).toHaveCount(0);
});

test('quiz artwork follows viewport and theme while answers stay usable', async ({ page }) => {
  await page.goto('/tests');
  await page.getByRole('combobox', { name: 'Select Course', exact: true }).fill('program');
  await page.getByRole('option', { name: 'Programming basics', exact: true }).click();
  await page.getByRole('button', { name: /Start test/i }).click();
  const scene = page.locator('.quiz-scene');
  await expect(scene).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    for (const width of [320, 375, 767, 768, 1024, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      const filename = width < 768 ? `mobilequiz${theme}bg.png` : `desktopquiz${theme}.png`;
      await expect.poll(() => scene.evaluate(el => getComputedStyle(el, '::before').backgroundImage)).toContain(filename);
      const loaded = await scene.evaluate(async el => {
        const background = getComputedStyle(el, '::before').backgroundImage;
        const url = background.match(/url\("?([^"\)]+)"?\)/)?.[1];
        if (!url) return false;
        const image = new Image();
        image.src = url;
        try { await image.decode(); return image.naturalWidth > 0; } catch { return false; }
      });
      expect(loaded).toBe(true);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${theme} quiz fits ${width}px` }).toBe(true);
    }
    await page.waitForTimeout(350);
    const scan = await new AxeBuilder({ page }).include('.quiz-scene').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
  }
  await page.getByRole('button', { name: /A 42/ }).click();
  await expect(page.getByRole('button', { name: /A 42/ })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: /Submit/i }).click();
  await expect(page.locator('.practice-result-hero')).toBeVisible();
});

test('journal supports pagination, review and insights controls', async ({ page }) => {
  await page.goto('/tests?view=history');
  await expect(page.locator('.practice-attempt')).toHaveCount(2);
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('.practice-attempt')).toHaveCount(1);
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await page.locator('.practice-attempt').first().click();
  await expect(page.locator('.practice-result-hero')).toContainText('80%');
  await page.getByRole('button', { name: /Back to history/i }).click();
  await expect(page.locator('.practice-insight-link')).toHaveCount(0);
  await page.locator('.practice-page > header').getByRole('button', { name: 'Deep Insights', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Deep Insights', exact: true })).toBeVisible();
  await expect(page.locator('.practice-hero')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Your growth trail' })).toBeVisible();
  const request = page.waitForRequest(r => r.url().includes('/insights/dashboard?windowDays=7'));
  await page.getByRole('button', { name: '7d', exact: true }).click();
  await request;
  await page.getByRole('button', { name: 'Level-up plan' }).click();
  await expect(page.getByRole('heading', { name: 'Skills to level up' })).toBeVisible();
  await expect(page.getByText('Trace each iteration before choosing an answer.')).toBeVisible();
});

test('all learning surfaces fit small phones through wide desktops and pass accessibility in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const view of ['', '?view=history', '?view=insights']) {
    await page.goto(`/tests${view}`);
    const title = view.includes('history') ? 'Test history' : view.includes('insights') ? 'Deep Insights' : 'Take a Test';
    await expect(page.getByRole('heading', { level: 1, name: title, exact: true })).toBeVisible();
    await expect(page.locator('.practice-hero')).toHaveCount(0);
    if (view.includes('history')) await expect(page.locator('.practice-attempt')).toHaveCount(2);
    if (view.includes('insights')) await expect(page.getByRole('heading', { name: 'Your growth trail' })).toBeVisible();
    for (const theme of ['light', 'dark']) {
      await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
      await page.waitForTimeout(350); // Let the shared app theme transition settle before contrast measurement.
      for (const width of [320, 375, 480, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), { message: `${view} ${theme} fits ${width}px` }).toBe(true);
      }
      const audit = await new AxeBuilder({ page }).include('.practice-page').analyze();
      expect(audit.violations, `${view} ${theme}`).toEqual([]);
    }
  }
  await page.getByRole('button', { name: 'Level-up plan' }).click();
  await expect(page.getByRole('heading', { name: 'Skills to level up' })).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await page.waitForTimeout(350);
    await page.setViewportSize({ width: 320, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).include('.practice-page').analyze();
    expect(audit.violations, `improvement ${theme}`).toEqual([]);
  }
});

test('history and insights have actionable empty and retry states', async ({ page }) => {
  await page.route('**/api/v1/tests/history?*', route => route.fulfill({ status: 500, json: { message: 'Temporary error' } }));
  await page.goto('/tests?view=history');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.route('**/api/v1/tests/history?*', route => route.fulfill({ json: { data: { content: [], totalElements: 0, totalPages: 0 } } }));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.locator('.practice-state')).toContainText('No');
  await page.goto('/tests?view=insights');
  await page.route('**/api/v1/tests/insights/dashboard*', route => route.fulfill({ status: 500, json: { message: 'Temporary error' } }));
  await page.getByRole('button', { name: '7d', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await page.route('**/api/v1/tests/insights/dashboard*', route => route.fulfill({ json: { data: { ...dashboard, totalAttempts: 0 } } }));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByText('No test data in this window yet.')).toBeVisible();
});
