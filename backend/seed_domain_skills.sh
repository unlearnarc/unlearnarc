#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_domain_skills.sh
# Populates multiple Domains, each with several Skills mapped to it via the
# domain_skill_mapping join table.
#
#   1. Creates (or reuses) each Domain                  POST /api/v1/domains
#   2. Creates (or reuses) each Skill with a level      POST /api/v1/skills
#   3. Wires Domain ↔ Skill                             POST /api/v1/domain-skill-mappings
#
# Fully idempotent — matches by name, skips existing mappings, safe to re-run.
# Honors the UNIQUE(domain_id, skill_id) constraint by checking before POSTing.
#
# Usage:
#   cd backend && ./seed_domain_skills.sh
#   BASE=http://localhost:8085 ADMIN_EMAIL=... ADMIN_PASS=... ./seed_domain_skills.sh
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

# ── Domain → "Skill:LEVEL, Skill:LEVEL, ..." definitions ─────────────────────────
# Level must be one of: BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
#            (matches Skill.SkillLevel enum)
# Edit / extend this block freely to seed your own taxonomy.
DOMAIN_SKILLS=(
  "Backend Development|Java:INTERMEDIATE,Spring Boot:ADVANCED,REST APIs:INTERMEDIATE,SQL:BEGINNER,Microservices:ADVANCED"
  "Frontend Development|HTML:BEGINNER,CSS:BEGINNER,JavaScript:INTERMEDIATE,React:ADVANCED,TypeScript:INTERMEDIATE"
  "Data Science|Python:INTERMEDIATE,Pandas:INTERMEDIATE,Machine Learning:ADVANCED,Statistics:INTERMEDIATE,Data Visualization:BEGINNER"
  "DevOps|Docker:INTERMEDIATE,Kubernetes:ADVANCED,CI/CD:INTERMEDIATE,Linux:BEGINNER,Terraform:ADVANCED"
  "Cloud Computing|AWS:INTERMEDIATE,Azure:INTERMEDIATE,Networking:BEGINNER,Serverless:ADVANCED,Cloud Security:ADVANCED"
)

# ── 1. Admin login ───────────────────────────────────────────────────────────────
hdr "Admin login"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | PY "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null || true)
[ -n "${TOKEN:-}" ] || { fail "Admin login failed"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
pass "Logged in as $ADMIN_EMAIL"

# ── Helpers ──────────────────────────────────────────────────────────────────────

# Find id by exact name within a collection path. Echoes id or empty.
find_id_by_name() {
  local path="$1" name="$2"
  curl -s "$BASE/api/v1/$path" -H "$AUTH" \
    | NAME="$name" PY "import os,sys,json;n=os.environ['NAME'];print(next((d['id'] for d in json.load(sys.stdin)['data'] if d.get('name')==n),''))"
}

# Ensure a domain exists by name; echo its id.
ensure_domain() {
  local name="$1"
  local existing; existing=$(find_id_by_name "domains" "$name")
  if [ -n "$existing" ]; then info "Domain '$name' exists ($existing) — reusing" >&2; echo "$existing"; return 0; fi
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/domains" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$name\"}")
  local id; id=$(echo "$resp" | PY "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || true)
  [ -n "${id:-}" ] || { fail "Domain create failed: $name"; echo "$resp" >&2; exit 1; }
  pass "Created domain '$name' ($id)" >&2
  echo "$id"
}

# Ensure a skill exists by name; echo its id. (Reuses first match regardless of level.)
ensure_skill() {
  local name="$1" level="$2"
  local existing; existing=$(find_id_by_name "skills" "$name")
  if [ -n "$existing" ]; then info "Skill '$name' exists ($existing) — reusing" >&2; echo "$existing"; return 0; fi
  local resp; resp=$(curl -s -X POST "$BASE/api/v1/skills" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$name\",\"level\":\"$level\"}")
  local id; id=$(echo "$resp" | PY "import sys,json;print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || true)
  [ -n "${id:-}" ] || { fail "Skill create failed: $name"; echo "$resp" >&2; exit 1; }
  pass "Created skill '$name' [$level] ($id)" >&2
  echo "$id"
}

# Ensure domain↔skill mapping exists (respects UNIQUE constraint; idempotent).
ensure_domain_skill() {
  local domainId="$1" skillId="$2" label="$3"
  local existing
  existing=$(curl -s "$BASE/api/v1/domain-skill-mappings/domain/$domainId" -H "$AUTH" \
    | SID="$skillId" PY "import os,sys,json;s=os.environ['SID'];print(next((m['id'] for m in json.load(sys.stdin)['data'] if m.get('skillId')==s),''))")
  if [ -n "$existing" ]; then info "domain↔skill already mapped: $label"; return 0; fi
  local resp
  resp=$(curl -s -X POST "$BASE/api/v1/domain-skill-mappings" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"domainId\":\"$domainId\",\"skillId\":\"$skillId\"}")
  if echo "$resp" | grep -q '"success":true'; then pass "Mapped domain↔skill: $label"
  elif echo "$resp" | grep -qi 'already\|unique\|constraint'; then info "domain↔skill already mapped: $label"
  else info "map note ($label): $(echo "$resp" | head -c 160)"; fi
}

# ── 2. Seed domains, skills and mappings ─────────────────────────────────────────
hdr "Seeding domains + skills + mappings"
for entry in "${DOMAIN_SKILLS[@]}"; do
  domainName="${entry%%|*}"
  skillSpec="${entry#*|}"

  domainId=$(ensure_domain "$domainName")

  IFS=',' read -ra pairs <<< "$skillSpec"
  for pair in "${pairs[@]}"; do
    skillName="${pair%%:*}"
    skillLevel="${pair##*:}"
    skillId=$(ensure_skill "$skillName" "$skillLevel")
    ensure_domain_skill "$domainId" "$skillId" "$domainName → $skillName"
  done
done

# ── 3. Verify ────────────────────────────────────────────────────────────────────
hdr "Verifying domain → skills"
curl -s "$BASE/api/v1/domains" -H "$AUTH" \
  | PY "import sys,json;[print(d['id']+'\t'+d['name']) for d in json.load(sys.stdin)['data']]" \
  | while IFS=$'\t' read -r dId dName; do
      [ -n "$dId" ] || continue
      count=$(curl -s "$BASE/api/v1/domain-skill-mappings/domain/$dId" -H "$AUTH" \
        | PY "import sys,json;d=json.load(sys.stdin)['data'];print(len(d));[print('     - '+m['skillId']) for m in d]" \
        | head -1)
      echo -e "${CYAN}• $dName${NC} — $count skill(s) mapped"
    done

echo ""
pass "Domain/skill seed complete. Open admin → 'Domains' and 'Skills' to verify."
