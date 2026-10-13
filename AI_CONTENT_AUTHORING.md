# UnlearnArc — AI Content Authoring Guide

> **Purpose:** This document is the single source of truth an AI (or automation script) uses to
> **populate platform data instead of a human admin**. It covers every authorable content domain:
> **Algorithm Visualizer · Contest Builder · Courses · Topics · Question Pools (+ Questions)**.
>
> For each domain you get: the exact REST endpoint, the request payload schema (field name, type,
> required?, constraints, enum values), validation rules, ordering/dependency rules, and a ready-to-post
> JSON example. Follow the **authoring order** at the bottom to avoid foreign-key / dependency errors.

- **Base URL:** `http://localhost:8085/api/v1`
- **Auth:** All writes require an **ADMIN** JWT. Obtain via `POST /auth/login`
  (`{"email":"unlearnarc@gmail.com","password":"Admin@123"}`), then send `Authorization: Bearer <accessToken>`.
- **Response envelope:** every call returns `{ success, message, data, error, timestamp }`.
  Read created IDs from `data.id`.
- **Rate limits:** 200 req / 60 s per admin token.

---

## 0. Authentication Bootstrap (do this first)

```bash
TOKEN=$(curl -s -X POST http://localhost:8085/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"unlearnarc@gmail.com","password":"Admin@123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])")
AUTH="Authorization: Bearer $TOKEN"
```

---

## 1. Algorithm Visualizer

Create a self-replaying, step-based algorithm visualization. The declarative **spec** drives a
frontend canvas that renders each frame; no code runs server-side.

### Endpoints

| Method | Path                          | Purpose                               |
|--------|-------------------------------|---------------------------------------|
| `POST` | `/algorithms`                 | Create algorithm                      |
| `POST` | `/algorithms/validate`        | Validate a spec without saving        |
| `PUT`  | `/algorithms/{id}`            | Update (replace) algorithm            |
| `PATCH`| `/algorithms/{id}/publish?value=true` | Publish / unpublish           |
| `GET`  | `/algorithms/slug/{slug}`     | Fetch by slug (to upsert)             |
| `GET`  | `/algorithms`                 | List all                              |

### Top-level payload (`AlgorithmRequest`)

