# PWA, background reminders & deep-focus DND

## Deployment

1. Apply `backend/migrations/V12__web_push.sql` on existing MySQL databases before deploying (or use the project's Hibernate auto-update in development).
2. Generate a VAPID key pair once with `npx web-push generate-vapid-keys`. Set `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, and `VAPID_SUBJECT` (a real `mailto:` contact or HTTPS URL) on the **backend**. Never put the private key in a `VITE_` variable. Keep the pair stable across deployments.
3. Build/deploy the student app over HTTPS. Its manifest, icons, offline fallback, and `/sw.js` must be served as real static assets, not SPA HTML. `/sw.js` must not be long-term cached. The student Vercel configuration supplies this header.
4. Keep the backend running: it polls persisted reminders every 15 seconds. Sleeping hosting instances cannot send on-time reminders. Push services and phone power/network policies may delay delivery; this is not an alarm-clock guarantee.

## User flow

- Open **Profile → App & notifications** or the **Reminders** tool. Tap **Enable notifications** and grant permission. No permission request happens on page load.
- Android: install via the browser's install menu or **Install app** when available.
- iPhone/iPad: iOS/iPadOS 16.4+, Safari → Share → Add to Home Screen. Open the installed app, then enable notifications there.
- Schedule up to 100 reminders per browser/device; one-time, daily, and weekly reminders are supported. Once synced, the backend can deliver while another phone app is active or UnlearnArc is closed. Reminders themselves remain local-first and are not shared between devices.
- Deep Mode has **Do not disturb during deep focus** and a live DND switch. DND persists across panel close/reopen and reload, ends when the session is ended, and expires after 12 hours as a safety limit. It defers learning reminders and silences timer chimes. The offline worker also checks the local DND state.
- This is **app-only DND**, not a switch for calls or other apps. Use the phone's Focus / Do Not Disturb settings for those.
- Disabling notifications unsubscribes this browser; logout also disables local delivery. A network failure can leave an obsolete server row until its push endpoint expires; it cannot re-enable delivery locally.

## Architecture and limitations

- Authenticated subscription CRUD is scoped to the current user and random browser device ID. Subscription endpoints are restricted to known browser push hosts to prevent arbitrary outbound requests. Expired endpoints (404/410) are removed.
- The server owns reminder delivery when push is enabled to avoid foreground/background duplicates. Sync reconciles server-fired occurrences into local storage. Without push, the existing foreground scheduler remains available; it is not guaranteed to run when a phone suspends the browser.
- API data, authentication callbacks, WASM assets, and private pages are not cached by this service worker. Offline navigation displays a simple reconnect page; this is not a full offline learning app.
- DND changes and reminder edits sync when online; changes made offline cannot retract a push already accepted by the phone's push provider. Push delivery is best-effort, not exactly-once across crashes/provider retries.
- Pomodoro uses mobile-compatible service-worker notifications while the browser runs; its phase transitions are not server-scheduled background alarms.
- VAPID key rotation requires users to disable/re-enable notifications.

## Validation / manual phone checks

- `npx tsc -b`, `npm run build`, `npm run lint`, `npx vitest run` in `student/`.
- After a build, `node scripts/smoke-pwa.mjs` verifies browser service-worker activation, install assets, persisted DND, and offline navigation.
- `mvn -Dtest=PushDeliveryServiceTest test` in `backend/`.
- Regenerate reproducible install icons with `node scripts/generate-pwa-icons.mjs` (requires Playwright Chromium).
- With VAPID configured, enable push on an installed phone app, schedule a reminder 2 minutes ahead, switch to another app, and verify delivery/click navigation.
- Repeat during deep focus with DND on: no reminder until DND ends. Toggle DND off or end the session and verify deferred delivery.
- Verify denial/revocation, offline sync error/retry, delete-before-due, repeats, logout, and Android/iOS system notification settings on real devices.
