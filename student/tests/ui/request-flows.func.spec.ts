import { test, expect, type Page } from '@playwright/test';

async function student(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'request-contract');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'requests', name: 'Learner' }));
    localStorage.setItem('i18nextLng', 'en');
  });
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/api/v1/user-auth/me' ? { id: 'requests', name: 'Learner' }
      : path.includes('streak') ? { currentStreak: 0, longestStreak: 0 }
      : path.endsWith('/rank-change') ? { changed: false, currentRank: 0, previousRank: 0 }
      : path.endsWith('/tests/history') ? { content: [], totalPages: 0, totalElements: 0 }
      : [];
    return route.fulfill({ json: { success: true, data } });
  });
}

for (const [path, endpoint] of [
  ['/tests?view=history', '/tests/history'],
  ['/roadmap', '/roles'],
  ['/algorithms', '/algorithms/published'],
  ['/animations', '/animation-scenes/published'],
  ['/interview-experiences', '/interview-experiences'],
]) {
  test(`${path} requests its backend resource`, async ({ page }) => {
    await student(page);
    const response = page.waitForResponse(r => new URL(r.url()).pathname === `/api/v1${endpoint}`);
    await page.goto(path);
    expect((await response).status()).toBe(200);
    await expect(page.locator('main h1')).toBeVisible();
  });
}

test('rank checks stay within five minutes across focus, navigation and reload', async ({ page }) => {
  await student(page);
  await page.clock.install();
  let checks = 0;
  page.on('request', r => { if (r.url().includes('/leaderboard/me/rank-change')) checks++; });
  await page.goto('/algorithms');
  await page.clock.runFor(1000);
  await expect.poll(() => checks).toBe(1);
  for (let i = 0; i < 5; i++) await page.evaluate(() => {
    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.clock.runFor(299000);
  expect(checks).toBe(1);
  await page.clock.runFor(2000);
  await expect.poll(() => checks).toBe(2);
  await page.reload();
  await page.clock.runFor(1000);
  expect(checks).toBe(2);
});

test('interview search deep link requests and opens the selected story', async ({ page }) => {
  await student(page);
  await page.route('**/api/v1/interview-experiences/story', route => route.fulfill({ json: { success: true, data: {
    id: 'story', company: 'Example Company', role: 'Developer', experience: '<p>A real interview story.</p>',
    isPassed: true, isVerified: true, authorName: 'Learner', createdAt: '2026-01-01T12:00:00Z',
  } } }));
  await page.goto('/interview-experiences?experience=story');
  await expect(page.getByText('A real interview story.', { exact: true })).toBeVisible();
});

test('interview feed errors offer a retry instead of an empty feed', async ({ page }) => {
  await student(page);
  let fail = true;
  await page.route('**/api/v1/interview-experiences', route => route.fulfill({ status: fail ? 500 : 200, json: { success: !fail, data: [] } }));
  await page.goto('/interview-experiences');
  await expect(page.getByRole('alert')).toContainText('Unable to load interview experiences');
  fail = false;
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
});
