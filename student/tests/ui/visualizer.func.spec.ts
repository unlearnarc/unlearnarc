import { expect, test, type Page } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const algorithm = {
  id: 'visualizer-regression', slug: 'visualizer-regression', title: 'Test sort',
  summary: 'Follow each comparison.', usage: 'Use this example to practice sorting.',
  complexity: { time: 'O(n²)', space: 'O(1)' }, visualizer: 'ARRAY',
  javaSource: 'class Example {\n  // Java example\n}',
  pythonSource: Array.from({ length: 80 }, (_, i) => `# Python line ${i + 1}`).join('\n'),
  spec: {
    visualizer: 'ARRAY',
    steps: [
      { title: 'Start', state: { array: [3, 1, 2] }, line: 1, lang: 'python' },
      { title: 'Compare', explanation: 'Compare the current pair. '.repeat(50),
        state: { array: [3, 1, 2] }, line: 40, lang: 'python',
        input: { key: 'swap', prompt: 'Should we swap?', type: 'BOOLEAN', expected: true } },
      { title: 'Sorted', state: { array: [1, 2, 3] }, line: 80, lang: 'python' },
    ],
  },
};

async function openVisualizer(page: Page, language = 'en') {
  await page.addInitScript((lang) => {
    localStorage.setItem('ua_lang', lang);
    localStorage.setItem('ua_algo_code_collapsed', '0');
  }, language);
  await page.route('**/api/v1/**', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ data: [] }),
  }));
  await page.route('**/api/v1/algorithms/slug/visualizer-regression', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ data: algorithm }),
  }));
  await page.goto('/algorithms/visualizer-regression');
  await expect(page.getByRole('heading', { name: 'Test sort', exact: true })).toBeVisible();
}

async function assertStableAfter(page: Page, action: () => Promise<unknown>) {
  const before = await page.evaluate(() => ({
    y: window.scrollY,
    toolbar: document.querySelector('[aria-label="Playback controls"]')!.getBoundingClientRect().top,
  }));
  await action();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => ({
    y: window.scrollY,
    toolbar: document.querySelector('[aria-label="Playback controls"]')!.getBoundingClientRect().top,
  }));
  expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(2);
  expect(Math.abs(after.toolbar - before.toolbar)).toBeLessThanOrEqual(2);
}

