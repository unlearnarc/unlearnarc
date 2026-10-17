import { test, expect } from '@playwright/test';
import { collectConsoleErrors, filterErrors } from './helpers';

const APP_ROUTES = [
  '/dashboard', '/explore', '/algorithms', '/algorithms/example', '/animations',
  '/contests', '/contests/example', '/courses/example', '/my-courses', '/tests',
  '/leaderboard', '/roadmap', '/interview-experiences', '/profile', '/mascot-preview',
  '/unknown-page',
];

test.describe('Anonymous access', () => {
  test('landing page renders hero and login CTA', async ({ page }) => {
    const errors = collectConsoleErrors(page);
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Get started', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('See it. Try it.');
    expect(filterErrors(errors)).toEqual([]);
  });

  test('login page shows Google sign-in', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
  });

  for (const path of APP_ROUTES) {
    test(`${path} redirects to login without fetching protected content`, async ({ page }) => {
      const apiRequests: string[] = [];
      page.on('request', request => {
        if (request.url().includes('/api/v1/')) apiRequests.push(request.url());
      });
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible();
      expect(apiRequests).toEqual([]);
    });
  }

  test('OAuth callback remains reachable to finish login', async ({ page }) => {
    await page.goto('/auth/callback?error=Access%20denied');
    await expect(page).toHaveURL(/\/login\?error=/);
    await expect(page.getByText('Access denied', { exact: true })).toBeVisible();
  });
});

test.describe('Authenticated access', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if (!sessionStorage.getItem('routing-session-seeded')) {
        localStorage.setItem('ua_user_token', 'routing-test-session');
        localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
        sessionStorage.setItem('routing-session-seeded', '1');
      }
    });
    await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
    await page.route('**/api/v1/user-auth/me', route => route.fulfill({
      json: { data: { id: 'learner', name: 'Alex', email: 'alex@example.com' } },
    }));
  });

  for (const path of ['/', '/login']) {
    test(`${path} redirects an existing session to dashboard`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/dashboard$/);
      await expect(page.locator('main')).toBeVisible();
    });
  }

  for (const path of ['/explore', '/algorithms', '/animations', '/contests', '/mascot-preview']) {
    test(`session can access ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('button', { name: /continue with google/i })).toHaveCount(0);
      await expect(page.locator('main').first()).toBeVisible();
    });
  }

  test('expired contest session redirects to login and clears credentials', async ({ page }) => {
    await page.route('**/api/v1/contests**', route => route.fulfill({ status: 401, json: {} }));
    await page.goto('/contests');
    await expect(page).toHaveURL(/\/login$/);
    expect(await page.evaluate(() => localStorage.getItem('ua_user_token'))).toBeNull();
  });
});
