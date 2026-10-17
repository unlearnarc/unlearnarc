# Visualizer thumbnails

Algorithms now accept optional `thumbnailUrl` metadata on admin create/update/validate requests. Both list endpoints and both detail endpoints return it. The lightweight list also includes `createdAt` for recent-first sorting; no detail requests are needed for catalog cards.

- Use an HTTPS public image URL (up to 1024 characters, no embedded credentials or fragment), or `/images/algorithms/<slug>.svg` for bundled assets.
- Omit the field on update to preserve an existing value. Send `null` or an empty string to clear it. Existing records/clients need no image.
- Existing admin authorization is unchanged; there is no new upload endpoint or server-side URL fetching. Do not put private storage URLs or data/base64 images in this field.
- Apply `backend/migrations/V9__algorithm_thumbnail.sql` using the existing standalone MySQL migration procedure. It conditionally adds the nullable column and backfills only known slugs with no image; it never inserts records or overwrites custom URLs. Development's Hibernate schema update adds the column but does not run the backfill.
- Deploy `student/public/images/algorithms` with the student app before applying the backfill. Paths resolve on the student origin, not the API origin. The catalog also uses bundled previews for known legacy records without a thumbnail.
- Regenerate the 480 × 240, title-free SVGs with `node student/scripts/generate-algorithm-previews.mjs` from the repository root. SVGs follow the embedding document's color scheme (the application sets this for both themes). The fallback SVG consumes the existing theme tokens.
- The basic algorithm seed builder includes thumbnail paths for new/updated starter records. Graph/stack/matrix records are covered by the migration and legacy fallback.

Catalog sorting supports Name, Difficulty, and Recently Added. Popularity is intentionally not offered: the data model has no popularity metric. Search, categories, and counts use the existing full published feed without changing API pagination semantics.

The admin editor now fetches the full record before editing, because summaries omit execution source/spec. This avoids erasing execution metadata when updating a thumbnail.
