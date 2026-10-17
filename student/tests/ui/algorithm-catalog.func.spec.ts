import { test, expect, type Page } from '@playwright/test';
import { selectAlgorithms, type AlgorithmSummary } from '../../src/components/algorithms/catalog';
import { readdirSync } from 'node:fs';
const items: AlgorithmSummary[] = [
  { id: '1', slug: 'binary-search', title: 'Binary Search', summary: 'Probe a sorted range.', category: 'Searching', difficulty: 'EASY', visualizer: 'ARRAY', thumbnailUrl: '/images/algorithms/binary-search.svg', createdAt: '2025-01-01' },
  { id: '2', slug: 'merge-sort', title: 'Merge Sort', summary: 'Split and merge sorted halves.', category: 'Sorting', difficulty: 'MEDIUM', visualizer: 'ARRAY', thumbnailUrl: 'https://cdn.example.org/broken.svg', createdAt: '2026-01-01' },
  { id: '3', slug: 'bfs', title: 'Breadth-First Search', summary: 'Explore each graph level.', category: 'Graphs', difficulty: 'HARD', visualizer: 'GRAPH' },
  { id: '4', slug: 'new-algorithm', title: 'New Algorithm', visualizer: 'CUSTOM', thumbnailUrl: 'javascript:alert(1)' },
];
async function open(page: Page) {
  await page.addInitScript(() => { localStorage.setItem('ua_lang', 'en'); localStorage.setItem('ua_user_token', 'catalog-test'); });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/v1/algorithms/published', route => route.fulfill({ json: { data: items } }));
  await page.route('https://cdn.example.org/**', route => route.abort());
  await page.goto('/algorithms');
  await expect(page.getByRole('heading', { name: 'Algorithm Visualizer', exact: true })).toBeVisible();
}
test('catalog selection combines metadata search, category and stable sorts without mutation', () => {
  expect(selectAlgorithms(items, 'sorted', 'Sorting', 'name').map(a => a.id)).toEqual(['2']);
  expect(selectAlgorithms(items, 'graph hard', '', 'name').map(a => a.id)).toEqual(['3']);
  expect(selectAlgorithms(items, '', '', 'difficulty').map(a => a.id)).toEqual(['1', '2', '3', '4']);
  expect(selectAlgorithms(items, '', '', 'recent')[0].id).toBe('2');
  expect(items.map(a => a.id)).toEqual(['1', '2', '3', '4']);
});
test('every repository algorithm has a local, title-free SVG preview', () => {
  const assets = new Set(readdirSync('public/images/algorithms'));
  for (const file of readdirSync('../backend/algoviz_specs').filter(f => f.endsWith('.json'))) {
    expect(assets.has(file.replace('.json', '.svg')), file).toBe(true);
  }
});
test('search, filters, sorting, reset and existing card routes work together', async ({ page }) => {
  await open(page);
  await expect(page.locator('.visualizer-card')).toHaveCount(4);
  await page.getByRole('group', { name: 'Algorithm categories' }).getByRole('button', { name: 'Sorting 1', exact: true }).click();
  await page.getByRole('searchbox', { name: 'Search algorithms' }).fill('split');
  await expect(page.locator('.visualizer-card')).toHaveCount(1);
  await expect(page.getByRole('status')).toContainText('1 of 4');
  await page.getByRole('searchbox').fill('nothing matches');
  await expect(page.getByRole('heading', { name: 'No algorithms found' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset filters' }).first().click();
  await page.getByRole('combobox', { name: 'Sort algorithms' }).selectOption('recent');
  await expect(page.locator('.visualizer-card').first()).toHaveAttribute('href', '/algorithms/merge-sort');
  await page.locator('.visualizer-card').first().focus();
  await expect(page.locator('.visualizer-card').first()).toBeFocused();
});
test('real assets, broken images and unknown algorithms render without broken icons', async ({ page }) => {
  await open(page);
  await expect(page.locator('img[alt="Binary Search algorithm preview"]')).toHaveJSProperty('naturalWidth', 480);
  await expect(page.locator('img[alt="Merge Sort algorithm preview"]')).toHaveAttribute('src', '/images/algorithms/merge-sort.svg');
  await expect(page.getByRole('img', { name: 'New Algorithm visualization preview' })).toBeVisible();
  await expect(page.locator('img[alt="Breadth-First Search algorithm preview"]')).toHaveAttribute('loading', 'eager');
  expect(await page.locator('.visualizer-card').count()).toBe(4);
});
test('light/dark layouts fit desktop, tablet and mobile', async ({ page }) => {
  await open(page);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    for (const [width, columns] of [[1440, 3], [1000, 2], [390, 1]]) {
      await page.setViewportSize({ width, height: 900 });
      const tracks = await page.locator('.visualizer-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(tracks).toBe(columns);
      // The existing shell animates its sidebar margin for 300ms across breakpoints.
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
test('API failure offers retry instead of pretending the catalog is empty', async ({ page }) => {
  await open(page);
  await page.route('**/api/v1/algorithms/published', route => route.fulfill({ status: 500, json: { message: 'Unavailable' } }));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Unable to load algorithms', { timeout: 20000 });
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