| Field          | Type                 | Required | Constraints / Notes |
|----------------|----------------------|----------|---------------------|
| `slug`         | string               | ✅       | **kebab-case** `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 160, unique |
| `title`        | string               | ✅       | — |
| `summary`      | string               | ❌       | max 1000 |
| `usage`        | string               | ❌       | free text (when/why to use it) |
| `category`     | string               | ❌       | max 80 (e.g. `"Sorting"`, `"Graph"`) |
| `difficulty`   | enum                 | ❌       | `EASY` · `MEDIUM` · `HARD` |
| `complexity`   | object               | ❌       | e.g. `{"time":"O(n log n)","space":"O(1)"}` |
| `visualizer`   | enum                 | ✅       | `ARRAY` · `GRAPH` · `TREE` · `STACK` · `QUEUE` · `LINKED_LIST` · `MATRIX` · `CUSTOM` |
| `javaSource`   | string               | ❌       | source shown in code panel (use `\n`) |
| `pythonSource` | string               | ❌       | at least one of java/python recommended |
| `spec`         | object (`VisualizationSpec`) | ✅ | the frame spec (below) |
| `isPublished`  | boolean              | ❌       | default `false`; or publish via PATCH |

### `spec` → `VisualizationSpec`

| Field          | Type         | Required | Notes |
|----------------|--------------|----------|-------|
| `visualizer`   | enum         | ✅       | must match top-level `visualizer` |
| `initialState` | object       | ❌       | canvas state before step 0, e.g. `{"array":[5,2,4,1]}` |
| `variables`    | Variable[]   | ❌       | tracked vars shown in narration panel |
| `steps`        | Step[]       | ✅       | **at least one** step |

**Variable:** `{ "name": string (req), "label"?: string, "color"?: string }`

**Step:**

| Field         | Type        | Required | Notes |
|---------------|-------------|----------|-------|
| `id`          | string      | ❌       | stable id (needed for branch targets) |
| `title`       | string      | ❌       | short frame title |
| `explanation` | string      | ❌       | narration text |
| `state`       | object      | ✅       | full renderable state for this frame |
| `variables`   | object      | ❌       | snapshot of tracked var values |
| `highlights`  | Highlight[] | ❌       | elements to colour |
| `line`        | integer     | ❌       | 1-based source line to highlight |
| `lang`        | string      | ❌       | `"java"` or `"python"` (which source `line` refers to) |
| `pointers`    | object      | ❌       | named cursors over cells, e.g. `{"i":2,"j":3}` |
| `input`       | UserInputRequest | ❌  | pauses playback for a learner answer |

**Highlight:** `{ "target": string (req, e.g. "array"/"nodes"/"edges"/"stack"), "indices"?: (number|string)[], "style": enum (req) }`
`style` ∈ `COMPARE` `SWAP` `VISIT` `ACTIVE` `DONE` `PATH` `ERROR` `INSERT` `DELETE` `PIVOT`

**UserInputRequest:** `{ "key": string (req), "prompt": string (req), "type": enum (req), "options"?: Option[], "expected"?: any, "placeholder"?: string }`
`type` ∈ `NUMBER` `TEXT` `CHOICE` `BOOLEAN`
**Option:** `{ "label": string (req), "value"?: any, "nextStepId"?: string }` — `nextStepId` branches playback.

### `state` shape by visualizer (convention)

| Visualizer    | Expected `state` keys |
|---------------|-----------------------|
| `ARRAY`       | `{ "array": number[] }` |
| `MATRIX`      | `{ "matrix": number[][] }` |
| `STACK`/`QUEUE` | `{ "stack"/"queue": any[] }` |
| `GRAPH`/`TREE`| `{ "nodes": [...], "edges": [...] }` |

### Example — create + publish

```bash
curl -s -X POST http://localhost:8085/api/v1/algorithms -H "Content-Type: application/json" -H "$AUTH" -d '{
  "slug": "bubble-sort",
  "title": "Bubble Sort",
  "summary": "Repeatedly swaps adjacent out-of-order elements until sorted.",
  "usage": "Teaching comparison sorting. O(n^2) — only small / nearly-sorted data.",
  "category": "Sorting",
  "difficulty": "EASY",
  "complexity": { "time": "O(n^2)", "space": "O(1)" },
  "visualizer": "ARRAY",
  "javaSource": "void bubbleSort(int[] a){\n  for(int i=0;i<a.length-1;i++)\n    for(int j=0;j<a.length-1-i;j++)\n      if(a[j]>a[j+1]){int t=a[j];a[j]=a[j+1];a[j+1]=t;}\n}",
  "pythonSource": "def bubble_sort(a):\n  for i in range(len(a)-1):\n    for j in range(len(a)-1-i):\n      if a[j] > a[j+1]:\n        a[j], a[j+1] = a[j+1], a[j]",
  "spec": {
    "visualizer": "ARRAY",
    "initialState": { "array": [5, 2, 4, 1] },
    "variables": [
      { "name": "i", "label": "pass", "color": "#3b82f6" },
      { "name": "j", "label": "index", "color": "#f59e0b" }
    ],
    "steps": [
      { "id": "s0", "title": "Start", "explanation": "Unsorted array.",
        "state": { "array": [5,2,4,1] }, "variables": { "i":0, "j":0 },
        "pointers": { "j":0 }, "line": 2, "lang": "java" },
      { "id": "s1", "title": "Compare 5 & 2", "explanation": "5 > 2 so we swap.",
        "state": { "array": [5,2,4,1] }, "variables": { "i":0, "j":0 },
        "highlights": [{ "target": "array", "indices": [0,1], "style": "COMPARE" }],
        "line": 4, "lang": "java",
        "input": { "key": "swap_1", "prompt": "Will these two be swapped?", "type": "BOOLEAN", "expected": true } },
      { "id": "s2", "title": "Swapped", "explanation": "Array is now [2,5,4,1].",
        "state": { "array": [2,5,4,1] }, "variables": { "i":0, "j":1 },
        "highlights": [{ "target": "array", "indices": [0,1], "style": "SWAP" }] },
      { "id": "s3", "title": "Done", "explanation": "Fully sorted.",
        "state": { "array": [1,2,4,5] },
        "highlights": [{ "target": "array", "indices": [0,1,2,3], "style": "DONE" }] }
    ]
  }
}'
# then publish (ID from data.id):
curl -s -X PATCH "http://localhost:8085/api/v1/algorithms/<ID>/publish?value=true" -H "$AUTH"
```

> **AI authoring tips:** always include an `initialState`; keep each `step.state` a *complete* snapshot
> (not a diff); give every step a stable `id` if any `input.options` use `nextStepId` branching; validate
> with `POST /algorithms/validate` before saving.

---

## 2. Contest Builder

A contest is a time-boxed set of coding problems. **Code runs on the client**; the server stores
problems + test cases and re-validates reported stdout. Build order: **contest → problems (with test cases)**.

### Endpoints

| Method | Path                                      | Purpose |
|--------|-------------------------------------------|---------|
| `POST` | `/admin/contests`                         | Create contest |
| `PUT`  | `/admin/contests/{id}`                    | Update contest |
| `PATCH`| `/admin/contests/{id}/status/{status}`    | Set status `DRAFT`·`PUBLISHED`·`ARCHIVED` |
| `POST` | `/admin/contests/{contestId}/problems`    | Add problem (+ its test cases) |
| `GET`  | `/admin/contests/{contestId}/problems`    | List problems (admin view) |
| `PUT`  | `/admin/contests/problems/{problemId}`    | Update problem |
| `DELETE`| `/admin/contests/problems/{problemId}`   | Delete problem |

### Contest payload (`ContestRequest`)

| Field                    | Type     | Required | Default | Notes |
|--------------------------|----------|----------|---------|-------|
| `title`                  | string   | ✅       | —       | max 255 |
| `slug`                   | string   | ❌       | auto    | max 255; auto-generated from title when blank |
| `description`            | string   | ❌       | —       | markdown |
| `visibility`             | enum     | ❌       | `PUBLIC`| `PUBLIC` · `PRIVATE` |
| `startTime`              | instant  | ❌       | —       | ISO-8601 UTC, e.g. `2025-10-01T09:00:00Z` |
| `endTime`                | instant  | ❌       | —       | after this, no submissions scored |
| `durationMinutes`        | integer  | ❌       | `0`     | per-participant budget; 0 = until endTime |
| `allowedLanguages`       | string   | ❌       | `"python,java,cpp,javascript"` | CSV |
| `wrongSubmissionPenalty` | integer  | ❌       | `0`     | ICPC-style tiebreak penalty |

> New contests start as `DRAFT`. Publish with `PATCH .../status/PUBLISHED`.

### Problem payload (`ContestProblemRequest`)

| Field             | Type            | Required | Default | Notes |
|-------------------|-----------------|----------|---------|-------|
| `title`           | string          | ✅       | —       | — |
| `statement`       | string          | ✅       | —       | markdown |
| `constraints`     | string          | ❌       | —       | markdown (I/O format + constraints) |
| `difficulty`      | enum            | ✅       | —       | `EASY` · `MEDIUM` · `HARD` |
| `maxPoints`       | integer         | ❌       | `100`   | awarded for passing all hidden cases |
| `starterCodeJson` | string (JSON)   | ❌       | —       | per-lang, e.g. `"{\"python\":\"def solve():\",\"java\":\"class Solution{}\"}"` |
| `harnessType`     | enum            | ❌       | `STDIN_STDOUT` | `STDIN_STDOUT` · `FUNCTION_RETURN` |
| `timeLimitMs`     | integer         | ❌       | `2000`  | per-test wall clock (client-enforced) |
| `displayOrder`    | integer         | ❌       | `0`     | ordering within contest |
| `testCases`       | TestCaseRequest[] | ❌     | `[]`    | include ≥1 public + hidden cases |

### Test case (`TestCaseRequest`)

| Field            | Type    | Required | Default | Notes |
|------------------|---------|----------|---------|-------|
| `input`          | string  | ✅       | —       | raw stdin, or JSON args for `FUNCTION_RETURN` |
| `expectedOutput` | string  | ✅       | —       | never exposed to client when hidden |
| `isHidden`       | boolean | ❌       | `true`  | `false` = public sample (shipped to client) |
| `weight`         | integer | ❌       | `1`     | points contribution |
| `strictMatch`    | boolean | ❌       | `false` | `true` = exact compare; else normalised |
| `displayOrder`   | integer | ❌       | `0`     | — |

### Example

```bash
# 1) create contest
CID=$(curl -s -X POST http://localhost:8085/api/v1/admin/contests -H "Content-Type: application/json" -H "$AUTH" -d '{
  "title": "Weekly Warmup #1",
  "description": "Beginner-friendly round.",
  "visibility": "PUBLIC",
  "startTime": "2025-10-01T09:00:00Z",
  "endTime":   "2025-10-01T11:00:00Z",
  "durationMinutes": 120,
  "allowedLanguages": "python,java,cpp,javascript",
  "wrongSubmissionPenalty": 0
}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")

