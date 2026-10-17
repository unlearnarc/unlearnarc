import { test, expect, type Page } from '@playwright/test';
import { buildRoadmapJourney, coursePercent } from '../../src/pages/roadmapModel';
import type { Roadmap, RoadmapCourse } from '../../src/pages/roadmapModel';

const course = (id: string, overrides: Partial<RoadmapCourse> = {}): RoadmapCourse => ({
  courseId: id, courseName: id, level: 'BEGINNER', topicsCount: 4, totalTime: null,
  completed: false, enrolled: false, progressPercent: 0, completedTopics: 0, bestCourseScore: null, ...overrides,
});
function roadmap(): Roadmap {
  return { roleId: 'developer', roleName: 'Software Developer', totalSkills: 4, totalCourses: 5, completedCourses: 1, progressPercent: 20, domains: [], stages: [
    { level: 'BEGINNER', order: 0, skills: [{ skillId: 'basics', skillName: 'Programming basics', level: 'BEGINNER', courses: [course('Introduction', { completed: true, progressPercent: 100 })] }] },
    { level: 'INTERMEDIATE', order: 1, skills: [{ skillId: 'core', skillName: 'Data structures and algorithms', level: 'INTERMEDIATE', courses: [course('Arrays', { enrolled: true, progressPercent: 50, completedTopics: 2 }), course('Searching')] }] },
    { level: 'ADVANCED', order: 2, skills: [{ skillId: 'graphs', skillName: 'Graph algorithms', level: 'ADVANCED', courses: [course('Graphs')] }] },
    { level: 'EXPERT', order: 3, skills: [{ skillId: 'interview', skillName: 'Interview preparation', level: 'EXPERT', courses: [course('Interview practice')] }] },
  ] };
}
async function setup(page: Page, getRoadmap = roadmap) {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'roadmap-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Learner' }));
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('ua_feature_tour_v1_learner', 'done');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown = [];
    if (path.endsWith('/user-auth/me')) data = { id: 'learner', name: 'Learner' };
    if (path.endsWith('/roles')) data = [{ id: 'developer', name: 'Software Developer', skills: [] }];
    if (path.endsWith('/roadmap/role/developer')) data = getRoadmap();
    if (path.endsWith('/courses/Arrays')) data = { id: 'Arrays', name: 'Arrays', topicsCount: 4, level: 'INTERMEDIATE' };
    await route.fulfill({ json: { success: true, data } });
  });
}
async function openStage(page: Page, name = 'Core DSA') {
  await page.getByRole('button', { name: new RegExp(`^${name}`) }).click();
}

test('model keeps every level open and uses persisted completion only', () => {
  const data = roadmap();
  data.stages[1].skills.push({ ...data.stages[1].skills[0], skillId: 'duplicate' });
  data.stages[1].skills[0].courses[0].progressPercent = 100;
  const result = buildRoadmapJourney(data);
  expect(result.total).toBe(5);
  expect(result.completed).toBe(1);
  expect(result.percent).toBe(20);
  expect(result.stages[1].percent).toBe(0);
  expect(result.stages.map(stage => stage.state)).toEqual(['completed', 'current', 'available', 'available']);
  expect(coursePercent(course('invalid', { progressPercent: Number.NaN }))).toBe(0);
  expect(coursePercent(course('done', { completed: true }))).toBe(100);
  data.stages = [];
  expect(buildRoadmapJourney(data).percent).toBe(0);
});

test('every stage opens without prerequisites; course actions preserve routes', async ({ page }) => {
  await setup(page);
  await page.goto('/roadmap');
  await page.getByRole('button', { name: /Software Developer/ }).click();
  await expect(page.getByRole('heading', { name: 'Your Learning Roadmap' })).toBeVisible();
  await expect(page.locator('[role="progressbar"][aria-label="Overall course completion"]')).toHaveAttribute('aria-valuenow', '20');
  await expect(page.locator('.journey-tracker [aria-disabled=true]')).toHaveCount(0);
  await expect(page.locator('.journey-tip, .journey-overview')).toHaveCount(0);
  for (const [name, id] of [['Advanced Topics', 'Graphs'], ['Interview Ready', 'Interview practice'], ['Foundations', 'Introduction']]) {
    if ((page.viewportSize()?.width ?? 0) < 768 && await page.getByRole('button', { name: 'All stages' }).isVisible()) await page.getByRole('button', { name: 'All stages' }).click();
    await openStage(page, name);
    await expect(page.getByRole('link', { name: `${id === 'Introduction' ? 'Review' : 'Start'}: ${id}`, exact: true })).toHaveAttribute('href', `/courses/${encodeURIComponent(id)}`);
  }
});

