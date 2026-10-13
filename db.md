# Schema: unlearnarc
Database: mysql
Tables: 15
Columns are NOT NULL unless marked nullable.

## user
id: uuid PK
name: char
email: char
region: char
rank: bigint
points: bigint

## course
id: uuid PK FK
name: varchar
img_url: bigint
total_time: time
topics_count: int
qus_pool: uuid
level: enum

## topic
id: uuid PK
name: char
time: time
topic_order: bigint
level: enum
course_id: uuid FK

## study_material
id: uuid PK
type: enum
topic_id: uuid FK
url: multilinestring

## qus_pool
id: uuid PK
level: enum
type: enum
course_id: uuid FK
topic_id: uuid FK

## question
id: uuid PK
question: mediumtext
level: enum
points: bigint
qus_pool: uuid FK
explanation: longtext

## answer
id: uuid PK
value: mediumtext
is_correct: boolean
qus_id: uuid FK

## enrolled_courses
id: uuid PK
user_id: uuid FK
course_id: uuid FK

## Domain
id: uuid PK
name: text

## Skill
id: uuid PK
name: text
level: enum

## domain_skill_mapping
id: uuid PK
domain_id: uuid FK
skill_id: uuid FK

## user_domain_mapping
id: uuid PK
user_id: uuid FK
domain_id: uuid FK

## skill_course_mapping
id: uuid PK
skill_id: uuid FK
course_id: uuid

## user_test_attempts
id: uuid PK
user_id: uuid FK
test_id: uuid

## test_result
id: uuid PK FK
entity_type: enum
entity_id: uuid
total_qus: int
points: int
is_improvement_needed: boolean

## Relationships
course.id → topic.course_id (one-to-many)
topic.id → study_material.topic_id (one-to-many)
qus_pool.id → question.qus_pool (one-to-one)
course.id → qus_pool.course_id (one-to-many)
topic.id → qus_pool.topic_id (one-to-many)
answer.qus_id → question.id (many-to-one)
user.id → enrolled_courses.user_id (one-to-many)
enrolled_courses.course_id → course.id (many-to-one)
Domain.id → domain_skill_mapping.domain_id (one-to-many)
Skill.id → domain_skill_mapping.skill_id (one-to-many)
user.id → user_domain_mapping.user_id (one-to-many)
user_domain_mapping.domain_id → Domain.id (many-to-one)
Skill.id → skill_course_mapping.skill_id (one-to-many)
skill_course_mapping.course_id → course.id (one-to-many)
user_test_attempts.user_id → user.id (many-to-one)
user_test_attempts.test_id → test_result.id (one-to-many)

---
If you suggest changes to this schema, ALSO return them as a DrawSQL patch: one fenced ```json code block, so I can apply them to my diagram. If you are only answering a question, skip the patch.

Patch rules:
- One JSON object with "strategy": "merge"; combine every change into that single patch.
- Reference tables and columns by name. Only include what changes — omit unchanged columns and unused optional fields.
- Column: {"name","type","length","is_primary_key","is_auto_increment","is_nullable","is_unique_key","is_index","is_unsigned","default","enum_values"} — use exact type names for mysql as shown in the schema above.
- Relationship: {"type":"one-to-many","source_table":"users","source_column":"id","target_table":"posts","target_column":"user_id"} — for "one-to-many" the source is the "one" side; for "many-to-one" the source is the "many" (foreign-key) side. Prefer "one-to-many".
- Add "default_type" ("string" | "function" | "number" | "boolean") when a default could be misread — a literal string "CURRENT_TIMESTAMP" or "0" needs "default_type":"string".
- SET columns (MySQL) list their members in "set_values", not "enum_values".
- Index: {"indexes":[{"name":"idx_posts_user_created","type":"index","columns":["user_id","created_at"]}]} on its table — "type" is "index" or "unique"; delete via "deletions".
- Group: {"name":"Billing"}. A group never lists its members — put "parent_name":"Billing" on each table that belongs to it.
- Sticky note: {"sticky_notes":[{"content":"..."}]}.
- Delete via "deletions"; rename via "old_name". Do not include left/top coordinates.

Examples:
Add table: `{"strategy":"merge","tables":[{"name":"posts","comment":"Blog posts","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true},{"name":"user_id","type":"bigint","is_index":true},{"name":"title","type":"varchar","length":255},{"name":"body","type":"text","is_nullable":true},{"name":"created_at","type":"timestamp","is_nullable":true},{"name":"updated_at","type":"timestamp","is_nullable":true}]}]}`
Rename table and column (use old_name only when renaming): `{"strategy":"merge","tables":[{"name":"articles","old_name":"posts","columns":[{"name":"content","old_name":"body"}]}]}`
Delete: `{"strategy":"merge","deletions":{"tables":["tmp"],"columns":[{"table":"users","columns":["legacy"]}],"relationships":[{"source_table":"users","source_column":"id","target_table":"posts","target_column":"user_id"}]}}`
Multiple groups with nested tables (every table sets parent_name): `{"strategy":"merge","groups":[{"name":"Auth"},{"name":"Content"}],"tables":[{"name":"users","parent_name":"Auth","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true}]},{"name":"roles","parent_name":"Auth","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true}]},{"name":"posts","parent_name":"Content","columns":[{"name":"id","type":"bigint","is_primary_key":true,"is_auto_increment":true}]}]}`
