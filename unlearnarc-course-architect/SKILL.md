---
name: unlearnarc-course-architect
description: >
  Audit, design, create, enrich, and validate a complete course inside the UnlearnArc
  learning platform. Accepts a course name (and optional metadata) and drives the full
  content lifecycle — curriculum design → topics → notes → algorithm visualizations →
  animations → question pools → questions — using the real MCP tools exposed by the
  UnlearnArc MCP server. Safe to run repeatedly: always searches before creating,
  preserves existing content, and resumes from the last verified phase.
---

# UnlearnArc Course Architect

## What this skill does

Given a course name, this skill:

1. Searches the existing UnlearnArc catalog for the course (or a substantially equivalent one).
2. Audits its current state — topics, notes, visualizations, animations, and question pools.
3. Designs a complete curriculum if the course is new, or identifies gaps if it already exists.
4. Creates or updates topics, rich-text notes, algorithm visualizations, animation scenes, question pools, and questions using only the real MCP tools.
5. Verifies every write by retrieving the saved records.
6. Produces an accurate completion report — verified counts only, no assumed successes.

## Invocation

```
Create a complete course on Graph Algorithms in UnlearnArc.
```

Optional additional inputs:
- Target audience or prerequisite knowledge.
- Difficulty level (`BEGINNER` | `INTERMEDIATE` | `ADVANCED`).
- Learning goals or desired scope.
- Specific topics to include or exclude.

The course name alone is sufficient.

---

## Mandatory pre-flight check

Before any content creation, call `health_check()` and `whoami()`.
If the backend is unreachable, stop and report the connectivity issue.
Do not attempt content creation against an offline backend.

---

## Phase 1 — Discover

### 1.1 Search the course catalog

Call `list_courses()` and scan the full result for:
- Exact title matches (case-insensitive).
- Near-equivalent titles (e.g. "Graph Theory", "Graphs and Algorithms", "Graph Algorithms").
- Courses covering substantially the same subject matter.

**Never create a duplicate course.** If a substantially equivalent course exists, treat it as the target course and proceed to Phase 2.

### 1.2 Retrieve existing structure

If a matching course is found:
- `list_topics_for_course(course_id)` — get all topics.
- For each topic: `list_notes_for_topic(topic_id)` and `list_question_pools_by_topic(topic_id)`.
- `list_algorithms()` — scan for related algorithm visualizations.
- `list_animation_scenes()` — scan for related animation scenes.
- `list_question_pools_by_course(course_id)` — get course-level pools.

Record every returned ID. Never assume IDs.

---

## Phase 2 — Audit

Build an internal inventory before making any changes. For each topic, classify its state:

| State | Condition |
|-------|-----------|
| MISSING | Topic does not exist |
| NO_NOTES | Topic exists but has no notes |
| WEAK_NOTES | Topic has notes but they are superficial (< 300 words or missing key sections) |
| NO_VISUAL | Topic has notes but no visualization or animation |
| NO_QUESTIONS | Topic has notes but no question pool or pool has fewer than 5 questions |
| INCOMPLETE | Topic has notes and a pool but questions are sparse |
| COMPLETE | Topic has good notes, appropriate visual, and ≥ 10 questions |

Also classify the course:
- NEW: Course does not exist → create from scratch.
- PARTIAL: Course exists but is incomplete → identify and fill gaps only.
- COMPLETE: Course is already comprehensive → report without unnecessary rewrites.

---

## Phase 3 — Plan

Design the full curriculum before creating any records.

### Course metadata to determine

- **Title** — use the canonical, concise form (e.g. "Graph Algorithms" not "Introduction to Graph Algorithm Concepts").
- **Level** — derive from the subject and optional input; default to `INTERMEDIATE`.
- **Total time** — estimate in `HH:MM:SS` format; a 10-topic course at 30 min/topic = `05:00:00`.
- **Topics count** — the planned number of topics.
- **Image URL** — use a placeholder URL when no specific image is available (e.g. `"https://unlearnarc.com/images/default.png"`). The `imgUrl` field is a URL string on the Java `CourseRequest` DTO.

### Curriculum design rules

