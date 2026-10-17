import { expect, test } from '@playwright/test';
import { recommendCourses } from '../../src/components/insights/recommendations';
import type { Course } from '../../src/types';

const courses: Course[] = [
  { id: 'current', name: 'Current course', level: 'BEGINNER', topicsCount: 4 },
  { id: 'shared', name: 'Related skill course', level: 'INTERMEDIATE', topicsCount: 5 },
  { id: 'domain', name: 'Related domain course', level: 'BEGINNER', topicsCount: 3 },
  { id: 'unrelated', name: 'Unrelated course', level: 'BEGINNER', topicsCount: 2 },
];
const skillCourse = [{ id: '1', skillId: 'code', courseId: 'current' }, { id: '2', skillId: 'code', courseId: 'shared' }, { id: '3', skillId: 'web', courseId: 'domain' }];
const domainSkill = [{ id: '1', skillId: 'code', domainId: 'software' }, { id: '2', skillId: 'web', domainId: 'software' }];

test('recommendations rank shared skills first and exclude enrolled or unrelated courses', () => {
  const input = { courses, enrolledIds: ['current'], sourceCourseIds: [], domainIds: [], skills: [], domains: [], skillCourse, domainSkill };
  expect(recommendCourses(input).map(r => r.course.id)).toEqual(['shared', 'domain']);
  expect(recommendCourses({ ...input, enrolledIds: [] })).toEqual([]);
  expect(recommendCourses({ ...input, enrolledIds: [], domainIds: ['software'] })).toHaveLength(3);
});

test('progress adapts to both themes and suggests new related courses only for a small improvement plan', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'progress-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_theme', 'light');
  });
  let manyAreas = false;
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex' };
    else if (path.includes('/streak')) data = { activeToday: true };
    else if (path === '/courses') data = courses;
    else if (path === '/enrollments/me') data = [{ courseId: 'current' }];
    else if (path === '/skill-course-mappings') data = skillCourse;
    else if (path === '/domain-skill-mappings') data = domainSkill;
    else if (path === '/skills') data = [{ id: 'code', name: 'Coding', level: 'BEGINNER' }];
    else if (path === '/domains') data = [{ id: 'software', name: 'Software' }];
    else if (path === '/tests/insights/dashboard') data = { totalAttempts: 5, averageScore: 90, bestScore: 95, latestScore: 90, passRate: 100, trendDelta: 0, trendLabel: 'STEADY', totalTimeSeconds: 500, recentScores: [], difficultyAccuracy: [] };
    else if (path === '/tests/insights/improvement') data = { attemptsAnalyzed: 5, summary: 'Keep learning.', weakAreas: manyAreas ? ['a', 'b'].map(entityId => ({ entityId, entityName: entityId, entityType: 'COURSE', severity: 'NEEDS_WORK', averageScore: 40, bestScore: 50, accuracy: 40, attempts: 2, recommendation: 'Practice.' })) : [], difficultyGaps: [], recurringMistakes: [] };
    await route.fulfill({ json: { data } });
  });
  await page.goto('/tests?view=insights');
  const suggestions = page.locator('.insight-recommendations');
  await expect(suggestions.getByRole('heading', { name: 'Related skill course' })).toBeVisible();
  await expect(suggestions).not.toContainText('Unrelated course');
  await expect(suggestions).not.toContainText('Current course');
  await expect(suggestions).toContainText('Build on Coding.');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => document.documentElement.setAttribute('data-theme', t), theme);
    await expect.poll(() => suggestions.evaluate(el => getComputedStyle(el).backgroundColor)).toBe(theme === 'light' ? 'rgb(255, 255, 255)' : 'rgb(24, 33, 43)');
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
  await page.getByRole('button', { name: 'Level-up plan' }).click();
  await expect(page.getByText('No weak areas detected', { exact: false })).toBeVisible();
  await suggestions.getByRole('link', { name: /Related skill course/ }).click();
  await expect(page).toHaveURL(/\/courses\/shared$/);
  manyAreas = true;
  await page.goto('/tests?view=insights');
  await expect(page.getByRole('heading', { name: 'Your growth trail' })).toBeVisible();
  await page.getByRole('button', { name: 'Level-up plan' }).click();
  await expect(page.locator('.insight-mini-card')).toHaveCount(2);
  await expect(suggestions).toHaveCount(0);
});
