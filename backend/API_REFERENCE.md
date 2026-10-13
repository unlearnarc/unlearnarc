# UnlearnArc Backend — REST API Reference

> **Base URL:** `http://localhost:8085/api/v1`
> **Server port:** `8085`
> **Auth model:** JWT Bearer tokens — ADMIN via email/password · USER via Google OAuth2

---

## 📦 Response Envelope

Every endpoint returns this wrapper:

```json
{
  "success": true,
  "message": "...",
  "data": { ... },
  "error": null,
  "timestamp": "2025-09-26T10:00:00Z"
}
```

Error response:
```json
{
  "success": false,
  "error": "Human-readable error message",
  "timestamp": "2025-09-26T10:00:00Z"
}
```

---

## 🔐 Authentication & Security

### Access Rules

| Role    | How to obtain                  | What it unlocks                                    |
|---------|--------------------------------|----------------------------------------------------|
| `ADMIN` | `POST /api/v1/auth/login`      | Full read + write on **all** endpoints             |
| `USER`  | Google OAuth2 redirect         | Read-only content + test engine + own profile      |
| Public  | No token                       | Health check + OAuth2 initiation only              |

### Using a token

```
Authorization: Bearer <accessToken>
```

---

## 1. Admin Auth `/api/v1/auth`

| Method | Path       | Auth   | Description                  |
|--------|------------|--------|------------------------------|
| `POST` | `/login`   | Public | Admin email + password login |
| `POST` | `/refresh` | Public | Rotate admin access token    |
| `GET`  | `/me`      | ADMIN  | Verify token / who am I      |
| `GET`  | `/health`  | Public | API health check             |

### POST `/api/v1/auth/login`

```json
// Request
{
  "email": "unlearnarc@gmail.com",
  "password": "Admin@123"
}

// Response → data
{
  "accessToken":  "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType":    "Bearer",
  "expiresIn":    86400,
  "email":        "unlearnarc@gmail.com",
  "role":         "ADMIN"
}
```

> ⚠️ Rate limited: **10 attempts / 60 seconds per IP**

### POST `/api/v1/auth/refresh`

```json
// Request
{ "refreshToken": "<adminRefreshToken>" }

// Response: same shape as /login
```

### GET `/api/v1/auth/me`

```
Authorization: Bearer <adminAccessToken>
// Returns: string "Authenticated as: unlearnarc@gmail.com"
```

### GET `/api/v1/auth/health`

```json
// Response → data: "UnlearnArc API is running"
```

---

## 2. User Auth (Google OAuth2) `/api/v1/user-auth` & `/oauth2`

### OAuth2 Flow

```
1. Browser opens:
   GET http://localhost:8085/oauth2/authorization/google
   → Redirects to Google Consent page

2. After Google approves:
   → Callback: http://localhost:8085/login/oauth2/code/google
   → Backend upserts User in DB, mints JWT
   → Redirects to:
     http://localhost:3000/auth/callback
       ?token=<accessToken>
       &refreshToken=<refreshToken>
       &userId=<uuid>
       &name=<displayName>
       &email=<email>

3. On failure:
   http://localhost:3000/auth/error?error=<reason>
```

| Method | Path                           | Auth          | Description                  |
|--------|--------------------------------|---------------|------------------------------|
| `GET`  | `/oauth2/authorization/google` | Public (browser) | Initiate Google login     |
| `POST` | `/api/v1/user-auth/refresh`    | Public        | Rotate user access token     |
| `GET`  | `/api/v1/user-auth/me`         | USER or ADMIN | Get own profile              |

### POST `/api/v1/user-auth/refresh`

```json
// Request
{ "refreshToken": "<userRefreshToken>" }

// Response → data
{
  "accessToken":  "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType":    "Bearer",
  "expiresIn":    86400,
  "email":        "user@gmail.com",
  "role":         "USER"
}
```

### GET `/api/v1/user-auth/me`

```json
// Response → data
{
  "id":             "uuid",
  "name":           "John Doe",
  "email":          "john@gmail.com",
  "region":         "IN",
  "rank":           0,
  "points":         0,
  "profilePicture": "https://lh3.googleusercontent.com/...",
  "isActive":       true,
  "authProvider":   "GOOGLE",
  "createdAt":      "2025-09-26T10:00:00"
}
```

---

## 3. Domains `/api/v1/domains`

