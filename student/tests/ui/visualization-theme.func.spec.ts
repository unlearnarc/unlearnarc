import { expect, test, type Locator, type Page } from '@playwright/test';

async function canvasPixel(canvas: Locator, x = 2, y = 2) {
  return canvas.evaluate((el, point) => {
    const ctx = (el as HTMLCanvasElement).getContext('2d')!;
    return [...ctx.getImageData(point.x, point.y, 1, 1).data];
  }, { x, y });
}

async function setup(page: Page, mode: 'light' | 'dark') {
  await page.addInitScript(theme => {
    localStorage.setItem('ua_theme', theme);
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_user_token', 'theme-regression-session');
    localStorage.setItem('ua_algo_code_collapsed', '0');
  }, mode);
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
}

async function switchTheme(page: Page, to: 'light' | 'dark') {
  // Theme switching lives only in the sidebar on desktop and mobile.
  const toggle = page.getByRole('button', { name: to === 'light' ? 'Light mode' : 'Dark mode', exact: true });
  await expect(toggle).toHaveCount(1);
  await expect(page.locator('header').getByRole('button', { name: /^(Light|Dark) mode$/ })).toHaveCount(0);
  if (await page.getByRole('button', { name: 'Open menu', exact: true }).isVisible()) {
    await page.getByRole('button', { name: 'Open menu', exact: true }).click();
  }
  await toggle.filter({ visible: true }).first().click();
  const closeMenu = page.getByRole('button', { name: /close menu/i });
  if (await closeMenu.isVisible()) await closeMenu.click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', to);
  expect(await page.evaluate(() => localStorage.getItem('ua_theme'))).toBe(to);
}

for (const mode of ['light', 'dark'] as const) {
  test(`algorithm canvas and code follow ${mode} mode and switch without resetting`, async ({ page }) => {
    await setup(page, mode);
    await page.route('**/api/v1/algorithms/slug/theme-example', route => route.fulfill({ json: { data: {
      id: 'theme-example', slug: 'theme-example', title: 'Theme example', pythonSource: 'print(1)\nprint(2)',
      spec: { visualizer: 'MATRIX', steps: [
        { title: 'Start', state: { matrix: [[1, 2], [3, 4]] }, line: 1, lang: 'python' },
        { title: 'Visit', state: { matrix: [[1, 2], [3, 4]], cursor: [0, 0], visited: [[0, 1]] }, line: 2, lang: 'python' },
      ] },
    } } }));
    await page.goto('/algorithms/theme-example');
    const canvas = page.getByRole('region', { name: 'Algorithm grid visualization' }).locator('canvas');
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvasPixel(canvas)).toEqual(mode === 'light' ? [255, 255, 255, 255] : [15, 23, 42, 255]);
    await expect(page.getByLabel('Source code', { exact: true })).toHaveCSS('background-color', mode === 'light' ? 'rgb(255, 255, 255)' : 'rgb(24, 33, 43)');
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
    await switchTheme(page, mode === 'light' ? 'dark' : 'light');
    await expect.poll(() => canvasPixel(canvas)).toEqual(mode === 'light' ? [15, 23, 42, 255] : [255, 255, 255, 255]);
    await expect(page.getByLabel('Step timeline')).toHaveValue('1');
    await expect(page.getByLabel('Source code').locator('[aria-current="true"]')).toContainText('print(2)');
  });

  test(`saved animation trace follows ${mode} mode including caption and panels`, async ({ page }) => {
    await setup(page, mode);
    const trace = {
      id: 'theme-scene', title: 'Theme scene', duration: 5000,
      viewport: { width: 960, height: 540 },
      theme: { background: '#0F172A', textColor: '#F1F5F9', tokens: { primary: '#2563EB' } },
      keyframes: [
        { time: 0, entities: {}, caption: 'Start' },
        { time: 5000, entities: {}, caption: 'Done' },
      ],
      instructions: [{ id: 'start', time: 0, title: 'Start' }],
      notes: { summary: 'A themed scene.' },
      programs: [{ id: 'sql', label: 'SQL', language: 'sql', source: 'SELECT 1;' }],
    };
    await page.route('**/api/v1/animation-scenes/published', route => route.fulfill({ json: { data: [{ id: trace.id, title: trace.title }] } }));
    await page.route('**/api/v1/animation-scenes/theme-scene', route => route.fulfill({ json: { data: { trace } } }));
    await page.goto('/animations');
    await page.getByRole('link', { name: 'Watch Theme scene', exact: true }).click();
    const canvas = page.locator('canvas[aria-label="Theme scene"]');
    await expect(canvas).toBeVisible();
    await expect.poll(() => canvasPixel(canvas)).toEqual(mode === 'light' ? [255, 255, 255, 255] : [15, 23, 42, 255]);
    for (const label of ['Step-by-step instructions', 'About this animation']) {
      await expect(page.getByLabel(label)).toHaveCSS('background-color', mode === 'light' ? 'rgb(238, 242, 247)' : 'rgb(32, 43, 54)');
    }
    await expect(page.getByLabel('Program source code')).toHaveCSS('background-color', mode === 'light' ? 'rgb(255, 255, 255)' : 'rgb(24, 33, 43)');
    await switchTheme(page, mode === 'light' ? 'dark' : 'light');
    await expect.poll(() => canvasPixel(canvas)).toEqual(mode === 'light' ? [15, 23, 42, 255] : [255, 255, 255, 255]);
    await page.getByRole('button', { name: /Full screen/ }).click();
    await expect.poll(() => canvasPixel(canvas)).toEqual(mode === 'light' ? [15, 23, 42, 255] : [255, 255, 255, 255]);
  });
}
