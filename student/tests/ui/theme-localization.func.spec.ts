import { expect, test } from '@playwright/test';

test('language dropdown is visible, translates static labels and persists on desktop and mobile', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('ua_user_token', 'language-test-session');
    localStorage.setItem('ua_user', JSON.stringify({ id: 'language-learner', name: 'Learner' }));
    localStorage.setItem('ua_lang', localStorage.getItem('ua_lang') || 'en');
  });
  await page.route('**/api/v1/**', async route => {
    const data = route.request().url().includes('/user-auth/me')
      ? { id: 'language-learner', name: 'Learner' } : [];
    await route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
  });
  await page.goto('/explore');
  const dropdown = page.locator('header:visible select');
  await expect(dropdown).toBeVisible();
  await expect(dropdown).toHaveValue('en');
  await dropdown.selectOption('fr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ua_lang'))).toBe('fr');
  await expect(page.getByRole('link', { name: 'Tableau de bord', exact: true }).first()).toBeAttached();
  await page.reload();
  await expect(dropdown).toHaveValue('fr');
  await page.setViewportSize({ width: 320, height: 740 });
  await expect(dropdown).toBeVisible();
  await dropdown.selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

 test('light is the default even on dark devices and landing stays light', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.evaluate(() => localStorage.setItem('ua_theme', 'dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('.landing-page')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.landing-page')).toHaveCSS('color-scheme', 'light');
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('only static interface strings translate; runtime translation is disabled', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const fail = () => { throw new Error('Runtime translation must not run'); };
    Object.defineProperty(globalThis, 'Translator', { configurable: true, value: { create: fail, availability: fail } });
    const { default: i18n } = await import('/src/i18n/index.ts');
    const { translateText, translateBatch, isTranslatorSupported } = await import('/src/i18n/translator.ts');
    const before = i18n.t('nav.dashboard');
    await i18n.changeLanguage('fr');
    return {
      before, after: i18n.t('nav.dashboard'), supported: isTranslatorSupported(),
      title: await translateText('Original course', 'en', 'fr'),
      batch: await translateBatch(['Question', 'Lesson'], 'en', 'fr'),
    };
  });
  expect(result.after).not.toBe(result.before);
  expect(result.supported).toBe(false);
  expect(result.title).toBe('Original course');
  expect(result.batch).toEqual(['Question', 'Lesson']);
  await expect(page.getByRole('button', { name: /listen|read aloud/i })).toHaveCount(0);
});
