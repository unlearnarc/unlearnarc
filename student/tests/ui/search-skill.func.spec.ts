import { test, expect } from '@playwright/test';

test('skill deep links request skill mappings and filter courses', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'skill-contract');
    localStorage.setItem('i18nextLng', 'en');
  });
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/api/v1/**', route => {
    const path = new URL(route.request().url()).pathname;
    const data = path.endsWith('/user-auth/me') ? { id: 'skill-test', name: 'Learner' }
      : path.endsWith('/skills/java') ? { id: 'java', name: 'Java' }
      : path.endsWith('/skill-course-mappings/skill/java') ? [{ skillId: 'java', courseId: 'one' }]
      : path.endsWith('/courses') ? [{ id: 'one', name: 'Java Course', level: 'BEGINNER' }, { id: 'two', name: 'Other Course', level: 'BEGINNER' }]
      : path.includes('streak') ? { currentStreak: 0, longestStreak: 0 }
      : [];
    return route.fulfill({ json: { success: true, data } });
  });
  const mapping = page.waitForResponse(r => r.url().endsWith('/skill-course-mappings/skill/java'));
  await page.goto('/explore?skill=java');
  expect((await mapping).status()).toBe(200);
  await expect(page.getByText('Java Course', { exact: true }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText('Other Course', { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