**Auth:** Reads → USER or ADMIN · Writes → ADMIN only

| Method   | Path    | Auth  | Description       |
|----------|---------|-------|-------------------|
| `POST`   | `/`     | ADMIN | Create domain     |
| `GET`    | `/`     | USER+ | List all domains  |
| `GET`    | `/{id}` | USER+ | Get domain by ID  |
| `PUT`    | `/{id}` | ADMIN | Update domain     |
| `DELETE` | `/{id}` | ADMIN | Delete domain     |

### Request Body (POST / PUT)

```json
{ "name": "Backend Engineering" }
```

### Response

```json
{
  "id":   "550e8400-e29b-41d4-a716-446655440000",
  "name": "Backend Engineering"
}
```

---

## 4. Users `/api/v1/users`

**Auth:** All → ADMIN only

> Regular users are auto-created on first Google OAuth2 login. Manual creation is admin-only.

| Method   | Path    | Auth  | Description            |
|----------|---------|-------|------------------------|
| `POST`   | `/`     | ADMIN | Create user manually   |
| `GET`    | `/`     | ADMIN | List all users         |
| `GET`    | `/{id}` | ADMIN | Get user by ID         |
| `PUT`    | `/{id}` | ADMIN | Update user            |
| `DELETE` | `/{id}` | ADMIN | Delete user            |

### Request Body (POST / PUT)

```json
{
  "name":   "John Doe",
  "email":  "john@example.com",
  "region": "IN",
  "rank":   1,
  "points": 500
}
```

### Response

```json
{
  "id":             "uuid",
  "name":           "John Doe",
  "email":          "john@example.com",
  "region":         "IN",
  "rank":           1,
  "points":         500,
  "googleId":       null,
  "profilePicture": null,
  "authProvider":   "LOCAL",
  "isActive":       true,
  "createdAt":      "2025-09-26T10:00:00"
}
```

---

## 5. Skills `/api/v1/skills`

**Auth:** Reads → USER or ADMIN · Writes → ADMIN only

> Skills are **global** — created once in the Skills Library and reused across multiple domains via `domain-skill-mappings`. No duplication needed.

| Method   | Path    | Auth  | Description       |
|----------|---------|-------|-------------------|
| `POST`   | `/`     | ADMIN | Create skill      |
| `GET`    | `/`     | USER+ | List all skills   |
| `GET`    | `/{id}` | USER+ | Get skill by ID   |
| `PUT`    | `/{id}` | ADMIN | Update skill      |
| `DELETE` | `/{id}` | ADMIN | Delete skill      |

### Request Body (POST / PUT)

```json
{
  "name":  "Spring Boot",
  "level": "INTERMEDIATE"
}
```

> `level` enum: `BEGINNER` · `INTERMEDIATE` · `ADVANCED` · `EXPERT`

### Response

```json
{
  "id":    "uuid",
  "name":  "Spring Boot",
  "level": "INTERMEDIATE"
}
```

---

## 6. Courses `/api/v1/courses`

**Auth:** Reads → USER or ADMIN · Writes → ADMIN only

| Method   | Path    | Auth  | Description        |
|----------|---------|-------|--------------------|
| `POST`   | `/`     | ADMIN | Create course      |
| `GET`    | `/`     | USER+ | List all courses   |
| `GET`    | `/{id}` | USER+ | Get course by ID   |
| `PUT`    | `/{id}` | ADMIN | Update course      |
| `DELETE` | `/{id}` | ADMIN | Delete course      |

### Request Body (POST / PUT)

```json
{
  "name":        "Java Mastery",
  "imgUrl":      "https://example.com/java.png",
  "totalTime":   "10:00:00",
  "topicsCount": 12,
  "level":       "ADVANCED"
}
```

> `level` enum: `BEGINNER` · `INTERMEDIATE` · `ADVANCED` · `EXPERT`
> `totalTime` format: `HH:mm:ss`

### Response

```json
{
  "id":          "uuid",
  "name":        "Java Mastery",
  "imgUrl":      "https://example.com/java.png",
  "totalTime":   "10:00:00",
  "topicsCount": 12,
  "level":       "ADVANCED"
}
```

---

## 7. Topics `/api/v1/topics`

**Auth:** Reads → USER or ADMIN · Writes → ADMIN only

