import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const theme of ['light', 'dark']) {
  test(`populated animation library is accessible in ${theme} mode`, async ({ page }) => {
    await page.addInitScript(() => { localStorage.setItem('ua_lang', 'en'); localStorage.setItem('ua_user_token', 'library-a11y'); });
    await page.route('**/api/v1/**', route => route.fulfill({ json: { data: [] } }));
    await page.route('**/api/v1/animation-scenes/published', route => route.fulfill({ json: { data: [
      { id: 'sql', title: 'SQL JOIN', category: 'DATABASE', duration: 2600, keyframeCount: 5 },
      { id: 'search', title: 'Binary Search', category: 'DSA' },
    ] } }));
    await page.goto('/animations');
    await expect(page.locator('.animation-library-card')).toHaveCount(2);
    await page.evaluate(value => document.documentElement.setAttribute('data-theme', value), theme);
    // Let the shared page-entry fade and theme transitions settle before contrast sampling.
    await page.locator('.animation-library').evaluate(async el => {
      await Promise.all(el.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    });
    for (const category of ['ALL', 'DATABASE']) {
      if (category === 'DATABASE') {
        await page.getByRole('button', { name: 'View all SQL / Database', exact: true }).click();
        await expect(page.getByRole('heading', { level: 1, name: 'SQL / Database' })).toBeVisible();
      }
      const results = await new AxeBuilder({ page }).include('.animation-library').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(results.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }))).toEqual([]);
    }
  });
}
