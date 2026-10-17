# Learner domains and shared skills

`backend/seed_learning_domains.py` adds 16 practical software-learning domains and their shared skills through the existing authenticated admin APIs. No database schema or visualizer changes are required: domains and skills belong to the learning catalog, not algorithm playback.

## Suggested progression

1. **Start:** Computer & Programming Foundations. Practice the command line, Git, debugging, Python, and small tested programs.
2. **Core:** Data Structures & Algorithms and Databases & SQL. Practice complexity, common data structures, queries, and data modeling.
3. **Choose a path:** Frontend, Backend, Full Stack, Mobile, Data Analytics, Data Science, or Data Engineering.
4. **Build production skills:** Software Testing & QA, DevOps, Cloud Computing, and Cybersecurity.
5. **Specialize:** AI & Machine Learning or Software Architecture & System Design after the relevant foundations.

These are curated useful skills, not a verified job-market ranking. Learners do not need every domain or every cloud/framework: select one path and build a small project first.

Skill levels represent a recommended entry level for a subject, not learner mastery or completion. Skills are shared across domains. Existing skills and their levels, courses, IDs, and mappings are preserved. If the same name exists at multiple levels, the recommended level is preferred; otherwise an existing record is reused deterministically. Existing unrelated content remains unchanged.

## Run from `backend/`

```sh
python3 seed_learning_domains.py --check
python3 -m unittest test_seed_learning_domains.py -v
python3 seed_learning_domains.py
```

The default target is the local backend at `http://localhost:8085`. `BASE`, `ADMIN_EMAIL`, and `ADMIN_PASS` follow existing local seed conventions. Non-local targets are rejected to prevent accidental remote writes. Credentials and tokens are not printed.

The seed verifies saved mappings and can be rerun safely; subsequent runs should report zero creations. Writes are additive and individually committed by the API, so an interrupted run can be resumed by rerunning. It creates catalog entries and associations only, not courses, lessons, roadmaps, or claims of learner proficiency. The descriptions and progression above are authoring guidance; the current domain/skill API stores names and skill levels, not descriptions or prerequisite ordering.
