#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_extras.sh
# ------------------------------------------------------------------------------
# Follow-on to seed_master.sh. Fills the gaps that were still empty/thin:
#
#   1. QUESTIONS in empty pools   → API (POST /questions/bulk, ADMIN).
#                                   Any pool with 0 active questions is stocked to
#                                   match its own easy/medium/hard counts.
#   2. NEW COURSES                → API (POST /courses, ADMIN).
#   3. NEW ROADMAPS (roles)       → API (POST /roles + role↔domain / role↔skill).
#                                   Roadmaps are GENERATED from a role's mappings.
#   4. INTERVIEW EXPERIENCES      → SQL. The create endpoint is student-OAuth
#                                   gated (resolves author by JWT email), so these
#                                   are inserted directly, attributed to seeded
#                                   users and pre-verified so they show publicly.
#
# HYBRID, exactly per the house rule:
#   • Admin-API-reachable things  → API.
#   • Student-OAuth / signed-flow things → SQL, written to the live schema.
#
# Fully idempotent: questions only added to EMPTY pools; courses/roles reused by
# name; interviews use deterministic uuid5 ids with INSERT … WHERE NOT EXISTS.
#
# Usage:
#   cd backend && ./seed_extras.sh
#   BASE=... DB_HOST=... DB_USER=... DB_PASS=... ADMIN_EMAIL=... ADMIN_PASS=... ./seed_extras.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
BASE="${BASE:-http://localhost:8085}"
ADMIN_EMAIL="${ADMIN_EMAIL:-unlearnarc@gmail.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-unlearnarc}"
DB_USER="${DB_USER:-unlearnarc}"
DB_PASS="${DB_PASS:-unlearnarc123}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
hdr()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
PY()   { python3 -c "$1"; }

