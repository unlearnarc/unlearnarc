import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('ua_user_token', 'mascot-test-session'));
  await page.route('**/api/v1/**', route => route.fulfill({ json: { data: {} } }));
  await page.goto('/mascot-preview');
});

test('floating buddy replaces legacy characters without remounting or moving feet', async ({ page }) => {
  await page.evaluate(() => localStorage.setItem('ua_mascot_char', 'byte'));
  await page.reload();
  const buddy = page.getByRole('button', { name: /Your study buddy/ });
  const mascot = buddy.locator('svg');
  await expect(mascot).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('ua_mascot_char'))).toBe('aria');
  await page.waitForTimeout(1000);
  await mascot.evaluate(el => { (window as unknown as { buddyNode: Element }).buddyNode = el; });
  const feet = mascot.locator('[data-fixed-feet]');
  const before = await feet.boundingBox();
  for (let i = 0; i < 3; i++) {
    await buddy.click();
    await page.waitForTimeout(90);
    expect(await mascot.evaluate(el => el === (window as unknown as { buddyNode: Element }).buddyNode)).toBe(true);
    const after = await feet.boundingBox();
    expect(after!.y).toBeCloseTo(before!.y, 2);
    expect(after!.x).toBeCloseTo(before!.x, 2);
  }
  await buddy.dispatchEvent('contextmenu');
  const settings = page.getByRole('dialog', { name: 'Buddy settings' });
  await expect(settings.getByText('Aria', { exact: true })).toBeVisible();
  await expect(settings.locator('.ua-buddy-settings__char')).toHaveCount(1);
  await settings.getByRole('button', { name: /Buddy reactions are on/ }).click();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(1800);
  const body = mascot.locator('[data-upper-body]');
  for (let i = 0; i < 2; i++) {
    const transform = await body.getAttribute('transform');
    const scale = Number(transform!.match(/scale\(1 ([^)]+)\)/)![1]);
    expect(scale).toBeCloseTo(1, 7);
    await page.waitForTimeout(250);
  }
});

test('all states and rapid retargeting retain exact grounded feet and live path nodes', async ({ page }) => {
  const mascot = page.getByRole('img', { name: 'Aria, your coding companion' });
  await expect(mascot).toBeVisible();
  const before = await mascot.locator('[data-fixed-feet]').evaluate(el => el.innerHTML);
  await mascot.evaluate(el => { (window as unknown as { testEye: Element | null }).testEye = el.querySelector('[data-part="eye-left-white"]'); });
  const samples: string[] = [];
  for (const state of ['Excited','Sleepy','Sad','Happy','Excited','Sad']) {
    await page.getByRole('button', { name: new RegExp(state) }).click();
    await page.waitForTimeout(65);
    samples.push(await mascot.locator('[data-part="mouth"]').getAttribute('d') || '');
    expect(await mascot.locator('[data-fixed-feet]').evaluate(el => el.innerHTML)).toBe(before);
  }
  expect(new Set(samples).size).toBeGreaterThan(3);
  await expect(mascot).toHaveAttribute('data-state','sad');
  await expect(page.getByRole('button', { name: /Sad/ })).toHaveAttribute('aria-pressed','true');
  expect(await mascot.evaluate(el => el.querySelector('[data-part="eye-left-white"]') === (window as unknown as { testEye: Element }).testEye)).toBe(true);
  const box = await mascot.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
});

test('redesigned eye details share blink transforms in every expression', async ({ page }) => {
  const mascot = page.getByRole('img', { name: 'Aria, your coding companion' });
  await expect(mascot).toBeVisible();
  for (const state of ['Happy', 'Sleepy', 'Excited', 'Sad']) {
    await page.getByRole('button', { name: new RegExp(state) }).click();
    await page.waitForTimeout(800);
    for (const side of ['left', 'right']) {
      const transforms = await mascot.locator(`[data-part^="eye-${side}-"], [data-part="eyelid-${side}"]`).evaluateAll(els => els.map(el => el.getAttribute('transform')));
      expect(transforms.length).toBeGreaterThan(9);
      expect(new Set(transforms).size).toBe(1);
    }
    await expect(mascot.locator('[data-part="mouth-tongue"]')).toHaveCount(1);
    expect(await mascot.locator('[data-part="mouth"]').getAttribute('d')).not.toMatch(/NaN|Infinity/);
  }
});

