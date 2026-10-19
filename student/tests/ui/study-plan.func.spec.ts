import { test, expect, type Page } from '@playwright/test';

const preferences = { domainIds: ['cs'], goal: 'FUNDAMENTALS', skillLevel: 'BEGINNER', dailyMinutes: 30, studyDays: [1,2,3,4,5], courseMode: 'MANUAL', courseIds: ['course'], timeZone: 'UTC' };
const catalog = { domains: [{ id: 'cs', name: 'Computer Science' }], courses: [{ id: 'course', name: 'Real course', description: 'Computers · Memory', level: 'BEGINNER', domainIds: ['cs'], topics: 2 }] };
const learn = { id: 'learn', topicId: 'topic', title: 'Computer memory', courseName: 'Real course', taskType: 'Learn', activity: 'Study the lesson', scheduledDate: '2026-06-01', originalLearningDate: '2026-06-01', revisionInterval: 0, estimatedMinutes: 15, available: true, href: '/courses/course?topic=topic' };
const revision = { ...learn, id: 'revise', taskType: 'Revise', activity: 'Active recall', revisionInterval: 1, scheduledDate: '2026-06-02' };
async function setup(page: Page, configured = false, fail = false) {
  let saved = configured, completed = false;
  const calls: { path: string; body: any }[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'study-ui-contract');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'existing-student', name: 'Learner', email: 'learner@example.test' }));
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('ua_tour_seen_existing-student', '1');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (fail && path === '/api/v1/study-plan') return route.fulfill({ status: 503, json: { success: false } });
    if (route.request().method() !== 'GET') calls.push({ path, body: route.request().postDataJSON() });
    if (path === '/api/v1/study-plan/preferences' && route.request().method() === 'PUT') saved = true;
    if (path.endsWith('/learn/complete')) completed = true;
    const task = { ...learn, completedAt: completed ? '2026-06-01T12:00:00Z' : undefined };
    const data = path === '/api/v1/user-auth/me' ? { id: 'existing-student', name: 'Learner', email: 'learner@example.test' }
      : path.includes('streak') ? { currentStreak: 0, longestStreak: 0, days: [] }
      : path === '/api/v1/study-plan/catalog' ? catalog
      : path === '/api/v1/study-plan' ? { preferences: saved ? preferences : undefined, generationVersion: saved ? 1 : 0, planId: saved ? 'plan' : undefined, today: '2026-06-01', todayTasks: saved ? [task] : [], overdueTasks: [], weekTasks: saved ? [task, revision] : [], upcomingRevisions: saved ? [revision] : [], summary: { completed: completed ? 1 : 0, remaining: completed ? 4 : 5, revisionCompletionRate: 0, activeTopics: 1 } }
      : [];
    await route.fulfill({ json: { success: true, data } });
  });
  return calls;
}

test('existing account configures Study Plan directly and persists preferences', async ({ page }) => {
  const calls = await setup(page);
  await page.goto('/study-plan');
  await expect(page.getByRole('heading', { name: 'Create your personalized study plan' })).toBeVisible();
  await page.getByRole('button', { name: 'Generate My Study Plan' }).click();
  await expect(page.getByRole('alert')).toContainText('Choose at least one domain');
  await page.getByLabel('Computer Science', { exact: true }).check();
  await page.getByLabel('Primary learning goal').selectOption('FUNDAMENTALS');
  await page.getByLabel('Current skill level').selectOption('BEGINNER');
  await page.getByLabel('Course selection').selectOption('MANUAL');
  await expect(page.getByText('Computers · Memory')).toBeVisible();
  await page.getByRole('checkbox', { name: /Real course/ }).check();
  await page.getByRole('button', { name: 'Generate My Study Plan' }).click();
  await expect(page.getByRole('heading', { name: "Today's learning tasks" })).toBeVisible();
  expect(calls.find(c => c.path.endsWith('/preferences'))?.body.courseIds).toEqual(['course']);
  expect(new URL(page.url()).pathname).toBe('/study-plan');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Edit Preferences' })).toBeVisible();
});

test('saved dashboard completes tasks, navigates weeks and confirms preference changes', async ({ page }) => {
  const calls = await setup(page, true);
  await page.goto('/study-plan');
  const today = page.locator('section').filter({ has: page.getByRole('heading', { name: "Today's learning tasks" }) });
  await expect(today.getByRole('link', { name: 'Start activity' })).toHaveAttribute('href', '/courses/course?topic=topic');
  await today.getByRole('button', { name: 'Complete learn: Computer memory' }).click();
  await expect(today.getByText('All tasks for today are complete.')).toBeVisible();
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(page.getByText('Mon, Jun 8 – Sun, Jun 14')).toBeVisible();
  await page.getByRole('button', { name: 'Edit Preferences' }).click();
  await page.getByLabel('Available study time').selectOption('45');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Save preferences & update plan' }).click();
  await expect(page.getByRole('heading', { name: "Today's learning tasks" })).toBeVisible();
  expect(calls.some(c => c.path.endsWith('/preferences') && c.body.dailyMinutes === 45)).toBe(true);
});

test('sidebar opens dedicated Study Plan page on desktop and mobile', async ({ page }) => {
  await setup(page, true);
  await page.goto('/study-plan');
  await expect(page.getByRole('heading', { name: 'Study Plan', exact: true })).toBeVisible();
  const menu = page.getByRole('button', { name: 'Open menu', exact: true });
  if (await menu.isVisible()) await menu.click();
  const link = page.locator('aside').getByRole('link', { name: 'Study Plan', exact: true });
  await expect(link).toHaveAttribute('aria-current', 'page');
  await link.click();
  await expect(page).toHaveURL(/\/study-plan$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('failed fetch shows retry instead of resetting preferences', async ({ page }) => {
  await setup(page, true, true);
  await page.goto('/study-plan');
  await expect(page.getByRole('alert')).toContainText('Your saved progress has not changed');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
