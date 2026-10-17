# Roadmap and learning progress

Roadmaps now separate **picked/enrolled** courses from **completed** courses. Learners can expand connected stage cards, expand a skill branch, pick a course into My Learnings, and open its lessons and quizzes.

The roadmap completion bar is hidden until a course in that roadmap is picked/enrolled or has recorded learning progress (including a course quiz score, even if it is zero). The same activity rule switches the primary action from Start learning to Continue learning. Roadmap cards use compact spacing and smaller mobile typography; course actions remain available on narrow screens.

Completion is based on persisted, learner-scoped quiz history, never enrollment:
- A course quiz score strictly **greater than 65%** completes the course.
- Alternatively, every currently mapped topic must have a topic quiz score strictly greater than 65%.
- Exactly 65% does not qualify. Best scores are retained across retakes.
- Course quizzes do not falsely mark individual topic quizzes completed.
- Empty courses do not automatically complete; a qualifying course quiz is required.
- Topic progress uses the current topic membership, not the catalog's denormalized topicsCount.

Existing enrollment endpoints remain unchanged. `GET /api/v1/enrollments/course/{courseId}/progress` requires authentication and returns courseId, enrolled, completed, progressPercent, totalTopics, completedTopics, bestCourseScore, and topics (topicId, topicName, completed, bestScore). Roadmap course nodes also expose enrolled, progressPercent, completedTopics and bestCourseScore.

No database migration is needed: existing test_result and user_test_attempts provide durable progress, including historical quizzes. Existing enrollments previously displayed as complete may now correctly display as in progress. Pool-specific quiz pass/fail settings are unchanged; learning mastery independently requires >65%.

Validation: backend `LearningProgressServiceTest` covers threshold boundaries, course/topic completion, retakes, enrollment separation, scope isolation and empty/zero-point attempts. Run backend tests with Java 21 and the student TypeScript/build checks.
