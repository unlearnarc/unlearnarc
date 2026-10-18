# Searching algorithms — four rich-text lessons

Adds four ordered, published notes to the existing **Algorithms → Searching algorithms** topic:

1. Linear Search — sequential lookup and useful variations.
2. Binary Search — sorted arrays, interval reasoning, and duplicate limitations.
3. Binary Search on Answer — monotone feasibility and a minimum-speed example.
4. Lower Bound and Upper Bound — duplicate boundaries, insertion positions, and range counts.

Each lesson includes beginner prerequisites, intuition, a worked trace, Python and Java implementations, correctness reasoning, complexity, beginner/intermediate/advanced use cases, pitfalls, and practice with answers. Reading estimates are 15, 18, 22, and 22 minutes; practice may take longer.

## Import into MySQL

Back up the database first. Requires MySQL 8.0.16+ for enforced CHECK constraints. The script adds published content but does not delete data, create catalog entries, modify course metadata, or overwrite existing notes. Run one import at a time while no other author is writing to this topic.

From an authenticated MySQL session:

```sql
SOURCE /Users/subra-zstch1595/unlearnarc/backend/content/searching-algorithms/seed_notes.sql;
```

Alternatively, feed `seed_notes.sql` to the MySQL command-line client using your existing credentials. Do not enable `--force`. The script selects `unlearnarc` and requires exactly one course named Algorithms and exactly one of its topics named Searching algorithms or Search algorithms (case-insensitive, ignoring surrounding spaces). Missing or ambiguous matches cause a CHECK error. Stop on any error; if your interactive client continues processing, the insert also independently requires both match counts to equal one.

New notes attach only to `topic_id`; `course_id` remains NULL, matching the note service's one-parent rule. They are appended after existing note orders in the listed sequence. Exact-title matches within this topic are skipped, including existing drafts; existing content and publication state stay unchanged. A clean import creates all four; rerunning inserts zero. Partial imports can be rerun but do not reorder already existing notes. Use the admin editor to resolve pre-existing titles, duplicates, or ordering conflicts deliberately.

The final query shows saved lesson IDs, order, publication state, and content size. After import, open Algorithms in the student app, expand Searching algorithms, and open its notes. These are note records, not new algorithm visualizer records. No visualizer dependencies are required.

## Editing and validation

The HTML sources use only elements supported by the current rich-text editor and student sanitizer: headings, paragraphs, emphasis, lists, quotes, and code blocks. They contain no scripts, inline styling, tables, or external media. These same notes remain editable through the admin Notes interface after import.

After editing a source, regenerate the SQL and run the offline checks from the repository root:

```bash
python3 backend/content/searching-algorithms/build_sql.py
python3 backend/content/searching-algorithms/test_content.py
```

Tests execute the embedded Python examples, compare small-input searches against reference/brute-force answers, check HTML and metadata, and compile/run the Java examples when a JDK is available. They do not connect to any database. SQL import still needs verification on the target MySQL instance; offline tests do not certify a live import.
