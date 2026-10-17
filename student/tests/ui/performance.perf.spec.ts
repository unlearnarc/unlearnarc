import { test, expect } from '@playwright/test';
import { fetchRealToken, seedAuth, type SeededSession } from './helpers';

/**
 * PERFORMANCE UI AUTOMATION — Web-Vitals & load budgets.
 *
 * Measures real browser timings via the Navigation Timing + Paint Timing APIs
 * and asserts against budgets. These are dev-machine budgets (generous); tighten
 * for CI once you have a baseline. Each page is loaded cold (fresh context).
 */

interface PerfMetrics {
  /** Time to first byte (ms). */
  ttfb: number;
  /** DOM content loaded (ms from navigationStart). */
  domContentLoaded: number;
  /** Full load event (ms). */
  loadComplete: number;
  /** First Contentful Paint (ms). */
  fcp: number;
  /** Total JS transfer size (bytes). */
  jsBytes: number;
}

async function measure(page: import('@playwright/test').Page, path: string): Promise<PerfMetrics> {
  await page.goto(path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle');

  return page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const fcpEntry = performance
      .getEntriesByType('paint')
      .find((e) => e.name === 'first-contentful-paint');
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsBytes = resources
      .filter((r) => r.name.endsWith('.js') || r.initiatorType === 'script')
      .reduce((sum, r) => sum + (r.transferSize || 0), 0);

    return {
      ttfb: nav.responseStart - nav.requestStart,
      domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
      loadComplete: nav.loadEventEnd - nav.startTime,
      fcp: fcpEntry ? fcpEntry.startTime : -1,
      jsBytes,
    };
  });
}

// Dev-build budgets (ms / bytes). CI prod-build budgets should be ~3x tighter.
const BUDGETS = {
  ttfb: 800,
  fcp: 3500,
  domContentLoaded: 6000,
  loadComplete: 9000,
  jsBytes: 12 * 1024 * 1024, // dev serves unminified + source maps
};

const PAGES: Array<[string, string]> = [
  ['Landing', '/'],
  ['Explore', '/explore'],
  ['Algorithms', '/algorithms'],
];

for (const [name, path] of PAGES) {
  test(`perf: ${name} (${path}) meets load budgets`, async ({ page }) => {
    if (path !== '/') {
      await seedAuth(page, { token: 'performance-test-session', refreshToken: '' });
      await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
      await page.route('**/api/v1/user-auth/me', route => route.fulfill({
        json: { data: { id: 'learner', name: 'Alex' } },
      }));
    }
    const m = await measure(page, path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));

    console.log(
      `\n[perf:${name}] TTFB=${m.ttfb.toFixed(0)}ms  FCP=${m.fcp.toFixed(0)}ms  ` +
        `DCL=${m.domContentLoaded.toFixed(0)}ms  Load=${m.loadComplete.toFixed(0)}ms  ` +
        `JS=${(m.jsBytes / 1024 / 1024).toFixed(2)}MB`,
    );

    expect.soft(m.ttfb, 'TTFB budget').toBeLessThan(BUDGETS.ttfb);
    if (m.fcp >= 0) expect.soft(m.fcp, 'FCP budget').toBeLessThan(BUDGETS.fcp);
    expect.soft(m.domContentLoaded, 'DCL budget').toBeLessThan(BUDGETS.domContentLoaded);
    expect(m.loadComplete, 'Load budget').toBeLessThan(BUDGETS.loadComplete);
  });
}

test.describe('client-side navigation performance', () => {
  let session: SeededSession;
  test.beforeAll(async ({ request }) => {
    session = await fetchRealToken(request);
  });
  test.beforeEach(async ({ page }) => {
    await seedAuth(page, session);
  });

  test('perf: client-side route change is fast (no full reload)', async ({ page }) => {
    // The sidebar nav links only render when authenticated. Our minted token is
    // an ADMIN identity which the student-only /user-auth/me endpoint 401s —
    // that 401 trips the axios interceptor and logs us out before we can click.
    // Stub /user-auth/me + the streak ping with a valid student profile so the
    // session survives and the authenticated sidebar renders. This isolates the
    // measurement to the pure client-side route transition (the thing we test).
    // Exact /me (not the /me/streak/... children).
    await page.route('**/api/v1/user-auth/me', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: { id: 'test', name: 'Test', email: 't@t.com', points: 0, rank: 0 },
        }),
      }),
    );
    // Streak ping + read (POST /me/streak/ping, GET /me/streak).
    await page.route('**/api/v1/user-auth/me/streak**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { currentStreak: 1, longestStreak: 1 } }),
      }),
    );

    await page.goto('/explore', { waitUntil: 'load' });
    await expect(page.locator('a[href="/animations"]').first()).toBeVisible();

    const start = Date.now();
    await page.locator('a[href="/animations"]').first().click();
    await page.waitForURL(/\/animations/, { timeout: 5000 });
    const elapsed = Date.now() - start;
    console.log(`\n[perf:route] /explore -> /animations in ${elapsed}ms`);
    expect(elapsed, 'client route change').toBeLessThan(3000);
  });
});
