# MCP Tool Map — UnlearnArc Course Architect

> Verified against `mcp/src/unlearnarc_mcp/server.py`.  
> All tools call the Java REST API; they never touch the database directly.  
> Do not invent tools that are not in this list.

---

## Health and Identity

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `health_check()` | Verify backend is reachable | — |
| `whoami()` | Return admin identity | — |

**Always call `health_check()` before bulk operations.**

---

## Domains

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_domains()` | List all learning domains | — |
| `create_domain(name)` | Create a domain | `name` (unique, not blank) |
| `update_domain(domain_id, name)` | Rename a domain | `domain_id`, `name` |
| `delete_domain(domain_id)` | Delete a domain | `domain_id` |

---

## Skills

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_skills()` | List all skills | — |
| `create_skill(name, level)` | Create a skill | `name`, `level`: BEGINNER\|INTERMEDIATE\|ADVANCED |
| `update_skill(skill_id, name, level)` | Update a skill | `skill_id`, `name`, `level` |
| `delete_skill(skill_id)` | Delete a skill | `skill_id` |

---

## Domain-Skill and Skill-Course Mappings

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `map_skill_to_domain(domain_id, skill_id)` | Associate skill with domain | `domain_id`, `skill_id` |
| `list_domain_skill_mappings()` | List all domain→skill links | — |
| `map_course_to_skill(skill_id, course_id)` | Associate course with skill | `skill_id`, `course_id` |
| `list_skill_course_mappings()` | List all skill→course links | — |

---

## Courses

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_courses()` | List all courses | — |
| `create_course(name, img_url, total_time, topics_count, level, qus_pool?)` | Create course | See schema below |
| `update_course(course_id, name, img_url, total_time, topics_count, level, qus_pool?)` | Update course | `course_id` + same fields |
| `delete_course(course_id)` | Delete course | `course_id` |

### `create_course` / `update_course` schema

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `name` | string | ✅ | unique, not blank |
| `img_url` | string | ✅ | A URL string (or placeholder like `"https://unlearnarc.com/images/default.png"`). The Java DTO types this as `String`. |
| `total_time` | string | ✅ | `HH:MM:SS` format |
| `topics_count` | int | ✅ | positive integer |
| `level` | enum | ✅ | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` |
| `qus_pool` | string (UUID) | ❌ | optional pool UUID |

> ⚠️ `img_url` is a URL string in the Java DTO (`String imgUrl`). Use a valid URL or a placeholder  
> such as `"https://unlearnarc.com/images/default.png"` when no specific image is available.  
> The AI_CONTENT_AUTHORING.md note about it being a Long is incorrect for the current codebase.

---

## Topics

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_topics_for_course(course_id)` | Get all topics in a course | `course_id` |
| `create_topic(name, course_id, topic_order, time, level)` | Create topic | See schema below |
| `update_topic(topic_id, name, course_id, topic_order, time, level)` | Update topic | `topic_id` + same fields |
| `delete_topic(topic_id)` | Delete topic | `topic_id` |

### `create_topic` schema

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `name` | string | ✅ | unique within course, not blank |
| `course_id` | string (UUID) | ✅ | must reference an existing course |
| `topic_order` | int | ✅ | 1-based; lower = earlier in the course |
| `time` | string | ✅ | `HH:MM:SS` — estimated reading time |
| `level` | enum | ✅ | `BEGINNER` \| `INTERMEDIATE` \| `ADVANCED` |

---

## Notes

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_notes_for_topic(topic_id)` | List notes for a topic (includes drafts) | `topic_id` |
| `create_note(title, content_html, topic_id?, course_id?, summary?, note_order?, read_minutes?, is_published?)` | Create a note | See schema below |
| `update_note(note_id, title, content_html, ...)` | Update a note | `note_id` + same fields |
| `publish_note(note_id)` | Make note visible to students | `note_id` |
| `unpublish_note(note_id)` | Retract to draft | `note_id` |
| `delete_note(note_id)` | Delete permanently | `note_id` |

### `create_note` schema

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `title` | string | ✅ | max 255 chars |
| `content_html` | string | ✅ | max 200,000 chars; sanitized server-side |
| `topic_id` | string (UUID) | one of | provide exactly one of `topic_id` / `course_id` |
| `course_id` | string (UUID) | one of | provide exactly one of `topic_id` / `course_id` |
| `summary` | string | ❌ | max 500 chars |
| `note_order` | int | ❌ | 0-based sort position; default 0 |
| `read_minutes` | int | ❌ | estimated minutes; default 5 |
| `is_published` | bool | ❌ | default False — save as draft |

---