| Method   | Path                    | Auth  | Description                               |
|----------|-------------------------|-------|-------------------------------------------|
| `POST`   | `/`                     | ADMIN | Create topic                              |
| `GET`    | `/`                     | USER+ | List all topics                           |
| `GET`    | `/{id}`                 | USER+ | Get topic by ID                           |
| `GET`    | `/course/{courseId}`    | USER+ | Topics for a course (ordered by `topicOrder`) |
| `PUT`    | `/{id}`                 | ADMIN | Update topic                              |
| `DELETE` | `/{id}`                 | ADMIN | Delete topic                              |

### Request Body (POST / PUT)

```json
{
  "name":       "Intro to JPA",
  "time":       "01:30:00",
  "topicOrder": 1,
  "level":      "BEGINNER",
  "courseId":   "<course-uuid>"
}
```

> `time` format: `HH:mm:ss`
> `topicOrder` controls display sequence within a course

### Response

```json
{
  "id":         "uuid",
  "name":       "Intro to JPA",
  "time":       "01:30:00",
  "topicOrder": 1,
  "level":      "BEGINNER",
  "courseId":   "<course-uuid>"
}
```

---

## 8. Study Materials `/api/v1/study-materials`

**Auth:** Reads → USER or ADMIN · Writes → ADMIN only

| Method   | Path                    | Auth  | Description                      |
|----------|-------------------------|-------|----------------------------------|
| `POST`   | `/`                     | ADMIN | Create study material            |
| `GET`    | `/`                     | USER+ | List all study materials         |
| `GET`    | `/{id}`                 | USER+ | Get by ID                        |
| `GET`    | `/topic/{topicId}`      | USER+ | All materials for a topic        |
| `PUT`    | `/{id}`                 | ADMIN | Update study material            |
| `DELETE` | `/{id}`                 | ADMIN | Delete study material            |

### Request Body (POST / PUT)

```json
{
  "type":    "VIDEO",
  "topicId": "<topic-uuid>",
  "url":     "https://example.com/video.mp4"
}
```

> `type` enum: `VIDEO` · `ARTICLE` · `PDF` · `QUIZ` · `EXERCISE` · `SLIDES`

### Response

```json
{
  "id":      "uuid",
  "type":    "VIDEO",
  "topicId": "<topic-uuid>",
  "url":     "https://example.com/video.mp4"
}
```

---

## 9. Domain ↔ Skill Mappings `/api/v1/domain-skill-mappings`

**Auth:** Writes → ADMIN · Reads → USER or ADMIN

> Links an existing **global skill** to a domain. Same skill can be in many domains.

| Method   | Path                      | Auth  | Description                          |
|----------|---------------------------|-------|--------------------------------------|
| `POST`   | `/`                       | ADMIN | Link skill to domain                 |
| `GET`    | `/`                       | USER+ | List all mappings                    |
| `GET`    | `/{id}`                   | USER+ | Get mapping by ID                    |
| `GET`    | `/domain/{domainId}`      | USER+ | All skills linked to a domain        |
| `GET`    | `/skill/{skillId}`        | USER+ | All domains a skill belongs to       |
| `DELETE` | `/{id}`                   | ADMIN | Remove mapping                       |

### Request Body (POST)

```json
{
  "domainId": "<domain-uuid>",
  "skillId":  "<skill-uuid>"
}
```

### Response

```json
{
  "id":       "uuid",
  "domainId": "<domain-uuid>",
  "skillId":  "<skill-uuid>"
}
```

---

## 10. User ↔ Domain Mappings `/api/v1/user-domain-mappings`

**Auth:** ADMIN only

| Method   | Path                      | Auth  | Description                     |
|----------|---------------------------|-------|---------------------------------|
| `POST`   | `/`                       | ADMIN | Assign domain to user           |
| `GET`    | `/`                       | ADMIN | List all mappings               |
| `GET`    | `/{id}`                   | ADMIN | Get mapping by ID               |
| `GET`    | `/user/{userId}`          | ADMIN | All domains for a user          |
| `GET`    | `/domain/{domainId}`      | ADMIN | All users in a domain           |
| `DELETE` | `/{id}`                   | ADMIN | Remove mapping                  |

### Request Body (POST)

```json
{
  "userId":   "<user-uuid>",
  "domainId": "<domain-uuid>"
}
```

### Response

```json
{
  "id":       "uuid",
  "userId":   "<user-uuid>",
  "domainId": "<domain-uuid>"
}
```

---

