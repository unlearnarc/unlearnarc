# Profile sharing and rank-change pop-ups

## Deployment

The backend adds the nullable `profile_share_token` and `last_seen_rank` columns and the unique sharing-token constraint automatically at startup with the default `JPA_DDL_AUTO=update`. Existing accounts stay private and establish their rank baseline on first use; no data backfill is needed. Fresh installs also include the columns in `backend/schema.sql`. No new environment variables are required.

For existing Render services, set `JPA_DDL_AUTO=update` in the dashboard if it still says `validate`. If you deliberately keep schema validation enabled, apply `backend/migrations/V13__profile_sharing_rank_alerts.sql` once before deploying instead. Do not run that SQL after startup has already created the columns.

## Profile sharing

Profile → Share your profile → Enable profile sharing. Students can use the native share sheet on supported devices, copy the link elsewhere, or preview it. Public routes are `/p/:token`; they do not require login. The public response explicitly allows only name, points, live global rank, current streak and best streak. Email, region, profile photo, internal ID, activity dates and auth settings are never included.

Sharing is private by default. Disabling it removes the token immediately; enabling it again generates a new random token. Only active users can be shared. Public API responses are marked `Cache-Control: no-store`; public data is not retained in the client query cache after unmount. A person who has already viewed the profile could still save the information, so do not treat revocation as erasing earlier disclosures.

API contracts (standard `ApiResponse` envelopes):
- `GET /api/v1/user-auth/me/sharing` → `{ token: string | null }`
- `PUT /api/v1/user-auth/me/sharing` with `{ enabled: boolean }` → settings
- `GET /api/v1/public/profiles/:token` → public profile or 404

## Rank changes

`POST /api/v1/leaderboard/me/rank-change` computes the live global rank and acknowledges it transactionally, returning `{ previousRank, currentRank, changed }`. The first call establishes a silent baseline. Subsequent changes are acknowledged across devices; the next active student client receives the update. Ranks use competition ranking (equal points share a rank).

The student shell checks every 30 seconds and on window focus/visibility restoration; hidden pages, full-screen learning sessions and Deep Mode DND skip checks. Entering the board or improving rank shows a brief confetti pop-up; drops show a neutral update without celebration. Reduced-motion preferences disable confetti. These are in-app pop-ups, not background push notifications. Network failures never block learning.

Validation: frontend unit tests include rank-change classification; deterministic browser contract tests are in `tests/ui/profile-sharing-rank.func.spec.ts`. Backend tests cover opt-in/revocation, safe fields, stale streaks, rank baselines/change acknowledgement, 404 responses, no-store headers and input validation.
