import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const profile = { id: 'dashboard-learner', name: 'Alex Learner', email: 'alex@example.test', points: 320, currentStreak: 5, longestStreak: 12 };
const courses = [
  { id: 'intro', name: 'Discover the world of programming', level: 'BEGINNER', topicsCount: 8, totalTime: '2 hours' },
  { id: 'algorithms', name: 'Algorithms and a wonderfully long course title that should wrap naturally', level: 'INTERMEDIATE', topicsCount: 12 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(user => {
    localStorage.setItem('ua_user_token', 'dashboard-test-session');
    localStorage.setItem('ua_user', JSON.stringify(user));
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('ua_theme', 'light');
  }, profile);
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = profile;
    else if (path.includes('/streak')) data = { ...profile, active: true, activeToday: true };
    else if (path === '/courses') data = courses;
    else if (path === '/enrollments/me') data = courses.map(c => ({ courseId: c.id }));
    else if (path === '/contests') data = [{ id: 'challenge', title: 'Your first coding adventure', phase: 'RUNNING', durationMinutes: 30, problemCount: 3 }];
    else if (path === '/tests/history') data = { content: [{ attemptId: 'attempt-1', poolName: 'Programming basics', totalQuestions: 10, correctCount: 8, scorePercentage: 80, passed: true, attemptedAt: '2026-10-10T10:00:00Z' }], totalElements: 27 };
    else if (path === '/roles') data = [{ id: 'developer', name: 'Software developer', description: 'Build your skills one step at a time.' }];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  });
});

test('learning home shows real stats, course adventures and working destinations', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Alex');
  await expect(page.locator('.study-greeting h1')).toContainText('Alex');
  await expect(page.locator('.study-welcome h1, .study-welcome .study-companion, .study-welcome .aria-mascot')).toHaveCount(0);
  await expect(page.locator('.study-welcome h2')).toHaveText(courses[0].name);
  const stats = page.getByRole('group', { name: 'Your learning at a glance' });
  await expect(stats.getByRole('link', { name: /5 Day streak/ })).toBeVisible();
  await expect(stats.getByRole('link', { name: /320 Learning points/ })).toBeVisible();
  await expect(stats.getByRole('link', { name: /2 Courses started/ })).toBeVisible();
  await expect(stats.getByRole('link', { name: /27 Practice rounds/ })).toBeVisible();
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '5');
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuemax', '7');
  await expect(page.getByRole('link', { name: /Continue learning/ })).toHaveAttribute('href', '/courses/intro');
  await expect(page.locator('.study-course')).toHaveCount(2);
  await expect(page.getByRole('link', { name: /Your first coding adventure/ })).toHaveAttribute('href', '/contests/challenge');
  await expect(page.getByText('80%', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /Software developer/ })).toHaveAttribute('href', '/roadmap?role=developer');
  await page.getByRole('link', { name: /Continue learning/ }).click();
  await expect(page).toHaveURL(/\/courses\/intro$/);
});

test('Your Next Chapter shows only two courses and links to all learnings', async ({ page }) => {
  const enrolledCourses = [
    ...courses,
    { id: 'databases', name: 'Database essentials', level: 'BEGINNER', topicsCount: 6 },
    { id: 'networks', name: 'Network essentials', level: 'BEGINNER', topicsCount: 5 },
  ];
  await page.route('**/api/v1/courses', route => route.fulfill({ json: { data: enrolledCourses } }));
  await page.route('**/api/v1/enrollments/me', route => route.fulfill({ json: { data: enrolledCourses.map(course => ({ courseId: course.id })) } }));
  await page.goto('/dashboard');
  const section = page.getByRole('region', { name: /your next chapter/i });
  await expect(section.locator('.study-course')).toHaveCount(2);
  await expect(section.getByRole('heading', { name: courses[0].name, exact: true })).toBeVisible();
  await expect(section.getByRole('heading', { name: courses[1].name, exact: true })).toBeVisible();
  await expect(section.getByRole('link', { name: /View all/i })).toHaveAttribute('href', '/my-courses');
  await expect(page.getByRole('group', { name: 'Your learning at a glance' }).getByRole('link', { name: /4 Courses started/ })).toBeVisible();
});

test('layout fits phones, tablets and desktops in both themes', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('.study-course')).toHaveCount(2);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    for (const width of [320, 375, 480, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const fits = await page.locator('.study-home').evaluate(root => [...root.querySelectorAll('.study-stat, .study-course, .study-panel, .study-list-card')].every(el => {
        const rect = el.getBoundingClientRect();
        return rect.left >= 0 && rect.right <= innerWidth;
      }));
      expect(fits, `${theme} cards should fit at ${width}px`).toBe(true);
    }
  }
});

test('dashboard is accessible in light and dark modes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/dashboard');
  await expect(page.locator('.study-course')).toHaveCount(2);
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    const result = await new AxeBuilder({ page }).include('.study-home').analyze();
    expect(result.violations).toEqual([]);
  }
});

test('shared course cards stay consistent across the dashboard, catalog and My Learnings', async ({ page }) => {
  for (const path of ['/dashboard', '/explore', '/my-courses']) {
    await page.goto(path);
    const card = page.locator('.study-course:visible').filter({ hasText: courses[0].name }).first();
    await expect(card).toBeVisible();
    await expect(card.locator('.study-course-art')).toBeVisible();
    await expect(card.getByRole('heading', { name: courses[0].name })).toBeVisible();
    await expect(card.locator('.ua-badge')).toHaveClass(/ua-badge--beginner/);
    await expect(card.locator('.study-course-meta')).toContainText('2 hours');
    await expect(card.locator('.study-course-progress')).toHaveCount(0);
    const courseLink = path === '/my-courses' ? card.locator('.study-course-main') : card;
    await expect(courseLink).toHaveAttribute('href', '/courses/intro');
    if (path === '/my-courses') {
      await expect(card.getByRole('link', { name: /Take a Test/ })).toHaveAttribute('href', '/tests?scope=COURSE&entityId=intro');
      await expect(card.locator('a a, a button')).toHaveCount(0);
    }
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test('new learners get useful empty states without invented progress', async ({ page }) => {
  await page.route('**/api/v1/enrollments/me', route => route.fulfill({ json: { data: [] } }));
  await page.route('**/api/v1/tests/history?*', route => route.fulfill({ json: { data: { content: [], totalElements: 0 } } }));
  await page.goto('/dashboard');
  await expect(page.getByText(/Your adventure starts here/)).toBeVisible();
  await expect(page.getByRole('link', { name: /Start your adventure/ })).toHaveAttribute('href', '/explore');
  await expect(page.getByText(/No practice rounds yet/)).toBeVisible();
  await expect(page.locator('.study-course')).toHaveCount(0);
});

test('failed sections can be retried without breaking the learning home', async ({ page }) => {
  await page.route('**/api/v1/courses', route => route.fulfill({ status: 500, json: { message: 'Temporary error' } }));
  await page.goto('/dashboard');
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await page.route('**/api/v1/courses', route => route.fulfill({ json: { data: courses } }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('.study-course')).toHaveCount(2);
});