test('desktop selects last completed or first course and allows changing details', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const data = roadmap();
  data.stages[1].skills[0].courses.push(course('Last completed', { completed: true }));
  await setup(page, () => data);
  await page.goto('/roadmap?role=developer');
  const details = page.getByRole('complementary', { name: 'Selected course details' });
  await expect(details.getByRole('heading')).toHaveText('Last completed');
  await page.getByRole('button', { name: 'Searching', exact: true }).click();
  await expect(details.getByRole('heading')).toHaveText('Searching');
  await expect(page.getByRole('button', { name: 'Searching', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await openStage(page, 'Advanced Topics');
  await expect(details.getByRole('heading')).toHaveText('Graphs');
  await expect(details.getByRole('link', { name: 'Start course' })).toHaveAttribute('href', '/courses/Graphs');
  await openStage(page);
  await expect(details.getByRole('heading')).toHaveText('Last completed');
});

test('mobile has stage-only and course-list screens, direct course navigation and browser back', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await setup(page);
  await page.goto('/roadmap?role=developer');
  await expect(page.getByRole('navigation', { name: 'Roadmap stages' })).toBeVisible();
  await expect(page.locator('.journey-workspace')).toBeHidden();
  await openStage(page);
  await expect(page).toHaveURL(/stage=INTERMEDIATE/);
  await expect(page.getByRole('navigation', { name: 'Roadmap stages' })).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Core DSA', exact: true })).toBeFocused();
  await expect(page.locator('.journey-course-detail')).toBeHidden();
  await page.getByRole('link', { name: 'Arrays', exact: true }).click();
  await expect(page).toHaveURL(/\/courses\/Arrays/);
  await page.goBack();
  await expect(page.locator('.journey-courses')).toBeVisible();
  await page.getByRole('button', { name: 'All stages' }).click();
  await expect(page).not.toHaveURL(/stage=/);
  await expect(page.getByRole('button', { name: /^Core DSA/ })).toBeFocused();
  await openStage(page, 'Interview Ready');
  await page.goBack();
  await expect(page.getByRole('navigation', { name: 'Roadmap stages' })).toBeVisible();
});

test('saving and server refresh update real progress without locking stages', async ({ page }) => {
  const data = roadmap();
  let requests = 0;
  await setup(page, () => { requests++; return data; });
  await page.route('**/api/v1/enrollments/course/Searching', async route => {
    data.stages[1].skills[0].courses[1].enrolled = true;
    await route.fulfill({ json: { success: true, data: {} } });
  });
  await page.goto('/roadmap?role=developer');
  await openStage(page);
  await page.getByRole('button', { name: 'Pick course: Searching', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Picked: Searching', exact: true })).toBeDisabled();
  await expect(page.locator('[role="progressbar"][aria-label="Overall course completion"]')).toHaveAttribute('aria-valuenow', '20');
  const before = requests;
  data.stages[1].skills[0].courses.forEach(item => { item.completed = true; item.progressPercent = 100; });
  for (const visibility of ['hidden', 'visible']) {
    await page.evaluate(value => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => value });
      window.dispatchEvent(new Event('visibilitychange'));
    }, visibility);
    await page.waitForTimeout(50);
  }
  await expect.poll(() => requests).toBeGreaterThan(before);
  await expect(page.locator('[role="progressbar"][aria-label="Overall course completion"]')).toHaveAttribute('aria-valuenow', '60');
  await expect(page.getByRole('progressbar', { name: 'Selected stage completion' })).toHaveAttribute('aria-valuenow', '100');
});

for (const width of [320, 375, 639, 768, 1280]) {
  test(`stage and course screens fit ${width}px in both themes`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const data = roadmap();
    data.stages[1].skills[0].courses[0].courseName = 'DistributedSystemsAndInfrastructureEngineeringWithoutSpaces';
    await setup(page, () => data);
    await page.goto('/roadmap?role=developer');
    const fits = async () => {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      for (const box of await page.locator('.journey-header:visible, .journey-overall:visible, .journey-workspace:visible, .journey-courses:visible, .journey-course-row:visible, .journey-course-detail:visible').evaluateAll(elements => elements.map(el => ({ width: el.clientWidth, scroll: el.scrollWidth })))) {
        expect(box.scroll).toBeLessThanOrEqual(box.width + 1);
      }
    };
    await fits();
    await openStage(page);
    await expect(page.locator('.journey-course-row')).toHaveCount(2);
    for (const theme of ['light', 'dark']) {
      await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
      await fits();
      await expect(page.getByRole('progressbar', { name: 'Arrays progress' })).toHaveCount(0);
      await expect(page.getByRole('progressbar', { name: 'Selected stage completion' })).toHaveAttribute('aria-valuenow', '0');
    }
    if (width < 768) expect((await page.getByRole('link', { name: /Continue:/ }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
  });
}

test('unconfigured levels remain selectable and empty roadmaps show no fabricated progress', async ({ page }) => {
  await setup(page, () => ({ ...roadmap(), stages: [] }));
  await page.goto('/roadmap?role=developer');
  await openStage(page, 'Interview Ready');
  await expect(page.getByRole('heading', { name: 'Courses coming soon' })).toBeVisible();
  await expect(page.locator('[role="progressbar"][aria-label="Overall course completion"]')).toHaveAttribute('aria-valuenow', '0');
});
