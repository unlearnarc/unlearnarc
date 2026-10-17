import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES: Array<[string, string]> = [
  ['Landing', '/'], ['Login', '/login'], ['Explore', '/explore'],
  ['Algorithms', '/algorithms'], ['Animations', '/animations'],
];

// Keep the existing critical-only gate; report serious issues for follow-up.
for (const [name, path] of PAGES) {
  test(`a11y: ${name} (${path}) has no critical violations`, async ({ page }) => {
    if (path !== '/' && path !== '/login') {
      await page.addInitScript(() => localStorage.setItem('ua_user_token', 'a11y-test-session'));
      await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
      await page.route('**/api/v1/user-auth/me', route => route.fulfill({
        json: { data: { id: 'learner', name: 'Alex' } },
      }));
    }
    await page.goto(path);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await page.waitForLoadState('networkidle');
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const serious = results.violations.filter(v => v.impact === 'serious');
    if (serious.length) console.log(`[a11y:${name}] serious warnings:`, serious.map(v => ({ id: v.id, help: v.help, targets: v.nodes.map(n => n.target) })));
    expect(results.violations.filter(v => v.impact === 'critical'), `critical a11y violations on ${name}`).toEqual([]);
  });
}

test('a11y: landing page is keyboard-navigable to the CTA', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Tab');
  const active = await page.evaluate(() => document.activeElement?.tagName ?? '');
  expect(['A', 'BUTTON', 'INPUT']).toContain(active);
});
