#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_roadmaps.sh
# Populates the Role-based Roadmap feature end-to-end so it can be verified in the
# UI immediately:
#
#   1. Ensures every Skill has at least one Course mapped (skill_course_mapping),
#      so roadmap stages actually contain courses (not empty skills).
#   2. Creates sample Roles and wires their Role→Domain and Role→Skill mappings.
#   3. Verifies each role's generated roadmap via GET /roadmap/role/{id} and
#      prints a human-readable summary (stages / skills / courses).
#
# Fully idempotent — matches by name, skips existing mappings, safe to re-run.
#
# Usage:
#   cd backend && ./seed_roadmaps.sh
#   BASE=http://localhost:8085 ADMIN_EMAIL=... ADMIN_PASS=... ./seed_roadmaps.sh
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
PY() { python3 -c "$1"; }

# ── 1. Admin login ─────────────────────────────────────────────────────────────
hdr "Admin login"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | PY "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null || true)
[ -n "${TOKEN:-}" ] || { fail "Admin login failed"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
pass "Logged in as $ADMIN_EMAIL"

# ── Helpers ────────────────────────────────────────────────────────────────────

# GET a collection, return list of "id<TAB>name" lines.
list_id_name() {
  curl -s "$BASE/api/v1/$1" -H "$AUTH" \
    | PY "import sys,json;[print(d['id']+'\t'+d.get('name','')) for d in json.load(sys.stdin)['data']]"
}

# Find id by exact name within a collection path. Echoes id or empty.
find_id_by_name() {
  local path="$1" name="$2"
  curl -s "$BASE/api/v1/$path" -H "$AUTH" \
    | NAME="$name" PY "import os,sys,json;n=os.environ['NAME'];print(next((d['id'] for d in json.load(sys.stdin)['data'] if d.get('name')==n),''))"
}

# Ensure a skill→course mapping exists (idempotent; ignores 'already' errors).
ensure_skill_course() {
  local skillId="$1" courseId="$2" label="$3"
  # Already mapped?
  local existing
  existing=$(curl -s "$BASE/api/v1/skill-course-mappings/skill/$skillId" -H "$AUTH" \
    | CID="$courseId" PY "import os,sys,json;c=os.environ['CID'];print(next((m['id'] for m in json.load(sys.stdin)['data'] if m.get('courseId')==c),''))")
  if [ -n "$existing" ]; then info "skill↔course already mapped: $label"; return 0; fi
  local resp
  resp=$(curl -s -X POST "$BASE/api/v1/skill-course-mappings" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"skillId\":\"$skillId\",\"courseId\":\"$courseId\"}")
  if echo "$resp" | grep -q '"success":true'; then pass "Mapped skill↔course: $label"
  elif echo "$resp" | grep -qi 'already'; then info "skill↔course already mapped: $label"
  else info "map note ($label): $(echo "$resp" | head -c 160)"; fi
}

# Ensure a role exists by name; echo its id.
ensure_role() {
  local name="$1" desc="$2"
  local existing; existing=$(find_id_by_name "roles" "$name")
  if [ -n "$existing" ]; then info "Role '$name' exists ($existing) — reusing" >&2; echo "$existing"; return 0; fi
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/roles" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$name\",\"description\":\"$desc\"}")
  local id; id=$(echo "$resp" | PY "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || true)
  [ -n "${id:-}" ] || { fail "Role create failed: $name"; echo "$resp" >&2; exit 1; }
  pass "Created role '$name' ($id)" >&2
  echo "$id"
}

role_add_domain() {
  local roleId="$1" domainId="$2" label="$3"
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/roles/domains" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"roleId\":\"$roleId\",\"domainId\":\"$domainId\"}")
  echo "$resp" | grep -q '"success":true' && pass "role↔domain: $label" || info "role↔domain note ($label): $(echo "$resp" | head -c 120)"
}

role_add_skill() {
  local roleId="$1" skillId="$2" label="$3"
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/roles/skills" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"roleId\":\"$roleId\",\"skillId\":\"$skillId\"}")
  echo "$resp" | grep -q '"success":true' && pass "role↔skill: $label" || info "role↔skill note ($label): $(echo "$resp" | head -c 120)"
}

# ── 2. Resolve existing entities ────────────────────────────────────────────────
hdr "Resolving entities"
SKILLS_RAW=$(list_id_name "skills")
COURSES_RAW=$(list_id_name "courses")
DOMAINS_RAW=$(list_id_name "domains")
echo "Skills:";  echo "$SKILLS_RAW"  | sed 's/^/   /'
echo "Courses:"; echo "$COURSES_RAW" | sed 's/^/   /'
echo "Domains:"; echo "$DOMAINS_RAW" | sed 's/^/   /'

col1() { echo "$1" | awk -F'\t' 'NR=='"$2"'{print $1}'; }

SKILL_COUNT=$(echo "$SKILLS_RAW"  | grep -c . || true)
COURSE_COUNT=$(echo "$COURSES_RAW" | grep -c . || true)
DOMAIN_COUNT=$(echo "$DOMAINS_RAW" | grep -c . || true)
[ "$SKILL_COUNT"  -ge 1 ] || { fail "Need at least 1 skill";  exit 1; }
[ "$COURSE_COUNT" -ge 1 ] || { fail "Need at least 1 course"; exit 1; }
[ "$DOMAIN_COUNT" -ge 1 ] || { fail "Need at least 1 domain"; exit 1; }

