import { type Page, type APIRequestContext, expect } from '@playwright/test';

/**
 * Shared helpers for the student UI suite.
 *
 * AUTH STRATEGY
 * -------------
 * The student app authenticates via Google OAuth2, which we can't drive in a
 * headless test. But the frontend stores its session entirely in localStorage
 * (`ua_user_token`, `ua_user`) and AuthContext treats "has token" as logged-in.
 * We therefore mint a REAL JWT from the backend admin login endpoint
 * (/api/v1/auth/login) and inject it into localStorage before the app boots.
 * This gives us a genuine, server-valid token so /me and all protected API
 * calls succeed — no mocking.
 */

const API_BASE = process.env.API_BASE || 'http://localhost:8085';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'unlearnarc@gmail.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';

export interface SeededSession {
  token: string;
  refreshToken: string;
}

/** Log in via the backend and return a real JWT pair. */
export async function fetchRealToken(
  request: APIRequestContext,
): Promise<SeededSession> {
  const res = await request.post(`${API_BASE}/api/v1/auth/login`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  expect(res.ok(), `login should succeed (got ${res.status()})`).toBeTruthy();
  const body = await res.json();
  const data = body.data ?? body;
  const token = data.accessToken ?? data.token;
  expect(token, 'login response must carry an access token').toBeTruthy();
  return { token, refreshToken: data.refreshToken ?? '' };
}

/**
 * Inject a real session into localStorage so the SPA boots authenticated.
 * Must be called AFTER an initial navigation (so an origin exists) but the
 * caller then reloads to let AuthContext read the token.
 */
export async function seedAuth(page: Page, session: SeededSession) {
  await page.addInitScript((s) => {
    localStorage.setItem('ua_user_token', s.token);
    if (s.refreshToken) localStorage.setItem('ua_user_refresh', s.refreshToken);
    localStorage.setItem(
      'ua_user',
      JSON.stringify({
        id: 'test-admin',
        name: 'Test Admin',
        email: 'unlearnarc@gmail.com',
        picture: '',
      }),
    );
  }, session);
}

/** Collect browser console errors for a quality gate. */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

/** Known benign console noise to ignore (third-party / expected). */
export const IGNORED_CONSOLE = [
  /favicon/i,
  /Failed to load resource.*404.*picture/i, // empty avatar
  /ResizeObserver loop/i,
  /pyodide/i, // sandbox worker boot logs, not a page error
];

export function filterErrors(errors: string[]): string[] {
  return errors.filter((e) => !IGNORED_CONSOLE.some((re) => re.test(e)));
}