## Question Pools

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_question_pools()` | List all pools | — |
| `list_question_pools_by_scope(scope_type)` | Filter by DOMAIN\|COURSE\|TOPIC | `scope_type` |
| `get_question_pool(pool_id)` | Fetch single pool | `pool_id` |
| `list_question_pools_by_domain(domain_id)` | Pools for a domain | `domain_id` |
| `list_question_pools_by_course(course_id)` | Pools for a course | `course_id` |
| `list_question_pools_by_topic(topic_id)` | Pools for a topic | `topic_id` |
| `create_question_pool(name, scope_type, ...)` | Create pool | See schema below |
| `update_question_pool(pool_id, name, scope_type, ...)` | Update pool | `pool_id` + same fields |
| `toggle_question_pool_active(pool_id)` | Enable/disable pool | `pool_id` |
| `delete_question_pool(pool_id)` | Delete pool | `pool_id` |
| `map_question_pool_to_entity(pool_id, domain_id?, course_id?, topic_id?)` | Bind pool to entity | `pool_id` + exactly one entity ID |

### `create_question_pool` schema

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `name` | string | ✅ | not blank |
| `scope_type` | enum | ✅ | `DOMAIN` \| `COURSE` \| `TOPIC` |
| `description` | string | ❌ | optional |
| `total_questions` | int | ❌ | 1–100; default 9 |
| `easy_count` | int | ❌ | default 3 |
| `medium_count` | int | ❌ | default 3 |
| `hard_count` | int | ❌ | default 3 |
| `pass_percentage` | int | ❌ | 0–100; default 60 |
| `time_limit_minutes` | int | ❌ | 0 = unlimited; default 0 |

> ⚠️ **CRITICAL:** `easy_count + medium_count + hard_count` must equal `total_questions` exactly.  
> Mismatched counts return HTTP 400.

---

## Questions

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_questions_for_pool(pool_id)` | Get all questions in a pool | `pool_id` |
| `list_questions_by_pool_and_difficulty(pool_id, difficulty)` | Filter by EASY\|MEDIUM\|HARD | `pool_id`, `difficulty` |
| `get_question(question_id)` | Fetch single question | `question_id` |
| `create_question(pool_id, question_text, question_type, difficulty, answers, points?, explanation?)` | Create one question | See schema below |
| `bulk_create_questions(questions)` | Create many at once (transactional) | `questions`: list of question objects |
| `update_question(question_id, pool_id, question_text, question_type, difficulty, answers, points?, explanation?)` | Replace question | `question_id` + same fields |
| `toggle_question_active(question_id)` | Enable/disable question | `question_id` |
| `delete_question(question_id)` | Delete permanently | `question_id` |

### Question schema

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `pool_id` | string (UUID) | ✅ | must reference an existing pool |
| `question_text` | string | ✅ | not blank |
| `question_type` | enum | ✅ | `MCQ` \| `MULTIPLE_CORRECT` |
| `difficulty` | enum | ✅ | `EASY` \| `MEDIUM` \| `HARD` |
| `answers` | list | ✅ | 2–10 answer objects |
| `points` | int | ❌ | 1–100; default 1 |
| `explanation` | string | ❌ | shown after answering |

### Answer object schema

```json
{
  "answerText": "string (required)",
  "isCorrect": true,
  "displayOrder": 0
}
```

**MCQ:** exactly **1** answer with `isCorrect: true`.  
**MULTIPLE_CORRECT:** at least **2** answers with `isCorrect: true`.

> ⚠️ `bulk_create_questions` is transactional: if any question in the batch fails validation, the entire batch is rejected. Fix and retry the whole batch.

---

