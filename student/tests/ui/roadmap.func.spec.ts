import { test, expect } from '@playwright/test';

test('roadmap stages and skill branches expand, and picked courses remain incomplete', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'roadmap-ui-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Learner', email: 'learner@example.test' }));
    localStorage.setItem('i18nextLng', 'en');
  });
  let picked = false;
  const course = () => ({ courseId: 'course', courseName: 'Programming basics', level: 'BEGINNER', topicsCount: 2,
    totalTime: null, completed: false, enrolled: picked, progressPercent: 0, completedTopics: 0, bestCourseScore: null });
  await page.route('**/api/v1/**', async route => {
    const url = new URL(route.request().url());
    let data: unknown = [];
    if (url.pathname.endsWith('/user-auth/me')) data = { id: 'learner', name: 'Learner', email: 'learner@example.test' };
    if (url.pathname.endsWith('/roles')) data = [{ id: 'developer', name: 'Software Developer', skills: [] }];
    if (url.pathname.endsWith('/roadmap/role/developer')) data = {
      roleId: 'developer', roleName: 'Software Developer', totalSkills: 2, totalCourses: 1, completedCourses: 0,
      progressPercent: 0, domains: [], stages: [
        { level: 'BEGINNER', order: 0, skills: [{ skillId: 'coding', skillName: 'Coding foundations', level: 'BEGINNER', courses: [course()] }] },
        { level: 'ADVANCED', order: 1, skills: [{ skillId: 'systems', skillName: 'Systems design', level: 'ADVANCED', courses: [] }] },
        { level: 'EXPERT', order: 2, skills: [] },
      ],
    };
    if (url.pathname.endsWith('/enrollments/course/course') && route.request().method() === 'POST') {
      picked = true;
      data = { id: 'enrollment', courseId: 'course' };
    }
    await route.fulfill({ json: { success: true, data } });
  });
  await page.goto('/roadmap');
  await page.getByRole('button', { name: /Software Developer/ }).click();
  const stages = page.locator('.roadmap-stage > button');
  await expect(stages.nth(0)).toHaveAttribute('aria-expanded', 'true');
  await expect(stages.nth(1)).toHaveAttribute('aria-expanded', 'false');
  // Level badges and stage numbers share learning colors, not danger colors.
  const expertBadge = stages.nth(2).locator('.ua-badge');
  await expect(expertBadge).toHaveClass(/ua-badge--expert/);
  const originalTheme = await page.locator('html').getAttribute('data-theme');
  for (const [theme, color] of [['light', 'rgb(126, 34, 206)'], ['dark', 'rgb(216, 180, 254)']]) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    await expect(expertBadge).toHaveCSS('color', color);
    await expect(stages.nth(2).locator('.roadmap-stage-number span')).toHaveCSS('color', color);
  }
  await page.evaluate(theme => {
    if (theme) document.documentElement.setAttribute('data-theme', theme);
    else document.documentElement.removeAttribute('data-theme');
  }, originalTheme);
  await expect(page.getByRole('progressbar', { name: 'Courses completed' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Start learning/i })).toBeVisible();
  await expect(page.getByText('Programming basics', { exact: true })).toBeHidden();
  await page.getByRole('button', { name: /Coding foundations/ }).click();
  await expect(page.getByText('Programming basics', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pick course: Programming basics', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Picked: Programming basics', exact: true })).toBeDisabled();
  await expect(page.getByText('0 / 1 courses completed')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Courses completed' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Continue learning/i })).toBeVisible();
  await expect(page.getByText(/0 \/ 2 topic quizzes completed/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (test.info().project.name === 'mobile') {
    await expect(page.locator('.roadmap-summary h1')).toHaveCSS('font-size', '16px');
    await expect(page.locator('.roadmap-stage-header h2').first()).toHaveCSS('font-size', '13px');
  }
  await stages.nth(0).click();
  await expect(page.getByText('Programming basics', { exact: true })).toBeHidden();
  await stages.nth(1).click();
  await page.getByRole('button', { name: /Systems design/ }).click();
  await expect(page.getByText(/No courses/i)).toBeVisible();
});
