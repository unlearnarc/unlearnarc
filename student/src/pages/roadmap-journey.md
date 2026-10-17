# Roadmap journey

- `/roadmap` retains the searchable role catalogue. Selecting a role opens `/roadmap?role=<id>`. Selecting any stage adds `stage=<LEVEL>`; browser back/forward restores the stage list or selected stage.
- The authenticated `/roadmap/role/{id}` response remains the only course/progress source. Courses are deduplicated by ID. Only the server's `completed` flag counts toward stage/overall completion; enrollment never counts as completion.
- All four levels are open regardless of earlier progress. Missing levels can be selected and show an honest empty state. The first unfinished populated stage is highlighted as current, not enforced as a prerequisite.
- Desktop shows courses on the left and compact selected-course details on the right. Clicking a course title selects its details; Start / Continue / Review navigate to the existing course route. Default selection is the last completed course in curriculum order, or the first course. Completion timestamps are not provided by the API, so the UI does not claim chronological recency.
- Mobile (below 768px) has a distinct drill-down flow: stage list, selected stage's courses with All stages back navigation, then the existing course page. Course titles navigate directly on mobile. Desktop details are not displayed on mobile. Resizing preserves stage selection.
- There is no stage overview or Pro Tip banner. Existing course saving, query invalidation, visibility refresh, authentication, themes and course navigation remain unchanged.
- No progress store, database seed, migration, or backend prerequisite change is required.

Validation: progress-model assertions and controlled-API browser tests are in `tests/ui/roadmap.func.spec.ts`; keyboard and scoped WCAG checks are in `tests/ui/roadmap-accessibility.func.spec.ts`.
