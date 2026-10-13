#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_tests.sh
# Populates the Test Engine with ready-to-take question pools across all three
# scopes (DOMAIN, COURSE, TOPIC), each fully stocked with EASY/MEDIUM/HARD
# questions so `POST /tests/generate` works with ZERO pool selection — the
# learner just picks a domain/course/topic and the engine auto-resolves the pool.
#
# Idempotent: pools are matched by name; if a pool with the same name already
# exists it is reused (and re-stocked only if it has no active questions), so you
# can run this repeatedly without creating duplicates.
#
# Usage:
#   cd backend && ./seed_tests.sh
#   BASE=http://localhost:8085 ADMIN_EMAIL=... ADMIN_PASS=... ./seed_tests.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="${BASE:-http://localhost:8085}"
ADMIN_EMAIL="${ADMIN_EMAIL:-unlearnarc@gmail.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
hdr()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
jqget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

# ── 1. Admin login ────────────────────────────────────────────────────────────
hdr "Admin login"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | jqget "['data']['accessToken']" 2>/dev/null || true)
[ -n "${TOKEN:-}" ] || { fail "Admin login failed"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
pass "Logged in as $ADMIN_EMAIL"

# ── Helpers ───────────────────────────────────────────────────────────────────

# Find an existing pool id by exact name, else empty.
find_pool_by_name() {
  local name="$1"
  curl -s "$BASE/api/v1/question-pools" -H "$AUTH" \
    | python3 -c "import sys,json;n='$name';print(next((p['id'] for p in json.load(sys.stdin)['data'] if p['name']==n),''))"
}

# Count active questions in a pool.
pool_active_count() {
  local pid="$1"
  curl -s "$BASE/api/v1/questions/pool/$pid" -H "$AUTH" \
    | python3 -c "import sys,json;print(sum(1 for q in json.load(sys.stdin)['data'] if q.get('isActive',True)))" 2>/dev/null || echo 0
}

# Create a pool (or reuse existing by name). Echoes the pool id.
# args: name scope total easy medium hard pass timelimit description
ensure_pool() {
  local name="$1" scope="$2" total="$3" easy="$4" medium="$5" hard="$6" passp="$7" tl="$8" desc="$9"
  local existing; existing=$(find_pool_by_name "$name")
  if [ -n "$existing" ]; then
    info "Pool '$name' already exists ($existing) — reusing" >&2
    echo "$existing"; return 0
  fi
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/question-pools" -H "Content-Type: application/json" -H "$AUTH" -d @- <<EOF
{ "name":"$name","description":"$desc","scopeType":"$scope","totalQuestions":$total,
  "easyCount":$easy,"mediumCount":$medium,"hardCount":$hard,
  "passPercentage":$passp,"timeLimitMinutes":$tl }
EOF
)
  local pid; pid=$(echo "$resp" | jqget "['data']['id']" 2>/dev/null || true)
  [ -n "${pid:-}" ] || { fail "Pool create failed: $name"; echo "$resp" >&2; exit 1; }
  pass "Created pool '$name' ($pid)" >&2
  echo "$pid"
}

# Map a pool to its scope entity (ignores "already mapped" errors).
map_pool() {
  local pid="$1" field="$2" eid="$3"
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/question-pools/map" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"poolId\":\"$pid\",\"$field\":\"$eid\"}")
  if echo "$resp" | grep -q '"success":true'; then
    pass "Mapped pool -> $field=$eid" >&2
  elif echo "$resp" | grep -qi 'already mapped'; then
    info "Pool already mapped to $field=$eid" >&2
  else
    info "Map note: $(echo "$resp" | head -c 160)" >&2
  fi
}

# Bulk-create questions for a pool from an inline JSON array (reads stdin).
# The JSON MUST already contain poolId on every item.
bulk_questions() {
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/questions/bulk" -H "Content-Type: application/json" -H "$AUTH" -d @-)
  local n; n=$(echo "$resp" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['data']) if d.get('success') else -1)" 2>/dev/null || echo -1)
  if [ "$n" -ge 0 ]; then pass "Inserted $n questions" >&2; else fail "Bulk insert failed"; echo "$resp" >&2; exit 1; fi
}

