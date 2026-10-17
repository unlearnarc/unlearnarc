import { test, expect } from '@playwright/test';

const scenes = [
  { id: 'join', slug: 'sql-inner-join', title: 'SQL INNER JOIN', description: 'Match tables by key.', category: 'DATABASE', thumbnailUrl: '/images/animations/sql-inner-join.svg', duration: 2050, keyframeCount: 4, createdAt: '2026-01-01' },
  { id: 'walk', slug: 'sql-join-query-walkthrough', title: 'SQL — clause by clause', description: 'Walk through SQL code.', category: 'DATABASE', thumbnailUrl: '/images/animations/sql-join-query-walkthrough.svg', createdAt: '2026-02-01' },
  { id: 'graph', title: 'BFS', category: 'DSA', thumbnailUrl: '/images/animations/missing.svg' },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('ua_lang', 'en'); localStorage.setItem('ua_user_token', 'category-test'); });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/v1/animation-scenes/published', route => route.fulfill({ json: { data: scenes } }));
});

test('View all stays available for two SQL lessons and opens the category layout', async ({ page }) => {
  await page.goto('/animations');
  await page.getByRole('button', { name: 'View all SQL / Database', exact: true }).click();
  await expect(page).toHaveURL(/category=DATABASE/);
  await expect(page.getByRole('heading', { name: 'SQL / Database', level: 1 })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toContainText('Animations');
  await expect(page.getByRole('complementary', { name: 'SQL / Database summary' })).toContainText('2 SQL animations');
  await expect(page.locator('.animation-library-card')).toHaveCount(2);
  await expect(page.getByPlaceholder('Search SQL animations...')).toBeVisible();
  await page.getByRole('combobox', { name: 'Sort animations' }).selectOption('recent');
  await expect(page.locator('.animation-library-card').first()).toHaveAttribute('href', '/animations?category=DATABASE&scene=walk');
  await page.getByRole('searchbox').fill('match');
  await expect(page.locator('.animation-library-card')).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('1 of 2 animations');
  await page.getByRole('searchbox').fill('not found');
  await expect(page.getByRole('heading', { name: 'No animations found' })).toBeVisible();
  await page.getByRole('searchbox').fill('');
  await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Animations', exact: true }).click();
  await expect(page.locator('.animation-library-card')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'View all DSA / Graphs', exact: true })).toBeVisible();
});

test('category deep links, real SVG loading, fallback and responsive themes', async ({ page }) => {
  await page.goto('/animations?category=DATABASE');
  await expect(page.locator('.animation-library-card')).toHaveCount(2);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    for (const [width, columns] of [[1440, 3], [1000, 2], [390, 1], [320, 1]]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.locator('.animation-library-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(columns);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await expect.poll(() => page.locator('.animation-library-preview img').first().evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
  await page.getByRole('group', { name: 'Animation categories' }).getByRole('button', { name: 'DSA / Graphs 1 animations', exact: true }).click();
  await expect(page).toHaveURL(/category=DSA/);
  await expect(page.locator('.animation-library-preview svg')).toHaveCount(1);
  await expect(page.locator('.animation-library-preview img')).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'DSA / Graphs' })).toBeVisible();
});