## 11. Skill ↔ Course Mappings `/api/v1/skill-course-mappings`

**Auth:** Writes → ADMIN · Reads → USER or ADMIN

| Method   | Path                      | Auth  | Description                        |
|----------|---------------------------|-------|------------------------------------|
| `POST`   | `/`                       | ADMIN | Link course to skill               |
| `GET`    | `/`                       | USER+ | List all mappings                  |
| `GET`    | `/{id}`                   | USER+ | Get mapping by ID                  |
| `GET`    | `/skill/{skillId}`        | USER+ | All courses for a skill            |
| `GET`    | `/course/{courseId}`      | USER+ | All skills for a course            |
| `DELETE` | `/{id}`                   | ADMIN | Remove mapping                     |

### Request Body (POST)

```json
{
  "skillId":  "<skill-uuid>",
  "courseId": "<course-uuid>"
}
```

### Response

```json
{
  "id":       "uuid",
  "skillId":  "<skill-uuid>",
  "courseId": "<course-uuid>"
}
```

---

## 12. Question Pools `/api/v1/question-pools`

**Auth:** Writes → ADMIN · Reads → USER or ADMIN

> A pool is scoped to exactly one level: `DOMAIN`, `COURSE`, or `TOPIC`.
> `easyCount + mediumCount + hardCount` **must equal** `totalQuestions` — enforced on create/update.

| Method   | Path                       | Auth  | Description                                  |
|----------|----------------------------|-------|----------------------------------------------|
| `POST`   | `/`                        | ADMIN | Create question pool                         |
| `GET`    | `/`                        | USER+ | List all pools                               |
| `GET`    | `/{id}`                    | USER+ | Get pool by ID (includes live question stats)|
| `GET`    | `/scope/{scopeType}`       | USER+ | Pools by scope (`DOMAIN`/`COURSE`/`TOPIC`)   |
| `PUT`    | `/{id}`                    | ADMIN | Update pool config                           |
| `DELETE` | `/{id}`                    | ADMIN | Delete pool + all its scope mappings         |
| `PATCH`  | `/{id}/toggle-active`      | ADMIN | Enable / disable pool                        |
| `POST`   | `/map`                     | ADMIN | Link pool to domain / course / topic         |
| `GET`    | `/by-domain/{domainId}`    | USER+ | All pools for a domain                       |
| `GET`    | `/by-course/{courseId}`    | USER+ | All pools for a course                       |
| `GET`    | `/by-topic/{topicId}`      | USER+ | All pools for a topic                        |

### Request Body — Create / Update

```json
{
  "name":             "Java Basics Pool",
  "description":      "Entry-level Java test pool",
  "scopeType":        "COURSE",
  "totalQuestions":   9,
  "easyCount":        3,
  "mediumCount":      3,
  "hardCount":        3,
  "passPercentage":   60,
  "timeLimitMinutes": 30
}
```

> `scopeType` enum: `DOMAIN` · `COURSE` · `TOPIC`
> `timeLimitMinutes`: `0` = unlimited
> **Validation:** `easyCount + mediumCount + hardCount == totalQuestions` → else `400`

### Request Body — Map Pool to Entity (`POST /map`)

```json
{
  "poolId":   "<pool-uuid>",
  "domainId": "<domain-uuid>",
  "courseId": null,
  "topicId":  null
}
```

> Supply only the field matching the pool's `scopeType`:
> - `DOMAIN` scope → provide `domainId`
> - `COURSE` scope → provide `courseId`
> - `TOPIC` scope → provide `topicId`

### Response

```json
{
  "id":                 "uuid",
  "name":               "Java Basics Pool",
  "description":        "Entry-level Java test pool",
  "scopeType":          "COURSE",
  "totalQuestions":     9,
  "easyCount":          3,
  "mediumCount":        3,
  "hardCount":          3,
  "passPercentage":     60,
  "timeLimitMinutes":   30,
  "isActive":           true,
  "createdAt":          "2025-09-26T10:00:00Z",
  "activeQuestionCount": 27,
  "easyAvailable":      10,
  "mediumAvailable":    9,
  "hardAvailable":      8
}
```

---

## 13. Questions `/api/v1/questions`

**Auth:** Writes → ADMIN · Reads → USER or ADMIN

> Supports two question types:
> - `MCQ` — exactly **1** correct answer
> - `MULTIPLE_CORRECT` — **≥ 2** correct answers
>
> Answers are embedded in the question payload (no separate endpoint).

