# Fundamental of Computer Science — incremental content

This content pack adds **Topic 1: Introduction to Computers** through the existing REST API. It does not run the destructive `seed_cs_fundamentals.sh` script, access SQL, delete catalog data, create users, or overwrite existing lessons/questions.

## Included content

- One beginner course, initially one hour with one topic. Future modules can be added in sequence; do not invent missing syllabus requirements.
- One topic containing six ordered, published notes: computer definition and input/processing/output/storage; history and motivation; types; applications; human interfaces and hardware/software; fictional ATM activity and completion self-check.
- Thirty four-option MCQs with explanations, exactly ten per difficulty. Difficulty reflects recall, application, and multi-step reasoning within this beginner syllabus.
- One mapped topic question pool. `totalQuestions: 6` is the **test size**, not the number of stored questions. Each test randomly samples two easy, two medium, and two hard questions.
- One point per question, default 60% pass threshold (four out of six passes), unlimited test time to avoid imposing an unrequested time limit.

## Usage

From the repository root, validate the content without any network requests:

```bash
python3 backend/populate_cs_intro.py
```

Populate the running local backend and verify persisted content:

```bash
python3 backend/populate_cs_intro.py --apply
```

Credentials come from `ADMIN_EMAIL` and `ADMIN_PASSWORD` in the environment or `backend/.env`. They and the JWT are never printed or stored in a report. Never commit `.env`.

To explicitly target a different HTTPS backend, set `--base` to its origin (without `/api/v1`). `--report` optionally writes verified entity IDs to a chosen path.

The loader reuses exact-name course/topic/pool matches and exact-title notes; it adds only missing matching content. Conflicting existing content, occupied topic order, ambiguous duplicates, unrelated pool questions, and alternate topic pools cause a stop rather than silent replacement. Course topic count and duration are synchronized with actual topics, preserving other course fields. Run only one copy at a time: these APIs do not provide server-side idempotency keys, uniqueness guarantees, or a transaction spanning the complete content import.

## Verification and recovery

After saving, the loader reads back all questions, answer keys, explanations, published note text, pool configuration, course counters, and topic mapping. It generates five tests through the topic mapping and checks six distinct questions per test, the 2/2/2 difficulty split, and absence of correct-answer flags. It does not grade tests or create learner attempt history.

An interrupted import can leave partial records because API writes are separate transactions. Rerun after resolving the reported error; matching records are reused and missing questions are reconciled. There are deliberately no automatic POST retries, destructive cleanup, or silent updates to conflicting content.

## Topic 2: Getting Started with a Computer

`02-getting-started-with-a-computer.json` adds the next supplied module at topic order 2, estimated at 90 minutes including practice. It includes seven published notes: physical components and safe startup/shutdown; keyboard and mouse; desktop navigation and accessibility; files and folders; everyday applications, updates, and permissions; browser and web basics; and the **My First Computer Project** activity with troubleshooting and a completion checklist.

Its separate topic pool contains 30 explained MCQs (10 easy, 10 medium, 10 hard), with the same six-question 2/2/2 test configuration. Hard questions combine the taught beginner skills rather than introducing advanced prerequisites. The exercises avoid unauthorized installation, sharing personal information, or deleting existing content.

Validate and apply this module from the repository root:

```bash
python3 backend/populate_cs_intro.py --content backend/content/cs-fundamentals/02-getting-started-with-a-computer.json
python3 backend/populate_cs_intro.py --content backend/content/cs-fundamentals/02-getting-started-with-a-computer.json --apply
```

The default content path still selects Topic 1. `--content` allows future module files with any nonzero number of sequential notes; the 30-question and 2/2/2 checks remain mandatory. Applying Topic 2 to the existing course preserves Topic 1 and updates the course to two topics and 2 hours 30 minutes. Apply supplied modules in order.

## Topics 3 and 4: Hardware; Software and Operating Systems

- `03-hardware-inside-a-computer.json`: topic order 3, 90 minutes, eight published notes covering physical components, CPU, RAM, storage, motherboard/power/GPU/cooling, input/output, component cooperation, and a fictional specification activity with worked reasoning.
- `04-software-and-operating-systems.json`: topic order 4, 90 minutes, seven published notes covering software, OS services, resource management, users and permissions, the application lifecycle, introductory virtualization, and a safe Task Manager/Activity Monitor observation activity.

Each has a separate pool of 30 explained MCQs (10 per difficulty), sampling two easy, two medium, and two hard questions per test. Activities require no disassembly, software installation, permission changes, or process termination. Hardware questions use workload-based reasoning; OS notes distinguish disk activity from free storage capacity.

Apply in order after Topics 1 and 2:

```bash
python3 backend/populate_cs_intro.py --content backend/content/cs-fundamentals/03-hardware-inside-a-computer.json --apply
python3 backend/populate_cs_intro.py --content backend/content/cs-fundamentals/04-software-and-operating-systems.json --apply
```

Omit `--apply` for offline validation. With all four supplied topics saved, the course has four topics and an estimated duration of 5 hours 30 minutes. Existing course metadata is preserved while actual counts and durations are synchronized.

## Continuing the course

Keep each supplied outline as one topic; its sections are lesson notes, not separate topic pools. Each future supplied topic should get its own ordered notes, activity, and topic-mapped 30-question pool with the same test distribution. The importer updates course duration and topic count from actual saved topics when adding modules.