export MYSQL_PWD="$DB_PASS"
MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" --batch --skip-column-names)
sql()     { "${MYSQL[@]}" -e "$1"; }
sql_one() { "${MYSQL[@]}" -e "$1" | head -n1; }
esc()     { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/''/g"; }

# ── Pre-flight ─────────────────────────────────────────────────────────────────
hdr "Pre-flight"
command -v mysql >/dev/null || { fail "mysql client missing"; exit 1; }
command -v curl  >/dev/null || { fail "curl missing"; exit 1; }
command -v python3 >/dev/null || { fail "python3 missing"; exit 1; }
sql "SELECT 1" >/dev/null 2>&1 || { fail "Cannot reach MySQL $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"; exit 1; }
pass "MySQL reachable"

hdr "Admin login"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null || true)
TOKEN=$(echo "$LOGIN" | PY "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null || true)
[ -n "${TOKEN:-}" ] || { fail "Admin login failed — backend running on $BASE?"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
pass "Logged in as $ADMIN_EMAIL"

# ══════════════════════════════════════════════════════════════════════════════
# 1. STOCK EMPTY QUESTION POOLS (API)
# ══════════════════════════════════════════════════════════════════════════════
# A bank of reusable Q&A keyed by difficulty. The pool only needs *enough* of each
# difficulty to satisfy generate(); we post exactly easy/medium/hard counts.
hdr "Stocking empty question pools (API)"

# bulk-post an inline question JSON array (already carrying poolId) on stdin.
bulk_questions() {
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/questions/bulk" \
    -H "Content-Type: application/json" -H "$AUTH" -d @-)
  local n; n=$(echo "$resp" | PY "import sys,json;d=json.load(sys.stdin);print(len(d['data']) if d.get('success') else -1)" 2>/dev/null || echo -1)
  if [ "$n" -ge 0 ]; then pass "  inserted $n question(s)"; else fail "  bulk insert failed: $(echo "$resp" | head -c 200)"; fi
}

# Build the full question array for a pool (easy+medium+hard) via the Python
# helper file (keeps apostrophes/parentheses out of the shell).
# args: poolId easy medium hard label
HELPER="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.seed_questions.py"

# Find pools with 0 active questions, plus their difficulty requirements.
EMPTY_POOLS=()
while IFS=$'\t' read -r pid pname e m h; do
  [ -n "$pid" ] && EMPTY_POOLS+=("$pid|$pname|$e|$m|$h")
done < <(sql "
  SELECT qp.id, qp.name, qp.easy_count, qp.medium_count, qp.hard_count
  FROM question_pool qp
  WHERE (SELECT COUNT(*) FROM question q WHERE q.pool_id=qp.id AND q.is_active) = 0;")

if [ "${#EMPTY_POOLS[@]}" -eq 0 ]; then
  info "No empty pools — every pool already has questions."
else
  for row in "${EMPTY_POOLS[@]}"; do
    IFS='|' read -r pid pname e m h <<< "$row"
    # minimum 1 of each so generate() never starves; honour the pool's own counts
    e=${e:-0}; m=${m:-0}; h=${h:-0}
    [ "$e" -lt 1 ] && e=1; [ "$m" -lt 1 ] && m=1; [ "$h" -lt 1 ] && h=1
    info "Stocking '$pname' ($pid): ${e}E / ${m}M / ${h}H"
    label=$(printf "%s" "$pname" | cut -c1-24)
    python3 "$HELPER" "$pid" "$e" "$m" "$h" "$label" | bulk_questions
  done
fi

# ══════════════════════════════════════════════════════════════════════════════
# 2. NEW COURSES (API)
# ══════════════════════════════════════════════════════════════════════════════
hdr "Creating new courses (API)"

find_course_by_name() {
  curl -s "$BASE/api/v1/courses" -H "$AUTH" \
    | NAME="$1" PY "import os,sys,json;n=os.environ['NAME'];print(next((c['id'] for c in json.load(sys.stdin)['data'] if c.get('name')==n),''))"
}

# name | imgUrl(Long) | totalTime(HH:MM:SS) | topicsCount | level
COURSES=(
  "Data Structures & Algorithms|1|12:00:00|12|INTERMEDIATE"
  "System Design Fundamentals|2|08:30:00|8|ADVANCED"
  "React From Zero to Pro|3|10:00:00|10|BEGINNER"
  "Python for Data Science|4|09:00:00|9|INTERMEDIATE"
  "Docker & Kubernetes in Practice|5|07:30:00|7|ADVANCED"
  "SQL Mastery|6|06:00:00|6|BEGINNER"
)

for row in "${COURSES[@]}"; do
  IFS='|' read -r cname cimg ctime ctopics clevel <<< "$row"
  existing=$(find_course_by_name "$cname")
  if [ -n "$existing" ]; then info "Course '$cname' exists ($existing) — reusing"; continue; fi
  resp=$(curl -s -X POST "$BASE/api/v1/courses" -H "Content-Type: application/json" -H "$AUTH" -d @- <<EOF
{ "name":"$cname","imgUrl":$cimg,"totalTime":"$ctime","topicsCount":$ctopics,"level":"$clevel" }
EOF
)
  cid=$(echo "$resp" | PY "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || true)
  if [ -n "${cid:-}" ]; then pass "Created course '$cname' ($cid)"; else fail "Course create failed '$cname': $(echo "$resp" | head -c 160)"; fi
done

# ══════════════════════════════════════════════════════════════════════════════
# 3. NEW ROADMAPS — roles + mappings (API)
# ══════════════════════════════════════════════════════════════════════════════
# A roadmap is GENERATED from a role's domain/skill mappings, so "new roadmap" =
# new role + wiring. We resolve skill/domain ids by name from the live catalog.
hdr "Creating new roadmaps (roles + mappings, API)"

find_id_by_name() {  # path name → id
  curl -s "$BASE/api/v1/$1" -H "$AUTH" \
    | NAME="$2" PY "import os,sys,json;n=os.environ['NAME'];print(next((d['id'] for d in json.load(sys.stdin)['data'] if d.get('name')==n),''))"
}

ensure_role() {  # name desc → id
  local existing; existing=$(find_id_by_name "roles" "$1")
  if [ -n "$existing" ]; then info "Role '$1' exists ($existing) — reusing" >&2; echo "$existing"; return 0; fi
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/roles" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$1\",\"description\":\"$2\"}")
  local id; id=$(echo "$resp" | PY "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || true)
  [ -n "${id:-}" ] || { fail "Role create failed: $1"; echo "$resp" >&2; return 1; }
  pass "Created role '$1' ($id)" >&2; echo "$id"
}

role_add_domain() {  # roleId domainId label
  [ -n "$2" ] || { info "skip role↔domain ($3): domain not found"; return 0; }
  local r; r=$(curl -s -X POST "$BASE/api/v1/roles/domains" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"roleId\":\"$1\",\"domainId\":\"$2\"}")
  echo "$r" | grep -q '"success":true' && pass "  role↔domain: $3" || info "  role↔domain note ($3): $(echo "$r" | head -c 100)"
}
role_add_skill() {  # roleId skillId label
  [ -n "$2" ] || { info "skip role↔skill ($3): skill not found"; return 0; }
  local r; r=$(curl -s -X POST "$BASE/api/v1/roles/skills" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"roleId\":\"$1\",\"skillId\":\"$2\"}")
  echo "$r" | grep -q '"success":true' && pass "  role↔skill: $3" || info "  role↔skill note ($3): $(echo "$r" | head -c 100)"
}

# Resolve the skill/domain ids we want to wire (by name; empty if absent).
D_DATA=$(find_id_by_name domains "Data Science")
D_CLOUD=$(find_id_by_name domains "Cloud Computing")
D_DEVOPS=$(find_id_by_name domains "DevOps")
S_PY=$(find_id_by_name skills "Python")
S_ML=$(find_id_by_name skills "Machine Learning")
S_PANDAS=$(find_id_by_name skills "Pandas")
S_STATS=$(find_id_by_name skills "Statistics")
S_AWS=$(find_id_by_name skills "AWS")
S_DOCKER=$(find_id_by_name skills "Docker")
S_K8S=$(find_id_by_name skills "Kubernetes")
S_CICD=$(find_id_by_name skills "CI/CD")
S_TF=$(find_id_by_name skills "Terraform")

# Roadmap A — Data Scientist (domain-driven + hand-picked skills)
R_DS=$(ensure_role "Data Scientist" "Analyses data, builds models and communicates insights.")
if [ -n "${R_DS:-}" ]; then
  role_add_domain "$R_DS" "$D_DATA" "Data Scientist ← Data Science"
  role_add_skill  "$R_DS" "$S_PY"     "Data Scientist ← Python"
  role_add_skill  "$R_DS" "$S_ML"     "Data Scientist ← Machine Learning"
  role_add_skill  "$R_DS" "$S_PANDAS" "Data Scientist ← Pandas"
  role_add_skill  "$R_DS" "$S_STATS"  "Data Scientist ← Statistics"
fi

# Roadmap B — DevOps Engineer (domain + infra skills)
R_DO=$(ensure_role "DevOps Engineer" "Automates build, deploy and operate pipelines; owns reliability.")
if [ -n "${R_DO:-}" ]; then
  role_add_domain "$R_DO" "$D_DEVOPS" "DevOps Engineer ← DevOps"
  role_add_skill  "$R_DO" "$S_DOCKER" "DevOps Engineer ← Docker"
  role_add_skill  "$R_DO" "$S_K8S"    "DevOps Engineer ← Kubernetes"
  role_add_skill  "$R_DO" "$S_CICD"   "DevOps Engineer ← CI/CD"
  role_add_skill  "$R_DO" "$S_TF"     "DevOps Engineer ← Terraform"
fi

# Roadmap C — Cloud Engineer (domain + cloud skills)
R_CL=$(ensure_role "Cloud Engineer" "Designs and runs scalable, secure cloud infrastructure.")
if [ -n "${R_CL:-}" ]; then
  role_add_domain "$R_CL" "$D_CLOUD" "Cloud Engineer ← Cloud Computing"
  role_add_skill  "$R_CL" "$S_AWS"   "Cloud Engineer ← AWS"
  role_add_skill  "$R_CL" "$S_DOCKER" "Cloud Engineer ← Docker"
  role_add_skill  "$R_CL" "$S_TF"    "Cloud Engineer ← Terraform"
fi

# Ensure the newly-referenced skills have at least one course mapped, otherwise
# roadmap stages render as skills with "(no courses)". Round-robin over courses.
hdr "Ensuring skill→course mappings for new roadmap skills"
COURSE_IDS=()
while IFS= read -r c; do [ -n "$c" ] && COURSE_IDS+=("$c"); done < <(sql "SELECT id FROM course ORDER BY id;")
ensure_skill_course() {  # skillId courseId label
  [ -n "$1" ] && [ -n "$2" ] || return 0
  local existing; existing=$(curl -s "$BASE/api/v1/skill-course-mappings/skill/$1" -H "$AUTH" \
    | CID="$2" PY "import os,sys,json;c=os.environ['CID'];print(next((m['id'] for m in json.load(sys.stdin).get('data',[]) if m.get('courseId')==c),''))" 2>/dev/null || true)
  [ -n "$existing" ] && { info "  skill↔course already mapped: $3"; return 0; }
  local r; r=$(curl -s -X POST "$BASE/api/v1/skill-course-mappings" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"skillId\":\"$1\",\"courseId\":\"$2\"}")
  echo "$r" | grep -q '"success":true' && pass "  mapped skill↔course: $3" || info "  map note ($3): $(echo "$r" | head -c 100)"
}
if [ "${#COURSE_IDS[@]}" -gt 0 ]; then
  n=${#COURSE_IDS[@]}; idx=0
  for sk in "$S_PY" "$S_ML" "$S_PANDAS" "$S_STATS" "$S_AWS" "$S_DOCKER" "$S_K8S" "$S_CICD" "$S_TF"; do
    [ -n "$sk" ] || continue
    cid="${COURSE_IDS[$(( idx % n ))]}"
    ensure_skill_course "$sk" "$cid" "skill→course"
    idx=$((idx+1))
  done
else
  info "No courses to map — skipping"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 4. INTERVIEW EXPERIENCES (SQL — student-OAuth gated endpoint)
# ══════════════════════════════════════════════════════════════════════════════
hdr "Simulating interview experiences (SQL)"

# Pick real users to attribute stories to (prefer our seeded sample learners).
USER_ROWS=()
while IFS=$'\t' read -r uid uname; do
  [ -n "$uid" ] && USER_ROWS+=("$uid|$uname")
done < <(sql "SELECT id, name FROM \`user\` WHERE auth_provider='LOCAL' ORDER BY points DESC LIMIT 8;")
# fallback: any users
if [ "${#USER_ROWS[@]}" -eq 0 ]; then
  while IFS=$'\t' read -r uid uname; do
    [ -n "$uid" ] && USER_ROWS+=("$uid|$uname")
  done < <(sql "SELECT id, name FROM \`user\` ORDER BY created_at LIMIT 8;")
fi

if [ "${#USER_ROWS[@]}" -eq 0 ]; then
  info "No users exist — run seed_master.sh first to create sample users."
else
  # Admin id for the verified_by column.
  ADMIN_ID=$(sql_one "SELECT id FROM \`user\` WHERE email='$(esc "$ADMIN_EMAIL")' LIMIT 1;")
  [ -n "${ADMIN_ID:-}" ] || ADMIN_ID="${USER_ROWS[0]%%|*}"

  # company | city | role | passed(1/0) | story
  EXPERIENCES=(
    "Google|Bangalore|Software Engineer|1|Applied through a referral. Round 1 was two DSA problems (a sliding-window substring question and a graph BFS). Round 2 was system design — design a URL shortener, they probed on hashing collisions and read/write scaling. The behavioural round focused on ownership stories. Tip: narrate your thought process out loud and always state time/space complexity before coding."
    "Amazon|Hyderabad|SDE-1|1|Five rounds, all anchored on the Leadership Principles. Two coding rounds (a DP coin-change variant and a BST validation), one LP-heavy behavioural, one low-level design (design a parking lot), and a bar-raiser. The bar-raiser dug into a time I disagreed with a teammate. Prepare 6-8 STAR stories mapped to the LPs."
    "Microsoft|Noida|Software Engineer II|0|Got to the final loop but missed the offer. Coding rounds were fair (a matrix island-count and a linked-list reversal). Where I slipped was the design round — I jumped to a solution without clarifying requirements. Lesson learned: spend the first 5 minutes on requirements and constraints before designing anything."
    "Flipkart|Bangalore|SDE-2|1|Machine coding round was the differentiator — build an in-memory Splitwise in 90 minutes with clean OOP and tests. Then a DSA round (two-pointer + heap) and a hiring-manager round on past projects. They valued extensible design and unit tests over finishing every feature."
    "Atlassian|Remote|Full-Stack Engineer|1|Loved their process. One round was a React take-home extended into a live pairing session (add a feature + handle an edge case live). Backend round was API design for a comments service with pagination. Values round was genuinely conversational. Be ready to reason about front-end state management trade-offs."
    "Stripe|Remote|Backend Engineer|0|Very practical interviews — an integration round where you build against a real API and handle retries/idempotency, plus a debugging round in an unfamiliar codebase. I underestimated the debugging round; practise reading large codebases quickly and writing tests to isolate bugs."
    "Zoho|Chennai|Member Technical Staff|1|Written aptitude + programming test to start, then a technical interview on core CS (OS scheduling, DBMS normalisation, a SQL join query) and a coding problem (string compression). Final HR round. Strong fundamentals matter more here than exotic algorithms."
    "Uber|Bangalore|Software Engineer|1|Two DSA rounds (a Dijkstra shortest-path variant and an LRU cache implementation), one system design (design a ride-matching service — focus on geospatial indexing and surge pricing), and a hiring-manager chat. For design, discuss data partitioning and how you'd handle hot regions."
  )

  made=0
  i=0
  for exp in "${EXPERIENCES[@]}"; do
    IFS='|' read -r company city role passed story <<< "$exp"
    # round-robin an author
    urow="${USER_ROWS[$(( i % ${#USER_ROWS[@]} ))]}"
    uid="${urow%%|*}"
    # deterministic id so re-runs don't duplicate
    ie_id=$(ARG="$company$role$uid" PY "import os,uuid;print(uuid.uuid5(uuid.NAMESPACE_DNS,'ie:'+os.environ['ARG']))")
    e_company=$(esc "$company"); e_city=$(esc "$city"); e_role=$(esc "$role"); e_story=$(esc "$story")
    passed_bit=$([ "$passed" = "1" ] && echo "b'1'" || echo "b'0'")

    sql "INSERT INTO interview_experience
          (id, user_id, is_passed, company, city, role, experience,
           is_verified, verified_by, created_at, updated_at)
         SELECT '$ie_id','$uid',$passed_bit,'$e_company','$e_city','$e_role','$e_story',
           b'1','$ADMIN_ID', NOW() - INTERVAL $((i+1)) DAY, NOW()
         FROM DUAL
         WHERE NOT EXISTS (SELECT 1 FROM interview_experience WHERE id='$ie_id');"
    made=$((made+1))
    i=$((i+1))
  done
  TOTAL_IE=$(sql_one "SELECT COUNT(*) FROM interview_experience;")
  VERIFIED_IE=$(sql_one "SELECT COUNT(*) FROM interview_experience WHERE is_verified=b'1';")
  pass "Interview experiences present: $TOTAL_IE total, $VERIFIED_IE verified (public)"
fi

# ══════════════════════════════════════════════════════════════════════════════
# 5. VERIFICATION
# ══════════════════════════════════════════════════════════════════════════════
hdr "Verification summary"
printf "  %-26s %s\n" "courses"              "$(sql_one "SELECT COUNT(*) FROM course;")"
printf "  %-26s %s\n" "roles (roadmaps)"     "$(sql_one "SELECT COUNT(*) FROM role;")"
printf "  %-26s %s\n" "question_pool"        "$(sql_one "SELECT COUNT(*) FROM question_pool;")"
printf "  %-26s %s\n" "questions (active)"   "$(sql_one "SELECT COUNT(*) FROM question WHERE is_active;")"
printf "  %-26s %s\n" "pools still empty"    "$(sql_one "SELECT COUNT(*) FROM question_pool qp WHERE (SELECT COUNT(*) FROM question q WHERE q.pool_id=qp.id AND q.is_active)=0;")"
printf "  %-26s %s\n" "interview_experience" "$(sql_one "SELECT COUNT(*) FROM interview_experience;")"

echo ""
info "Pools (name → active questions):"
sql "SELECT qp.name, (SELECT COUNT(*) FROM question q WHERE q.pool_id=qp.id AND q.is_active)
     FROM question_pool qp ORDER BY qp.name;" \
  | awk -F'\t' '{printf "   %-36s %s\n",$1,$2}'

echo ""
info "Verified interview experiences:"
sql "SELECT company, role, CASE WHEN is_passed THEN 'PASSED' ELSE 'rejected' END
     FROM interview_experience WHERE is_verified=b'1' ORDER BY created_at DESC;" \
  | awk -F'\t' '{printf "   %-14s %-26s %s\n",$1,$2,$3}'

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Extras seeded ✅  questions + courses + roadmaps (API), interviews (SQL)${NC}"
echo -e "${GREEN}  Student app → Tests (pools now generate), Courses, Roadmap, Interview Experiences${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
