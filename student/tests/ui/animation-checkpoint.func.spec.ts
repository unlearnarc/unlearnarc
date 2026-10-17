import { test, expect } from '@playwright/test';

test('library lesson preserves blocking checkpoints and timeline controls', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('ua_lang', 'en'); localStorage.setItem('ua_user_token', 'checkpoint-test'); });
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
  const trace = {
    id: 'checkpoint', title: 'Checkpoint lesson', duration: 5000,
    viewport: { width: 960, height: 540 },
    keyframes: [{ time: 0, entities: {} }, { time: 5000, entities: {} }],
    instructions: [{ id: 'start', time: 0, title: 'Start' }, { id: 'finish', time: 5000, title: 'Finish' }],
    checkpoints: [{ id: 'question', time: 500, kind: 'boolean', prompt: 'Is this a visual lesson?', answer: true, blocking: true, hint: 'Try True.' }],
  };
  await page.route('**/api/v1/animation-scenes/published', route => route.fulfill({ json: { data: [{ id: trace.id, title: trace.title, category: 'DSA' }] } }));
  await page.route('**/api/v1/animation-scenes/checkpoint', route => route.fulfill({ json: { data: { trace } } }));
  await page.goto('/animations');
  await page.getByRole('link', { name: 'Watch Checkpoint lesson', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  const question = page.getByRole('dialog', { name: 'Animation checkpoint question' });
  await expect(question).toBeVisible();
  await expect(question.getByRole('button', { name: 'Skip', exact: true })).toHaveCount(0);
  await question.getByRole('button', { name: 'False', exact: true }).click();
  await question.getByRole('button', { name: 'Submit' }).click();
  await expect(question).toContainText('Try True.');
  await question.getByRole('button', { name: 'True', exact: true }).click();
  await question.getByRole('button', { name: 'Submit' }).click();
  await expect(question).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(page.getByRole('slider')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(page.getByLabel('Step-by-step instructions')).toBeVisible();
});
