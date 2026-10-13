#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_master.sh
# ------------------------------------------------------------------------------
# ONE-SHOT sample-data loader for local testing. It fills EVERY user-facing table
# so the whole app (student + admin) has realistic data to browse:
#
#   catalog        : domains, skills, courses, contests, animations, test pools
#                    → delegated to the existing API seeders (idempotent).
#   users          : a batch of sample learners (SQL — points/rank are server
#                    managed, and we want them pre-scored for the leaderboard).
#   user↔domain    : interests mapping (ADMIN API — endpoint exists).
#   enrolled_courses, user_test_attempts, test_result, contest_participant,
#   contest_submission
#                    : activity rows that CANNOT be created via the admin API
#                    (student-OAuth / HMAC-signed flows) → inserted via SQL.
#
# HYBRID BY DESIGN:
#   • Anything the ADMIN API can create → created through the API (safe, mapped).
#   • Anything gated behind student-OAuth or server-signed challenges → SQL,
#     written exactly to the live schema (verified against information_schema).
#
# Fully idempotent: SQL uses INSERT … WHERE NOT EXISTS / ON DUPLICATE semantics,
# so re-running never duplicates rows.
#
# Usage:
#   cd backend && ./seed_master.sh
#   # override anything:
#   BASE=http://localhost:8085 \
#   DB_HOST=127.0.0.1 DB_PORT=3306 DB_NAME=unlearnarc \
#   DB_USER=unlearnarc DB_PASS=unlearnarc123 \
#   ADMIN_EMAIL=unlearnarc@gmail.com ADMIN_PASS='Admin@123' \
#   ./seed_master.sh
#
#   # skip the heavy catalog seeders if the catalog is already populated:
#   SKIP_CATALOG=1 ./seed_master.sh
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

SKIP_CATALOG="${SKIP_CATALOG:-0}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
hdr()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
PY()   { python3 -c "$1"; }

# ── mysql helpers ─────────────────────────────────────────────────────────────
# MYSQL_PWD avoids the insecure "password on the command line" warning on stderr.
export MYSQL_PWD="$DB_PASS"
MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" --batch --skip-column-names)
sql()      { "${MYSQL[@]}" -e "$1"; }                   # run SQL, tab-separated rows
sql_one()  { "${MYSQL[@]}" -e "$1" | head -n1; }        # first value/row only

check_db() {
  if ! sql "SELECT 1" >/dev/null 2>&1; then
    fail "Cannot reach MySQL at $DB_HOST:$DB_PORT/$DB_NAME as $DB_USER."
    fail "Set DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS env vars and retry."
    exit 1
  fi
  pass "MySQL reachable: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
}

# SQL-escape a bash string (single quotes + backslashes).
esc() { printf "%s" "$1" | sed "s/\\\\/\\\\\\\\/g; s/'/''/g"; }

# ── 0. Pre-flight ─────────────────────────────────────────────────────────────
hdr "Pre-flight checks"
command -v mysql  >/dev/null || { fail "mysql client not found on PATH"; exit 1; }
command -v curl   >/dev/null || { fail "curl not found on PATH"; exit 1; }
command -v python3>/dev/null || { fail "python3 not found on PATH"; exit 1; }
check_db

