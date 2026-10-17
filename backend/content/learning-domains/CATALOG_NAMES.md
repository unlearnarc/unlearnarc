# Short catalog labels

Course titles use the curriculum focus without a redundant `Domain: ` prefix.
Progression skills use a compact domain label and level (for example,
`Backend — Beginner`); the level is retained to distinguish the four stages.
Common long skill names use recognizable abbreviations such as OOP, EDA,
RAG and SRE. The explicit mappings live in `backend/catalog_names.py` and are
also used by the learning catalog seed scripts.

## Existing database

From `backend/`, preview with `python3 shorten_catalog_names.py`.
To persist, supply `ADMIN_EMAIL` and `ADMIN_PASSWORD` through the environment
and run `python3 shorten_catalog_names.py --apply`. The backend defaults to
`http://localhost:8085`; remote targets are intentionally rejected.

The script uses authenticated admin updates on existing IDs, not delete/create.
It checks target-name collisions, preserves request metadata, verifies every
write, and attempts to restore previous values if an update fails. API updates
are not one database transaction; avoid concurrent catalog edits during the run.
Original names and restore payloads are written to a private temporary backup
path printed before updates. Copy that backup to durable storage if needed.
A second preview should report zero changes.

No schema changes are required. Domain names, course content, enrollments,
progress and mapping IDs are not changed. Existing study-guide headings and
titles remain unchanged; this operation only renames course and skill records.
