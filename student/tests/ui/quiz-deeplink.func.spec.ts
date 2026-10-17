import { expect, test } from '@playwright/test';

for (const scope of ['TOPIC', 'COURSE'] as const) {
  test(`${scope} quiz starts from course detail and grades the correct scope`, async ({ page }) => {
    const generated: unknown[] = [];
    const entityId = scope === 'TOPIC' ? 'topic-1' : 'intro';
    await page.addInitScript(() => {
      localStorage.setItem('ua_user_token', 'quiz-test');
      localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem('ua_mascot_muted', '1');
    });
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      let data: unknown = [];
      if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex' };
      else if (path === '/courses/intro') data = { id: 'intro', name: 'Programming basics', level: 'BEGINNER' };
      else if (path === '/topics/by-course/intro') data = [{ id: 'topic-1', name: 'First steps', courseId: 'intro', topicOrder: 1, level: 'BEGINNER' }];
      else if (path.includes('/question-pools/')) data = [{ id: 'pool-1' }];
      else if (path.endsWith('/status')) data = { enrolled: true };
      else if (path.endsWith('/progress')) data = { topics: [], progressPercent: 0 };
      else if (path === '/tests/generate') {
        generated.push(route.request().postDataJSON());
        data = { poolId: 'pool-1', poolName: 'First steps quiz', scopeType: scope, totalQuestions: 1, totalPoints: 1,
          questions: [{ id: 'q1', questionText: 'Which value is a number?', questionType: 'MCQ', difficulty: 'EASY', answers: [{ id: 'a1', answerText: '42' }] }] };
      } else if (path === '/tests/grade') data = { percentageScore: 100, passed: true, earnedPoints: 1, totalPoints: 1, correctAnswers: 1, wrongAnswers: 0, skippedAnswers: 0, passPercentage: 65, breakdown: [] };
      await route.fulfill({ json: { data } });
    });
    await page.goto('/courses/intro');
    const quiz = scope === 'TOPIC' ? page.getByRole('link', { name: 'Quiz: First steps', exact: true }) : page.getByRole('link', { name: /Take Course Test/i });
    // Exercise keyboard navigation too, without interference from the floating buddy.
    await quiz.focus();
    await quiz.press('Enter');
    await expect(page.getByText('Which value is a number?', { exact: true })).toBeVisible();
    expect(generated).toEqual([{ scopeType: scope, entityId, adaptive: false }]);
    await expect(page.getByRole('combobox')).toHaveCount(0);
    await page.getByRole('button', { name: /A 42/ }).click();
    const graded = page.waitForRequest(request => request.url().includes('/tests/grade'));
    await page.getByRole('button', { name: /Submit/i }).click();
    expect((await graded).postDataJSON()).toMatchObject({ scopeType: scope, entityId, poolId: 'pool-1', answers: [{ questionId: 'q1', selectedAnswerIds: ['a1'] }] });
    await expect(page.locator('.practice-result-hero')).toContainText('100%');
    await page.getByRole('button', { name: /Try again/i }).click();
    await expect(page.getByRole('heading', { name: 'Take a Test', exact: true })).toBeVisible();
    expect(generated).toHaveLength(1);
  });
}

test('failed topic auto-start retains course/topic selections and retries only on request', async ({ page }) => {
  let generations = 0;
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'quiz-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
    localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem('ua_mascot_muted', '1');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex' };
    else if (path === '/courses') data = [{ id: 'intro', name: 'Programming basics' }];
    else if (path === '/topics/by-course/intro') data = [{ id: 'topic-1', name: 'First steps' }];
    else if (path.includes('/question-pools/')) data = [{ id: 'pool-1' }];
    else if (path === '/tests/generate') {
      generations++;
      if (generations === 1) {
        await route.fulfill({ status: 500, json: { message: 'Temporary failure' } });
        return;
      }
      data = { poolId: 'pool-1', poolName: 'First steps', scopeType: 'TOPIC', totalQuestions: 1, totalPoints: 1,
        questions: [{ id: 'q1', questionText: 'Retry question', questionType: 'MCQ', difficulty: 'EASY', answers: [{ id: 'a1', answerText: '42' }] }] };
    }
    await route.fulfill({ json: { data } });
  });
  await page.goto('/tests?scope=TOPIC&entityId=topic-1&courseId=intro');
  await expect(page.getByRole('alert')).toContainText('Unable to start this quiz');
  await expect(page.getByRole('combobox', { name: 'Select Course', exact: true })).toHaveValue('Programming basics');
  await expect(page.getByRole('combobox', { name: 'Select Topic', exact: true })).toHaveValue('First steps');
  expect(generations).toBe(1);
  await page.getByRole('alert').getByRole('button').click();
  await expect(page.getByText('Retry question', { exact: true })).toBeVisible();
  expect(generations).toBe(2);
});