# Stock a pool only if it currently has no active questions. Reads question JSON
# (array, WITHOUT poolId) on stdin and injects poolId before posting.
stock_pool_if_empty() {
  local pid="$1"
  local cnt; cnt=$(pool_active_count "$pid")
  if [ "$cnt" -gt 0 ]; then info "Pool $pid already has $cnt active questions — skipping stock" >&2; cat >/dev/null; return 0; fi
  python3 -c "import sys,json;pid='$pid';d=json.load(sys.stdin);[q.__setitem__('poolId',pid) for q in d];print(json.dumps(d))" | bulk_questions
}

# ── 2. Resolve target entities ────────────────────────────────────────────────
hdr "Resolving entities"
DOMAIN_ID=$(curl -s "$BASE/api/v1/domains" -H "$AUTH" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d[0]['id'] if d else '')")
COURSE_ID=$(curl -s "$BASE/api/v1/courses" -H "$AUTH" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d[0]['id'] if d else '')")
[ -n "$DOMAIN_ID" ] || { fail "No domains exist — create one in the admin app first"; exit 1; }
[ -n "$COURSE_ID" ] || { fail "No courses exist — create one in the admin app first"; exit 1; }
TOPIC_ID=$(curl -s "$BASE/api/v1/topics/course/$COURSE_ID" -H "$AUTH" | python3 -c "import sys,json;d=json.load(sys.stdin)['data'];print(d[0]['id'] if d else '')")
[ -n "$TOPIC_ID" ] || { fail "Course $COURSE_ID has no topics — create one first"; exit 1; }
pass "Domain=$DOMAIN_ID  Course=$COURSE_ID  Topic=$TOPIC_ID"