- Aim for **6–12 well-structured topics** for a substantial course. Adjust to the subject's actual scope.
- Order topics by dependency: foundational concepts before algorithms, algorithms before applications.
- Each topic must have a clear, specific title and learning objective.
- Do not create artificially narrow micro-topics or excessively broad macro-topics.

### Visual learning classification (per topic)

For every planned topic, decide in advance:

**Use `create_algorithm` (AlgoViz)** when the learner benefits from seeing execution state change step by step. Applicable to: BFS, DFS, Dijkstra's, Topological Sort, Binary Search, sorting algorithms, dynamic programming, heap operations, tree traversals.

**Use `create_animation_scene` (GENERATED)** for concepts better shown as diagrams or flows: graph representations, connected components concepts, cycle detection illustrations, general structural concepts.

**No visual needed** when the topic is primarily definitional (e.g. terminology reference) or mathematical.

Always search `list_algorithms()` and `list_animation_scenes()` first — reuse an existing asset when it accurately covers the concept.

---

## Phase 4 — Create or update the course

Only create a course if none exists. If one exists, update metadata only if it is significantly stale.

```
create_course(
  name         = "<canonical title>",
  img_url      = "https://unlearnarc.com/images/default.png",
  total_time   = "HH:MM:SS",
  topics_count = <planned count>,
  level        = "BEGINNER|INTERMEDIATE|ADVANCED"
)
```

Validation constraints:
- `name` must not be blank and must be unique.
- `img_url` is a **URL string** (the Java DTO field `imgUrl` is `String`).
- `total_time` must be `HH:MM:SS` format.
- `level` must be `BEGINNER`, `INTERMEDIATE`, or `ADVANCED` (`EXPERT` is also accepted by the API).

Retain the returned `course_id`. All subsequent topic and pool operations require it.

---

## Phase 5 — Create or update topics

Create topics in dependency order (foundational first). Do not create a topic that already exists.

```
create_topic(
  name        = "<topic title>",
  course_id   = "<course_id>",
  topic_order = <1-based integer>,
  time        = "HH:MM:SS",   # estimated reading time; 30 min = "00:30:00"
  level       = "BEGINNER|INTERMEDIATE|ADVANCED"
)
```

Constraints:
- `(name, courseId)` must be unique — the API enforces this.
- `time` must be `HH:MM:SS`.
- Retain every returned `topic_id`. Do not proceed to notes or questions without the actual ID.

---

## Phase 6 — Create learning notes

Write one substantive note per topic. A note must be a real learning document, not a stub.

```
create_note(
  title        = "<topic title> — Learning Note",
  content_html = "<rich HTML content>",
  topic_id     = "<topic_id>",
  summary      = "<1–2 sentence summary>",
  note_order   = 0,
  read_minutes = <estimated minutes>,
  is_published = True
)
```

Constraints:
- `content_html` max 200,000 characters.
- `title` max 255 characters.
- Exactly one of `topic_id` or `course_id` must be provided.
- Content is sanitized server-side — avoid inline JavaScript or dangerous attributes.
- If updating an existing note: use `update_note(note_id, ...)`.

### Required sections in every note (HTML structure)

Adapt to the topic. Not every section applies to every topic.

```html
<h2>Learning Objectives</h2>
<!-- What the learner will understand, implement, or analyze -->

<h2>Intuition and Motivation</h2>
<!-- Why this concept exists; what problem it solves -->

<h2>Core Concept</h2>
<!-- Progressive explanation: simplest mental model first -->
<!-- Define terms before using them -->

<h2>Worked Example</h2>
<!-- Step-by-step with intermediate states -->

<h2>Code Example</h2>
<!-- Complete, correct, readable; explain key lines -->
<pre><code class="language-python">
# code here
</code></pre>

<h2>Complexity Analysis</h2>
<!-- Time and space complexity; assumptions and trade-offs -->

<h2>Common Mistakes</h2>
<!-- Misconceptions, edge cases, debugging strategies -->

<h2>Real-World Applications</h2>
<!-- When and why this concept is actually used -->

<h2>Key Takeaways</h2>
<!-- 3–5 bullet summary -->

<h2>Knowledge Check</h2>
<!-- 2–3 short questions that preview the quiz -->
```

