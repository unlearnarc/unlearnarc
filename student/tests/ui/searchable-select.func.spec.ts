import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const courses = Array.from({ length: 65 }, (_, index) => ({ id: `course-${index}`, name: `Learning course ${index}` }));
courses.push({ id: 'cafe', name: 'Café programming — a very long course title for learning and practicing fundamental skills' });

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'dropdown-test');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex', points: 10 }));
    localStorage.setItem('ua_lang', 'en');
    localStorage.setItem('ua_theme', 'light');
  });
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex', points: 10 };
    else if (path === '/courses') data = courses;
    else if (path === '/domains') data = [{ id: 'cs', name: 'Computer science' }, { id: 'math', name: 'Mathematics' }];
    else if (path.includes('/topics/')) data = path.includes('course-1') ? [{ id: 'loops', name: 'Loops' }, { id: 'arrays', name: 'Arrays' }] : [{ id: 'functions', name: 'Functions' }];
    else if (path.includes('/question-pools/')) data = [{ id: 'pool' }];
    await route.fulfill({ json: { data } });
  });
});

test('search filters long lists and supports keyboard selection and dismissal', async ({ page }) => {
  await page.goto('/tests');
  const course = page.getByRole('combobox', { name: 'Select Course', exact: true });
  await course.click();
  await expect(page.getByRole('option')).toHaveCount(66);
  await course.fill('CAFE');
  await expect(page.getByRole('option')).toHaveCount(1);
  await course.press('Enter');
  await expect(course).toHaveValue(/Café programming/);
  await expect(page.getByRole('button', { name: /Start test/i })).toBeEnabled();
  await course.fill('not-a-course');
  await expect(page.getByText('No matches. Try a different search.')).toBeVisible();
  await course.press('Escape');
  await expect(course).toHaveValue(/Café programming/);
  await course.click();
  await course.fill('course 64');
  await course.press('ArrowDown');
  await course.press('Enter');
  await expect(course).toHaveValue('Learning course 64');
  await course.fill('course 1');
  await page.getByRole('heading', { name: /Pick your learning destination/ }).click();
  await expect(course).toHaveValue('Learning course 64');
  await expect(course).toHaveAttribute('aria-expanded', 'false');
});

test('domain and dependent topic searches keep selections scoped to their course', async ({ page }) => {
  await page.goto('/tests');
  await page.getByRole('button', { name: /Domain Test/i }).click();
  await page.getByRole('combobox', { name: 'Select Domain', exact: true }).fill('math');
  await page.getByRole('option', { name: 'Mathematics' }).click();
  await expect(page.getByRole('button', { name: /Start test/i })).toBeEnabled();
  await page.getByRole('button', { name: /Topic Quiz/i }).click();
  const course = page.getByRole('combobox', { name: 'Select Course', exact: true });
  await course.fill('course 1');
  await page.getByRole('option', { name: 'Learning course 1', exact: true }).click();
  const topic = page.getByRole('combobox', { name: 'Select Topic', exact: true });
  await topic.fill('loop');
  await page.getByRole('option', { name: 'Loops', exact: true }).click();
  await expect(page.getByRole('button', { name: /Start test/i })).toBeEnabled();
  await course.fill('course 2');
  await page.getByRole('option', { name: 'Learning course 2', exact: true }).click();
  await expect(topic).toHaveValue('');
  await expect(page.getByRole('button', { name: /Start test/i })).toBeDisabled();
  await topic.click();
  await expect(page.getByRole('option', { name: 'Functions' })).toBeVisible();
  await expect(page.getByRole('option', { name: 'Loops' })).toHaveCount(0);
});

test('open dropdown is accessible and fits phones through desktops in both themes', async ({ page }) => {
  await page.goto('/tests');
  const course = page.getByRole('combobox', { name: 'Select Course', exact: true });
  await course.fill('cafe');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    await page.waitForTimeout(350);
    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    const audit = await new AxeBuilder({ page }).include('.practice-setup').analyze();
    expect(audit.violations).toEqual([]);
  }
});

test('loading, empty options and failed requests provide feedback and retry', async ({ page }) => {
  await page.route('**/api/v1/courses', async route => {
    await new Promise(resolve => setTimeout(resolve, 800));
    await route.fulfill({ json: { data: [] } });
  });
  await page.goto('/tests');
  const course = page.getByRole('combobox', { name: 'Select Course', exact: true });
  await course.click();
  await expect(course).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('No options available yet.')).toBeVisible();
  await page.route('**/api/v1/domains', route => route.fulfill({ status: 400, json: { message: 'Unavailable' } }));
  await page.reload(); // Domains are fetched on mount, before selecting the domain scope.
  await page.getByRole('button', { name: /Domain Test/i }).click();
  await page.getByRole('combobox', { name: 'Select Domain', exact: true }).click();
  await expect(page.getByText('Could not load options.')).toBeVisible();
  await page.route('**/api/v1/domains', route => route.fulfill({ json: { data: [{ id: 'math', name: 'Mathematics' }] } }));
  await page.getByRole('button', { name: 'Try again', exact: true }).click();
  await expect(page.getByRole('option', { name: 'Mathematics' })).toBeVisible();
});
