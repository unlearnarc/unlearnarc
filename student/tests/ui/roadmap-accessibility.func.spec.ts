import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('roadmap supports keyboard selection of all stages and accessible progress', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'roadmap-accessibility');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Learner' }));
    localStorage.setItem('ua_feature_tour_v1_learner', 'done');
    localStorage.setItem('i18nextLng', 'en');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/user-auth/me')) data = { id: 'learner', name: 'Learner' };
    if (path.endsWith('/roadmap/role/developer')) data = {
      roleId: 'developer', roleName: 'Developer', domains: [], stages: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((level, order) => ({
        level, order, skills: [{ skillId: level, skillName: level, level, courses: [{ courseId: level, courseName: `Course ${order + 1}`, level,
          topicsCount: 2, completed: order === 0, enrolled: false, progressPercent: order === 0 ? 100 : 0, completedTopics: order === 0 ? 2 : 0, bestCourseScore: null }] }],
      })),
    };
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/roadmap?role=developer');
  const foundations = page.getByRole('button', { name: /^Foundations/ });
  await foundations.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Review: Course 1', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /^Core DSA/ })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Start: Course 2', exact: true })).toBeVisible();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('link', { name: 'Start: Course 3', exact: true })).toBeVisible();
  await expect(page.locator('.journey-tracker [aria-disabled=true]')).toHaveCount(0);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    // Let shared theme/surface transitions settle before sampling contrast.
    await page.waitForTimeout(750);
    const results = await new AxeBuilder({ page }).include('.roadmap-journey').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  }
});
