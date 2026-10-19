import { test, expect } from '@playwright/test';

// Deterministic UI contract tests; no OAuth provider or running database needed.
test('shared profile works without signing in and hides private account data', async ({ page }) => {
  await page.route('**/api/v1/public/profiles/shared-link', route => route.fulfill({ json: {
    success: true, data: { name: 'Shared Learner', points: 120, rank: 3, currentStreak: 2, longestStreak: 7 },
  } }));
  await page.goto('/p/shared-link');
  await expect(page.getByRole('heading', { name: 'Shared Learner' })).toBeVisible();
  await expect(page.getByText('#3', { exact: true })).toBeVisible();
  await expect(page.getByText('Public learning profile')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/p/shared-link');
});

test('revoked profile displays an unavailable state', async ({ page }) => {
  await page.route('**/api/v1/public/profiles/revoked', route => route.fulfill({ status: 404, json: { success: false } }));
  await page.goto('/p/revoked');
  await expect(page.getByRole('heading', { name: 'Profile unavailable' })).toBeVisible();
});

async function mockStudent(page: import('@playwright/test').Page, dnd = false) {
  await page.addInitScript(({ dnd }) => {
    localStorage.setItem('ua_user_token', 'ui-contract-session');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'student', name: 'Student', email: 'private@example.test' }));
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('ua_prod_focus_session', JSON.stringify({ startedAt: Date.now(), endsAt: Date.now() + 600000, dnd }));
  }, { dnd });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const data = path === '/api/v1/user-auth/me' ? { id: 'student', name: 'Student', email: 'private@example.test', points: 120 }
      : path === '/api/v1/user-auth/me/sharing' ? { token: null }
      : path === '/api/v1/leaderboard/me/rank-change' ? { previousRank: 8, currentRank: 3, changed: true }
      : path.includes('streak/calendar') ? { days: [], currentStreak: 0, longestStreak: 0 }
      : path.includes('streak') ? { currentStreak: 0, longestStreak: 0 }
      : [];
    await route.fulfill({ json: { success: true, data } });
  });
}

test('student enables, previews and revokes profile sharing', async ({ page }) => {
  await mockStudent(page);
  let token: string | null = null;
  await page.route('**/api/v1/user-auth/me/sharing', async route => {
    if (route.request().method() === 'PUT') token = route.request().postDataJSON().enabled ? 'new-share-link' : null;
    await route.fulfill({ json: { success: true, data: { token } } });
  });
  await page.goto('/profile');
  await page.getByRole('switch', { name: 'Enable profile sharing' }).click();
  await expect(page.getByLabel('Public profile link')).toHaveValue(/\/p\/new-share-link$/);
  await expect(page.getByRole('link', { name: 'Preview', exact: true })).toHaveAttribute('href', /\/p\/new-share-link$/);
  await page.getByRole('switch', { name: 'Disable profile sharing' }).click();
  await expect(page.getByLabel('Public profile link')).toHaveCount(0);
});

test('rank improvement displays dismissible celebration', async ({ page }) => {
  await mockStudent(page);
  await page.goto('/profile');
  await expect(page.getByText('Your rank improved!', { exact: false })).toBeVisible();
  await expect(page.locator('.rank-confetti')).toBeVisible();
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(page.locator('.rank-change')).toHaveCount(0);
});

test('DND suppresses rank checks and celebrations', async ({ page }) => {
  await mockStudent(page, true);
  let checks = 0;
  page.on('request', request => { if (request.url().includes('/api/v1/leaderboard/me/rank-change')) checks++; });
  await page.goto('/profile');
  await expect(page.getByRole('heading', { name: 'Share your profile' })).toBeVisible();
  await expect(page.locator('.rank-change')).toHaveCount(0);
  expect(checks).toBe(0);
});