# 2) add a problem with public + hidden test cases
curl -s -X POST "http://localhost:8085/api/v1/admin/contests/$CID/problems" -H "Content-Type: application/json" -H "$AUTH" -d '{
  "title": "Sum of Two Numbers",
  "statement": "Read two integers and print their sum.",
  "constraints": "1 <= a,b <= 10^9",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 0,
  "starterCodeJson": "{\"python\":\"a,b=map(int,input().split())\\nprint(a+b)\",\"java\":\"// read a,b; print a+b\"}",
  "testCases": [
    { "input": "2 3",   "expectedOutput": "5",  "isHidden": false, "weight": 1, "displayOrder": 0 },
    { "input": "10 20", "expectedOutput": "30", "isHidden": true,  "weight": 1, "displayOrder": 1 },
    { "input": "999999999 1", "expectedOutput": "1000000000", "isHidden": true, "weight": 2, "displayOrder": 2 }
  ]
}'

# 3) publish
curl -s -X PATCH "http://localhost:8085/api/v1/admin/contests/$CID/status/PUBLISHED" -H "$AUTH"
```

> **AI authoring tips:** always ship ≥1 public (`isHidden:false`) sample plus multiple hidden cases;
> keep `expectedOutput` normalised (no trailing spaces) unless `strictMatch:true`; sum of hidden
> `weight`s maps to `maxPoints` distribution.

---

## 3. Courses

### Endpoints

| Method | Path            | Purpose |
|--------|-----------------|---------|
| `POST` | `/courses`      | Create course |
| `GET`  | `/courses`      | List |
| `PUT`  | `/courses/{id}` | Update |
| `DELETE`| `/courses/{id}`| Delete |

### Payload (`CourseRequest`)

| Field         | Type       | Required | Notes |
|---------------|------------|----------|-------|
| `name`        | string     | ✅       | not blank |
| `imgUrl`      | long (number) | ✅    | ⚠️ numeric reference id, **not** a URL string |
| `totalTime`   | string     | ✅       | `HH:mm:ss` (LocalTime) |
| `topicsCount` | integer    | ✅       | count of topics |
| `qusPool`     | string     | ❌       | optional pool reference |
| `level`       | enum       | ✅       | `BEGINNER` · `INTERMEDIATE` · `ADVANCED` · `EXPERT` |

### Example

```bash
curl -s -X POST http://localhost:8085/api/v1/courses -H "Content-Type: application/json" -H "$AUTH" -d '{
  "name": "Java Mastery",
  "imgUrl": 101,
  "totalTime": "10:00:00",
  "topicsCount": 12,
  "level": "ADVANCED"
}'
```

> **Note:** The API-reference example shows `imgUrl` as a URL string, but the current `CourseRequest`
> DTO types it as `Long`. Send a **number**. Update `topicsCount` to match the topics you actually create.

---

## 4. Topics

Topics belong to a course and are ordered by `topicOrder`. Create the course **first**.

### Endpoints

| Method | Path                      | Purpose |
|--------|---------------------------|---------|
| `POST` | `/topics`                 | Create topic |
| `GET`  | `/topics/course/{courseId}` | List topics for a course (ordered) |
| `PUT`  | `/topics/{id}`            | Update |
| `DELETE`| `/topics/{id}`           | Delete |

### Payload (`TopicRequest`)

| Field        | Type    | Required | Notes |
|--------------|---------|----------|-------|
| `name`       | string  | ✅       | not blank |
| `time`       | string  | ✅       | `HH:mm:ss` |
| `topicOrder` | long    | ✅       | display sequence (1,2,3…) |
| `level`      | enum    | ✅       | `BEGINNER` · `INTERMEDIATE` · `ADVANCED` · `EXPERT` |
| `courseId`   | string  | ✅       | parent course UUID |

### Example

```bash
curl -s -X POST http://localhost:8085/api/v1/topics -H "Content-Type: application/json" -H "$AUTH" -d '{
  "name": "Intro to JPA",
  "time": "01:30:00",
  "topicOrder": 1,
  "level": "BEGINNER",
  "courseId": "<course-uuid>"
}'
```

### Study materials for a topic (optional)

`POST /study-materials` — `{ "type": enum, "topicId": string, "url": string }`
`type` ∈ `VIDEO` `ARTICLE` `PDF` `QUIZ` `EXERCISE` `SLIDES`.

---

## 5. Question Pools (+ Questions)

A pool is scoped to exactly one level (`DOMAIN`/`COURSE`/`TOPIC`), then questions are added to it,
then (optionally) the pool is mapped to a specific entity so the test engine can find it.

### Endpoints

| Method | Path                        | Purpose |
|--------|-----------------------------|---------|
| `POST` | `/question-pools`           | Create pool |
| `PUT`  | `/question-pools/{id}`      | Update pool config |
| `PATCH`| `/question-pools/{id}/toggle-active` | Enable/disable |
| `POST` | `/question-pools/map`       | Map pool → domain/course/topic |
| `POST` | `/questions`                | Create single question (+ answers) |
| `POST` | `/questions/bulk`           | Bulk create (array body) |
| `PATCH`| `/questions/{id}/toggle-active` | Enable/disable |

### Pool payload (`QuestionPoolRequest`)

| Field              | Type    | Required | Default | Constraints |
|--------------------|---------|----------|---------|-------------|
| `name`             | string  | ✅       | —       | not blank |
| `description`      | string  | ❌       | —       | — |
| `scopeType`        | enum    | ✅       | —       | `DOMAIN` · `COURSE` · `TOPIC` |
| `totalQuestions`   | integer | ❌       | `9`     | 1–100 |
| `easyCount`        | integer | ❌       | `3`     | ≥0 |
| `mediumCount`      | integer | ❌       | `3`     | ≥0 |
| `hardCount`        | integer | ❌       | `3`     | ≥0 |
| `passPercentage`   | integer | ❌       | `60`    | 0–100 |
| `timeLimitMinutes` | integer | ❌       | `0`     | 0 = unlimited |

> **Hard rule:** `easyCount + mediumCount + hardCount == totalQuestions` or you get `400`.
> Make sure you actually create ≥ that many active questions per difficulty, or the test engine
> can't assemble a session.

### Question payload (`QuestionRequest`)

| Field          | Type           | Required | Default | Notes |
|----------------|----------------|----------|---------|-------|
| `poolId`       | string         | ✅       | —       | parent pool UUID |
| `questionText` | string         | ✅       | —       | not blank |
| `questionType` | enum           | ✅       | —       | `MCQ` · `MULTIPLE_CORRECT` |
| `difficulty`   | enum           | ✅       | —       | `EASY` · `MEDIUM` · `HARD` |
| `points`       | integer        | ❌       | `1`     | 1–100 |
| `explanation`  | string         | ❌       | —       | shown after grading |
| `answers`      | AnswerRequest[]| ✅       | —       | **2–10** answers |

**Answer (`AnswerRequest`):** `{ "answerText": string (req), "isCorrect": boolean (req), "displayOrder"?: int (default 0) }`

> **Correctness rules:** `MCQ` → exactly **1** `isCorrect:true`; `MULTIPLE_CORRECT` → **≥2** `isCorrect:true`.

### Pool → entity mapping (`PoolMappingRequest`)

`POST /question-pools/map` — supply only the id matching the pool's `scopeType`:

```json
{ "poolId": "<pool-uuid>", "domainId": null, "courseId": "<course-uuid>", "topicId": null }
```

### Example

```bash
# 1) create a COURSE-scoped pool (3+3+3 = 9)
PID=$(curl -s -X POST http://localhost:8085/api/v1/question-pools -H "Content-Type: application/json" -H "$AUTH" -d '{
  "name": "Java Basics Pool",
  "description": "Entry-level Java test pool",
  "scopeType": "COURSE",
  "totalQuestions": 9,
  "easyCount": 3, "mediumCount": 3, "hardCount": 3,
  "passPercentage": 60, "timeLimitMinutes": 30
}' | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['id'])")

