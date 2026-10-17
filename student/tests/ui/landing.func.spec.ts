import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('ua_user_token');
    localStorage.removeItem('ua_user');
  });
  await page.goto('/');
});

test('launch page highlights real features without invented social proof', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toContainText('See it. Try it.');
  await expect(page.locator('main')).not.toContainText(/5K\+|4\.9|Active Learners|Average Rating|Join thousands/);
  await expect(page.getByRole('heading', { name: 'A little structure. A lot of clarity.' })).toBeAttached();
  await expect(page.getByRole('heading', { name: 'Find your level. Then go further.' })).toBeAttached();
  await expect(page.getByRole('link', { name: 'Browse courses', exact: true }).first()).toHaveAttribute('href', '/explore');
  await expect(page.getByRole('button', { name: 'Get started', exact: true })).toBeVisible();
});

test('binary search preview supports stepping, back, reset, and another target', async ({ page }) => {
  await page.getByRole('link', { name: 'Try the interactive demo' }).click();
  const status = page.getByRole('status').filter({ hasText: 'STEP' });
  const next = page.getByRole('button', { name: 'Next step' });
  await expect(status).toContainText('13 is smaller than 21');
  await next.click();
  await expect(status).toContainText('34 is larger than 21');
  await next.click();
  await expect(status).toContainText('Found 21!');
  await expect(next).toBeDisabled();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(status).toContainText('STEP 2 OF 3');
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(status).toContainText('STEP 1 OF 3');
  await page.getByLabel('Number to find').selectOption('8');
  await next.click();
  await next.click();
  await expect(status).toContainText('Found 8!');
  await page.getByLabel('Number to find').selectOption('13');
  await expect(status).toContainText('Found 13!');
  await expect(next).toBeDisabled();
});

test('FAQ expands and the page fits its viewport', async ({ page }) => {
  const question = page.locator('summary').filter({ hasText: 'How do level-based tests work?' });
  await question.click();
  await expect(page.locator('details[open]')).toContainText('easy, medium, and hard');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('reduced motion keeps content visible, disables parallax, and allows manual demo controls', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByRole('button', { name: 'Enable animations' })).toBeVisible();
  await page.locator('#playground').scrollIntoViewIfNeeded();
  await expect(page.locator('.landing-hero-art')).toHaveCSS('transform', 'none');
  await expect(page.getByRole('heading', { name: 'Less abstract.' })).toBeVisible();
  await page.getByRole('button', { name: 'Next step' }).click();
  await expect(page.locator('.landing-demo-explanation')).toContainText('STEP 2 OF 3');
});

test('animation toggle pauses decorative movement', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: 'Pause animations' }).click();
  await expect(page.getByRole('button', { name: 'Enable animations' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.float-visual')).toHaveCSS('animation-play-state', 'paused');
});

test('landing content has no serious or critical accessibility violations in either theme', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    const results = await new AxeBuilder({ page }).include('.landing-page').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical').map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, reason: n.failureSummary })) })), `${theme} accessibility`).toEqual([]);
  }
});
