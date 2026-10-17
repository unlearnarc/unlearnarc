import { expect, test } from '@playwright/test';

for (const scope of ['COURSE', 'TOPIC']) {
  test(`${scope} counts answers, not visited questions, with compact solid progress`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.addInitScript(() => {
      localStorage.setItem('ua_user_token', 'quiz-progress');
      localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem('ua_mascot_muted', '1');
    });
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      let data: unknown = [];
      if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex' };
      else if (path === '/tests/generate') data = {
        poolId: 'pool', poolName: 'Long quiz title hidden on phones', scopeType: scope,
        totalQuestions: 2, totalPoints: 2,
        questions: [1, 2].map(i => ({ id: `q${i}`, questionText: `Question ${i} prompt`,
          questionType: 'MULTIPLE_CORRECT', difficulty: 'EASY', points: 1,
          answers: [{ id: `a${i}`, answerText: 'Select this choice' }] })),
      };
      await route.fulfill({ json: { data } });
    });
    await page.goto(`/tests?scope=${scope}&entityId=intro&courseId=intro`);
    const progress = page.getByRole('progressbar', { name: 'Questions answered' });
    const choice = page.getByRole('button', { name: /A Select this choice/ });
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByText('Long quiz title hidden on phones')).toBeHidden();
    const fill = progress.locator('.ua-progress__fill');
    await expect(fill).toBeHidden();
    await page.getByRole('button', { name: /Next/ }).click();
    await expect(page.getByText('Question 2 prompt')).toBeVisible();
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    await page.getByRole('button', { name: /Previous/ }).click();
    await choice.click();
    await expect(progress).toHaveAttribute('aria-valuenow', '50');
    await expect(fill).toHaveCSS('animation-name', 'none');
    await expect(fill).toHaveCSS('transition-duration', '0s');
    await expect(fill).toHaveCSS('background-image', 'none');
    await choice.click();
    await expect(progress).toHaveAttribute('aria-valuenow', '0');
    await expect(fill).toBeHidden();
    await choice.click();
    await page.getByRole('button', { name: /Next/ }).click();
    await choice.click();
    await expect(progress).toHaveAttribute('aria-valuenow', '100');
    await expect(page.getByRole('button', { name: /Submit/ })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.getByText('Long quiz title hidden on phones')).toBeVisible();
    await expect(progress).toHaveAttribute('aria-valuenow', '100');
  });
}