# ── 1. Admin login (for API portions) ─────────────────────────────────────────
hdr "Admin login"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}" 2>/dev/null || true)
TOKEN=$(echo "$LOGIN" | PY "import sys,json;print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null || true)
if [ -z "${TOKEN:-}" ]; then
  fail "Admin login failed — is the backend running on $BASE?"
  echo "$LOGIN"; exit 1
fi
AUTH="Authorization: Bearer $TOKEN"
pass "Logged in as $ADMIN_EMAIL"

# ── 2. Catalog seeders (API, idempotent) ──────────────────────────────────────
# These create the content students point AT: domains/skills/courses, test pools,
# contests (with problems + test cases) and animation scenes.
if [ "$SKIP_CATALOG" = "1" ]; then
  info "SKIP_CATALOG=1 → skipping catalog API seeders"
else
  hdr "Catalog seeders (domains/skills, tests, contest, animations, roadmaps)"
  run_seeder() {
    local script="$1"
    if [ -f "$HERE/$script" ]; then
      info "Running $script …"
      if BASE="$BASE" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASS="$ADMIN_PASS" bash "$HERE/$script" >/tmp/${script}.log 2>&1; then
        pass "$script completed"
      else
        info "$script exited non-zero (continuing). Tail:"
        tail -n 6 "/tmp/${script}.log" | sed 's/^/     /'
      fi
    else
      info "$script not found — skipping"
    fi
  }
  run_seeder seed_domain_skills.sh
  run_seeder seed_tests.sh
  run_seeder seed_contest.sh
  run_seeder seed_animations.sh
  run_seeder seed_roadmaps.sh
fi

# ── 3. Sample users (SQL) ──────────────────────────────────────────────────────
# Created directly: points/rank are server-managed and we want them pre-scored so
# the leaderboard is populated immediately. LOCAL provider + fixed UUIDs so the
# script is deterministic and idempotent.
hdr "Sample users (SQL)"

# name | email | region | points
USERS=(
  "Ana Sharma|ana.sharma@example.com|IN|1850"
  "Ben Carter|ben.carter@example.com|US|1620"
  "Chen Wei|chen.wei@example.com|CN|1440"
  "Diana Lopez|diana.lopez@example.com|ES|1210"
  "Elan Mehta|elan.mehta@example.com|IN|980"
  "Farah Khan|farah.khan@example.com|AE|760"
  "George Smith|george.smith@example.com|GB|540"
  "Hana Sato|hana.sato@example.com|JP|300"
)

declare -a USER_IDS=()
for row in "${USERS[@]}"; do
  IFS='|' read -r uname uemail uregion upoints <<< "$row"
  # Deterministic UUID derived from email (uuid5) → idempotent across runs.
  uid=$(EMAIL="$uemail" PY "import os,uuid;print(uuid.uuid5(uuid.NAMESPACE_DNS,'unlearnarc:'+os.environ['EMAIL']))")
  USER_IDS+=("$uid")
  e_name=$(esc "$uname"); e_email=$(esc "$uemail"); e_region=$(esc "$uregion")
  sql "INSERT INTO \`user\` (id,name,email,region,points,\`rank\`,auth_provider,is_active,created_at)
       SELECT '$uid','$e_name','$e_email','$e_region',$upoints,0,'LOCAL',b'1',NOW()
       FROM DUAL
       WHERE NOT EXISTS (SELECT 1 FROM \`user\` WHERE email='$e_email');"
  pass "user: $uname ($uregion, ${upoints}pts)"
done

# Recompute dense global ranks from points (mirrors the nightly self-heal job).
info "Recomputing global ranks from points …"
sql "UPDATE \`user\` u
     JOIN (
       SELECT id, (SELECT COUNT(*)+1 FROM \`user\` x
                   WHERE x.points > u2.points AND x.is_active=b'1') AS rnk
       FROM \`user\` u2
     ) r ON r.id=u.id
     SET u.\`rank\`=r.rnk
     WHERE u.points > 0;"
pass "Ranks recomputed"

# ── 4. user ↔ domain interests (ADMIN API) ─────────────────────────────────────
hdr "User → Domain interests (API)"
DOMAIN_IDS=$(curl -s "$BASE/api/v1/domains" -H "$AUTH" \
  | PY "import sys,json;[print(d['id']) for d in json.load(sys.stdin)['data']]" 2>/dev/null || true)
DOMAIN_ARR=(); while IFS= read -r d; do [ -n "$d" ] && DOMAIN_ARR+=("$d"); done <<< "$DOMAIN_IDS"

if [ "${#DOMAIN_ARR[@]}" -eq 0 ]; then
  info "No domains found — skipping user↔domain mapping (run catalog seeders first)"
else
  di=0
  for uid in "${USER_IDS[@]}"; do
    # Each user gets 1–2 domains, round-robin.
    for off in 0 1; do
      didx=$(( (di + off) % ${#DOMAIN_ARR[@]} ))
      dom="${DOMAIN_ARR[$didx]}"
      # Idempotent: check existing mappings for this user first.
      exists=$(curl -s "$BASE/api/v1/user-domain-mappings/user/$uid" -H "$AUTH" \
        | DID="$dom" PY "import os,sys,json;d=os.environ['DID'];print(any(m.get('domainId')==d for m in json.load(sys.stdin).get('data',[])))" 2>/dev/null || echo "False")
      if [ "$exists" = "True" ]; then continue; fi
      resp=$(curl -s -X POST "$BASE/api/v1/user-domain-mappings" \
        -H "Content-Type: application/json" -H "$AUTH" \
        -d "{\"userId\":\"$uid\",\"domainId\":\"$dom\"}")
      echo "$resp" | grep -q '"success":true' && pass "user↔domain mapped" || info "map note: $(echo "$resp" | head -c 100)"
    done
    di=$((di+1))
  done
fi

# ── 5. enrolled_courses (SQL) ──────────────────────────────────────────────────
# "My Courses" rows. Enrollment API is student-OAuth gated, so SQL it is.
hdr "Enrollments (SQL)"
COURSE_IDS=()
while IFS= read -r c; do [ -n "$c" ] && COURSE_IDS+=("$c"); done < <(sql "SELECT id FROM course ORDER BY id;")

if [ "${#COURSE_IDS[@]}" -eq 0 ]; then
  info "No courses in DB — skipping enrollments (run catalog seeders first)"
else
  ci=0
  for uid in "${USER_IDS[@]}"; do
    # Enroll each user into up to 3 courses, round-robin.
    n=${#COURSE_IDS[@]}; take=$(( n < 3 ? n : 3 ))
    for k in $(seq 0 $((take-1))); do
      cidx=$(( (ci + k) % n ))
      cid="${COURSE_IDS[$cidx]}"
      eid=$(ARG="$uid$cid" PY "import os,uuid;print(uuid.uuid5(uuid.NAMESPACE_DNS,'enroll:'+os.environ['ARG']))")
      sql "INSERT INTO enrolled_courses (id,user_id,course_id,enrolled_at)
           SELECT '$eid','$uid','$cid',NOW()
           FROM DUAL
           WHERE NOT EXISTS (SELECT 1 FROM enrolled_courses WHERE user_id='$uid' AND course_id='$cid');"
    done
    ci=$((ci+1))
  done
  TOTAL_ENROLL=$(sql_one "SELECT COUNT(*) FROM enrolled_courses;")
  pass "Enrollments present: $TOTAL_ENROLL row(s)"
fi

# ── 6. Test attempts + results (SQL) ───────────────────────────────────────────
# test_result holds the graded breakdown; user_test_attempts links user→result.
# Grade API requires a real USER JWT, so we write deterministic rows via SQL.
hdr "Test attempts + results (SQL)"
# Pick pools (with their scope) to attribute attempts to.
POOL_ROWS=()
while IFS=$'\t' read -r pid scope ename; do
  [ -n "$pid" ] && POOL_ROWS+=("$pid|$scope|$ename")
done < <(sql "
  SELECT qp.id,
         CASE
           WHEN d.domain_id IS NOT NULL THEN 'DOMAIN'
           WHEN c.course_id IS NOT NULL THEN 'COURSE'
           WHEN t.topic_id  IS NOT NULL THEN 'TOPIC'
           ELSE 'DOMAIN'
         END AS entity_type,
         COALESCE(d.domain_id, c.course_id, t.topic_id, qp.id) AS entity_id
  FROM question_pool qp
  LEFT JOIN (SELECT pool_id, MIN(domain_id) AS domain_id FROM domain_pool_mapping GROUP BY pool_id) d ON d.pool_id = qp.id
  LEFT JOIN (SELECT pool_id, MIN(course_id) AS course_id FROM course_pool_mapping GROUP BY pool_id) c ON c.pool_id = qp.id
  LEFT JOIN (SELECT pool_id, MIN(topic_id)  AS topic_id  FROM topic_pool_mapping  GROUP BY pool_id) t ON t.pool_id = qp.id
  LIMIT 20;")

if [ "${#POOL_ROWS[@]}" -eq 0 ]; then
  info "No question pools in DB — skipping test attempts (run seed_tests.sh first)"
else
  made=0
  ui=0
  for uid in "${USER_IDS[@]}"; do
    # Each user does 2 attempts against rotating pools.
    for a in 0 1; do
      pidx=$(( (ui + a) % ${#POOL_ROWS[@]} ))
      IFS='|' read -r pool_id scope entity_id <<< "${POOL_ROWS[$pidx]}"
      [ -n "$pool_id" ] || continue

      # Deterministic scorecard (varied but stable per user+pool+attempt).
      seed=$(( (ui*7 + a*3 + pidx) ))
      total_q=10
      correct=$(( 4 + (seed % 6) ))                 # 4..9
      wrong=$(( total_q - correct ))
      skipped=0
      e_tot=4; m_tot=4; h_tot=2
      e_cor=$(( correct<e_tot ? correct : e_tot ))
      rem=$(( correct - e_cor ))
      m_cor=$(( rem<m_tot ? rem : m_tot )); [ $m_cor -lt 0 ] && m_cor=0
      rem2=$(( correct - e_cor - m_cor ))
      h_cor=$(( rem2<h_tot ? rem2 : h_tot )); [ $h_cor -lt 0 ] && h_cor=0
      e_pts=$((e_tot*10)); m_pts=$((m_tot*20)); h_pts=$((h_tot*30))
      e_earn=$((e_cor*10)); m_earn=$((m_cor*20)); h_earn=$((h_cor*30))
      total_points=$(( e_pts+m_pts+h_pts ))
      earned=$(( e_earn+m_earn+h_earn ))
      pct=$(PY "print(round($earned*100.0/$total_points,2) if $total_points else 0.0)")
      pass_pct=60
      passed=$(PY "print(\"b'1'\" if $pct>=$pass_pct else \"b'0'\")")
      improv=$(PY "print(\"b'0'\" if $pct>=$pass_pct else \"b'1'\")")
      tts=$(( 180 + seed*7 ))

      tr_id=$(ARG="$uid$pool_id$a" PY "import os,uuid;print(uuid.uuid5(uuid.NAMESPACE_DNS,'tr:'+os.environ['ARG']))")
      ta_id=$(ARG="$uid$pool_id$a" PY "import os,uuid;print(uuid.uuid5(uuid.NAMESPACE_DNS,'ta:'+os.environ['ARG']))")

      # Skip if this attempt already exists.
      ex=$(sql_one "SELECT COUNT(*) FROM test_result WHERE id='$tr_id';")
      if [ "$ex" != "0" ]; then continue; fi

      sql "INSERT INTO test_result
            (id, pool_id, entity_type, entity_id,
             total_questions, correct_count, wrong_count, skipped_count,
             total_points, earned_points, score_percentage, pass_percentage, passed, is_improvement_needed,
             time_taken_seconds,
             easy_total, easy_correct, easy_points, easy_earned,
             medium_total, medium_correct, medium_points, medium_earned,
             hard_total, hard_correct, hard_points, hard_earned,
             created_at)
           VALUES
            ('$tr_id','$pool_id','$scope','$entity_id',
             $total_q, $correct, $wrong, $skipped,
             $total_points, $earned, $pct, $pass_pct, $passed, $improv,
             $tts,
             $e_tot,$e_cor,$e_pts,$e_earn,
             $m_tot,$m_cor,$m_pts,$m_earn,
             $h_tot,$h_cor,$h_pts,$h_earn,
             NOW() - INTERVAL $((seed+1)) DAY);"

      sql "INSERT INTO user_test_attempts (id,user_id,test_id,created_at)
           SELECT '$ta_id','$uid','$tr_id', NOW() - INTERVAL $((seed+1)) DAY
           FROM DUAL
           WHERE NOT EXISTS (SELECT 1 FROM user_test_attempts WHERE id='$ta_id');"
      made=$((made+1))
    done
    ui=$((ui+1))
  done
  pass "Test attempts created: $made (this run)"
fi

# ── 7. Contest participation + submissions (SQL) ───────────────────────────────
# Submissions require HMAC-signed challenges → impossible to replay via API.
hdr "Contest participation + submissions (SQL)"
CONTEST_ID=$(sql_one "SELECT id FROM contest WHERE status='PUBLISHED' ORDER BY created_at DESC LIMIT 1;")
if [ -z "${CONTEST_ID:-}" ]; then
  CONTEST_ID=$(sql_one "SELECT id FROM contest ORDER BY created_at DESC LIMIT 1;")
fi

if [ -z "${CONTEST_ID:-}" ]; then
  info "No contest in DB — skipping contest activity (run seed_contest.sh first)"
else
  info "Using contest: $CONTEST_ID"
  PROBLEM_ROWS=()
  while IFS=$'\t' read -r prob_id maxp; do
    [ -n "$prob_id" ] && PROBLEM_ROWS+=("$prob_id|$maxp")
  done < <(sql "SELECT id, max_points FROM contest_problem WHERE contest_id='$CONTEST_ID' ORDER BY display_order LIMIT 6;")

  if [ "${#PROBLEM_ROWS[@]}" -eq 0 ]; then
    info "Contest has no problems — skipping submissions"
  else
    ui=0
    for uid in "${USER_IDS[@]}"; do
      # Each user solves the first (ui%problems)+1 problems.
      solve_n=$(( (ui % ${#PROBLEM_ROWS[@]}) + 1 ))
      total_score=0; solved=0; penalty=0
      for k in $(seq 0 $((solve_n-1))); do
        IFS='|' read -r prob_id maxp <<< "${PROBLEM_ROWS[$k]}"
        # Deterministic verdict: most accepted, some partial.
        if [ $(( (ui + k) % 4 )) -eq 3 ]; then
          verdict="PARTIAL"; passed_t=3; total_t=5; score=$(( maxp / 2 ))
        else
          verdict="ACCEPTED"; passed_t=5; total_t=5; score=$maxp
        fi
        total_score=$(( total_score + score ))
        [ "$verdict" = "ACCEPTED" ] && solved=$(( solved + 1 ))
        [ "$verdict" = "PARTIAL" ] && penalty=$(( penalty + 5 ))

        sub_id=$(ARG="$uid$prob_id" PY "import os,uuid;print(uuid.uuid5(uuid.NAMESPACE_DNS,'sub:'+os.environ['ARG']))")
        src="# sample accepted solution seeded for testing"
        e_src=$(esc "$src")
        sql "INSERT INTO contest_submission
              (id,contest_id,problem_id,user_id,language,source_code,verdict,
               passed_tests,total_tests,score,runtime_ms,submitted_at)
             SELECT '$sub_id','$CONTEST_ID','$prob_id','$uid','python','$e_src','$verdict',
               $passed_t,$total_t,$score,$(( 50 + (ui*13+k*7)%200 )),NOW() - INTERVAL $((ui+1)) HOUR
             FROM DUAL
             WHERE NOT EXISTS (SELECT 1 FROM contest_submission WHERE id='$sub_id');"
      done

      part_id=$(ARG="$uid$CONTEST_ID" PY "import os,uuid;print(uuid.uuid5(uuid.NAMESPACE_DNS,'part:'+os.environ['ARG']))")
      sql "INSERT INTO contest_participant
            (id,contest_id,user_id,started_at,total_score,solved_count,penalty,
             last_accepted_at,created_at,updated_at)
           VALUES
            ('$part_id','$CONTEST_ID','$uid',NOW() - INTERVAL $((ui+2)) HOUR,
             $total_score,$solved,$penalty,NOW() - INTERVAL $((ui+1)) HOUR,NOW(),NOW())
           ON DUPLICATE KEY UPDATE
             total_score=VALUES(total_score),
             solved_count=VALUES(solved_count),
             penalty=VALUES(penalty),
             last_accepted_at=VALUES(last_accepted_at),
             updated_at=NOW();"
      ui=$((ui+1))
    done
    SUBS=$(sql_one "SELECT COUNT(*) FROM contest_submission WHERE contest_id='$CONTEST_ID';")
    PARTS=$(sql_one "SELECT COUNT(*) FROM contest_participant WHERE contest_id='$CONTEST_ID';")
    pass "Contest activity: $PARTS participant(s), $SUBS submission(s)"
  fi
fi

# ── 8. Verification summary ────────────────────────────────────────────────────
hdr "Verification summary"
printf "  %-24s %s\n" "users"               "$(sql_one "SELECT COUNT(*) FROM \`user\`;")"
printf "  %-24s %s\n" "user_domain_mapping" "$(sql_one "SELECT COUNT(*) FROM user_domain_mapping;")"
printf "  %-24s %s\n" "enrolled_courses"    "$(sql_one "SELECT COUNT(*) FROM enrolled_courses;")"
printf "  %-24s %s\n" "test_result"         "$(sql_one "SELECT COUNT(*) FROM test_result;")"
printf "  %-24s %s\n" "user_test_attempts"  "$(sql_one "SELECT COUNT(*) FROM user_test_attempts;")"
printf "  %-24s %s\n" "contest_participant" "$(sql_one "SELECT COUNT(*) FROM contest_participant;")"
printf "  %-24s %s\n" "contest_submission"  "$(sql_one "SELECT COUNT(*) FROM contest_submission;")"
printf "  %-24s %s\n" "domains"             "$(sql_one "SELECT COUNT(*) FROM domain;")"
printf "  %-24s %s\n" "skills"              "$(sql_one "SELECT COUNT(*) FROM skill;")"
printf "  %-24s %s\n" "courses"             "$(sql_one "SELECT COUNT(*) FROM course;")"
printf "  %-24s %s\n" "contests"            "$(sql_one "SELECT COUNT(*) FROM contest;")"
printf "  %-24s %s\n" "animation_scene"     "$(sql_one "SELECT COUNT(*) FROM animation_scene;")"

echo ""
info "Leaderboard preview (top 5):"
sql "SELECT \`rank\`, name, region, points FROM \`user\` WHERE points>0 ORDER BY points DESC LIMIT 5;" \
  | awk -F'\t' '{printf "   #%-3s %-18s %-4s %s pts\n",$1,$2,$3,$4}'

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Master sample data seeded ✅  (API for catalog/mappings, SQL for gated tables)${NC}"
echo -e "${GREEN}  Open the student app → Dashboard / My Courses / Tests / Contests / Leaderboard${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
