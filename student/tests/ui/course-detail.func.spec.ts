import { expect, test } from '@playwright/test';

const course = { id: 'intro', name: 'Programming basics', level: 'BEGINNER', topicsCount: 1 };

for (const width of [320, 375, 768, 1280]) {
  test(`topic cards fit and remain usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const topicName = 'Understanding asynchronous programming and exceptionallylongunbrokentopicnames';
    const noteTitle = 'A comprehensive guide to asynchronous programming with practical examples';
    await page.addInitScript(() => {
      localStorage.setItem('ua_user_token', 'course-test-session');
      localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
      localStorage.setItem('i18nextLng', 'en');
    });
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      let data: unknown = [];
      if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex' };
      else if (path === '/courses/intro') data = course;
      else if (path === '/topics/by-course/intro') data = [{ id: 'topic-1', name: topicName, topicOrder: 1, level: 'INTERMEDIATE', time: '1 hour 30 minutes', courseId: 'intro' }];
      else if (path === '/notes/topic/topic-1') data = [{ id: 'note-1', title: noteTitle, summary: 'A lesson summary', noteOrder: 1, readMinutes: 12 }];
      else if (path === '/study-materials/topic/topic-1') data = [{ id: 'material-1', type: 'EXERCISE', url: `https://example.com/${'long-material-path'.repeat(12)}` }];
      else if (path.endsWith('/status')) data = { enrolled: true };
      else if (path.endsWith('/progress')) data = { progressPercent: 0, totalTopics: 1, completedTopics: 0, topics: [] };
      await route.fulfill({ json: { data } });
    });
    await page.goto('/courses/intro');
    const toggle = page.getByRole('button', { name: new RegExp(topicName) });
    const quiz = page.getByRole('link', { name: `Quiz: ${topicName}`, exact: true });
    await expect(toggle).toBeVisible();
    await expect(quiz).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(await toggle.locator('a').count()).toBe(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    const lesson = page.getByRole('button', { name: new RegExp(noteTitle) });
    await expect(lesson).toBeVisible();
    const material = page.getByRole('link', { name: /Exercise Material/ });
    await expect(material).toBeVisible();
    for (const element of [toggle, quiz, lesson, material]) {
      const box = await element.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await element.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await toggle.click();
    await expect(lesson).toBeHidden();
    await quiz.click();
    await expect(page).toHaveURL(/\/tests\?scope=TOPIC&entityId=topic-1/);
  });
}

for (const theme of ['light', 'dark']) {
  test(`liquid progress stays compact and accurate in ${theme} theme`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(theme => {
      localStorage.setItem('ua_user_token', 'course-test-session');
      localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
      localStorage.setItem('i18nextLng', 'en');
      localStorage.setItem('ua_theme', theme);
    }, theme);
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      let data: unknown = [];
      if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex' };
      else if (path === '/courses/intro') data = course;
      else if (path.endsWith('/status')) data = { enrolled: true };
      else if (path.endsWith('/progress')) data = { courseId: 'intro', completed: false, progressPercent: 50, totalTopics: 4, completedTopics: 2 };
      await route.fulfill({ json: { data } });
    });
    await page.goto('/courses/intro');
    const region = page.getByRole('region', { name: 'Your learning progress' });
    const heading = region.getByRole('heading', { name: 'Learning progress' });
    const summary = region.getByText('2/4 quizzes · 50%');
    await expect(summary).toBeVisible();
    await expect(region.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    const headingBox = await heading.boundingBox();
    const summaryBox = await summary.boundingBox();
    expect(headingBox).not.toBeNull();
    expect(summaryBox).not.toBeNull();
    expect(Math.abs(headingBox!.y - summaryBox!.y)).toBeLessThan(4);
    expect(summaryBox!.x + summaryBox!.width).toBeLessThanOrEqual(320);
    const fill = region.locator('.course-liquid-progress__fill');
    await expect(fill).toHaveCSS('animation-name', 'none');
    expect(await fill.evaluate(element => (element as HTMLElement).style.width)).toBe('50%');
    await expect(region.locator('.course-liquid-progress__wave')).toHaveCSS('animation-name', 'none');
  });
}

for (const scenario of [
  { name: 'omitted score and topic progress', progress: {}, expected: null },
  { name: 'null score', progress: { bestCourseScore: null, topics: [] }, expected: null },
  { name: 'zero score', progress: { bestCourseScore: 0, topics: [] }, expected: '0.00' },
  { name: 'completed quiz score', progress: { bestCourseScore: 82.5, topics: [{ topicId: 'topic-1', completed: true, bestScore: 75.25 }] }, expected: '82.50' },
]) {
  test(`course detail handles ${scenario.name} without crashing`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('ua_user_token', 'course-test-session');
      localStorage.setItem('ua_user', JSON.stringify({ id: 'learner', name: 'Alex' }));
      localStorage.setItem('i18nextLng', 'en');
    });
    await page.route('**/api/v1/**', async route => {
      const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
      let data: unknown = [];
      if (path === '/user-auth/me') data = { id: 'learner', name: 'Alex' };
      else if (path === '/courses/intro') data = course;
      else if (path === '/topics/by-course/intro') data = [{ id: 'topic-1', name: 'First steps', topicOrder: 1, level: 'BEGINNER', courseId: 'intro' }];
      else if (path.endsWith('/status')) data = { enrolled: true };
      else if (path.endsWith('/progress')) data = { courseId: 'intro', enrolled: true, completed: false, progressPercent: 0, totalTopics: 1, completedTopics: 0, ...scenario.progress };
      await route.fulfill({ json: { data } });
    });
    await page.goto('/courses/intro');
    await expect(page.getByRole('heading', { level: 1, name: course.name })).toBeVisible();
    const progress = page.getByRole('region', { name: 'Your learning progress' });
    await expect(progress.getByRole('heading', { name: 'Learning progress' })).toBeVisible();
    await expect(progress.getByText('0/1 quizzes · 0%')).toBeVisible();
    await expect(progress.getByRole('progressbar', { name: 'Course completion' })).toHaveAttribute('aria-valuenow', '0');
    await expect(progress.locator('.course-liquid-progress__fill')).toBeHidden();
    if (scenario.expected === null) await expect(progress.getByText(/Best course quiz/)).toHaveCount(0);
    else await expect(progress.getByText(`Best course quiz: ${scenario.expected}%`)).toBeVisible();
    if (scenario.name === 'completed quiz score') await expect(page.getByText('Completed · Best quiz: 75.25%')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