| Method   | Path                                     | Auth  | Description                            |
|----------|------------------------------------------|-------|----------------------------------------|
| `POST`   | `/`                                      | ADMIN | Create question + answers              |
| `POST`   | `/bulk`                                  | ADMIN | Bulk-create questions (array body)     |
| `GET`    | `/pool/{poolId}`                         | USER+ | All questions in a pool (with answers) |
| `GET`    | `/pool/{poolId}/difficulty/{difficulty}` | USER+ | Filter by `EASY`/`MEDIUM`/`HARD`       |
| `GET`    | `/{id}`                                  | USER+ | Single question with all answers       |
| `PUT`    | `/{id}`                                  | ADMIN | Update question + replace all answers  |
| `DELETE` | `/{id}`                                  | ADMIN | Delete question + its answers          |
| `PATCH`  | `/{id}/toggle-active`                    | ADMIN | Enable / disable question              |

### Request Body — Create / Update

```json
{
  "poolId":       "<pool-uuid>",
  "questionText": "Which of the following are valid Java access modifiers?",
  "questionType": "MULTIPLE_CORRECT",
  "difficulty":   "EASY",
  "points":       1,
  "explanation":  "Java has four access modifiers: public, protected, default (package-private), and private.",
  "answers": [
    { "answerText": "public",    "isCorrect": true,  "displayOrder": 0 },
    { "answerText": "protected", "isCorrect": true,  "displayOrder": 1 },
    { "answerText": "private",   "isCorrect": true,  "displayOrder": 2 },
    { "answerText": "internal",  "isCorrect": false, "displayOrder": 3 }
  ]
}
```

> `questionType` enum: `MCQ` · `MULTIPLE_CORRECT`
> `difficulty` enum: `EASY` · `MEDIUM` · `HARD`
> Min **2** answer options; max **10**
> MCQ: exactly **1** `isCorrect: true`
> MULTIPLE_CORRECT: **≥ 2** `isCorrect: true`

### Request Body — Bulk Create

```json
[
  {
    "poolId": "...", "questionText": "Q1 ...",
    "questionType": "MCQ", "difficulty": "EASY",
    "points": 1, "answers": [...]
  },
  {
    "poolId": "...", "questionText": "Q2 ...",
    "questionType": "MULTIPLE_CORRECT", "difficulty": "MEDIUM",
    "points": 2, "answers": [...]
  }
]
```

### Response

```json
{
  "id":           "uuid",
  "poolId":       "<pool-uuid>",
  "questionText": "Which of the following are valid Java access modifiers?",
  "questionType": "MULTIPLE_CORRECT",
  "difficulty":   "EASY",
  "points":       1,
  "explanation":  "...",
  "isActive":     true,
  "createdAt":    "2025-09-26T10:00:00Z",
  "updatedAt":    "2025-09-26T10:00:00Z",
  "answers": [
    { "id": "uuid", "questionId": "uuid", "answerText": "public",    "isCorrect": true,  "displayOrder": 0 },
    { "id": "uuid", "questionId": "uuid", "answerText": "protected", "isCorrect": true,  "displayOrder": 1 },
    { "id": "uuid", "questionId": "uuid", "answerText": "private",   "isCorrect": true,  "displayOrder": 2 },
    { "id": "uuid", "questionId": "uuid", "answerText": "internal",  "isCorrect": false, "displayOrder": 3 }
  ]
}
```

---

## 14. Test Engine `/api/v1/tests`

**Auth:** USER or ADMIN

> Questions are drawn **randomly** from the pool matching the configured difficulty split.
> `isCorrect` is **hidden** during a session; **revealed** after grading.

| Method | Path        | Auth  | Description                           |
|--------|-------------|-------|---------------------------------------|
| `POST` | `/generate` | USER+ | Generate a randomised test session    |
| `POST` | `/grade`    | USER+ | Submit answers and get full breakdown |

### POST `/api/v1/tests/generate`

```json
// Request
{
  "scopeType": "COURSE",
  "entityId":  "<course-uuid>",
  "poolId":    null
}
```

> `poolId` is optional — omit to use the first active pool for the entity.
> `scopeType`: `DOMAIN` · `COURSE` · `TOPIC`