# 2) bulk-add questions
curl -s -X POST http://localhost:8085/api/v1/questions/bulk -H "Content-Type: application/json" -H "$AUTH" -d "[
  {
    \"poolId\": \"$PID\", \"questionText\": \"What does JVM stand for?\",
    \"questionType\": \"MCQ\", \"difficulty\": \"EASY\", \"points\": 1,
    \"explanation\": \"Java Virtual Machine.\",
    \"answers\": [
      { \"answerText\": \"Java Virtual Machine\", \"isCorrect\": true,  \"displayOrder\": 0 },
      { \"answerText\": \"Java Verified Module\",  \"isCorrect\": false, \"displayOrder\": 1 },
      { \"answerText\": \"Just Very Much\",        \"isCorrect\": false, \"displayOrder\": 2 }
    ]
  },
  {
    \"poolId\": \"$PID\", \"questionText\": \"Which are valid access modifiers?\",
    \"questionType\": \"MULTIPLE_CORRECT\", \"difficulty\": \"MEDIUM\", \"points\": 2,
    \"answers\": [
      { \"answerText\": \"public\",    \"isCorrect\": true,  \"displayOrder\": 0 },
      { \"answerText\": \"protected\", \"isCorrect\": true,  \"displayOrder\": 1 },
      { \"answerText\": \"internal\",  \"isCorrect\": false, \"displayOrder\": 2 }
    ]
  }
]"

# 3) map the pool to the course so the test engine can find it
curl -s -X POST http://localhost:8085/api/v1/question-pools/map -H "Content-Type: application/json" -H "$AUTH" -d "{
  \"poolId\": \"$PID\", \"courseId\": \"<course-uuid>\"
}"
```

---

## 6. Recommended Authoring Order (dependency-safe)

```
1. Login            → get ADMIN token
2. Domain           → POST /domains
3. Skill (global)   → POST /skills           → map: POST /domain-skill-mappings
4. Course           → POST /courses          → map: POST /skill-course-mappings
5. Topic            → POST /topics           (needs courseId)  [+ study-materials]
6. Question Pool    → POST /question-pools    (scope DOMAIN/COURSE/TOPIC)
7. Questions        → POST /questions/bulk    (needs poolId; counts must satisfy pool split)
8. Map Pool         → POST /question-pools/map (bind pool to the scoped entity)
9. Algorithm Viz    → POST /algorithms        → PATCH .../publish?value=true   (independent)
10. Contest         → POST /admin/contests    → add problems+testcases → PATCH status/PUBLISHED  (independent)
```

Steps 9 and 10 have no dependency on 2–8 and can be authored anytime after login.

---

## 7. Enum Quick Reference

| Enum                      | Values |
|---------------------------|--------|
| Course / Topic / Skill `level` | `BEGINNER` `INTERMEDIATE` `ADVANCED` `EXPERT` |
| `MaterialType`            | `VIDEO` `ARTICLE` `PDF` `QUIZ` `EXERCISE` `SLIDES` |
| Pool `scopeType`          | `DOMAIN` `COURSE` `TOPIC` |
| `QuestionType`            | `MCQ` `MULTIPLE_CORRECT` |
| Question `difficulty`     | `EASY` `MEDIUM` `HARD` |
| Algorithm `difficulty`    | `EASY` `MEDIUM` `HARD` |
| Algorithm `visualizer`    | `ARRAY` `GRAPH` `TREE` `STACK` `QUEUE` `LINKED_LIST` `MATRIX` `CUSTOM` |
| Highlight `style`         | `COMPARE` `SWAP` `VISIT` `ACTIVE` `DONE` `PATH` `ERROR` `INSERT` `DELETE` `PIVOT` |
| Input `type`              | `NUMBER` `TEXT` `CHOICE` `BOOLEAN` |
| Contest `visibility`      | `PUBLIC` `PRIVATE` |
| Contest `status`          | `DRAFT` `PUBLISHED` `ARCHIVED` |
| Contest `harnessType`     | `STDIN_STDOUT` `FUNCTION_RETURN` |

---

## 8. Validation Pitfalls (common 400 causes)

- **Pool counts** don't sum to `totalQuestions`.
- **MCQ** with ≠1 correct answer, or **MULTIPLE_CORRECT** with <2 correct.
- Fewer than 2 or more than 10 answers on a question.
- Algorithm `slug` not kebab-case, or duplicate slug.
- Algorithm `spec.steps` empty, or a step missing `state`.
- Course `imgUrl` sent as a string (it must be a **number/Long**).
- Time fields (`totalTime`, `time`) not in `HH:mm:ss`.
- Instant fields (`startTime`/`endTime`) not ISO-8601 UTC.
- Posting questions before the pool exists, or topics before the course exists.

---

*Generated for AI/automation-driven content population — keep in sync with
`backend/API_REFERENCE.md`, the `*Request.java` DTOs, and `packages/algo-visualizer/src/core/types.ts`.*