test('every locale resolves the visualizer labels, including interpolation', async () => {
  const dir = resolve('src/i18n/locales');
  const source = readFileSync(resolve('src/pages/AlgorithmDetailPage.tsx'), 'utf8');
  const used = [...source.matchAll(/t\('algoDetail\.([^']+)'/g)].map(match => match[1]);
  for (const file of readdirSync(dir).filter(file => file.endsWith('.json'))) {
    const locale = JSON.parse(readFileSync(resolve(dir, file), 'utf8'));
    for (const key of used) {
      expect(typeof locale.algoDetail?.[key], `${file}: algoDetail.${key}`).toBe('string');
      expect(locale.algoDetail[key].trim()).not.toBe('');
    }
    expect(locale.algoDetail.stepN).toContain('{{num}}');
  }
});

test('questions are centered, keyboard-contained and responsive', async ({ page }) => {
  await openVisualizer(page);
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  const modal = page.getByRole('dialog', { name: 'Animation checkpoint question' });
  await expect(modal).toBeVisible();
  await expect(modal).toContainText('Should we swap?');
  const layout = await modal.evaluate(el => {
    const r = el.getBoundingClientRect();
    return {
      dx: Math.abs(r.x + r.width / 2 - innerWidth / 2),
      dy: Math.abs(r.y + r.height / 2 - innerHeight / 2),
      fits: r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
      blur: getComputedStyle(el, '::backdrop').backdropFilter,
      nativeModal: el.matches(':modal'),
    };
  });
  expect(layout.dx).toBeLessThan(2);
  expect(layout.dy).toBeLessThan(2);
  expect(layout.fits).toBe(true);
  expect(layout.blur).toBe('blur(8px)');
  expect(layout.nativeModal).toBe(true);
  await page.keyboard.press('Escape');
  await expect(modal).toBeVisible();
  await page.keyboard.press('Home');
  await expect(modal).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('Tab');
    expect(await modal.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await modal.getByRole('button', { name: 'True', exact: true }).click();
  await expect(modal).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Next step', exact: true })).toBeFocused();
});

test('fullscreen keeps algorithm playback and checkpoint questions accessible', async ({ page }) => {
  await openVisualizer(page);
  await page.getByRole('button', { name: /Full screen/ }).click();
  const focus = page.getByRole('dialog', { name: 'Test sort animation', exact: true });
  await expect(focus).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  const question = page.getByRole('dialog', { name: 'Animation checkpoint question' });
  await expect(question).toBeVisible();
  await question.getByRole('button', { name: 'True', exact: true }).click();
  await expect(question).toHaveCount(0);
  await expect(focus).toBeVisible();
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await expect(focus).toHaveCount(0);
  await expect(page.getByText('Correct! Continue to see the next step.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('labels resolve in the normal, checkpoint and completed states', async ({ page }) => {
  await openVisualizer(page);
  await expect(page.getByText('Current action', { exact: true })).toBeVisible();
  await expect(page.getByText('Paused', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByText('Awaiting answer', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'True', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Correct!');
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByText('Complete', { exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('algoDetail.');
});

test('localized labels and missing algorithm state do not show raw keys', async ({ page }) => {
  await openVisualizer(page, 'ta');
  await expect(page.getByText('தற்போதைய செயல்', { exact: true })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('algoDetail.');
  await page.route('**/api/v1/algorithms/slug/missing', route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ data: null }),
  }));
  await page.goto('/algorithms/missing');
  await expect(page.getByRole('link', { name: 'அல்காரிதங்களுக்குத் திரும்பு' })).toBeVisible();
  await expect(page.locator('main')).not.toContainText('algoDetail.');
});

test('stepping, checkpoints, restart and language changes preserve page position', async ({ page }) => {
  await openVisualizer(page);
  const next = page.getByRole('button', { name: 'Next step', exact: true });
  await next.scrollIntoViewIfNeeded();
  await assertStableAfter(page, () => next.click());
  const listing = page.getByLabel('Source code listing');
  expect(await listing.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  // The long explanation must remain accessible inside the inspector.
  await page.getByLabel('Step inspector').evaluate(el => { el.scrollTop = el.scrollHeight; });
  await page.getByRole('button', { name: 'True', exact: true }).scrollIntoViewIfNeeded();
  await assertStableAfter(page, () => page.getByRole('button', { name: 'True', exact: true }).click());
  await next.scrollIntoViewIfNeeded();
  await assertStableAfter(page, () => next.click());
  await expect(page.getByLabel('Source code').locator('[aria-current="true"]')).toContainText('80');
  await page.getByRole('button', { name: 'Java', exact: true }).scrollIntoViewIfNeeded();
  await assertStableAfter(page, () => page.getByRole('button', { name: 'Java', exact: true }).click());
  await assertStableAfter(page, () => page.getByRole('button', { name: 'Python', exact: true }).click());
  await page.getByRole('button', { name: 'Restart', exact: true }).scrollIntoViewIfNeeded();
  await assertStableAfter(page, () => page.getByRole('button', { name: 'Restart', exact: true }).click());
  // The first line is visible; the viewport may retain its 8px top padding.
  expect(await listing.evaluate(el => el.scrollTop)).toBeLessThanOrEqual(8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('autoplay does not pull the learner down to the code panel', async ({ page }) => {
  await openVisualizer(page);
  await page.getByRole('button', { name: 'Play', exact: true }).scrollIntoViewIfNeeded();
  await page.getByLabel('Playback speed', { exact: true }).selectOption('200');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.getByText('Awaiting answer', { exact: true })).toBeVisible();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test('collapsed code stays collapsed through playback and can be reopened', async ({ page }) => {
  await openVisualizer(page);
  await page.getByRole('button', { name: 'Hide code' }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).scrollIntoViewIfNeeded();
  await assertStableAfter(page, () => page.getByRole('button', { name: 'Next step', exact: true }).click());
  await expect(page.getByLabel('Source code listing')).toHaveCount(0);
  const showCode = page.getByRole('button', { name: 'Show code' });
  // Answer the modal before interacting with the background code controls.
  await page.getByRole('dialog').getByRole('button', { name: 'True', exact: true }).click();
  await showCode.focus();
  await showCode.press('Enter');
  expect(await page.getByLabel('Source code listing').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
});
