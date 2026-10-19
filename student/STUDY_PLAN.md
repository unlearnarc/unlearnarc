# Personalized Study Plan

## Entry and existing accounts
`/study-plan` is authenticated and linked directly from the existing desktop/mobile sidebar.
Both new and existing students use the dedicated setup form. No account or onboarding flags are changed.
Returning students see their saved dashboard. Preferences are edited on the same page.

## Files
- Backend `studyplan/`: mapped plan/preferences, task/revision records, repositories, DTOs, controller, service and pure calendar scheduler.
- `backend/migrations/V14__study_plan.sql`: reference DDL for managed schemas.
- `student/src/api/studyPlan.ts`: existing authenticated API client integration.
- `student/src/pages/StudyPlanPage.tsx`, `study-plan.css`: responsive setup/dashboard.
- Existing App route, AppSidebar, English navigation label, and TopicRow deep-link handling extended.
- Backend scheduler/persistence tests and `student/tests/ui/study-plan.func.spec.ts`.

## Database startup
The existing `spring.jpa.hibernate.ddl-auto=${JPA_DDL_AUTO:update}` creates additive tables automatically.
There is no Flyway runner; SQL files are reference migrations for deployments using externally managed schemas.
No existing tables or progress are reset. Tables: `study_plan`, `study_plan_domains`,
`study_plan_courses`, `study_plan_days`, `study_plan_task`.
A plan belongs to one user, guarded by an account-row transaction lock.
Tasks reference existing course/topic rows and retain title/key snapshots if catalog rows are removed.
The `(plan_id, topic_key, revision_interval)` unique constraint prevents duplicate revisions.
Revision records are task rows with interval 1/3/5/7, rather than a redundant second table.

## API
All endpoints are under `/api/v1/study-plan`, require USER authority, and derive the account from authentication:
- GET `/catalog`, GET/PUT `/preferences`
- POST `/generate` with `{ "replaceFuture": false }`; repeat requests without replacement are no-ops.
- GET base route with optional `weekStart=YYYY-MM-DD`: dashboard and persisted summary.
- GET `/tasks/today`, GET `/tasks/week?weekStart=YYYY-MM-DD`, GET `/revisions`
- POST `/tasks/{id}/complete`: idempotent, ownership checked, earlier steps required, no early completion.
PUT preferences uses `?replaceFuture=true` after UI confirmation to reschedule incomplete tasks.
Completed tasks and external quiz/enrollment records are never overwritten.

## Scheduling policy
No AI or external calls. Catalog domains resolve through existing domain→skill→course mappings.
Recommendations prioritize the selected skill level and deterministically select up to three matching courses.
Course previews use actual topic names because the course model has no description field.
Only topics with published notes, materials or mapped quizzes are scheduled. Existing quiz mastery is reused.
Learn day 0, then revision intervals 1,3,5,7; non-study/full days move forward. Revisions stay ordered.
Daily minutes are capped at the selected budget (90+ uses 90). Longer topics get a budget-sized focus session;
this version does not split a lesson into multiple sub-lessons or auto-verify study time.
Missed tasks remain visible; regeneration redistributes incomplete work without clearing history.
Late learning completion anchors outstanding revisions to the actual completion date.
Completed topics' outstanding revisions survive changes in course selection.
Learner IANA time zone is captured at setup; schedules use date-only calendar arithmetic; completion uses instants.
Activity starts use published NoteReader content, real course/topic deep links or existing topic quiz routes.
Completion is learner-reported and does not manufacture quiz results, points, or enrollment mastery.
New UI copy is English; sidebar falls back to English for locales without a Study Plan translation.
Push reminders for study tasks are not automatically subscribed by this feature.
