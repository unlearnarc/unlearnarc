import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const longName = 'Systems architecture and distributed infrastructure engineering fundamentals';
const skills = Array.from({ length: 40 }, (_, index) => ({ id: `skill-${index}`, name: `Skill ${String(index).padStart(2, '0')}` }));
skills.push({ id: 'systems', name: longName });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'roadmap-filter-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Learner' }));
    localStorage.setItem('ua_feature_tour_v1_learner', 'done');
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_theme', 'light');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/user-auth/me')) data = { id: 'learner', name: 'Learner' };
    if (path.endsWith('/roles')) data = skills.map((skill, index) => ({ id: `role-${index}`, name: `Role ${index}`, skills: [skill] }));
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/roadmap');
});

test('overflow skills can be searched, selected by keyboard, promoted and reset', async ({ page }) => {
  const filter = page.getByRole('combobox', { name: 'Filter by skill:' });
  await filter.click();
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(34);
  await filter.fill('infrastructure systems');
  await expect(page.getByRole('listbox').getByRole('option')).toHaveCount(1);
  await filter.press('Enter');
  const chip = page.getByRole('button', { name: longName, exact: true });
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.roadmap-role-card')).toHaveCount(1);
  await expect(filter).toHaveAttribute('aria-expanded', 'false');
  await filter.fill('no-such-skill');
  await expect(page.getByText('No matches. Try a different search.')).toBeVisible();
  await filter.press('Escape');
  await expect(chip).toHaveAttribute('aria-pressed', 'true');
  await chip.click();
  await expect(page.locator('.roadmap-role-card')).toHaveCount(41);
  await filter.fill('skill 39');
  await page.getByRole('listbox').getByRole('option', { name: 'Skill 39', exact: true }).click();
  await expect(page.locator('.roadmap-role-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Reset filters', exact: true }).click();
  await expect(page.locator('.roadmap-role-card')).toHaveCount(41);
});

test('fixed dropdown dimensions and long names fit mobile and desktop in both themes', async ({ page }) => {
  const filter = page.getByRole('combobox', { name: 'Filter by skill:' });
  for (const width of [320, 375, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await filter.click();
    const panel = page.locator('.searchable-select-panel');
    const before = await panel.boundingBox();
    await expect(page.getByRole('listbox').getByRole('option', { name: longName, exact: true }).locator('span')).toHaveAttribute('title', longName);
    await filter.fill('infrastructure');
    const after = await panel.boundingBox();
    expect(after!.width).toBeCloseTo(before!.width, 0);
    expect(after!.height).toBeCloseTo(before!.height, 0);
    expect(after!.x).toBeGreaterThanOrEqual(0);
    expect(after!.x + after!.width).toBeLessThanOrEqual(width);
    const row = await page.getByRole('listbox').getByRole('option').boundingBox();
    expect(row!.height).toBe(64);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await filter.press('Escape');
  }
  await filter.click();
  const audit = await new AxeBuilder({ page }).include('.roadmap-filters').analyze();
  expect(audit.violations).toEqual([]);
});
