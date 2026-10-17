# Animation thumbnails

The existing nullable `animation_scene.thumbnail_url` VARCHAR(1024) is added by
`migrations/V10__animation_scene_thumbnail.sql`. Apply that idempotent standalone
MySQL migration first in deployments with schema auto-update disabled. No new
schema migration or table is needed for population.

Student assets live under `student/public/images/animations`, following the
existing algorithm-preview hosting convention. Deploy assets before populating
references in a remote database. Each diagram is static 16:9 SVG, without a
heading, animation, script, or external dependency. SVGs support the embedding
page's preferred color scheme and use readable neutral/blue surfaces in both
modes. Cards retain a theme-token-aware inline fallback if media is missing,
unsafe, or fails to load.

## Repeatable population

Start the backend containing the metadata PATCH endpoint, then from `backend/`:

```sh
# Credentials come from the environment, not from this source file.
export ADMIN_EMAIL ADMIN_PASS
python3 populate_animation_thumbnails.py          # Generate assets, preview DB changes
python3 populate_animation_thumbnails.py --apply  # Populate missing references
python3 populate_animation_thumbnails.py --apply  # No-op if already populated
```

Alternatively supply `ADMIN_TOKEN`. `--base` or `BASE` selects the API server.
The script retrieves **all** records through the authenticated admin inventory,
including unpublished scenes; it never creates or publishes an animation.
Asset filenames derive from existing unique slugs, and the stable manifest
tracks asset ownership. Custom nonempty references and unowned assets are
preserved. Existing lessons have individually authored diagrams; future lessons
can use their stored trace geometry or receive a custom reference in admin.

`PATCH /api/v1/animation-scenes/{id}/thumbnail` accepts
`{"thumbnailUrl":"/images/animations/lesson.svg"}` or explicit null and requires
ADMIN. Validation matches scene create/update: HTTPS or a public `/images/`
image path, maximum 1024 characters. The update changes only media metadata,
never the trace, checkpoints, duration, content version, simulator inputs, or
publication state; submitting the same URL does not issue a write. Summary and
detail endpoints already return this reference.

The existing admin scene form includes a Thumbnail URL field for authored media
references. Clearing it restores the student fallback. No upload service or raw
base64 data is introduced.

## Verified local inventory

9 records: 2 SQL JOIN lessons, 2 CAS/thread lessons, BFS traversal, Two Sum,
request routing through a load balancer, matrix multiplication, and Hello Pulse.
All receive distinct SVGs. The SQL category intentionally shows the actual two
records; no WHERE/GROUP BY/index/transaction/normalization lessons are fabricated.

Tests: `python3 -m unittest test_populate_animation_thumbnails.py` and
`./mvnw -Dtest=AnimationSceneCatalogTest,AnimationThumbnailUpdateTest test`.
