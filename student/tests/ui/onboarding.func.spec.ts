import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Isolate onboarding from OAuth's external provider and course availability.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/v1/**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: [] }),
  }));
  await page.route('**/api/v1/user-auth/me', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: { id: 'tour-user', name: 'New Learner', email: 'learner@example.test' } }),
  }));
});

async function callback(page: import('@playwright/test').Page, isNewUser: boolean, userId = 'tour-user') {
  await page.goto(`/auth/callback?token=test-token&userId=${userId}&name=New%20Learner&isNewUser=${isNewUser}`);
  await expect(page).toHaveURL(/\/dashboard$/);
}

test('mascot is absent only from the landing page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.ua-mascot')).toHaveCount(0);
  await page.goto('/login');
  await expect(page.locator('.ua-mascot')).toBeVisible();
});

test('new registration gets a complete keyboard-accessible feature guide', async ({ page }) => {
  await callback(page, true);
  const dialog = page.getByRole('dialog', { name: 'Your learning journey starts here' });
  await expect(dialog).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your learning journey starts here' })).toBeFocused();
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    await page.waitForTimeout(350);
    const accessibility = await new AxeBuilder({ page }).include('.feature-tour').analyze();
    expect(accessibility.violations, `${theme} tour accessibility`).toEqual([]);
  }
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Learn with a clear structure' })).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(dialog).toBeVisible();
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Find things fast. Make space to focus.' })).toBeVisible();
  await page.getByRole('button', { name: 'Finish tour' }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ua_feature_tour_v1:tour-user'))).toBe('done');
});

test('pending tour survives reload; skipping persists; URL replay opens features', async ({ page }) => {
  await callback(page, true);
  await page.reload();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.reload();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Feature tour', exact: true })).toHaveCount(0);
  await page.goto('/dashboard?tour=1');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Explore courses', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('existing users can replay via URL, even with a rate-limited profile image', async ({ page }) => {
  await page.route('https://lh3.googleusercontent.com/**', route => route.fulfill({ status: 429, body: 'Too Many Requests' }));
  await page.unroute('**/api/v1/user-auth/me');
  await page.route('**/api/v1/user-auth/me', route => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify({ data: { id: 'tour-user', name: 'New Learner', profilePicture: 'https://lh3.googleusercontent.com/test-avatar' } }),
  }));
  await callback(page, false);
  await page.goto('/dashboard?tour=1&keep=yes');
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page).toHaveURL(/\/dashboard\?keep=yes$/);
  await expect(page.locator('img[src*="googleusercontent"]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.reload();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('pending state set from the console is picked up on window focus', async ({ page }) => {
  await callback(page, false);
  await page.evaluate(() => {
    localStorage.setItem('ua_feature_tour_v1:tour-user', 'pending');
    window.dispatchEvent(new Event('focus'));
  });
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('returning sign-ins do not trigger a tour, even without browser history', async ({ page }) => {
  await callback(page, false);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('ua_feature_tour_v1:tour-user'))).toBeNull();
});

test('Escape dismisses the tour and reduced motion disables entry animation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await callback(page, true);
  await expect(page.getByRole('dialog')).toHaveCSS('animation-name', 'none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.reload();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('a dismissed tour cannot suppress another new account', async ({ page }) => {
  await callback(page, true);
  await page.getByRole('button', { name: 'Skip tour' }).click();
  await page.unroute('**/api/v1/user-auth/me');
  await page.route('**/api/v1/user-auth/me', route => route.abort());
  await callback(page, true, 'another-user');
  await expect(page.getByRole('dialog')).toBeVisible();
});
