import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openLesson(page: Page, code: boolean) {
  await page.addInitScript(() => {
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_user_token', 'animation-detail-test');
  });
  const trace = {
    id: 'detail', title: 'SQL lesson', description: 'Join related records.', category: 'DATABASE', duration: 5000,
    viewport: { width: 720, height: 360 },
    keyframes: [{ time: 0, entities: {} }, { time: 2000, entities: {} }, { time: 5000, entities: {} }],
    instructions: [{ id: 'start', title: 'Read the tables', time: 0 }, { id: 'match', title: 'Match records', time: 2000 }],
    notes: { summary: 'Matching records are returned.', whereToUse: ['Reporting across related tables.'], keyPoints: ['Unmatched records are excluded.'] },
    programs: code ? [
      { id: 'sql', label: 'Query', language: 'sql', source: 'SELECT users.id\nFROM users\nINNER JOIN orders ON users.id = orders.user_id;', highlights: [{ time: 0, lines: [1, 2] }, { time: 2000, lines: [3] }] },
      { id: 'python', label: 'Python reference', language: 'python', source: 'matches = []\nprint(matches)', highlights: [{ time: 0, lines: [1] }] },
    ] : [],
  };
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/v1/animation-scenes/detail', route => route.fulfill({ json: { data: { id: 'detail', title: trace.title, category: 'DATABASE', trace } } }));
  await page.goto('/animations?category=DATABASE&scene=detail');
  await expect(page.getByRole('heading', { name: 'SQL lesson', exact: true })).toBeVisible();
}

test('shared editor switches real programs, highlights seeked lines, and tabs preserve playback state', async ({ page }) => {
  await openLesson(page, true);
  const editor = page.locator('.cm-editor');
  await expect(editor).toHaveCount(1);
  await expect(editor).toContainText('SELECT users.id');
  await expect(editor.locator('.cm-execution-line')).toHaveCount(2);
  await expect(editor.locator('.cm-content')).toHaveAttribute('aria-readonly', 'true');
  await page.getByRole('button', { name: 'Next keyframe', exact: true }).click();
  await expect(page.getByRole('slider')).toHaveValue('2000');
  await expect(editor.locator('.cm-execution-line')).toHaveCount(1);
  await expect(editor.locator('.cm-execution-line')).toContainText('INNER JOIN');
  await page.getByRole('tab', { name: 'Code Example', exact: true }).click();
  await expect(page.locator('canvas')).toBeHidden();
  await expect(editor).toBeVisible();
  await page.getByRole('button', { name: /Python reference/ }).click();
  await expect(editor).toContainText('matches = []');
  await expect(editor).not.toContainText('SELECT users.id');
  await page.getByRole('tab', { name: 'Explanation', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByText('Reporting across related tables.')).toBeVisible();
  await page.getByRole('tab', { name: 'Visualizer', exact: true }).click();
  await expect(page.getByRole('slider')).toHaveValue('2000');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await expect(page.getByRole('slider')).toHaveValue('0');
  await page.getByRole('combobox', { name: 'Playback speed' }).selectOption('2');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.getByRole('tab', { name: 'Code Example', exact: true }).click();
  await page.getByRole('tab', { name: 'Visualizer', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Playback speed' })).toHaveValue('2');
});

test('no-code lesson expands without an empty editor and supports keyboard tabs and category breadcrumbs', async ({ page }) => {
  await openLesson(page, false);
  await expect(page.locator('.animation-detail-workspace')).not.toHaveClass(/has-code/);
  await expect(page.locator('.cm-editor')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Key takeaway' })).toBeVisible();
  await page.getByRole('tab', { name: 'Visualizer', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Code Example', exact: true })).toBeFocused();
  await expect(page.getByText('This lesson is taught visually', { exact: false })).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Explanation', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('Matching records are returned.')).toBeVisible();
  await page.getByRole('navigation', { name: 'Breadcrumb', exact: true }).getByRole('link', { name: 'SQL / Database' }).click();
  await expect(page).toHaveURL(/category=DATABASE$/);
});

test('detail fits desktop tablet and phone in both themes with accessible tabs and editor', async ({ page }) => {
  await openLesson(page, true);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => localStorage.setItem('ua_theme', t), theme);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    for (const width of [1440, 1000, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const columns = await page.locator('.animation-detail-workspace').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
      expect(columns).toBe(width >= 1200 ? 2 : 1);
    }
    for (const tab of ['Visualizer', 'Code Example', 'Explanation']) {
      await page.getByRole('tab', { name: tab, exact: true }).click();
      const result = await new AxeBuilder({ page }).include('.animation-detail').withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(result.violations.map(v => `${v.id}: ${v.nodes.map(n => n.target).join(', ')}`), `${theme}: ${tab}`).toEqual([]);
    }
  }
});