# ── 3. Ensure every skill has ≥1 course mapped (round-robin over courses) ────────
hdr "Ensuring skill→course mappings (so roadmap stages have courses)"
i=1
while IFS=$'\t' read -r sId sName; do
  [ -n "$sId" ] || continue
  # round-robin a course to this skill
  cIdx=$(( (i - 1) % COURSE_COUNT + 1 ))
  cLine=$(echo "$COURSES_RAW" | sed -n "${cIdx}p")
  cId=$(echo "$cLine" | awk -F'\t' '{print $1}')
  cName=$(echo "$cLine" | awk -F'\t' '{print $2}')
  ensure_skill_course "$sId" "$cId" "$sName → $cName"
  # If there are extra courses, also map the next one to the first skill so a
  # single skill can demonstrate multiple courses in a stage.
  if [ "$i" -eq 1 ] && [ "$COURSE_COUNT" -ge 2 ]; then
    c2=$(echo "$COURSES_RAW" | sed -n "2p")
    c2Id=$(echo "$c2" | awk -F'\t' '{print $1}')
    c2Name=$(echo "$c2" | awk -F'\t' '{print $2}')
    [ "$c2Id" != "$cId" ] && ensure_skill_course "$sId" "$c2Id" "$sName → $c2Name"
  fi
  i=$((i+1))
done <<< "$SKILLS_RAW"

# ── 4. Create sample roles + mappings ───────────────────────────────────────────
hdr "Creating sample roles & mappings"

# Grab concrete ids we'll reuse.
FIRST_DOMAIN_ID=$(col1 "$DOMAINS_RAW" 1)
FIRST_DOMAIN_NAME=$(echo "$DOMAINS_RAW" | sed -n '1p' | awk -F'\t' '{print $2}')
FIRST_SKILL_ID=$(col1 "$SKILLS_RAW" 1)
FIRST_SKILL_NAME=$(echo "$SKILLS_RAW" | sed -n '1p' | awk -F'\t' '{print $2}')

# Role A — domain-driven: inherits all skills of the first domain.
ROLE_A=$(ensure_role "Backend Developer" "Builds and maintains server-side applications, APIs and databases.")
role_add_domain "$ROLE_A" "$FIRST_DOMAIN_ID" "Backend Developer ← $FIRST_DOMAIN_NAME"

# Role B — skill-driven: a single hand-picked skill, no domain.
ROLE_B=$(ensure_role "Frontend Developer" "Crafts user-facing interfaces and client-side logic.")
role_add_skill "$ROLE_B" "$FIRST_SKILL_ID" "Frontend Developer ← $FIRST_SKILL_NAME"

# Role C — hybrid: a domain PLUS an extra direct skill (covers both paths).
ROLE_C=$(ensure_role "Full-Stack Engineer" "Works across the stack — frontend, backend and everything between.")
role_add_domain "$ROLE_C" "$FIRST_DOMAIN_ID" "Full-Stack ← $FIRST_DOMAIN_NAME"
# add a second domain as a direct skill if a second skill exists
SECOND_SKILL_ID=$(col1 "$SKILLS_RAW" 2 || true)
SECOND_SKILL_NAME=$(echo "$SKILLS_RAW" | sed -n '2p' | awk -F'\t' '{print $2}')
if [ -n "${SECOND_SKILL_ID:-}" ]; then
  role_add_skill "$ROLE_C" "$SECOND_SKILL_ID" "Full-Stack ← $SECOND_SKILL_NAME (direct)"
fi

# ── 5. Verify generated roadmaps ────────────────────────────────────────────────
hdr "Verifying generated roadmaps"
verify_roadmap() {
  local roleId="$1" label="$2"
  local resp; resp=$(curl -s "$BASE/api/v1/roadmap/role/$roleId" -H "$AUTH")
  echo "$resp" | PY "
import sys,json
d=json.load(sys.stdin)
if not d.get('success'):
    print('   ❌ failed:', str(d)[:200]); sys.exit(0)
r=d['data']
print(f\"   role: {r['roleName']}  |  {r['totalSkills']} skills, {r['totalCourses']} courses, {r['progressPercent']}% done\")
if not r['stages']:
    print('   ⚠️  no stages (no skills/courses resolved)')
for st in r['stages']:
    print(f\"     stage {st['order']+1} [{st['level']}]\")
    for sk in st['skills']:
        cs=', '.join(c['courseName'] for c in sk['courses']) or '(no courses)'
        print(f\"        - {sk['skillName']}: {cs}\")
"
}
echo "Backend Developer:";  verify_roadmap "$ROLE_A" "Backend Developer"
echo "Frontend Developer:"; verify_roadmap "$ROLE_B" "Frontend Developer"
echo "Full-Stack Engineer:"; verify_roadmap "$ROLE_C" "Full-Stack Engineer"

echo ""
pass "Roadmap seed complete. Open the admin → 'Roles & Roadmaps' and the student → 'Roadmap' to verify."
