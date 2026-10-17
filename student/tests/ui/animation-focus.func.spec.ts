import { expect, test, type Page } from '@playwright/test';

async function mockAnimation(page: Page) {
  await page.addInitScript(() => localStorage.setItem('ua_lang', 'en'));
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
  const trace = {
    id: 'focus-scene', title: 'Focus scene', duration: 5000,
    viewport: { width: 960, height: 540 },
    keyframes: [
      { time: 0, entities: {}, caption: 'Start here' },
      { time: 5000, entities: {}, caption: 'Complete' },
    ],
    instructions: [{ id: 'start', time: 0, title: 'Start here' }],
  };
  await page.route('**/api/v1/animation-scenes/published', route => route.fulfill({ json: { data: [
    { id: trace.id, title: trace.title, category: 'DSA' },
  ] } }));
  await page.route('**/api/v1/animation-scenes/focus-scene', route => route.fulfill({ json: { data: { ...trace, trace } } }));
  await page.goto('/animations');
  await expect(page.getByRole('button', { name: 'Full screen', exact: false })).toBeVisible();
}

async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  const toolbar = page.getByRole('group', { name: 'Animation playback controls' });
  expect(await toolbar.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
}

test('animation focus fills viewport, preserves playback and exits with focus restored', async ({ page }) => {
  await mockAnimation(page);
  await noOverflow(page);
  const launch = page.getByRole('button', { name: /Full screen/ });
  await launch.click();
  const dialog = page.getByRole('dialog', { name: 'Focus scene animation', exact: true });
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  const viewport = page.viewportSize()!;
  expect(bounds!.width).toBe(viewport.width);
  expect(bounds!.height).toBe(viewport.height);
  await noOverflow(page);
  await expect(page.getByLabel('Step-by-step instructions')).toBeHidden();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const time = await page.getByRole('slider').inputValue();
  await page.getByRole('button', { name: 'Exit full screen', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(launch).toBeFocused();
  expect(await page.getByRole('slider').inputValue()).toBe(time);
  await expect(page.getByLabel('Step-by-step instructions')).toBeVisible();
  await launch.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toHaveCount(0);
  await noOverflow(page);
});

test('animation controls fit small phones and landscape focus mode', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await mockAnimation(page);
  await noOverflow(page);
  await page.getByRole('button', { name: /Full screen/ }).click();
  await noOverflow(page);
  await page.setViewportSize({ width: 568, height: 320 });
  await noOverflow(page);
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeInViewport();
});