**Quality requirements:**
- Technically accurate. Never fabricate benchmarks, execution results, or external references.
- Progressive difficulty: simple → complex within each section.
- Use correct mathematical notation (e.g., O(V + E), not "O(V+E)").
- Code examples must be syntactically correct; trace output must match code behavior.
- Avoid repeating content from other topics in the same course.
- Minimum useful length: ~500 words of substantive explanation per topic.

After creating, call `publish_note(note_id)` to make it visible to students.

---

## Phase 7 — Add visual learning assets

Work through each topic's planned visual classification from Phase 3.

### 7A — Algorithm visualizations (`create_algorithm`)

Before creating, call `get_algorithm(slug)` to check if it already exists.

```
create_algorithm(
  slug          = "<kebab-case-slug>",   # e.g. "bfs", "dijkstra"
  title         = "<Display Title>",
  visualizer    = "ARRAY|GRAPH|STACK|MATRIX",
  spec          = { ... },               # see spec format below
  summary       = "<one sentence>",
  difficulty    = "EASY|MEDIUM|HARD",
  category      = "<Sorting|Graph|Dynamic Programming|etc>",
  java_source   = "<java code string>",
  python_source = "<python code string>",
  is_published  = True
)
```

**Slug rules:** kebab-case, `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 160 chars, unique.
**Visualizer enum:** `ARRAY` | `GRAPH` | `TREE` | `STACK` | `QUEUE` | `LINKED_LIST` | `MATRIX` | `CUSTOM`.

#### Spec format

```json
{
  "visualizer": "GRAPH",
  "initialState": { "nodes": [...], "edges": [...] },
  "variables": [{ "name": "u", "label": "current" }],
  "steps": [
    {
      "title": "Step title",
      "explanation": "What is happening and why.",
      "state": { "nodes": [...], "edges": [...] },
      "variables": { "u": "A" },
      "highlights": [{ "target": "nodes", "indices": ["A"], "style": "ACTIVE" }],
      "line": 3,
      "lang": "python",
      "input": {
        "key": "unique-checkpoint-key",
        "prompt": "What will happen next?",
        "type": "BOOLEAN",
        "expected": true
      }
    }
  ]
}
```

- `state` is required on every step and must be a complete snapshot, not a diff.
- `highlights.style` ∈ `COMPARE`, `SWAP`, `VISIT`, `ACTIVE`, `DONE`, `PATH`, `ERROR`, `INSERT`, `DELETE`, `PIVOT`.
- Include at least one `input` checkpoint per visualization for learner engagement.
- For `ARRAY` visualizer: `state = { "array": [number, ...] }`.
- For `GRAPH` visualizer: `state = { "nodes": [{"id": str}], "edges": [{"from": str, "to": str}] }`.
- Include meaningful `pointers` where applicable: `{ "lo": 0, "hi": 6, "mid": 3 }`.

See `references/visualization-guidelines.md` for complete worked examples.

### 7B — Animation scenes (`create_animation_scene`)

For non-algorithmic visual concepts:

```
create_animation_scene(
  slug        = "<kebab-case-slug>",
  title       = "<Display Title>",
  source      = "GENERATED",
  kind        = "<simulator-name>",   # e.g. "two-sum", "graph-adjacency"
  category    = "<category>",
  description = "<description>",
  is_published = True
)
```

Or for authored traces:

```
create_animation_scene(
  slug   = "<slug>",
  title  = "<title>",
  source = "AUTHORED",
  trace  = { ... },    # AnimationTrace object
  ...
)
```

Always search `list_animation_scenes()` first and reuse an existing scene when it fits.

---

## Phase 8 — Build question pools and questions

### 8.1 Create a question pool per topic

```
create_question_pool(
  name               = "<Topic Name> — Quiz",
  scope_type         = "TOPIC",
  description        = "<short description>",
  total_questions    = 9,
  easy_count         = 3,
  medium_count       = 3,
  hard_count         = 3,
  pass_percentage    = 60,
  time_limit_minutes = 0
)
```

**Critical constraint:** `easy_count + medium_count + hard_count` must equal `total_questions` exactly or the API returns 400.

Then map it:

```
map_question_pool_to_entity(
  pool_id  = "<pool_id>",
  topic_id = "<topic_id>"
)
```

### 8.2 Create questions using bulk_create_questions

Target: **10–15 questions per topic** distributed as:
- 3–4 EASY conceptual/recall questions.
- 4–6 MEDIUM application/tracing questions.
- 3–4 HARD edge-case/complexity/scenario questions.

```python
bulk_create_questions([
  {
    "poolId": "<pool_id>",
    "questionText": "<question text — HTML or plain>",
    "questionType": "MCQ",       # MCQ | MULTIPLE_CORRECT
    "difficulty": "EASY",        # EASY | MEDIUM | HARD
    "points": 1,
    "explanation": "<explanation shown after answering>",
    "answers": [
      { "answerText": "<option A>", "isCorrect": True,  "displayOrder": 0 },
      { "answerText": "<option B>", "isCorrect": False, "displayOrder": 1 },
      { "answerText": "<option C>", "isCorrect": False, "displayOrder": 2 },
      { "answerText": "<option D>", "isCorrect": False, "displayOrder": 3 }
    ]
  },
  ...
])
```

**MCQ validation:** exactly 1 answer with `isCorrect: true`.
**MULTIPLE_CORRECT validation:** at least 2 answers with `isCorrect: true`.
**Answer count:** 2–10 answers per question.

If `bulk_create_questions` fails (transactional — all-or-nothing), fix the failing question and retry. Do not retry a successful bulk batch.

### 8.3 Question quality rules

- Questions must test the topic's stated learning objectives.
- Distractors must be plausible and educationally meaningful.
- Code tracing questions: validate that the expected output matches the code.
- Complexity questions: ensure the correct answer is mathematically accurate.
- Never ask the same question twice in the same pool, even with different variable names.
- Explanations must teach, not just state the answer.
- Include a mix: definition, application, trace, edge case, misconception.

See `references/assessment-design.md` for question templates.

---

## Phase 9 — Validate

After all content is created, verify every record:

1. `list_topics_for_course(course_id)` → confirm all topics are present.
2. For each topic: `list_notes_for_topic(topic_id)` → confirm note exists and is published.
3. For each topic: `list_question_pools_by_topic(topic_id)` → confirm pool is mapped.
4. For each pool: `list_questions_for_pool(pool_id)` → confirm question counts match pool settings.
5. `list_algorithms()` → confirm created algorithms appear and are published.
6. `list_animation_scenes()` → confirm created animations appear and are published.

Flag any validation failures explicitly. Do not report success for unverified content.

**Verification checklist:**
- [ ] Every topic belongs to the correct course.
- [ ] Every note belongs to the correct topic.
- [ ] Every note is published (`isPublished: true`).
- [ ] Every pool is mapped to its topic.
- [ ] Pool question counts match `easyCount`, `mediumCount`, `hardCount`.
- [ ] Every algorithm visualization is published.
- [ ] No duplicate topics or question pools.

---

## Phase 10 — Finalize

Notes and topics in UnlearnArc have no separate "publish course" step — topics become live as soon as they are created, and notes become live when `publish_note()` is called.

Report:
- Course name and whether it was created or updated.
- Number of topics created vs. updated.
- Number of notes created vs. updated.
- Number of algorithm visualizations created vs. reused.
- Number of animation scenes created vs. reused.
- Number of questions created (total and per-pool).
- Any content that was skipped because it already existed and was complete.
- Any validation failures or operations that could not be completed.
- Actual IDs of the main records (course, topics) for future reference.

Report only verified, confirmed counts. Never report intended work as completed work.

---

## Safety rules

- **Never delete** existing content unless explicitly instructed.
- **Never overwrite** a note that already has substantial content — update only what is missing.
- **Never create a duplicate course** because its title differs by a word.
- **Never invent tool names.** Use only the tools listed in `references/mcp-tool-map.md`.
- **Never assume success.** Always retrieve after creating to confirm.
- If the backend returns a 400 or 409, read the error message before retrying.
- If a bulk question creation fails, check which question failed and fix it before retrying.
- If an algorithm slug is taken, check whether the existing one covers the same algorithm before creating a new one with a different slug.

---

## Resume behavior

If work is interrupted, resume from Phase 9 validation:
1. Retrieve all existing records for the course.
2. Build an updated inventory.
3. Identify what was and was not completed.
4. Continue only the incomplete phases, starting from the earliest incomplete phase.

Do not recreate records that already exist and are correct.
