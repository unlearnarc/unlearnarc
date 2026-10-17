# Four-level course catalog and five roadmap templates

From `backend/`:

```sh
python3 seed_learning_courses.py
python3 -m unittest test_seed_learning_courses.py -v
python3 seed_learning_courses.py --apply
```

Requires the local backend and domains from `seed_learning_domains.py`. Uses the existing local admin conventions (`ADMIN_EMAIL`, `ADMIN_PASSWORD` or `ADMIN_PASS`, `BASE`). Remote targets are rejected. The shared API client honors HTTP 429 retry delays. Interrupted imports can be resumed by rerunning; there is no deletion or automatic rollback. Conflicting named courses/skills/modules/guides stop rather than overwrite user content.

## Contents

`learning_course_bank.py` defines 64 guided courses: one Beginner, Intermediate, Advanced and Expert course for each of the 16 curated domains. Each has four sequential topic records and a published course study guide with prerequisites, outcomes, an official reference, a concrete project and a completion rubric. Existing legacy `Computer science` and `Machine Learning (ML)` domains reuse the relevant foundation/AI courses instead of duplicating them.

These are **guided project-based curricula**, not fully authored lesson libraries, question banks, videos or certificates of expertise. Topic time is a one-hour study planning estimate (four hours per course); independent reading, project implementation and review take additional variable time. Expert-level projects require prior experience and feedback. References are official documentation entry points, not scraped courses; links may evolve. Cloud/security practice requires isolated authorized sandboxes and budget/cleanup controls.

The catalog uses the existing gradient cover fallback, avoiding invented external images. There are no course-description/prerequisite fields in the API, so the published course guide stores this information.

## Mapping design

Each domain gets four level-specific practice skills, each linked only to its corresponding course. This is necessary because the existing roadmap service groups by **skill** level, not course level. Existing shared skills and their levels are unchanged. The new practice skills are additive progression anchors, not replacements for subject skills.

Five role templates are populated using explicit practice-skill mappings to avoid unrelated courses leaking through shared subject skills:

1. **Full Stack Product Engineer:** Foundations → Frontend → Backend → Databases → Full Stack.
2. **Cloud and DevOps Engineer:** Foundations → DevOps → Cloud → Cybersecurity.
3. **Data and AI Practitioner:** Foundations → Databases → Analytics → Data Science → AI/ML.
4. **Data Platform Engineer:** Foundations → Databases → Data Engineering → Cloud.
5. **Quality and Architecture Engineer:** Foundations → DSA → Backend → QA → Architecture.

The role description records suggested domain order. The existing UI groups skills alphabetically within each of four levels; it does not enforce prerequisites or domain ordering. Courses may be shared across paths; do not assume every learner must complete every domain. Mobile remains available as an independent four-level specialization. Existing roles/mappings are preserved rather than repurposed.

The import verifies persisted course metadata, topic sequence, published guides, domain/skill/course graph mappings and all four stages of the five roadmaps. A second successful run should report an empty `created` object.
