# Daily quiz implementation and data audit

## Existing data mapping (before schema changes)
- Student: `user`, authenticated email resolved on the backend; existing pessimistic user lock serializes mutations.
- Enrollment: `enrolled_courses`. Enrollment is NOT lesson completion.
- Lessons/concepts: `topic` belongs to `course`; published `note` and study material provide learning content. There is no independent lesson-completion table.
- Explicit study/revision completion: `study_plan_task.completed_at`, interval 0 means learned; higher intervals mean revised. Reuse these as learning activity, never mastery.
- Questions: `question_pool`, `question`, `answer`; MCQ and MULTIPLE_CORRECT only. Active flags are the publication policy. Topic/course mapping tables establish relevance. No duplicate question bank.
- Assessment history: `user_test_attempts` owns `test_result`; answer_snapshot contains question-level results, selected IDs, difficulty and correctness. Deduplicate by result ID and question ID. Empty selected IDs are skips, not errors. Aggregate-only results establish scope familiarity but not question-level weakness.
- Existing course progress uses best aggregate score >65 as completion. This is not sufficient for daily-quiz mastery and is deliberately not reused as mastery.
- Gamification: test history awards earned points; daily activity uses StreakService. Daily quizzes use established daily activity on completion; no new XP policy is introduced and no synthetic course test results are written.
- Practical coding/contests have no verified topic mapping, so are excluded from topic evidence. No arbitrary code execution is added.
- Admin QuestionPoolsPage already manages mapping, difficulty, active status, answer keys and explanations, with availability counts.
- MCP is admin catalog/content CRUD over REST, not an authenticated student learning-history provider. Daily selection reads backend-owned data directly.

## Additions
Daily session and ordered item tables snapshot question/options/key/explanation privately, with a unique student/date constraint. No question foreign keys: deleted content cannot destroy historical review. A small pool-policy table explicitly opts existing pools into general diagnostics or introductory diagnostics; no pools are implicitly general CS diagnostics. Default is opt-out.

Implementation/release details and executed validation are recorded below as work progresses.
