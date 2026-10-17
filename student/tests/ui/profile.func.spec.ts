import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const user = { id: 'profile-learner', name: 'Alex Learner', email: 'alex.long.address@example.test', region: 'IN', authProvider: 'GOOGLE', points: 320, rank: 17, currentStreak: 3, longestStreak: 12, createdAt: '2025-01-12T10:00:00', mascotCharacter: 'aria', mascotVibe: 'friend', mascotMuted: false };

test.beforeEach(async ({ page }) => {
  await page.addInitScript(profile => {
    localStorage.setItem('ua_user_token', 'profile-test-session');
    localStorage.setItem('ua_user', JSON.stringify(profile));
    localStorage.setItem('i18nextLng', 'en');
    localStorage.setItem('ua_theme', 'light');
    localStorage.setItem(`ua_feature_tour_seen_${profile.id}`, '1');
  }, user);
  await page.route('**/api/v1/**', async route => {
    const path = new URL(route.request().url()).pathname.replace('/api/v1', '');
    let data: unknown = [];
    if (path === '/user-auth/me') data = user;
    else if (path.endsWith('/streak/calendar')) {
      const date = new Date();
      const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      date.setDate(date.getDate() - 1);
      const yesterday = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      data = { activeDays: [today, yesterday], activeDayCount: 2 };
    } else if (path.includes('/streak')) data = user;
    else if (path === '/user-auth/me/region') data = { region: route.request().postDataJSON().region };
    else if (path === '/user-auth/me/mascot') data = {};
    else if (path === '/enrollments/me') data = [{ courseId: 'one' }, { courseId: 'two' }];
    else if (path === '/tests/history') data = { content: [], totalElements: 27 };
    await route.fulfill({ json: { data } });
  });
});

test('compact profile retains points and streaks without rank or learning section', async ({ page }) => {
  await page.goto('/profile');
  const root = page.locator('.profile-page');
  await expect(root.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
  await expect(root.locator('.profile-stat')).toHaveCount(3);
  await expect(root.locator('.profile-stats')).toContainText('320');
  await expect(root.locator('.profile-stats dt')).toHaveText(['Points', 'Current streak', 'Best streak']);
  await expect(root.locator('.profile-stats')).toContainText('3 days');
  await expect(root.locator('.profile-stats')).toContainText('12 days');
  await expect(root.getByText('Member since Jan 2025')).toBeVisible();
  await expect(root.locator('.profile-learning, .profile-xp, .profile-learning-stats')).toHaveCount(0);
  await expect(root.getByText('2 active days')).toBeVisible();
  await expect(root.locator('[role="img"][aria-label$=" • Active"]')).toHaveCount(2);
  await expect(root.locator('.profile-region')).toBeVisible();
});

for (const points of [0, 500, 1250, 10000]) {
  test(`profile retains the full ${points} points total`, async ({ page }) => {
    await page.route('**/api/v1/user-auth/me', route => route.fulfill({ json: { data: { ...user, points } } }));
    await page.goto('/profile');
    await expect(page.locator('.profile-stat').filter({ hasText: 'Points' }).locator('dd')).toHaveText(points.toLocaleString('en'));
    await expect(page.locator('.profile-learning')).toHaveCount(0);
  });
}

test('responsive profile fits mobile tablet and desktop in both themes', async ({ page }) => {
  await page.goto('/profile');
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const layout = await page.locator('.profile-grid').evaluate(el => ({ columns: getComputedStyle(el).gridTemplateColumns.split(' ').length, children: [...el.children].map(child => child.getBoundingClientRect().toJSON()) }));
      expect(layout.columns).toBe(width >= 768 ? 2 : 1);
      expect(layout.children.every(rect => rect.left >= 0 && rect.right <= width)).toBe(true);
    }
  }
});

// Retain settings coverage for when the mascot UI is restored.
test.skip('buddy choices and reaction settings use existing persistence', async ({ page }) => {
  await page.goto('/profile');
  const buddy = page.locator('.profile-buddy');
  await expect(buddy.locator('.ua-buddy-settings__char')).toHaveCount(1);
  await buddy.locator('.ua-buddy-settings__char').click();
  await expect(buddy.locator('.ua-buddy-settings__char')).toHaveAttribute('aria-pressed', 'true');
  const patch = page.waitForRequest(request => request.url().endsWith('/user-auth/me/mascot') && request.postDataJSON().vibe === 'companion');
  await buddy.getByRole('button', { name: /Companion Calm/ }).click();
  await patch;
  await expect(buddy.getByRole('button', { name: /Companion Calm/ })).toHaveAttribute('aria-pressed', 'true');
  await buddy.getByRole('button', { name: 'Buddy reactions are on' }).click();
  await expect(buddy.getByRole('button', { name: /Buddy is muted/ })).toHaveAttribute('aria-pressed', 'false');
  expect(await page.evaluate(() => localStorage.getItem('ua_mascot_vibe'))).toBe('companion');
  expect(await page.evaluate(() => localStorage.getItem('ua_mascot_muted'))).toBe('1');
});

test('mascot UI and profile settings stay hidden while paused', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Profile' })).toBeVisible();
  await expect(page.locator('.profile-buddy, .ua-mascot, .ua-buddy-settings')).toHaveCount(0);
  await expect(page.locator('.profile-region')).toBeVisible();

  await page.goto('/tests');
  await expect(page.locator('.practice-page')).toBeVisible();
  await expect(page.locator('.practice-buddy, .ua-mascot')).toHaveCount(0);

  await page.goto('/mascot-preview');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('img', { name: 'Aria, your coding companion' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Your study buddy/ })).toHaveCount(0);
});

test('manual region save updates identity and preserves failure feedback', async ({ page }) => {
  await page.goto('/profile');
  const region = page.locator('.profile-region');
  await expect(region.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
  await region.getByRole('combobox').selectOption('US');
  await region.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(region.getByRole('status')).toHaveText('Region set to United States.');
  await expect(page.locator('.profile-summary')).toContainText('United States');
  await page.route('**/api/v1/user-auth/me/region', route => route.fulfill({ status: 500, json: { error: 'Unavailable' } }));
  await region.getByRole('combobox').selectOption('GB');
  await region.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(region.getByRole('status')).toContainText('Could not save');
  await expect(page.locator('.profile-summary')).toContainText('United States');
});

test('detect region uses browser location and saves detected value', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 51.5, longitude: -0.1 });
  await page.route('https://api.bigdatacloud.net/**', route => route.fulfill({ json: { countryCode: 'GB' } }));
  await page.goto('/profile');
  await page.locator('.profile-region').getByRole('button', { name: 'Detect automatically' }).click();
  await expect(page.locator('.profile-region').getByRole('status')).toHaveText('Region set to United Kingdom.');
  await expect(page.locator('.profile-summary')).toContainText('United Kingdom');
});

test('profile is accessible in both themes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/profile');
  await expect(page.getByText('2 active days')).toBeVisible();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    const result = await new AxeBuilder({ page }).include('.profile-page').analyze();
    expect(result.violations).toEqual([]);
  }
});