## Algorithm Visualizations (AlgoViz)

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_algorithms()` | List all algorithm visualizations | — |
| `get_algorithm(slug)` | Fetch by slug | `slug` (kebab-case) |
| `create_algorithm(slug, title, visualizer, spec, summary?, difficulty?, category?, java_source?, python_source?, is_published?)` | Create visualization | See schema below |
| `publish_algorithm(slug, is_published?)` | Publish or unpublish | `slug`, `is_published` (default True) |

### `create_algorithm` schema

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `slug` | string | ✅ | kebab-case `^[a-z0-9]+(?:-[a-z0-9]+)*$`, max 160, unique |
| `title` | string | ✅ | not blank |
| `visualizer` | enum | ✅ | `ARRAY` \| `GRAPH` \| `TREE` \| `STACK` \| `QUEUE` \| `LINKED_LIST` \| `MATRIX` \| `CUSTOM` |
| `spec` | object | ✅ | must pass AlgorithmSpecValidator |
| `summary` | string | ❌ | max 1000 chars |
| `difficulty` | enum | ❌ | `EASY` \| `MEDIUM` \| `HARD` |
| `category` | string | ❌ | max 80 chars |
| `java_source` | string | ❌ | code shown in panel; use `\n` for newlines |
| `python_source` | string | ❌ | — |
| `is_published` | bool | ❌ | default False |

### Spec validation rules

- `spec.visualizer` must match top-level `visualizer`.
- `spec.steps` must have at least one step.
- Every step must have a `state` object.
- `highlights[].style` must be one of: `COMPARE`, `SWAP`, `VISIT`, `ACTIVE`, `DONE`, `PATH`, `ERROR`, `INSERT`, `DELETE`, `PIVOT`.
- `input.type` must be one of: `NUMBER`, `TEXT`, `CHOICE`, `BOOLEAN`.

See `references/visualization-guidelines.md` for complete spec examples.

---

## Animation Scenes

| Tool | Purpose | Key Parameters |
|------|---------|---------------|
| `list_animation_scenes()` | List all scenes | — |
| `create_animation_scene(slug, title, source, kind?, trace?, category?, description?, is_published?, simulator_params?)` | Create animation | See schema below |
| `publish_animation_scene(scene_id, is_published?)` | Publish or unpublish | `scene_id`, `is_published` (default True) |

### `create_animation_scene` schema

| Parameter | Type | Required | Constraints |
|-----------|------|----------|-------------|
| `slug` | string | ✅ | kebab-case, unique |
| `title` | string | ✅ | not blank |
| `source` | enum | ✅ | `AUTHORED` \| `GENERATED` |
| `kind` | string | ❌ | simulator name; required when `source = GENERATED` |
| `trace` | object | ❌ | AnimationTrace; required when `source = AUTHORED` |
| `category` | string | ❌ | optional grouping |
| `description` | string | ❌ | short description |
| `is_published` | bool | ❌ | default False |
| `simulator_params` | object | ❌ | optional params passed to simulator |

---

## What the MCP server CANNOT do

The following capabilities are **not available** through MCP tools. Report these as limitations rather than workaround or pretend success:

- Retrieve a single course by ID (only `list_courses()` is available — search by iterating the list).
- Search courses or topics by name — must iterate the list manually.
- Retrieve a single topic by ID — must iterate `list_topics_for_course()`.
- Delete questions in bulk.
- Retrieve notes by ID — must iterate `list_notes_for_topic()`.
- Associate a visualization or animation directly with a topic (the link is established in the note's HTML content, not via a dedicated tool).
- Publish a course as a whole — individual notes are published; courses and topics have no publish flag.
- Validate algorithm specs before saving without creating (`POST /algorithms/validate` exists in the REST API but is not exposed as an MCP tool).
- Create study materials (`POST /study-materials`) — not exposed as an MCP tool.
- List all questions globally — must query by pool.

---

## Enum Quick Reference

| Context | Allowed values |
|---------|---------------|
| Course / Topic / Skill `level` | `BEGINNER` `INTERMEDIATE` `ADVANCED` (also `EXPERT` for courses/topics) |
| Pool `scope_type` | `DOMAIN` `COURSE` `TOPIC` |
| Question `question_type` | `MCQ` `MULTIPLE_CORRECT` |
| Question / Pool `difficulty` | `EASY` `MEDIUM` `HARD` |
| Algorithm `visualizer` | `ARRAY` `GRAPH` `TREE` `STACK` `QUEUE` `LINKED_LIST` `MATRIX` `CUSTOM` |
| Algorithm / Question / Pool `difficulty` | `EASY` `MEDIUM` `HARD` |
| Animation `source` | `AUTHORED` `GENERATED` |
| Highlight `style` | `COMPARE` `SWAP` `VISIT` `ACTIVE` `DONE` `PATH` `ERROR` `INSERT` `DELETE` `PIVOT` |
| Input `type` | `NUMBER` `TEXT` `CHOICE` `BOOLEAN` |

---

## Dependency order (safe authoring sequence)

```
1. health_check()
2. list_courses() → find or create course
3. list_topics_for_course() → find or create topics (in order)
4. list_notes_for_topic() → find or create notes → publish_note()
5. list_algorithms() → reuse or create algorithm visualizations
6. list_animation_scenes() → reuse or create animation scenes
7. list_question_pools_by_topic() → find or create question pools
8. map_question_pool_to_entity() → bind pool to topic
9. list_questions_for_pool() → find or create questions (bulk_create_questions)
10. Validate: repeat steps 2–9 as GET calls to confirm every record
```

Parent records must exist before child records:
- Course before topics.
- Topics before notes, pools, and pool mappings.
- Pools before questions.