```json
// Response → data
{
  "poolId":          "uuid",
  "poolName":        "Java Basics Pool",
  "scopeType":       "COURSE",
  "entityId":        "<course-uuid>",
  "totalQuestions":  9,
  "easyCount":       3,
  "mediumCount":     3,
  "hardCount":       3,
  "timeLimitMinutes": 30,
  "passPercentage":  60,
  "totalPoints":     18,
  "questions": [
    {
      "id":           "uuid",
      "questionText": "What does JVM stand for?",
      "questionType": "MCQ",
      "difficulty":   "EASY",
      "points":       1,
      "answers": [
        { "id": "uuid", "answerText": "Java Virtual Machine", "displayOrder": 0 },
        { "id": "uuid", "answerText": "Java Verified Module",  "displayOrder": 1 },
        { "id": "uuid", "answerText": "Java Variable Method",  "displayOrder": 2 },
        { "id": "uuid", "answerText": "Just Very Much",        "displayOrder": 3 }
      ]
    }
  ]
}
```

> ⚠️ `isCorrect` is **NOT** in answers during a session.
> Questions and answer options are **shuffled** on every `/generate` call.

### POST `/api/v1/tests/grade`

```json
// Request
{
  "poolId":   "<pool-uuid>",
  "entityId": "<course-uuid>",
  "answers": [
    { "questionId": "<uuid>", "selectedAnswerIds": ["<answer-uuid>"] },
    { "questionId": "<uuid>", "selectedAnswerIds": ["<uuid1>", "<uuid2>"] },
    { "questionId": "<uuid>", "selectedAnswerIds": [] }
  ]
}
```

> Empty `selectedAnswerIds` = question **skipped**

```json
// Response → data
{
  "poolId":            "uuid",
  "entityId":          "<course-uuid>",
  "totalQuestions":    9,
  "correctCount":      6,
  "wrongCount":        2,
  "skippedCount":      1,
  "totalPoints":       18,
  "earnedPoints":      11,
  "scorePercentage":   61.11,
  "passPercentage":    60,
  "passed":            true,
  "improvementNeeded": false,
  "easy":   { "difficulty": "EASY",   "total": 3, "correct": 3, "points": 3, "earnedPoints": 3 },
  "medium": { "difficulty": "MEDIUM", "total": 3, "correct": 2, "points": 6, "earnedPoints": 4 },
  "hard":   { "difficulty": "HARD",   "total": 3, "correct": 1, "points": 9, "earnedPoints": 4 },
  "questionResults": [
    {
      "questionId":        "uuid",
      "questionText":      "What does JVM stand for?",
      "questionType":      "MCQ",
      "difficulty":        "EASY",
      "points":            1,
      "isCorrect":         true,
      "selectedAnswerIds": ["<uuid>"],
      "allAnswers": [
        { "id": "uuid", "questionId": "uuid", "answerText": "Java Virtual Machine", "isCorrect": true,  "displayOrder": 0 },
        { "id": "uuid", "questionId": "uuid", "answerText": "Java Verified Module",  "isCorrect": false, "displayOrder": 1 }
      ]
    }
  ]
}
```

> ✅ `isCorrect` is **revealed** on all answers after grading
> ✅ MULTIPLE_CORRECT: full marks only if **all** correct answers selected AND **no** wrong ones

---

## 🛡️ Rate Limits

| Bucket          | Limit                      | Scope          |
|-----------------|----------------------------|----------------|
| Login endpoint  | 10 requests / 60 seconds   | Per IP         |
| All API calls   | 200 requests / 60 seconds  | Per admin token|

> `429 Too Many Requests` returned when limit exceeded.

---

## ❌ Standard Error Codes

| HTTP Status | When                                                       |
|-------------|------------------------------------------------------------|
| `400`       | Validation failure, duplicate entry, business rule broken  |
| `401`       | Missing / expired / invalid JWT                            |
| `403`       | Valid token but insufficient role                          |
| `404`       | Entity not found                                           |
| `429`       | Rate limit exceeded                                        |
| `500`       | Unexpected server error                                    |

---

## 🗺️ Content Hierarchy