# ══════════════════════════════════════════════════════════════════════════════
# 3. DOMAIN pool — "Backend Engineering Fundamentals" (9 Q: 3E/3M/3H)
# ══════════════════════════════════════════════════════════════════════════════
hdr "DOMAIN pool"
DPOOL=$(ensure_pool "Backend Engineering Fundamentals" "DOMAIN" 9 3 3 3 60 20 "Core backend knowledge across the whole domain: HTTP, databases, concurrency and system design.")
map_pool "$DPOOL" "domainId" "$DOMAIN_ID"
stock_pool_if_empty "$DPOOL" <<'JSON'
[
 {"questionText":"Which HTTP status code indicates a successful request that created a new resource?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"201 Created is returned when a request succeeds and a new resource is created.","answers":[{"answerText":"200 OK","isCorrect":false},{"answerText":"201 Created","isCorrect":true},{"answerText":"204 No Content","isCorrect":false},{"answerText":"302 Found","isCorrect":false}]},
 {"questionText":"What does the acronym CRUD stand for?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"CRUD = Create, Read, Update, Delete — the four basic persistence operations.","answers":[{"answerText":"Create, Read, Update, Delete","isCorrect":true},{"answerText":"Copy, Run, Undo, Deploy","isCorrect":false},{"answerText":"Connect, Resolve, Update, Drop","isCorrect":false},{"answerText":"Cache, Read, Use, Delete","isCorrect":false}]},
 {"questionText":"Which of these is a stateless protocol?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"HTTP is stateless — each request is independent and carries all needed context.","answers":[{"answerText":"HTTP","isCorrect":true},{"answerText":"FTP control connection","isCorrect":false},{"answerText":"SSH session","isCorrect":false},{"answerText":"Telnet","isCorrect":false}]},
 {"questionText":"Which SQL isolation levels can prevent dirty reads? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":2,"explanation":"READ COMMITTED and above (REPEATABLE READ, SERIALIZABLE) prevent dirty reads; READ UNCOMMITTED does not.","answers":[{"answerText":"READ UNCOMMITTED","isCorrect":false},{"answerText":"READ COMMITTED","isCorrect":true},{"answerText":"REPEATABLE READ","isCorrect":true},{"answerText":"SERIALIZABLE","isCorrect":true}]},
 {"questionText":"What is the primary purpose of a database index?","questionType":"MCQ","difficulty":"MEDIUM","points":2,"explanation":"Indexes speed up read/lookup operations at the cost of extra write overhead and storage.","answers":[{"answerText":"To speed up data retrieval","isCorrect":true},{"answerText":"To compress the table on disk","isCorrect":false},{"answerText":"To enforce foreign keys","isCorrect":false},{"answerText":"To replicate data across nodes","isCorrect":false}]},
 {"questionText":"In REST, which HTTP method is expected to be idempotent AND safe (no side effects)?","questionType":"MCQ","difficulty":"MEDIUM","points":2,"explanation":"GET is both safe (no state change) and idempotent. PUT/DELETE are idempotent but not safe.","answers":[{"answerText":"GET","isCorrect":true},{"answerText":"POST","isCorrect":false},{"answerText":"PATCH","isCorrect":false},{"answerText":"PUT","isCorrect":false}]},
 {"questionText":"Which statements about the CAP theorem are correct? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"explanation":"Under a network partition a distributed system must choose between consistency and availability; you cannot guarantee all three simultaneously during a partition.","answers":[{"answerText":"You can fully guarantee C, A and P simultaneously at all times","isCorrect":false},{"answerText":"During a partition you must trade consistency for availability","isCorrect":true},{"answerText":"CAP stands for Consistency, Availability, Partition tolerance","isCorrect":true},{"answerText":"Partition tolerance is optional for networked systems","isCorrect":false}]},
 {"questionText":"A deadlock between two threads requires which conditions? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"explanation":"The four Coffman conditions: mutual exclusion, hold-and-wait, no preemption, and circular wait.","answers":[{"answerText":"Mutual exclusion","isCorrect":true},{"answerText":"Hold and wait","isCorrect":true},{"answerText":"Circular wait","isCorrect":true},{"answerText":"Unlimited memory","isCorrect":false}]},
 {"questionText":"What problem does an idempotency key primarily solve in a payment API?","questionType":"MCQ","difficulty":"HARD","points":3,"explanation":"It prevents duplicate processing when a client safely retries a request (e.g. after a timeout), so the same operation isn't applied twice.","answers":[{"answerText":"Prevents duplicate charges on client retries","isCorrect":true},{"answerText":"Encrypts the card number in transit","isCorrect":false},{"answerText":"Compresses the request body","isCorrect":false},{"answerText":"Guarantees sub-100ms latency","isCorrect":false}]}
]
JSON

# ══════════════════════════════════════════════════════════════════════════════
# 4. COURSE pool — "Spring Boot Essentials" (9 Q: 3E/3M/3H)
# ══════════════════════════════════════════════════════════════════════════════
hdr "COURSE pool"
CPOOL=$(ensure_pool "Spring Boot Essentials" "COURSE" 9 3 3 3 60 20 "Assesses Spring Boot fundamentals: DI, auto-configuration, REST, data and transactions.")
map_pool "$CPOOL" "courseId" "$COURSE_ID"
stock_pool_if_empty "$CPOOL" <<'JSON'
[
 {"questionText":"Which annotation marks a class as a Spring REST controller returning JSON by default?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"@RestController = @Controller + @ResponseBody, so methods return serialized objects.","answers":[{"answerText":"@RestController","isCorrect":true},{"answerText":"@Service","isCorrect":false},{"answerText":"@Component","isCorrect":false},{"answerText":"@Repository","isCorrect":false}]},
 {"questionText":"What does Spring Boot's @SpringBootApplication combine?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"It bundles @Configuration, @EnableAutoConfiguration and @ComponentScan.","answers":[{"answerText":"@Configuration, @EnableAutoConfiguration, @ComponentScan","isCorrect":true},{"answerText":"@Service, @Repository, @Controller","isCorrect":false},{"answerText":"@Bean, @Autowired, @Value","isCorrect":false},{"answerText":"@Entity, @Table, @Id","isCorrect":false}]},
 {"questionText":"Which file is the conventional place for Spring Boot configuration properties?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"application.properties (or application.yml) on the classpath is read automatically.","answers":[{"answerText":"application.properties","isCorrect":true},{"answerText":"settings.xml","isCorrect":false},{"answerText":"web.xml","isCorrect":false},{"answerText":"beans.cfg","isCorrect":false}]},
 {"questionText":"Which annotations can inject a dependency into a Spring bean? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":2,"explanation":"Constructor injection (implicit since 4.3), @Autowired and JSR-330 @Inject all work; @Bean declares a bean, it doesn't inject one.","answers":[{"answerText":"@Autowired","isCorrect":true},{"answerText":"Constructor injection","isCorrect":true},{"answerText":"@Inject","isCorrect":true},{"answerText":"@Bean","isCorrect":false}]},
 {"questionText":"What is the default bean scope in Spring?","questionType":"MCQ","difficulty":"MEDIUM","points":2,"explanation":"Singleton — one shared instance per Spring container.","answers":[{"answerText":"singleton","isCorrect":true},{"answerText":"prototype","isCorrect":false},{"answerText":"request","isCorrect":false},{"answerText":"session","isCorrect":false}]},
 {"questionText":"Which annotation maps an HTTP PUT request to a controller method?","questionType":"MCQ","difficulty":"MEDIUM","points":2,"explanation":"@PutMapping is the composed shortcut for @RequestMapping(method = PUT).","answers":[{"answerText":"@PutMapping","isCorrect":true},{"answerText":"@PostMapping","isCorrect":false},{"answerText":"@GetMapping","isCorrect":false},{"answerText":"@PatchMapping","isCorrect":false}]},
 {"questionText":"Regarding @Transactional, which statements are correct? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"explanation":"By default it rolls back only on unchecked (runtime) exceptions; self-invocation bypasses the proxy; the default propagation is REQUIRED.","answers":[{"answerText":"By default it rolls back on RuntimeException","isCorrect":true},{"answerText":"Calling a @Transactional method from the same class bypasses the proxy","isCorrect":true},{"answerText":"Its default propagation is REQUIRED","isCorrect":true},{"answerText":"By default it rolls back on checked exceptions too","isCorrect":false}]},
 {"questionText":"How does Spring Boot auto-configuration primarily decide which beans to create?","questionType":"MCQ","difficulty":"HARD","points":3,"explanation":"Conditional annotations (@ConditionalOnClass, @ConditionalOnMissingBean, etc.) evaluate the classpath and existing beans.","answers":[{"answerText":"@Conditional* annotations evaluating the classpath and existing beans","isCorrect":true},{"answerText":"Alphabetical ordering of bean names","isCorrect":false},{"answerText":"Random selection at startup","isCorrect":false},{"answerText":"The order of imports in the main class","isCorrect":false}]},
 {"questionText":"Which conditions can cause a LazyInitializationException with JPA in Spring? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"explanation":"Accessing a LAZY association after the persistence context/session is closed (e.g. in the view layer, outside a transaction) triggers it.","answers":[{"answerText":"Accessing a LAZY association after the transaction has committed","isCorrect":true},{"answerText":"Accessing a LAZY collection in the view layer with no open session","isCorrect":true},{"answerText":"Accessing an EAGER association inside a transaction","isCorrect":false},{"answerText":"Using a JOIN FETCH that loads the association up front","isCorrect":false}]}
]
JSON

# ══════════════════════════════════════════════════════════════════════════════
# 5. TOPIC pool — "REST API Design Quiz" (6 Q: 2E/2M/2H)
# ══════════════════════════════════════════════════════════════════════════════
hdr "TOPIC pool"
TPOOL=$(ensure_pool "REST API Design Quiz" "TOPIC" 6 2 2 2 50 10 "A quick quiz on REST API design: methods, status codes, versioning and idempotency.")
map_pool "$TPOOL" "topicId" "$TOPIC_ID"
stock_pool_if_empty "$TPOOL" <<'JSON'
[
 {"questionText":"Which HTTP method should be used to retrieve a resource without side effects?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"GET is the safe, read-only method for retrieval.","answers":[{"answerText":"GET","isCorrect":true},{"answerText":"DELETE","isCorrect":false},{"answerText":"POST","isCorrect":false},{"answerText":"PUT","isCorrect":false}]},
 {"questionText":"What status code best represents 'resource not found'?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"404 Not Found indicates the requested resource does not exist.","answers":[{"answerText":"404 Not Found","isCorrect":true},{"answerText":"400 Bad Request","isCorrect":false},{"answerText":"500 Internal Server Error","isCorrect":false},{"answerText":"403 Forbidden","isCorrect":false}]},
 {"questionText":"Which of the following are valid REST API versioning strategies? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":2,"explanation":"URI path (/v1/...), custom header, and Accept-header content negotiation are all common versioning strategies.","answers":[{"answerText":"URI path versioning (/v1/users)","isCorrect":true},{"answerText":"Custom request header (API-Version)","isCorrect":true},{"answerText":"Accept-header media type versioning","isCorrect":true},{"answerText":"Changing the TCP port per version","isCorrect":false}]},
 {"questionText":"A PUT request to the same resource with the same body, repeated twice, should result in...","questionType":"MCQ","difficulty":"MEDIUM","points":2,"explanation":"PUT is idempotent — repeating it yields the same resource state as doing it once.","answers":[{"answerText":"The same final state as a single request (idempotent)","isCorrect":true},{"answerText":"Two separate new resources","isCorrect":false},{"answerText":"A 409 Conflict on the second call","isCorrect":false},{"answerText":"A doubled value in the resource","isCorrect":false}]},
 {"questionText":"Which status code is most appropriate when a client sends a syntactically valid request that fails business validation?","questionType":"MCQ","difficulty":"HARD","points":3,"explanation":"422 Unprocessable Entity signals the request was well-formed but semantically invalid; 400 is for malformed syntax.","answers":[{"answerText":"422 Unprocessable Entity","isCorrect":true},{"answerText":"400 Bad Request","isCorrect":false},{"answerText":"200 OK","isCorrect":false},{"answerText":"500 Internal Server Error","isCorrect":false}]},
 {"questionText":"Which practices improve REST API evolvability and backward compatibility? (select all that apply)","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"explanation":"Adding optional fields, tolerant reading, and versioning preserve compatibility; removing/renaming existing response fields breaks clients.","answers":[{"answerText":"Adding new optional fields rather than removing existing ones","isCorrect":true},{"answerText":"Tolerant reader clients that ignore unknown fields","isCorrect":true},{"answerText":"Versioning breaking changes behind /v2","isCorrect":true},{"answerText":"Renaming existing response fields in place","isCorrect":false}]}
]
JSON

# ── 6. Verify all three pools can generate ─────────────────────────────────────
hdr "Verifying generate (auto pool-pick, no poolId)"
verify_generate() {
  local scope="$1" eid="$2" label="$3"
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/tests/generate" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"scopeType\":\"$scope\",\"entityId\":\"$eid\"}")
  local n; n=$(echo "$resp" | python3 -c "import sys,json;d=json.load(sys.stdin);print(len(d['data']['questions']) if d.get('success') else -1)" 2>/dev/null || echo -1)
  if [ "$n" -gt 0 ]; then
    local name; name=$(echo "$resp" | jqget "['data']['poolName']")
    pass "$label → generated $n questions from '$name'"
  else
    fail "$label → generate failed: $(echo "$resp" | head -c 200)"
  fi
}
verify_generate "DOMAIN" "$DOMAIN_ID" "Domain"
verify_generate "COURSE" "$COURSE_ID" "Course"
verify_generate "TOPIC"  "$TOPIC_ID"  "Topic"

echo ""
pass "Seed complete. Learners can now take Domain / Course / Topic tests with no pool selection."
