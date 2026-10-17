import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('leaderboard colors remain readable in both themes and on narrow phones', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'leaderboard-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex', region: 'India' }));
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_theme', 'light');
  });
  const rows = ['Sam', 'Taylor', 'Jordan', 'Alex'].map((name, i) => ({
    rank: i + 1, userId: i === 3 ? 'learner' : `user-${i}`, name,
    region: 'India', points: 1000 - i * 100, isCurrentUser: i === 3,
  }));
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex', region: 'India' };
    else if (path.includes('/streak')) data = { activeToday: true };
    else if (path === '/leaderboard/regions') data = ['India'];
    else if (path === '/leaderboard/me') data = rows[3];
    else if (path.startsWith('/leaderboard')) data = rows;
    await route.fulfill({ json: { data } });
  });
  await page.goto('/leaderboard');
  await expect(page.locator('.leaderboard-podium')).toHaveCount(3);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const scan = await new AxeBuilder({ page }).include('.leaderboard-page').withRules(['color-contrast']).analyze();
    expect(scan.violations).toEqual([]);
    await page.getByRole('button', { name: 'Region', exact: true }).click();
    await expect(page.getByRole('combobox')).toHaveValue('India');
    await expect(page.getByRole('button', { name: 'Region', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Global', exact: true }).click();
  }
});
