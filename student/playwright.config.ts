import { defineConfig, devices } from '@playwright/test';

/**
 * UI automation config for the UnlearnArc student app.
 *
 * Covers three test tiers, each in its own project:
 *   • functional  — navigation, rendering, filters, auth-gated routes
 *   • a11y        — accessibility / quality scans via axe-core
 *   • perf        — Web-Vitals-style load/latency budgets
 *
 * The app runs on Vite :3002 (strictPort) and proxies /api + /oauth2 to the
 * Spring backend on :8085. We assume the dev server + backend are already up;
 * `webServer` below can auto-start Vite when RUN_WEBSERVER=1.
 */

// IPv4 loopback keeps local automation out of corporate HTTP proxies.
const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3002';
// Optional: force a specific Chrome binary via CHROME_PATH. When unset we use
// Playwright's own bundled Chromium (installed via `npx playwright install
// chromium`), which is the most reliable option for headless automation.
const CHROME = process.env.CHROME_PATH;
const launchOptions = CHROME
  ? { executablePath: CHROME, args: ['--no-sandbox'] }
  : { args: ['--no-sandbox'] };

export default defineConfig({
  testDir: './tests/ui',
  // Each spec is independent; run files in parallel but keep tests within a
  // file serial so shared auth state is deterministic.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 45_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    // Match the app's cross-origin-isolation headers quietly; no extra flags
    // needed for functional/a11y runs.
  },

  projects: [
    {
      name: 'functional',
      testMatch: /.*\.func\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      name: 'a11y',
      testMatch: /.*\.a11y\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      name: 'perf',
      testMatch: /.*\.perf\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions },
    },
    {
      name: 'mobile',
      testMatch: /.*\.func\.spec\.ts/,
      use: { ...devices['Pixel 7'], launchOptions },
    },
  ],

  // Opt-in auto-start of the Vite dev server. By default we reuse a running one.
  webServer: process.env.RUN_WEBSERVER
    ? {
        command: 'npm run dev -- --host 127.0.0.1',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
