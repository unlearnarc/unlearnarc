# Admin AI Content Assistant

Open **AI Content Assistant** in the admin sidebar (`/ai-authoring`). This initial version supports topic batches for existing courses and canvas animation drafts using the registered simulator catalog. It does not generate new courses, notes, quizzes, arbitrary authored traces, or algorithm specs.

## Configuration

Add `AI_API_KEY` to the **backend** environment (`backend/.env` locally). Optionally set `AI_MODEL` (default `gpt-4o-mini`). The provider is OpenAI's Chat Completions API and the model must support JSON-object responses. Restart the backend after changes. No frontend secret, new dependency, or MCP server is required. The API key is never returned to the browser.

Generation sends the admin prompt plus selected course/existing topic metadata or the simulator catalog to OpenAI. Do not put sensitive personal information in prompts. Provider billing applies. Each request is bounded to 4,000 output tokens, one active generation per server process, and a 10-second generation interval. Multi-instance deployments should add shared quotas/rate limiting.

If Hibernate schema updates are disabled, apply `backend/migrations/V7__ai_authoring_job.sql` using your existing database migration procedure. The repository currently uses standalone SQL migrations, not Flyway.

## Workflow

1. Choose topics or animation. For topics choose an existing course and 1–12 topics.
2. Describe the learning objective and generate. The server validates output before storing a proposal. No content records are created yet.
3. Edit proposal JSON, then choose **Validate & preview draft**. Animation traces are built by the server simulator and rendered in the existing preview. Changing JSON clears validation/approval.
4. Review for educational accuracy and tick the approval checkbox.
5. Approve the save. **Topics become live immediately** (the existing topic model has no publication flag). Animations are forced unpublished and must be published separately from Canvas Animations.

Recent proposals survive reloads. Reopen a draft and validate it again before approval. Unsupported animation requests are rejected rather than represented using an unrelated simulator. Use small simulator inputs; arbitrary nested simulator parameters are intentionally unsupported in this first version.

## API and guarantees

All endpoints are under `/api/v1/admin/ai-authoring` and require `ROLE_ADMIN`:

- `GET /status`: whether the backend key is configured (never the key).
- `GET /jobs`: the requesting admin's 20 most recent proposals/results.
- `POST /jobs`: `{kind: "TOPICS" | "ANIMATION", prompt, courseId?, count: 1..12}`.
- `PUT /jobs/{id}`: `{proposal: {...}}`; validates, updates the stored draft, and returns `{job, preview}`.
- `POST /jobs/{id}/save`: explicitly approves the stored proposal. Revalidates against current content, then writes through existing content services in a single transaction.

A pessimistic job row lock plus stored results makes retries of the **same job** idempotent. Any batch failure rolls back both content and job state. Separate jobs are not deduplicated across requests; name/slug checks provide best-effort conflict detection, not a global content uniqueness guarantee. Existing content is never overwritten or deleted. Each job stores requester, prompt, approved proposal, creation/save timestamps, and created records. Generation/approval events log job ID, owner and type without logging keys or provider payloads. Generation failures do not create a job.

The AI has no HTTP, database, shell, delete, or publish tools. Server-side allowlists, Bean Validation, course binding, duplicate/order checks, simulator parameter bounds, trace validation, and forced unpublished animations apply independently of the UI. Direct use of the save endpoint constitutes explicit approval of the persisted draft. Structural validation cannot prove teaching accuracy; admin review is required.

## Validation

Run the admin production build and the backend test suite using Java 21. `AuthoringServiceTest`, `AiContentGeneratorTest`, `AuthoringApiTest` and `AuthoringPersistenceTest` cover validation, retries, security, endpoint behavior, actual simulator previews and transactional rollback without calling the paid AI provider. Provider-backed generation additionally requires a real configured key and quota.
