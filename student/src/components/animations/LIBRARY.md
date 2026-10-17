# Interactive animation library

The library consumes the existing `/animation-scenes/published` summaries. Cards only fetch a full trace when opened. No listing player or autoplay is mounted.

The existing `/animations` route now defaults to browsing; `/animations?scene=<existing-id>` opens the unchanged CanvasAnimator with checkpoints, instructions, code, notes and fullscreen enabled. Category selections use `?category=<domain>` and compose with `scene`. Back navigation returns to the library. No separate animation engine or duplicate records are introduced.

The six browse domains use existing enum values. `NETWORKING`, missing categories, and future unknown categories appear under Other without discarding their raw category metadata from search. Counts are computed from the full feed; search results are filtered within these categories.

Sorts are Title A–Z and Recently Added (only shown when actual `createdAt` metadata is supplied). No popularity figures or missing frame counts/durations are invented.

## Optional thumbnails

Apply `backend/migrations/V10__animation_scene_thumbnail.sql` via the existing standalone MySQL migration procedure when Hibernate schema updates are disabled. Development `ddl-auto=update` also creates the nullable column. The migration does not insert or update any animation records.

Scene create/update accepts optional `thumbnailUrl` (maximum 1024 characters): an HTTPS URL or public `/images/...` image path. It is returned by detail and summary APIs. Existing admin clients may omit the field without erasing a saved URL; explicit null clears it. Public image paths reuse the student's existing asset storage. The category view at `/animations?category=DATABASE` adds a breadcrumb, SQL-specific description, actual category summary and contextual search placeholder, using the same feed/cards/filter configuration as the main library. Every nonempty category shows View all, regardless of record count. See `backend/ANIMATION_THUMBNAILS.md` for the repeatable full-inventory SVG population and metadata-only admin PATCH workflow; the admin scene form also supports editing or clearing the reference. Missing, unsafe, or failed image references use lightweight static theme-aware concept SVG diagrams selected by scene title, slug, kind and domain.

Published summaries now include the existing creation timestamp. For generated scenes without a stored trace, frame count and duration remain null rather than presenting fabricated zero values.

## Detail workspace

`AnimationDetail` presents record metadata and accessible Visualizer / Code Example / Explanation tabs on the same `?scene=` route. `CanvasAnimator` remains mounted across tabs and owns the only playback controller; leaving the Visualizer pauses playback without resetting time, speed or checkpoints. The existing renderer, instruction navigation, toolbar and focus mode are reused.

Programs and notes come directly from the existing trace JSON contract (`programs`, `notes`); no schema migration or record population is needed. CodeProgramPanel now renders the shared Contest CodeEditor in read-only mode, including authored language variants, multiple synchronized line markers and copy. Existing explicitly runnable programs retain their local sandbox action. No-code lessons expand to full width; the Code Example tab explains the absence without mounting an empty editor. Takeaways use the first authored key point, then summary/description as fallbacks.

The shared editor adds SQL highlighting using its installed CodeMirror language infrastructure (no new dependency), TypeScript configuration, plain text fallback for unsupported grammars, optional multiple active lines and an accessible source label. Existing Contest props/defaults remain compatible.