test('artwork renders on light and dark surfaces at preview and website sizes', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const mascot = page.getByRole('img', { name: 'Aria, your coding companion' });
  const stage = page.locator('.aria-stage');
  for (const surface of ['#F8FAFC', '#111827']) {
    await page.getByRole('button', { name: `Surface ${surface}`, exact: true }).click();
    for (const state of ['Happy', 'Sleepy', 'Excited', 'Sad']) {
      await page.getByRole('button', { name: new RegExp(state) }).click();
      await expect(mascot).toHaveAttribute('data-state', state.toLowerCase());
      await expect(mascot.locator('[data-part="hair-clip"]')).toBeVisible();
      await expect(mascot.locator('[data-part="hair-cowlick"]')).toBeVisible();
      for (const width of [280, 64, 48]) {
        await page.locator('.aria-character').evaluate((el, size) => {
          (el as HTMLElement).style.width = `${size}px`;
          (el as HTMLElement).style.height = `${size * 1.25}px`;
        }, width);
        await expect(mascot).toBeVisible();
        const box = await mascot.boundingBox();
        expect(box!.width).toBeCloseTo(width, 0);
        await testInfo.attach(`${state}-${surface.slice(1)}-${width}px`, {
          body: await stage.screenshot(), contentType: 'image/png',
        });
      }
    }
  }
});

test('breathing and blinking compose; idle toggle and reduced motion settle', async ({ page }) => {
  const mascot = page.getByRole('img', { name: 'Aria, your coding companion' });
  await page.waitForTimeout(900);
  const body = mascot.locator('[data-upper-body]');
  const first = await body.getAttribute('transform');
  await page.waitForTimeout(200);
  expect(await body.getAttribute('transform')).not.toBe(first);
  // Observe the actual blink scale, rather than relying on a fixed random delay.
  const blink = await mascot.evaluate(async el => {
    for (let i=0; i<220; i++) {
      const tf = el.querySelector('[data-part="eye-left-white"]')!.getAttribute('transform') || '';
      if (/scale\(1 (?!1\))/.test(tf)) return true;
      await new Promise(r => setTimeout(r, 30));
    }
    return false;
  });
  expect(blink).toBe(true);
  await page.getByRole('checkbox', { name: /Idle animation/ }).uncheck();
  await page.waitForTimeout(1500);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: /Excited/ }).click();
  await page.waitForTimeout(100);
  expect(await body.getAttribute('transform')).toContain('scale(1 1)');
  const mouth = await mascot.locator('[data-part="mouth"]').getAttribute('d');
  await page.waitForTimeout(300);
  expect(await mascot.locator('[data-part="mouth"]').getAttribute('d')).toBe(mouth);
  await expect(mascot.locator('[data-part="eye-left-white"]')).toHaveAttribute('transform', /scale\(1 1\)/);
});

test('new actions animate articulated limbs and reduced motion freezes them', async ({ page }) => {
  const mascot = page.getByRole('img', { name: 'Aria, your coding companion' });
  for (const state of ['Walking', 'Greeting', 'Thinking', 'Surprised', 'Sleeping', 'Excited']) {
    await page.getByRole('button', { name: new RegExp(state) }).click();
    await expect(mascot).toHaveAttribute('data-state', state.toLowerCase());
    await page.waitForTimeout(1000);
    expect(await mascot.locator('[data-part="mouth"]').getAttribute('d')).not.toMatch(/NaN|Infinity/);
    if (['Walking', 'Greeting', 'Excited'].includes(state)) {
      const limb = mascot.locator(state === 'Walking' ? '[data-motion-part="leftLeg"]' : '[data-motion-part="rightArm"]').first();
      const before = await limb.getAttribute('transform');
      await page.waitForTimeout(170);
      expect(await limb.getAttribute('transform')).not.toBe(before);
    }
  }
  await page.getByRole('button', { name: /Walking/ }).click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForTimeout(150);
  const legs = mascot.locator('[data-fixed-feet]');
  const frozen = await legs.evaluate(el => el.innerHTML);
  await page.waitForTimeout(250);
  expect(await legs.evaluate(el => el.innerHTML)).toBe(frozen);
  await expect(mascot.locator('[data-motion-part="leftLeg"]').first()).toHaveAttribute('transform', /rotate\(0 /);
});

test('greeting reacts in place and companion settings contain no romantic effects', async ({ page }) => {
  const buddy = page.getByRole('button', { name: /Your study buddy/ });
  await buddy.click();
  await expect(buddy.locator('svg')).toHaveAttribute('data-state', 'greeting');
  await buddy.dispatchEvent('contextmenu');
  const settings = page.getByRole('dialog', { name: 'Buddy settings' });
  await settings.getByRole('button', { name: /Companion/ }).click();
  await page.keyboard.press('Escape');
  for (let i = 0; i < 5; i++) {
    await buddy.click();
    await expect(page.locator('.ua-mascot')).not.toContainText(/😘|💋|😍|🥰|💕|💖|💛|💞|💓/u);
    await expect(page.locator('.ua-mascot__hearts')).toHaveCount(0);
  }
});