```
Domain  ─── domain_skill_mapping ──→ Skill (global, shared across all domains)
  │                                        │
  ├─ domain_pool_mapping ──→ QuestionPool (DOMAIN scope)
  │                              └─ Question (EASY / MEDIUM / HARD)
  │                                    └─ Answer × 2-10 (MCQ or MULTIPLE_CORRECT)
  │
  └─ user_domain_mapping ──→ User (Google OAuth2)

Skill ─── skill_course_mapping ──→ Course
                                      │
                                      ├─ course_pool_mapping ──→ QuestionPool (COURSE scope)
                                      │
                                      └─ Topic (ordered by topicOrder)
                                             ├─ topic_pool_mapping ──→ QuestionPool (TOPIC scope)
                                             └─ StudyMaterial (VIDEO / ARTICLE / PDF / QUIZ / EXERCISE / SLIDES)
```

---

## 🔑 Enum Reference

| Enum                     | Values                                                   |
|--------------------------|----------------------------------------------------------|
| `SkillLevel`             | `BEGINNER` `INTERMEDIATE` `ADVANCED` `EXPERT`            |
| `CourseLevel`            | `BEGINNER` `INTERMEDIATE` `ADVANCED` `EXPERT`            |
| `TopicLevel`             | `BEGINNER` `INTERMEDIATE` `ADVANCED` `EXPERT`            |
| `MaterialType`           | `VIDEO` `ARTICLE` `PDF` `QUIZ` `EXERCISE` `SLIDES`       |
| `QuestionPool.ScopeType` | `DOMAIN` `COURSE` `TOPIC`                                |
| `Question.QuestionType`  | `MCQ` `MULTIPLE_CORRECT`                                 |
| `Question.Difficulty`    | `EASY` `MEDIUM` `HARD`                                   |
| `User.AuthProvider`      | `GOOGLE` `LOCAL`                                         |

---

## 🚀 Quick Start

```bash
# 1. Ensure DB and user exist
mysql -u root -e "
  CREATE DATABASE IF NOT EXISTS unlearnarc;
  CREATE USER IF NOT EXISTS 'unlearnarc'@'127.0.0.1' IDENTIFIED BY 'unlearnarc123';
  GRANT ALL ON unlearnarc.* TO 'unlearnarc'@'127.0.0.1';
  FLUSH PRIVILEGES;
"

# 2. Start backend (tables auto-created via ddl-auto=update)
cd /Users/subra-zstch1595/unlearnarc/backend
mvn spring-boot:run

# 3. Health check
curl http://localhost:8085/api/v1/auth/health

# 4. Admin login — capture token
TOKEN=$(curl -s -X POST http://localhost:8085/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"unlearnarc@gmail.com","password":"Admin@123"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])")

# 5. Create domain
curl -s -X POST http://localhost:8085/api/v1/domains \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Backend Engineering"}'

# 6. Create skill (global)
curl -s -X POST http://localhost:8085/api/v1/skills \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Spring Boot","level":"INTERMEDIATE"}'

# 7. Create question pool for a course
curl -s -X POST http://localhost:8085/api/v1/question-pools \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Java Basics Pool","scopeType":"COURSE",
    "totalQuestions":9,"easyCount":3,"mediumCount":3,"hardCount":3,
    "passPercentage":60,"timeLimitMinutes":30
  }'

# 8. Start Google OAuth2 login (browser)
open http://localhost:8085/oauth2/authorization/google
```

---

## ⚙️ Configuration Reference (`application.properties`)

```properties
# Server
server.port=8085

# Database
spring.datasource.url=jdbc:mysql://127.0.0.1:3306/unlearnarc?useSSL=false&serverTimezone=UTC
spring.datasource.username=unlearnarc
spring.datasource.password=unlearnarc123
spring.jpa.hibernate.ddl-auto=update

# JWT
app.jwt.secret=6f8f57715090da2632453988d9a1501b9d8e3c8e7b5e2e3a4c6d0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c
app.jwt.expiration-ms=86400000          # 24 hours
app.jwt.refresh-expiration-ms=604800000 # 7 days

# Single admin (hardcoded)
app.admin.email=unlearnarc@gmail.com
app.admin.password=Admin@123

# Google OAuth2
spring.security.oauth2.client.registration.google.client-id=YOUR_GOOGLE_CLIENT_ID
spring.security.oauth2.client.registration.google.client-secret=YOUR_GOOGLE_CLIENT_SECRET
spring.security.oauth2.client.registration.google.redirect-uri=http://localhost:8085/login/oauth2/code/google

# Frontend redirect after OAuth2
app.oauth2.redirect-uri=http://localhost:3000/auth/callback
app.oauth2.failure-redirect-uri=http://localhost:3000/auth/error
```
