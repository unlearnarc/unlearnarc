import { expect, test } from '@playwright/test';

test('contest completion and solved problems persist after navigation and reload', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'contest-progress-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
    localStorage.setItem('ua_lang', 'en');
  });
  const contest = { id: 'practice', title: 'Echo practice', slug: 'echo', status: 'PUBLISHED',
    visibility: 'PUBLIC', phase: 'RUNNING', durationMinutes: 0, allowedLanguages: 'python',
    wrongSubmissionPenalty: 0, problemCount: 2, participantCount: 1 };
  const problems = ['first', 'second'].map(id => ({ id, contestId: 'practice', title: `Echo ${id}`,
    statement: 'Echo input', difficulty: 'EASY', maxPoints: 100, harnessType: 'STDIN_STDOUT',
    timeLimitMs: 2000, displayOrder: 0, sampleTestCases: [], hiddenTestCount: 1 }));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex', points: 200 };
    else if (path.includes('/streak')) data = { activeToday: true };
    else if (path === '/contests') data = [contest];
    else if (path === '/contests/practice') data = contest;
    else if (path === '/contests/practice/problems') data = problems;
    else if (path === '/contests/my-progress') data = [{ contestId: 'practice', totalScore: 200,
      problemCount: 2, solvedProblemIds: ['first', 'second'], completed: true }];
    await route.fulfill({ json: { data } });
  });
  await page.goto('/contests');
  await expect(page.getByRole('button', { name: /Echo practice/ })).toContainText('Completed');
  await expect(page.getByRole('button', { name: /Echo practice/ })).toContainText('2/2 solved · 200 pts');
  await page.getByRole('button', { name: /Echo practice/ }).click();
  await expect(page.getByRole('status')).toHaveText('Completed · 2/2 solved · 200 pts');
  await expect(page.getByRole('button', { name: /Echo first/ })).toContainText('Solved');
  await expect(page.getByRole('button', { name: /Echo second/ })).toContainText('Solved');
  await page.reload();
  await expect(page.getByRole('status')).toHaveText('Completed · 2/2 solved · 200 pts');
});
