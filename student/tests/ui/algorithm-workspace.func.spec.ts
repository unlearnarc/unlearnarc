import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const fixture = (slug: string) => JSON.parse(readFileSync(resolve(`../backend/algoviz_specs/${slug}.json`), 'utf8'));

async function setup(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_user_token', 'workspace-test');
    localStorage.setItem('ua_algo_code_collapsed', '0');
  });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
  for (const slug of ['binary-search', 'bubble-sort']) {
    await page.route(`**/api/v1/algorithms/slug/${slug}`, route => route.fulfill({ json: { data: { id: slug, ...fixture(slug) } } }));
  }
}

async function answerInitialCheckpoint(page: Page, slug: string) {
  const expected = fixture(slug).spec.steps[0].input.expected;
  const question = page.getByRole('dialog', { name: 'Animation checkpoint question' });
  await expect(question).toBeVisible();
  const number = question.locator('input');
  if (await number.count()) {
    await number.fill(String(expected));
    await question.getByRole('button', { name: 'Submit', exact: true }).click();
  } else {
    await question.getByRole('button', { name: expected ? 'True' : 'False', exact: true }).click();
  }
}

for (const slug of ['binary-search', 'bubble-sort']) {
  test(`${slug} uses real sources, synchronized walkthrough, tabs and editor actions`, async ({ page, context }) => {
    await setup(page);
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/algorithms/${slug}`);
    await answerInitialCheckpoint(page, slug);
    await expect(page.getByRole('tab', { name: 'Visualization', exact: true })).toHaveAttribute('aria-selected', 'true');
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect(page.getByLabel('Step timeline')).toHaveValue('1');
    await expect(page.getByLabel('Step inspector')).toContainText(fixture(slug).spec.steps[1].title);
    await page.getByRole('tab', { name: 'Explanation', exact: true }).click();
    await expect(page.getByRole('tabpanel')).toContainText('How it works');
    await expect(page.getByRole('tabpanel')).toContainText('Complexity');
    await page.getByRole('tab', { name: 'Practice', exact: true }).click();
    await expect(page.getByRole('tabpanel')).toContainText(fixture(slug).spec.steps[0].input.prompt);
    await page.getByRole('tab', { name: 'Code', exact: true }).click();
    await expect(page.locator('.cm-editor:visible')).toHaveCount(1);
    await page.getByRole('button', { name: 'Java', exact: true }).click();
    await expect(page.locator('.cm-content:visible')).toHaveText(fixture(slug).javaSource.replace(/\n/g, ''));
    await page.getByRole('button', { name: 'Python', exact: true }).click();
    await page.getByRole('button', { name: 'Copy source', exact: true }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(fixture(slug).pythonSource);
    await expect(page.locator('.cm-content:visible')).toHaveAttribute('contenteditable', 'true');
    const content = await page.locator('.cm-content:visible').textContent();
    await page.locator('.cm-content:visible').click();
    await page.keyboard.type('SHOULD_NOT_EDIT');
    expect(await page.locator('.cm-content:visible').textContent()).toBe(content);
    await page.getByRole('button', { name: 'Reset source view', exact: true }).click();
    await expect(page.locator('.cm-editor:visible')).toHaveCount(1);
    await page.getByRole('button', { name: /Full screen/ }).click();
    await expect(page.getByRole('dialog', { name: `${fixture(slug).title} source code animation`, exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Hide code' }).click();
    await expect(page.locator('.cm-editor:visible')).toHaveCount(0);
    await page.getByRole('button', { name: 'Show code' }).click();
    await expect(page.locator('.cm-editor:visible')).toHaveCount(1);
  });
}

test('workspace fits desktop, tablet and small phones with full-width editor', async ({ page }) => {
  await setup(page);
  await page.goto('/algorithms/binary-search');
  await answerInitialCheckpoint(page, 'binary-search');
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    // Wait for ResizeObserver/canvas sizing before sampling layout after a breakpoint change.
    await expect.poll(() => page.evaluate(() => {
      const animation = document.querySelector('.ua-workspace-grid > .ua-animation-focus')!.getBoundingClientRect();
      const source = document.querySelector('[aria-label="Source code"]')!.getBoundingClientRect();
      return source.top >= animation.bottom;
    })).toBe(true);
    await page.waitForTimeout(150);
    const animation = await page.locator('.ua-workspace-grid > .ua-animation-focus').boundingBox();
    const inspector = await page.getByLabel('Step inspector').boundingBox();
    const code = await page.getByLabel('Source code', { exact: true }).boundingBox();
    expect(code!.y).toBeGreaterThan(animation!.y + animation!.height - 1);
    if (width >= 1440) {
      expect(Math.abs(animation!.y - inspector!.y)).toBeLessThan(2);
      expect(animation!.width / (animation!.width + inspector!.width)).toBeGreaterThan(0.63);
    } else if (width <= 768) expect(inspector!.y).toBeGreaterThan(animation!.y);
    const toolbar = page.getByRole('group', { name: 'Playback controls', exact: true });
    expect(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
});

test('bookmark persists and route changes load the other algorithm', async ({ page }) => {
  await setup(page);
  await page.goto('/algorithms/binary-search');
  await answerInitialCheckpoint(page, 'binary-search');
  await page.getByRole('button', { name: 'Bookmark algorithm', exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem('ua_algo_bookmark_binary-search'))).toBe('1');
  await page.reload();
  await answerInitialCheckpoint(page, 'binary-search');
  await expect(page.getByRole('button', { name: 'Remove bookmark', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.goto('/algorithms/bubble-sort');
  await answerInitialCheckpoint(page, 'bubble-sort');
  await expect(page.getByRole('heading', { name: 'Bubble Sort', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bookmark algorithm', exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('Contest still uses the editable shared editor and fullscreen', async ({ page }) => {
  await setup(page);
  // Prevent a large runtime download: this check exercises the editor, not grading.
  await page.route('**/wasm/**', route => route.abort());
  await page.route('**/api/v1/contests/editor-test', route => route.fulfill({ json: { data: {
    id: 'editor-test', title: 'Editor compatibility', allowedLanguages: 'python',
  } } }));
  await page.route('**/api/v1/contests/editor-test/problems', route => route.fulfill({ json: { data: [{
    id: 'problem', title: 'Shared editor problem', difficulty: 'EASY', maxPoints: 10,
    sampleTestCases: [], hiddenTestCount: 0, statement: 'Print a number',
    starterCodeJson: JSON.stringify({ python: 'print(1)' }),
  }] } }));
  await page.goto('/contests/editor-test');
  await page.getByRole('button', { name: /Shared editor problem/ }).click();
  await expect(page.locator('.cm-content:visible')).toContainText('print(1)');
  await page.locator('.cm-content:visible').click();
  await page.keyboard.press('ControlOrMeta+End');
  await page.keyboard.type('\nprint(2)');
  await expect(page.locator('.cm-content:visible')).toContainText('print(2)');
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.locator('.cm-content:visible')).not.toContainText('print(2)');
  // Keyboard activation also checks accessibility without depending on the existing Contest toolbar's mobile positioning.
  await page.getByRole('button', { name: 'Enter full screen', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Exit full screen', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Enter full screen', exact: true })).toBeVisible();
});
