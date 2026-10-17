import { test, expect, type Page } from '@playwright/test';
import { selectScenes, safeThumbnail, type SceneSummary } from '../../src/components/animations/catalog';
const scenes: SceneSummary[] = [
  { id: 'join', title: 'SQL — INNER JOIN', slug: 'sql-join', category: 'DATABASE', description: 'Match records across tables.', duration: 2600, keyframeCount: 5, createdAt: '2025-01-01' },
  { id: 'search', title: 'Binary Search', slug: 'binary-search', category: 'DSA', description: 'Probe a sorted array.', createdAt: '2026-01-01' },
  { id: 'sort', title: 'Merge Sort', slug: 'merge-sort', category: 'DSA', description: 'Divide and merge.', createdAt: '2024-01-01' },
  { id: 'network', title: 'Packet routing', category: 'NETWORKING' },
];
async function open(page: Page) {
  await page.addInitScript(() => { localStorage.setItem('ua_lang', 'en'); localStorage.setItem('ua_user_token', 'animation-library-test'); });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/v1/animation-scenes/published', route => route.fulfill({ json: { data: scenes } }));
  await page.goto('/animations');
  await expect(page.locator('.animation-library-card')).toHaveCount(4);
}
test('selection combines domains, multiword metadata search, and deterministic sorts', () => {
  expect(selectScenes(scenes, 'sorted graphs', 'DSA', 'name').map(s => s.id)).toEqual(['search']);
  expect(selectScenes(scenes, '', 'DSA', 'recent').map(s => s.id)).toEqual(['search', 'sort']);
  expect(selectScenes(scenes, '', 'OTHER', 'name').map(s => s.id)).toEqual(['network']);
  expect(scenes[0].id).toBe('join');
  expect(safeThumbnail('javascript:alert(1)')).toBeUndefined();
  expect(safeThumbnail('/images/animations/join.svg')).toBe('/images/animations/join.svg');
});
test('grouped categories, real counts, search, sorting, empty reset and keyboard lesson links', async ({ page }) => {
  await open(page);
  await expect(page.locator('.animation-library-section')).toHaveCount(3);
  await expect(page.locator('canvas')).toHaveCount(0);
  await expect(page.getByRole('group', { name: 'Animation categories' }).getByRole('button', { name: 'DSA / Graphs 2 animations', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'View all DSA / Graphs', exact: true }).click();
  await expect(page.locator('.animation-library-card')).toHaveCount(2);
  await page.getByRole('combobox', { name: 'Sort animations' }).selectOption('recent');
  await expect(page.locator('.animation-library-card').first()).toHaveAttribute('href', '/animations?category=DSA&scene=search');
  await page.getByRole('searchbox', { name: 'Search animations' }).fill('divide');
  await expect(page.locator('.animation-library-card')).toHaveCount(1);
  await page.getByRole('searchbox').fill('no match');
  await expect(page.getByRole('heading', { name: 'No animations found' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).click();
  await expect(page.locator('.animation-library-card')).toHaveCount(4);
  const join = page.getByRole('link', { name: 'Watch SQL — INNER JOIN', exact: true });
  await expect(join).toContainText('2.6s');
  await expect(join).toContainText('5 frames');
  await expect(page.getByRole('link', { name: 'Watch Binary Search', exact: true })).not.toContainText('frames');
  await join.focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/scene=join/);
  await page.getByRole('link', { name: 'Back to animations' }).click();
  await expect(page.locator('.animation-library-card')).toHaveCount(4);
});
test('light and dark responsive grids keep navigation scroll inside the page', async ({ page }) => {
  await open(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    for (const [width, columns] of [[1440, 3], [1000, 2], [390, 1], [320, 1]]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.locator('.animation-library-grid').first().evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
test('failed feed has an explicit retry state', async ({ page }) => {
  await open(page);
  await page.route('**/api/v1/animation-scenes/published', route => route.fulfill({ status: 500, json: {} }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Unable to load animations', { timeout: 25000 });
});
