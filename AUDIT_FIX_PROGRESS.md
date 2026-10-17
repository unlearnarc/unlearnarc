# Audit remediation progress

Source: `ai-fix-plan.md` from the UnlearnArc Bairav audit (2026-10-17).
This log records verified remediation done in the workspace. The full 99-task plan is not complete.

## Implemented and verified

- **T001 / T006 — backend dependency remediation, partial:** upgraded Spring Boot 3.2.5 to 3.5.16 while retaining Java 21 and the Spring Boot 3/Jackson 2 API families. Updated springdoc to 2.8.17 and added targeted patch overrides for Tomcat, Jackson, HttpCore/HttpClient, Commons Lang and Log4j.
- **T003 / T008 — admin dependency remediation:** upgraded the Node dependency baseline. `npm audit --audit-level=moderate` now reports zero vulnerabilities.
- **T004 / T009 — student dependency remediation:** upgraded the Node dependency baseline. `npm audit --audit-level=moderate` now reports zero vulnerabilities.
- **T012 / T087 / T088 — shared visualizer dependency and test baseline:** upgraded package dependencies, added renderer/engine regression tests, and rebuilt `dist` output.
- **T013 — backend non-root runtime:** Docker runtime now uses UID/GID 10001; the JAR belongs to that account, and the startup shell uses `exec` so Java receives termination signals.
- **T015 — locale-independent search:** case folding uses `Locale.ROOT`. Regression tests cover Turkish default locale behavior, browse behavior and weighted ranking.
- **T020 / T027 / T029 — backend log privacy and log-injection hardening:** sensitive authentication values, emails, token-bearing redirect URLs and unsafe request details are no longer written raw to security/audit logs. Added a `SafeLog` helper and regression coverage.
- **T030 — backend HTML sanitizer ReDoS fix:** replaced regex-based rich-text sanitization with parser-based allow-list sanitization via jsoup, with regression tests.
- **T011 / T033 / T034 / T043 — admin sanitizer test coverage:** added Vitest coverage for admin rich-text sanitization used before `dangerouslySetInnerHTML`.
- **T044 / T045 / T058 — renderer import-cycle cleanup:** shared renderer helpers were split into `shared.ts` and renderer index modules now only dispatch renderers.
- **Student browser-test reliability:** fixed stale/ambiguous Playwright assertions and made local browser automation use loopback so the workspace proxy does not intercept the Vite server.
- **Anonymous public-page behavior:** student API 401 handling no longer redirects anonymous users from public pages just because an optional API request failed.

## Latest validation

- `cd backend && ./mvnw -q -B clean verify`: passed, **42 unit tests + 22 integration tests**, zero failures/errors/skips.
- `cd admin && npm audit --audit-level=moderate`: passed, zero vulnerabilities.
- `cd admin && npm test && npm run build`: passed, **5 Vitest tests** and production build.
- `cd packages/algo-visualizer && npm audit --audit-level=moderate`: passed, zero vulnerabilities.
- `cd packages/algo-visualizer && npm test && npm run typecheck && npm run build`: passed, **7 Vitest tests**, TypeScript check and package build.
- `cd student && npm audit --audit-level=moderate`: passed, zero vulnerabilities.
- `cd student && npm run build`: passed.
- `cd student && RUN_WEBSERVER=1 npm run test:ui`: passed, **174 Playwright tests** across functional, accessibility, performance and mobile projects.
- `git diff --check`: passed before this progress-log update; rerun after final edits before committing.

## Remaining dependency advisories

Spring MVC 6.2.19 is still flagged by source/dependency scanners for:

- **CVE-2026-47884 / GHSA-j9f9-w8pj-32f8**: XSLT view rendering with an implicit view name and wildcard mapping.
- **CVE-2026-47890 / GHSA-pc63-qcmh-9cmg**: SSE view fragments.

The current backend uses REST controllers and has no XSLT view resolver, SSE emitter or view-fragment rendering code. These are dependency findings with currently absent application preconditions, not removed vulnerabilities. No global suppression was added. Track a compatible Spring Framework 6.2.x / Boot 3.x patch, or perform a separately tested Boot 4 migration; do not independently force Spring Framework 7 into Boot 3.

## Secret triage / follow-up

- **T016:** `backend/.env` is already ignored by the root `.gitignore` and is not tracked by Git. Local credentials were not modified.
- **T005:** the committed `.env.example` has empty credential fields. Scanner matches also include local `.env`, API documentation and the test-profile JWT value. The test JWT is explicitly test-only. Rotate any real provider/deployment credentials that were exposed outside the local workspace; that requires provider/deployment access.
- **T014 / T028:** `PayloadSigner` derives HMAC bytes from runtime `JwtProperties.secret`; `HmacSHA256` and `contest-challenge::` are an algorithm identifier and domain-separation prefix, not hardcoded secret keys.
- **T049:** `create-drop` is scoped to the H2 test profile; production schema handling was not changed.

## Still open / needs design decision

- **T010 / T019 / T032 — browser token storage:** bearer tokens remain in web storage. Replacing this safely requires a coordinated backend/frontend cookie-auth migration, CSRF protection, SameSite/Secure cookie settings and cross-origin deployment decisions.
- **T046 — CSRF:** currently tied to the token-storage migration. Enabling CSRF without changing auth flow would break existing bearer-token clients.
- **T048 — Actuator health/readiness:** can be added as an operations task, but it changes exposed endpoints and deployment health checks.
- **T018 / T021 / T022 / T023 and lower-priority quality/performance items:** not fully remediated yet.
- **Docker image runtime validation:** Docker is not installed in this workspace, so the image has not been built or run locally.

Do not remove sandbox execution or required WASM assets just to silence generic scanner findings. Admin SEO recommendations also need review: an authenticated admin console should not be made crawlable merely to improve audit scores.
