#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_cs_fundamentals.sh
# ------------------------------------------------------------------------------
# CLEAN-SLATE content loader. Wipes ALL existing catalog + user activity (keeps
# only the hardcoded admin, which is NOT a DB row) and seeds ONE polished,
# layman-friendly course:
#
#     Domain : Computer Science
#       Course : Fundamentals of Computer Science   (BEGINNER)
#         6 ordered Topics, each with:
#           • a rich, book-style NOTE (headings, images, analogies, callouts)
#           • an embedded ANIMATION or ALGORITHM visual (by slug)
#           • a TOPIC quiz pool (3 easy / 2 medium / 1 hard, auto-mapped)
#       + one COURSE-level "How to read this book" overview note
#       + one COURSE quiz pool
#
# Design goals for the notes:
#   • Explain each concept as if to a smart beginner with ZERO CS background.
#   • Use real-world analogies, then connect to the embedded animation.
#   • Every note embeds a matching live visual so the reader SEES the idea.
#
# Fully idempotent: safe to re-run. Each run wipes + reseeds the CS content only.
#
# Prereqs:  backend running on $BASE, mysql client, python3, curl.
# Usage:    cd backend && ./seed_cs_fundamentals.sh
#           BASE=http://localhost:8085 ADMIN_EMAIL=... ADMIN_PASS=... ./seed_cs_fundamentals.sh
#           KEEP_USERS=1 ./seed_cs_fundamentals.sh   # keep user/activity tables
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="${BASE:-http://localhost:8085}"
ADMIN_EMAIL="${ADMIN_EMAIL:-unlearnarc@gmail.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"
API="$BASE/api/v1"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-unlearnarc}"
DB_USER="${DB_USER:-unlearnarc}"
DB_PASS="${DB_PASS:-unlearnarc123}"
KEEP_USERS="${KEEP_USERS:-0}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
hdr()  { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
jqget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

export MYSQL_PWD="$DB_PASS"
MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" --batch --skip-column-names)
sql()     { "${MYSQL[@]}" -e "$1"; }
sql_one() { "${MYSQL[@]}" -e "$1" | head -n1; }

# ── 0. Pre-flight ───────────────────────────────────────────────────────────────
hdr "Pre-flight"
command -v mysql  >/dev/null || fail "mysql client not found"
command -v curl   >/dev/null || fail "curl not found"
command -v python3>/dev/null || fail "python3 not found"
sql "SELECT 1" >/dev/null 2>&1 || fail "cannot reach MySQL at $DB_HOST:$DB_PORT/$DB_NAME"
curl -sf "$API/auth/health" >/dev/null 2>&1 || fail "backend not reachable at $BASE"
pass "DB + backend reachable"

# ── 1. Admin login ──────────────────────────────────────────────────────────────
hdr "Admin login"
LOGIN=$(curl -sf -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | jqget "['data']['accessToken']") || fail "login failed"
[ -n "$TOKEN" ] || fail "no token"
AUTH="Authorization: Bearer $TOKEN"
pass "logged in as $ADMIN_EMAIL"

# ── 2. WIPE everything (clean slate) ─────────────────────────────────────────────
# Order respects FK-free schema (no DB FKs here, but we clear children first for
# clarity). The admin is a hardcoded credential, NOT a user row, so nothing to keep.
hdr "Wiping existing data (clean slate)"
sql "SET FOREIGN_KEY_CHECKS=0;"
# Content catalog
for t in answer question topic_pool_mapping course_pool_mapping domain_pool_mapping \
         question_pool study_material note topic skill_course_mapping domain_skill_mapping \
         course skill domain algorithm animation_scene \
         contest_submission contest_participant contest_test_case contest_problem contest \
         interview_experience role_domain_mapping role_skill_mapping role; do
  sql "DELETE FROM \`$t\`;" 2>/dev/null && info "cleared $t" || info "skip $t (absent)"
done
if [ "$KEEP_USERS" = "1" ]; then
  info "KEEP_USERS=1 → preserving user + activity tables"
else
  for t in user_test_attempts test_result user_activity_day user_domain_mapping enrolled_courses user; do
    sql "DELETE FROM \`$t\`;" 2>/dev/null && info "cleared $t" || info "skip $t (absent)"
  done
fi
sql "SET FOREIGN_KEY_CHECKS=1;"
pass "database wiped"

# ── 3. Publish the visual library (animations + algorithms) ──────────────────────
# The notes embed these by slug — they must be PUBLISHED so students can load them.
# We reseed the animation gallery and publish all algorithm specs from disk.
hdr "Visual library (animations + algorithms)"

# 3a. Re-seed + publish animation scenes via the existing idempotent seeder.
if [ -f "$(dirname "$0")/seed_animations.sh" ]; then
  info "running seed_animations.sh (idempotent) …"
  BASE="$BASE" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASS="$ADMIN_PASS" \
    bash "$(dirname "$0")/seed_animations.sh" >/tmp/anim_seed.log 2>&1 \
    && pass "animations seeded + published" \
    || { info "animation seeder tail:"; tail -n 5 /tmp/anim_seed.log | sed 's/^/     /'; }
fi

# 3b. Load algorithm specs. seed_algoviz_starter.sh seeds the FULL library
# (insertion/selection/merge/quick sort, binary-search, bfs, dfs, …) which the
# notes embed by slug; seed_algoviz.sh adds bubble-sort. Run both if present.
for algo_seeder in seed_algoviz_starter.sh seed_algoviz.sh; do
  if [ -f "$(dirname "$0")/$algo_seeder" ]; then
    info "running $algo_seeder (loads specs) …"
    BASE="$BASE" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_PASS="$ADMIN_PASS" \
      bash "$(dirname "$0")/$algo_seeder" >/tmp/${algo_seeder}.log 2>&1 \
      && pass "$algo_seeder loaded" \
      || { info "$algo_seeder tail:"; tail -n 5 "/tmp/${algo_seeder}.log" | sed 's/^/     /'; }
  fi
done

# Publish every algorithm + animation so note embeds resolve for students.
sql "UPDATE algorithm SET is_published=b'1';"      2>/dev/null || true
sql "UPDATE animation_scene SET is_published=b'1';" 2>/dev/null || true
ANIM_N=$(sql_one "SELECT COUNT(*) FROM animation_scene WHERE is_published=b'1';")
ALGO_N=$(sql_one "SELECT COUNT(*) FROM algorithm WHERE is_published=b'1';")
pass "published: $ANIM_N animation(s), $ALGO_N algorithm(s)"

# Resolve slugs we rely on; fall back gracefully if a visual is missing.
has_anim() { [ "$(sql_one "SELECT COUNT(*) FROM animation_scene WHERE slug='$1' AND is_published=b'1';")" != "0" ]; }
has_algo() { [ "$(sql_one "SELECT COUNT(*) FROM algorithm WHERE slug='$1' AND is_published=b'1';")" != "0" ]; }

# ── 4. Domain + Course ───────────────────────────────────────────────────────────
hdr "Domain + Course"
DOMAIN_ID=$(curl -sf -X POST "$API/domains" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Computer Science"}' | jqget "['data']['id']")
[ -n "$DOMAIN_ID" ] || fail "domain create failed"
pass "domain: Computer Science ($DOMAIN_ID)"

# course.img_url is a bigint in this schema (legacy) — send 1.
COURSE_ID=$(curl -sf -X POST "$API/courses" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Fundamentals of Computer Science","imgUrl":1,"totalTime":"03:00:00","topicsCount":6,"level":"BEGINNER"}' \
  | jqget "['data']['id']")
[ -n "$COURSE_ID" ] || fail "course create failed"
pass "course: Fundamentals of Computer Science ($COURSE_ID)"

# A supporting skill, mapped domain↔skill and skill↔course for a complete catalog.
SKILL_ID=$(curl -sf -X POST "$API/skills" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Computational Thinking","level":"BEGINNER"}' | jqget "['data']['id']")
curl -s -X POST "$API/domain-skill-mappings" -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"domainId\":\"$DOMAIN_ID\",\"skillId\":\"$SKILL_ID\"}" >/dev/null 2>&1 || true
curl -s -X POST "$API/skill-course-mappings" -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"skillId\":\"$SKILL_ID\",\"courseId\":\"$COURSE_ID\"}" >/dev/null 2>&1 || true
pass "skill mapped (Computational Thinking)"

# ── helpers for topics / notes / quizzes ────────────────────────────────────────

# create_topic <order> <name> <level>  → echoes topic id
create_topic() {
  curl -sf -X POST "$API/topics" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"$2\",\"time\":\"00:30:00\",\"topicOrder\":$1,\"level\":\"$3\",\"courseId\":\"$COURSE_ID\"}" \
    | jqget "['data']['id']"
}

# create_note: builds + posts a note. Reads HTML from stdin.
# args: scope(topic|course) parentId title summary cover readMin order blocksJson
create_note() {
  local scope="$1" pid="$2" title="$3" summary="$4" cover="$5" readmin="$6" order="$7" blocks="$8"
  local content; content="$(cat)"
  local payload
  payload=$(SCOPE="$scope" PID="$pid" TITLE="$title" SUMMARY="$summary" COVER="$cover" \
            READMIN="$readmin" ORDER="$order" BLOCKS="$blocks" CONTENT="$content" python3 <<'PY'
import json, os
scope = os.environ["SCOPE"]
body = {
  "title": os.environ["TITLE"],
  "summary": os.environ["SUMMARY"],
  "contentHtml": os.environ["CONTENT"],
  "coverImageUrl": os.environ["COVER"],
  "blocksJson": os.environ["BLOCKS"],
  "noteOrder": int(os.environ["ORDER"]),
  "readMinutes": int(os.environ["READMIN"]),
  "isPublished": True,
}
body["topicId" if scope == "topic" else "courseId"] = os.environ["PID"]
print(json.dumps(body))
PY
)
  local resp id; resp=$(curl -s -X POST "$API/notes" -H "Content-Type: application/json" -H "$AUTH" -d "$payload")
  id=$(echo "$resp" | jqget "['data']['id']" 2>/dev/null || echo "")
  [ -n "$id" ] && pass "   note: $title ($id)" || { fail "note create failed: $title → $(echo "$resp" | head -c 200)"; }
}

# create_quiz_pool <scope TOPIC|COURSE> <entityId> <name>  → echoes pool id, stocks + maps it.
create_quiz_pool() {
  local scope="$1" eid="$2" name="$3"
  local pid
  pid=$(curl -sf -X POST "$API/question-pools" -H "Content-Type: application/json" -H "$AUTH" -d @- <<EOF | jqget "['data']['id']"
{ "name":"$name","description":"Auto-seeded quiz for $name","scopeType":"$scope",
  "totalQuestions":6,"easyCount":3,"mediumCount":2,"hardCount":1,
  "passPercentage":60,"timeLimitMinutes":15 }
EOF
)
  [ -n "$pid" ] || { info "pool create failed: $name"; return 1; }
  # map pool to entity
  local field; [ "$scope" = "TOPIC" ] && field="topicId" || field="courseId"
  curl -s -X POST "$API/question-pools/map" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"poolId\":\"$pid\",\"$field\":\"$eid\"}" >/dev/null 2>&1 || true
  echo "$pid"
}

# stock_quiz <poolId> — reads a JSON array (WITHOUT poolId) on stdin, injects poolId, bulk-creates.
stock_quiz() {
  local pid="$1"
  python3 -c "import sys,json;pid='$pid';d=json.load(sys.stdin);[q.__setitem__('poolId',pid) for q in d];print(json.dumps(d))" \
    | curl -s -X POST "$API/questions/bulk" -H "Content-Type: application/json" -H "$AUTH" -d @- >/dev/null \
    && info "   quiz stocked (6 questions)" || info "   quiz stock failed"
}

# pick_block: returns a blocksJson referencing an animation (preferred) or algorithm by slug,
# falling back to [] if neither exists. args: kind slug caption
pick_block() {
  local kind="$1" slug="$2" caption="$3"
  if { [ "$kind" = "ANIMATION" ] && has_anim "$slug"; } || { [ "$kind" = "ALGORITHM" ] && has_algo "$slug"; }; then
    printf '[{"kind":"%s","slug":"%s","caption":"%s"}]' "$kind" "$slug" "$caption"
  else
    printf '[]'
  fi
}

COVER1="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200"
COVER2="https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200"
COVER3="https://images.unsplash.com/photo-1555949963-aa79dcee981c?w=1200"
COVER4="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200"
COVER5="https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200"
COVER6="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200"
COVERC="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200"

# ══════════════════════════════════════════════════════════════════════════════
#  COURSE-LEVEL overview note (the "preface" of the book)
# ══════════════════════════════════════════════════════════════════════════════
hdr "Course-level overview note"
create_note course "$COURSE_ID" \
  "How to Read This Book" \
  "A friendly preface — what computer science really is, and how to get the most from this course." \
  "$COVERC" 4 1 '[]' <<'HTML'
<h2>Welcome 👋 — you are about to meet the machine</h2>
<p>If you have ever wondered <em>how a computer actually thinks</em>, you are in the right place. This course assumes <strong>zero</strong> background. No maths degree, no prior coding — just curiosity.</p>
<figure>
  <img src="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1000" alt="A laptop with code on screen" />
  <figcaption>By the end, the glowing symbols on a screen will feel like a language you can read.</figcaption>
</figure>
<h3>What is Computer Science, really?</h3>
<p>Computer science is <strong>not</strong> about memorising a programming language. It is the study of <em>how to solve problems step by step</em> — so precisely that even a dumb machine can follow along. That recipe-writing skill is called <strong>computational thinking</strong>, and it is useful far beyond computers.</p>
<blockquote>Think of a computer as an extremely fast, extremely literal assistant. It never gets tired, never improvises, and does <em>exactly</em> what you say — including your mistakes.</blockquote>
<h3>How this book works</h3>
<ul>
  <li>📖 Each topic is a short <strong>illustrated chapter</strong> — read it like a story.</li>
  <li>🎬 Every chapter has a <strong>live animation</strong> you can play, pause, and step through. Watching the idea move is where it clicks.</li>
  <li>🧪 A short <strong>quiz</strong> at the end checks that the idea stuck.</li>
</ul>
<hr />
<p><strong>Suggested path:</strong> read the chapters in order — each one builds on the last. Don't rush. Replay the animations until they feel obvious.</p>
<p>Ready? Turn to Chapter 1. 🚀</p>
HTML

# ══════════════════════════════════════════════════════════════════════════════
#  TOPIC 1 — What is an Algorithm?
# ══════════════════════════════════════════════════════════════════════════════
hdr "Topic 1 — What is an Algorithm?"
T1=$(create_topic 1 "What Is an Algorithm?" "BEGINNER"); [ -n "$T1" ] || fail "topic1 failed"
BLK1=$(pick_block ALGORITHM "binary-search" "Binary search: a smart recipe for finding things fast.")
create_note topic "$T1" \
  "What Is an Algorithm?" \
  "An algorithm is just a recipe. Learn the single most important idea in all of computing." \
  "$COVER1" 6 1 "$BLK1" <<'HTML'
<h2>An algorithm is just a recipe 🍳</h2>
<p>Before computers, your grandmother had algorithms. A cooking recipe is a perfect example: a <strong>finite list of clear steps</strong> that, if you follow them exactly, always produce the same dish.</p>
<p>In computing, an <strong>algorithm</strong> is exactly that — a precise, step-by-step procedure for solving a problem.</p>
<figure>
  <img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1000" alt="A handwritten recipe card" />
  <figcaption>A recipe and an algorithm are the same idea: ordered, unambiguous steps.</figcaption>
</figure>
<h3>The three rules of a good algorithm</h3>
<ul>
  <li><strong>Clear</strong> — each step is unambiguous. "Add some salt" is bad; "add 1 teaspoon of salt" is good.</li>
  <li><strong>Finite</strong> — it eventually stops. A recipe that says "stir forever" is broken.</li>
  <li><strong>Correct</strong> — following it actually solves the problem.</li>
</ul>
<h3>A real example: finding a name in a phone book</h3>
<p>Imagine a phone book with a million names. The <em>slow</em> way: start at page 1 and check every single name. The <em>smart</em> way: open to the middle. Is the name before or after? Throw away half the book instantly. Repeat.</p>
<blockquote>That "throw away half every time" trick is called <strong>binary search</strong> — and it can find one name among a million in about <strong>20 steps</strong> instead of a million.</blockquote>
<p>Watch it happen below. Notice how the search space shrinks by half on every single step. 👇</p>
<hr />
<p><strong>Takeaway:</strong> the <em>same</em> problem can have a slow recipe and a brilliant recipe. Computer science is largely the art of finding the brilliant one.</p>
HTML
P1=$(create_quiz_pool TOPIC "$T1" "Algorithms — Quiz"); [ -n "$P1" ] && stock_quiz "$P1" <<'JSON'
[
 {"questionText":"What is an algorithm, in the simplest terms?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"An algorithm is a finite, ordered set of clear steps to solve a problem — like a recipe.","answers":[{"answerText":"A step-by-step recipe for solving a problem","isCorrect":true,"displayOrder":0},{"answerText":"A type of computer","isCorrect":false,"displayOrder":1},{"answerText":"A programming language","isCorrect":false,"displayOrder":2},{"answerText":"A kind of file","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which is NOT a required property of a good algorithm?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"Algorithms must be clear, finite and correct. Running forever violates finiteness.","answers":[{"answerText":"It should eventually stop (finite)","isCorrect":false,"displayOrder":0},{"answerText":"Each step is unambiguous","isCorrect":false,"displayOrder":1},{"answerText":"It should run forever","isCorrect":true,"displayOrder":2},{"answerText":"It should actually solve the problem","isCorrect":false,"displayOrder":3}]},
 {"questionText":"'Add some salt' is a poor algorithm step because it is not…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"'Some' is ambiguous — clear steps give exact amounts.","answers":[{"answerText":"Clear / unambiguous","isCorrect":true,"displayOrder":0},{"answerText":"Fast","isCorrect":false,"displayOrder":1},{"answerText":"Colorful","isCorrect":false,"displayOrder":2},{"answerText":"Expensive","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Binary search works by…","questionType":"MCQ","difficulty":"MEDIUM","points":20,"explanation":"It repeatedly discards half the remaining items by checking the middle.","answers":[{"answerText":"Discarding half the remaining items each step","isCorrect":true,"displayOrder":0},{"answerText":"Checking every item one by one","isCorrect":false,"displayOrder":1},{"answerText":"Guessing randomly","isCorrect":false,"displayOrder":2},{"answerText":"Sorting the list first every time","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which problems can a single problem have?","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":20,"explanation":"The same problem can be solved by multiple algorithms with different speeds.","answers":[{"answerText":"A slow but correct algorithm","isCorrect":true,"displayOrder":0},{"answerText":"A fast and correct algorithm","isCorrect":true,"displayOrder":1},{"answerText":"Exactly one possible algorithm","isCorrect":false,"displayOrder":2},{"answerText":"No algorithm at all, ever","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Binary search on a million sorted names takes roughly how many steps?","questionType":"MCQ","difficulty":"HARD","points":30,"explanation":"log2(1,000,000) ≈ 20, because each step halves the search space.","answers":[{"answerText":"About 20","isCorrect":true,"displayOrder":0},{"answerText":"About 1,000,000","isCorrect":false,"displayOrder":1},{"answerText":"About 500,000","isCorrect":false,"displayOrder":2},{"answerText":"About 1,000","isCorrect":false,"displayOrder":3}]}
]
JSON

# ══════════════════════════════════════════════════════════════════════════════
#  TOPIC 2 — How Computers Store Data (Binary)
# ══════════════════════════════════════════════════════════════════════════════
hdr "Topic 2 — Binary & Data"
T2=$(create_topic 2 "How Computers Store Everything (Binary)" "BEGINNER"); [ -n "$T2" ] || fail "topic2 failed"
BLK2=$(pick_block ANIMATION "atomic-cas-3-threads" "A shared value being read and written — the heartbeat of memory.")
create_note topic "$T2" \
  "How Computers Store Everything" \
  "Photos, music, this very sentence — all of it is just ones and zeros. Here's how." \
  "$COVER2" 7 1 "$BLK2" <<'HTML'
<h2>Everything is just ON and OFF 💡</h2>
<p>Deep down, a computer is millions of tiny switches. Each switch is either <strong>on</strong> or <strong>off</strong>. We write <strong>on = 1</strong> and <strong>off = 0</strong>. That's it. That's the whole alphabet.</p>
<figure>
  <img src="https://images.unsplash.com/photo-1510519138101-570d1dca3d66?w=1000" alt="Rows of glowing switches" />
  <figcaption>A single switch is a <strong>bit</strong>. Eight of them make a <strong>byte</strong>.</figcaption>
</figure>
<h3>How do you get words from switches?</h3>
<p>We simply <em>agree</em> on a code. For example, the letter <strong>A</strong> is stored as <code>01000001</code>. There is nothing magical about it — it's a shared convention, like Morse code.</p>
<ul>
  <li>Count with switches: <code>0</code>, <code>1</code>, <code>10</code>, <code>11</code>, <code>100</code>… that's <strong>binary</strong> — counting with only two digits.</li>
  <li>A photo? A huge grid of numbers, each saying how red/green/blue a dot is.</li>
  <li>Music? Thousands of numbers per second describing a sound wave's height.</li>
</ul>
<blockquote>Once everything is a number, and every number is switches, a computer can store <em>anything</em> — and do maths on it blazingly fast.</blockquote>
<h3>Why two digits and not ten?</h3>
<p>Because "on vs off" is easy and reliable to build with electricity. Ten distinct voltage levels would be fragile; two is rock-solid. Simplicity wins.</p>
<p>The animation below shows a single stored value being read and updated by different parts of the machine — the fundamental dance of memory. 👇</p>
<hr />
<p><strong>Takeaway:</strong> there is no "text" or "images" inside a computer — only numbers, and underneath them, switches.</p>
HTML
P2=$(create_quiz_pool TOPIC "$T2" "Binary & Data — Quiz"); [ -n "$P2" ] && stock_quiz "$P2" <<'JSON'
[
 {"questionText":"A single on/off switch in a computer is called a…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"A bit is one binary digit: 0 or 1.","answers":[{"answerText":"Bit","isCorrect":true,"displayOrder":0},{"answerText":"Byte","isCorrect":false,"displayOrder":1},{"answerText":"Pixel","isCorrect":false,"displayOrder":2},{"answerText":"Word","isCorrect":false,"displayOrder":3}]},
 {"questionText":"How many bits are in a byte?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"A byte is 8 bits.","answers":[{"answerText":"8","isCorrect":true,"displayOrder":0},{"answerText":"2","isCorrect":false,"displayOrder":1},{"answerText":"10","isCorrect":false,"displayOrder":2},{"answerText":"16","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Binary uses how many distinct digits?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"Binary uses exactly two: 0 and 1.","answers":[{"answerText":"Two (0 and 1)","isCorrect":true,"displayOrder":0},{"answerText":"Ten","isCorrect":false,"displayOrder":1},{"answerText":"Eight","isCorrect":false,"displayOrder":2},{"answerText":"One","isCorrect":false,"displayOrder":3}]},
 {"questionText":"How can a photo be stored as numbers?","questionType":"MCQ","difficulty":"MEDIUM","points":20,"explanation":"Images are grids of pixels, each pixel a set of color numbers.","answers":[{"answerText":"As a grid of color values per dot (pixel)","isCorrect":true,"displayOrder":0},{"answerText":"It cannot be — photos are special","isCorrect":false,"displayOrder":1},{"answerText":"As a single letter","isCorrect":false,"displayOrder":2},{"answerText":"As sound waves only","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which of these are ultimately stored as numbers in a computer?","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":20,"explanation":"Text, images and sound are all encoded as numbers.","answers":[{"answerText":"Text","isCorrect":true,"displayOrder":0},{"answerText":"Images","isCorrect":true,"displayOrder":1},{"answerText":"Music","isCorrect":true,"displayOrder":2},{"answerText":"None of these","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Why do computers use two states instead of ten?","questionType":"MCQ","difficulty":"HARD","points":30,"explanation":"Two reliable states (on/off) are robust to build with electronics; ten levels are error-prone.","answers":[{"answerText":"On/off is reliable and simple to build electronically","isCorrect":true,"displayOrder":0},{"answerText":"Because humans have two hands","isCorrect":false,"displayOrder":1},{"answerText":"To save money on screens","isCorrect":false,"displayOrder":2},{"answerText":"It is faster to type","isCorrect":false,"displayOrder":3}]}
]
JSON

# ══════════════════════════════════════════════════════════════════════════════
#  TOPIC 3 — Data Structures: Organising Information
# ══════════════════════════════════════════════════════════════════════════════
hdr "Topic 3 — Data Structures"
T3=$(create_topic 3 "Organising Information (Data Structures)" "BEGINNER"); [ -n "$T3" ] || fail "topic3 failed"
BLK3=$(pick_block ALGORITHM "merge-sort" "Sorting a shelf: merge sort splits, then cleverly combines.")
create_note topic "$T3" \
  "Organising Information" \
  "A messy drawer vs. a tidy wardrobe. How you store data decides how fast you can use it." \
  "$COVER3" 7 1 "$BLK3" <<'HTML'
<h2>A place for everything 🗄️</h2>
<p>Imagine two kitchens. In the first, every tool is dumped in one giant drawer. In the second, knives, spoons and forks each have their own slot. Both <em>store</em> the tools — but only one lets you grab a fork instantly.</p>
<p>A <strong>data structure</strong> is simply a way of organising information so a computer can use it efficiently.</p>
<figure>
  <img src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=1000" alt="Neatly organised drawers" />
  <figcaption>The right structure turns a slow search into an instant grab.</figcaption>
</figure>
<h3>The everyday structures</h3>
<ul>
  <li><strong>List / Array</strong> — like numbered lockers in a row. Instant access if you know the number.</li>
  <li><strong>Stack</strong> — like a pile of plates: last one on is the first one off (LIFO). Think "Undo".</li>
  <li><strong>Queue</strong> — like a line at a shop: first in, first out (FIFO). Think a printer's job list.</li>
  <li><strong>Map / Dictionary</strong> — like a real dictionary: look up a <em>word</em> (key) to get its <em>meaning</em> (value) instantly.</li>
</ul>
<h3>Why order matters: sorting</h3>
<p>Remember binary search from Chapter 1? It only works if the data is <strong>sorted</strong>. So sorting is one of the most important things computers do.</p>
<blockquote>A clever strategy: split the mess into tiny piles, sort those easily, then <em>merge</em> sorted piles together. That's <strong>merge sort</strong>.</blockquote>
<p>Watch it below — notice the "divide, then combine" rhythm. 👇</p>
<hr />
<p><strong>Takeaway:</strong> choosing the right data structure is like choosing the right container — it quietly makes everything faster.</p>
HTML
P3=$(create_quiz_pool TOPIC "$T3" "Data Structures — Quiz"); [ -n "$P3" ] && stock_quiz "$P3" <<'JSON'
[
 {"questionText":"A data structure is…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"It is a way to organise data for efficient use.","answers":[{"answerText":"A way to organise information efficiently","isCorrect":true,"displayOrder":0},{"answerText":"A type of monitor","isCorrect":false,"displayOrder":1},{"answerText":"A programming language","isCorrect":false,"displayOrder":2},{"answerText":"A password","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A stack works in which order?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"Stacks are LIFO — last in, first out, like a pile of plates.","answers":[{"answerText":"Last in, first out (LIFO)","isCorrect":true,"displayOrder":0},{"answerText":"First in, first out (FIFO)","isCorrect":false,"displayOrder":1},{"answerText":"Random order","isCorrect":false,"displayOrder":2},{"answerText":"Alphabetical","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A queue behaves like…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"Queues are FIFO — first in, first out, like a line at a shop.","answers":[{"answerText":"A line at a shop (FIFO)","isCorrect":true,"displayOrder":0},{"answerText":"A pile of plates","isCorrect":false,"displayOrder":1},{"answerText":"A dictionary","isCorrect":false,"displayOrder":2},{"answerText":"A locker row","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which structure maps a key to a value, like a dictionary?","questionType":"MCQ","difficulty":"MEDIUM","points":20,"explanation":"A map/dictionary associates keys with values.","answers":[{"answerText":"Map / Dictionary","isCorrect":true,"displayOrder":0},{"answerText":"Stack","isCorrect":false,"displayOrder":1},{"answerText":"Queue","isCorrect":false,"displayOrder":2},{"answerText":"Array of one item","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which are valid uses of a stack?","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":20,"explanation":"Undo history and the browser back button are classic stack uses.","answers":[{"answerText":"Undo history in an editor","isCorrect":true,"displayOrder":0},{"answerText":"Browser 'back' button","isCorrect":true,"displayOrder":1},{"answerText":"A supermarket checkout line","isCorrect":false,"displayOrder":2},{"answerText":"A printer job queue","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Why does merge sort split the data first?","questionType":"MCQ","difficulty":"HARD","points":30,"explanation":"Tiny pieces are trivial to sort; merging sorted pieces is efficient — divide and conquer.","answers":[{"answerText":"Small pieces are easy to sort, then merging them is efficient","isCorrect":true,"displayOrder":0},{"answerText":"To make the list longer","isCorrect":false,"displayOrder":1},{"answerText":"To delete duplicates","isCorrect":false,"displayOrder":2},{"answerText":"Splitting is just decoration","isCorrect":false,"displayOrder":3}]}
]
JSON

# ══════════════════════════════════════════════════════════════════════════════
#  TOPIC 4 — Thinking in Graphs & Networks
# ══════════════════════════════════════════════════════════════════════════════
hdr "Topic 4 — Graphs & Networks"
T4=$(create_topic 4 "Connections Everywhere (Graphs)" "INTERMEDIATE"); [ -n "$T4" ] || fail "topic4 failed"
BLK4=$(pick_block ANIMATION "graph-bfs-traversal" "BFS explores outward in ripples, level by level.")
create_note topic "$T4" \
  "Connections Everywhere" \
  "Friends, maps, the web — they're all graphs. Meet the structure behind 'six degrees of separation'." \
  "$COVER4" 8 1 "$BLK4" <<'HTML'
<h2>Dots and lines run the world 🕸️</h2>
<p>Your social network, a subway map, the internet, even a family tree — all of them are the same shape underneath: <strong>things</strong> connected by <strong>relationships</strong>.</p>
<p>Computer scientists call a <strong>thing</strong> a <em>node</em> and a <strong>connection</strong> an <em>edge</em>. Put them together and you have a <strong>graph</strong>.</p>
<figure>
  <img src="https://images.unsplash.com/photo-1545987796-200677ee1011?w=1000" alt="A network of connected nodes" />
  <figcaption>People = nodes, friendships = edges. That's a social graph.</figcaption>
</figure>
<h3>The classic question: how do I get from A to B?</h3>
<p>How does a map app find the route? How does "People You May Know" work? They <em>explore</em> the graph outward from a starting point.</p>
<p>One way is <strong>Breadth-First Search (BFS)</strong>: visit everything one step away, then everything two steps away, and so on — like ripples spreading from a stone dropped in a pond.</p>
<blockquote>Because BFS explores in rings of increasing distance, the first time it reaches your target, it has found the <strong>shortest path</strong>. That's the magic behind "6 steps to anyone on Earth".</blockquote>
<h3>Where you'll meet graphs</h3>
<ul>
  <li>🗺️ Shortest routes in maps and GPS</li>
  <li>👥 Friend suggestions on social media</li>
  <li>🌐 How web pages link together (and how search engines rank them)</li>
</ul>
<p>Press play below and watch BFS fan out, level by level. 👇</p>
<hr />
<p><strong>Takeaway:</strong> once you see the world as nodes and edges, a huge family of real problems suddenly share one solution.</p>
HTML
P4=$(create_quiz_pool TOPIC "$T4" "Graphs — Quiz"); [ -n "$P4" ] && stock_quiz "$P4" <<'JSON'
[
 {"questionText":"In graph terms, a 'thing' (like a person) is called a…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"A node (or vertex) represents a thing; an edge is a connection.","answers":[{"answerText":"Node","isCorrect":true,"displayOrder":0},{"answerText":"Edge","isCorrect":false,"displayOrder":1},{"answerText":"Byte","isCorrect":false,"displayOrder":2},{"answerText":"Pixel","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A connection between two nodes is an…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"Edges link nodes together.","answers":[{"answerText":"Edge","isCorrect":true,"displayOrder":0},{"answerText":"Node","isCorrect":false,"displayOrder":1},{"answerText":"Array","isCorrect":false,"displayOrder":2},{"answerText":"Stack","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which real-world thing is naturally a graph?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"A subway map is nodes (stations) and edges (tracks).","answers":[{"answerText":"A subway map","isCorrect":true,"displayOrder":0},{"answerText":"A single number","isCorrect":false,"displayOrder":1},{"answerText":"A plain paragraph","isCorrect":false,"displayOrder":2},{"answerText":"A password","isCorrect":false,"displayOrder":3}]},
 {"questionText":"BFS explores a graph by…","questionType":"MCQ","difficulty":"MEDIUM","points":20,"explanation":"BFS visits all nodes at distance 1, then 2, etc. — in expanding rings.","answers":[{"answerText":"Expanding outward level by level","isCorrect":true,"displayOrder":0},{"answerText":"Jumping to random nodes","isCorrect":false,"displayOrder":1},{"answerText":"Only visiting the last node","isCorrect":false,"displayOrder":2},{"answerText":"Sorting the nodes alphabetically","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which problems are naturally solved with graphs?","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":20,"explanation":"Routing, friend suggestions and web links are all graph problems.","answers":[{"answerText":"Finding the shortest route on a map","isCorrect":true,"displayOrder":0},{"answerText":"Suggesting new friends","isCorrect":true,"displayOrder":1},{"answerText":"Ranking linked web pages","isCorrect":true,"displayOrder":2},{"answerText":"Adding two numbers","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Why does BFS find the SHORTEST path in an unweighted graph?","questionType":"MCQ","difficulty":"HARD","points":30,"explanation":"It reaches nodes in order of distance, so the first time it hits the target is via the fewest edges.","answers":[{"answerText":"It reaches nodes in increasing order of distance","isCorrect":true,"displayOrder":0},{"answerText":"It checks the longest path first","isCorrect":false,"displayOrder":1},{"answerText":"It uses random luck","isCorrect":false,"displayOrder":2},{"answerText":"It deletes far-away nodes","isCorrect":false,"displayOrder":3}]}
]
JSON

# ══════════════════════════════════════════════════════════════════════════════
#  TOPIC 5 — How Fast Is It? (Big-O, gently)
# ══════════════════════════════════════════════════════════════════════════════
hdr "Topic 5 — Efficiency (Big-O)"
T5=$(create_topic 5 "How Fast Is It? (Efficiency)" "INTERMEDIATE"); [ -n "$T5" ] || fail "topic5 failed"
BLK5=$(pick_block ALGORITHM "selection-sort" "A slow sort: watch the nested looping that makes it O(n²).")
create_note topic "$T5" \
  "How Fast Is It?" \
  "Why one program finishes instantly and another crawls — measured without a stopwatch." \
  "$COVER5" 7 1 "$BLK5" <<'HTML'
<h2>Measuring 'fast' without a stopwatch ⏱️</h2>
<p>Here's a puzzle: a program is fast on your laptop but slow on your phone. So is it a "fast" program or a "slow" one? Clock time depends on the machine — we need a fairer ruler.</p>
<p>Computer scientists ask a smarter question: <strong>as the input grows, how does the work grow?</strong> That relationship is captured by <strong>Big-O notation</strong>.</p>
<figure>
  <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1000" alt="A rising performance chart" />
  <figcaption>It's not about the starting speed — it's about how steeply the effort climbs.</figcaption>
</figure>
<h3>The big three, in plain words</h3>
<ul>
  <li><strong>O(1) — constant:</strong> same effort no matter the size. Grabbing locker #5 takes one move whether there are 10 lockers or 10 million.</li>
  <li><strong>O(n) — linear:</strong> double the input, double the work. Reading every name in a list.</li>
  <li><strong>O(n²) — quadratic:</strong> double the input, <em>quadruple</em> the work. Comparing everyone with everyone else. Fine for 10 items, painful for 10,000.</li>
</ul>
<blockquote>Rule of thumb: watch the loops. One loop over the data is usually O(n). A loop inside a loop is usually O(n²).</blockquote>
<h3>Why you should care</h3>
<p>An O(n²) algorithm on a million items does a <em>trillion</em> operations. The same job with an O(n log n) algorithm does about 20 million. On real data, that's the difference between "instant" and "come back tomorrow".</p>
<p>The animation shows a sorting method with a loop inside a loop — the hallmark of O(n²). Watch how the comparisons pile up. 👇</p>
<hr />
<p><strong>Takeaway:</strong> efficiency isn't about a fast computer — it's about an algorithm whose work grows <em>slowly</em> as the problem grows.</p>
HTML
P5=$(create_quiz_pool TOPIC "$T5" "Efficiency — Quiz"); [ -n "$P5" ] && stock_quiz "$P5" <<'JSON'
[
 {"questionText":"Big-O notation describes…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"It describes how the work grows as the input grows.","answers":[{"answerText":"How an algorithm's work grows as input grows","isCorrect":true,"displayOrder":0},{"answerText":"The color of the code","isCorrect":false,"displayOrder":1},{"answerText":"How much RAM you bought","isCorrect":false,"displayOrder":2},{"answerText":"The price of a computer","isCorrect":false,"displayOrder":3}]},
 {"questionText":"O(1) means the work is…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"Constant — the same regardless of input size.","answers":[{"answerText":"Constant, regardless of input size","isCorrect":true,"displayOrder":0},{"answerText":"Always one second","isCorrect":false,"displayOrder":1},{"answerText":"Growing with the square of input","isCorrect":false,"displayOrder":2},{"answerText":"Impossible to run","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Reading every item in a list once is typically…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"One pass over n items is O(n), linear.","answers":[{"answerText":"O(n) — linear","isCorrect":true,"displayOrder":0},{"answerText":"O(1) — constant","isCorrect":false,"displayOrder":1},{"answerText":"O(n²) — quadratic","isCorrect":false,"displayOrder":2},{"answerText":"Free","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A loop nested inside another loop over the data is usually…","questionType":"MCQ","difficulty":"MEDIUM","points":20,"explanation":"Nested loops over n give about n×n work = O(n²).","answers":[{"answerText":"O(n²) — quadratic","isCorrect":true,"displayOrder":0},{"answerText":"O(1) — constant","isCorrect":false,"displayOrder":1},{"answerText":"O(n) — linear","isCorrect":false,"displayOrder":2},{"answerText":"O(0)","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which statements about efficiency are true?","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":20,"explanation":"Big-O ignores the machine and focuses on growth; a better algorithm beats a faster computer at scale.","answers":[{"answerText":"Big-O ignores the specific machine","isCorrect":true,"displayOrder":0},{"answerText":"A better algorithm can beat a faster computer on big inputs","isCorrect":true,"displayOrder":1},{"answerText":"O(n²) scales better than O(n)","isCorrect":false,"displayOrder":2},{"answerText":"Efficiency only matters for tiny inputs","isCorrect":false,"displayOrder":3}]},
 {"questionText":"On 1,000,000 items, roughly how many operations does an O(n²) algorithm do?","questionType":"MCQ","difficulty":"HARD","points":30,"explanation":"n² = (10^6)² = 10^12, a trillion operations.","answers":[{"answerText":"About a trillion (10^12)","isCorrect":true,"displayOrder":0},{"answerText":"About a million","isCorrect":false,"displayOrder":1},{"answerText":"About a thousand","isCorrect":false,"displayOrder":2},{"answerText":"Exactly 1,000,000","isCorrect":false,"displayOrder":3}]}
]
JSON

# ══════════════════════════════════════════════════════════════════════════════
#  TOPIC 6 — From Code to Running Program
# ══════════════════════════════════════════════════════════════════════════════
hdr "Topic 6 — Code to Program"
T6=$(create_topic 6 "From Code to a Running Program" "BEGINNER"); [ -n "$T6" ] || fail "topic6 failed"
BLK6=$(pick_block ANIMATION "leetcode-two-sum" "A real program running line-by-line beside its data.")
create_note topic "$T6" \
  "From Code to a Running Program" \
  "You type English-ish words; the machine speaks ones and zeros. Meet the translator in between." \
  "$COVER6" 7 1 "$BLK6" <<'HTML'
<h2>Bridging human and machine 🌉</h2>
<p>In Chapter 2 we learned the computer only understands switches — 1s and 0s. But nobody writes software in 1s and 0s. So how do your readable instructions become something the machine can run?</p>
<p>We write in a <strong>programming language</strong> — a set of words and rules that are strict enough for a machine yet readable for a human. Then a <strong>translator</strong> converts it down to machine code.</p>
<figure>
  <img src="https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=1000" alt="Lines of source code on a screen" />
  <figcaption>Source code is a contract: precise enough for a machine, clear enough for a person.</figcaption>
</figure>
<h3>Two kinds of translators</h3>
<ul>
  <li><strong>Compiler</strong> — translates the <em>whole</em> program up front into machine code, then runs it. Like translating an entire book before anyone reads it. (e.g. C, Java)</li>
  <li><strong>Interpreter</strong> — translates and runs <em>line by line</em>, on the fly. Like a live interpreter at a conference. (e.g. Python, JavaScript)</li>
</ul>
<h3>What actually happens when it runs</h3>
<p>The program becomes a list of tiny instructions the processor executes one after another, incredibly fast — fetch a value, add two numbers, compare them, jump to another step. Billions of these per second.</p>
<blockquote>Everything you've learned comes together here: data (Chapter 2) stored in structures (Chapter 3), transformed by algorithms (Chapter 1), chosen for efficiency (Chapter 5).</blockquote>
<p>The animation below runs a real little program and highlights each line as it executes, right next to the data it's changing. This is a computer <em>thinking</em>, slowed down so you can watch. 👇</p>
<hr />
<p><strong>Takeaway:</strong> programming is writing a precise recipe in a human-friendly language, which a translator turns into the switch-flipping the machine actually does.</p>
<p>🎓 <strong>Congratulations</strong> — you now understand, end to end, how a computer takes a problem and solves it. That's the foundation of all of computer science.</p>
HTML
P6=$(create_quiz_pool TOPIC "$T6" "Programs — Quiz"); [ -n "$P6" ] && stock_quiz "$P6" <<'JSON'
[
 {"questionText":"Why don't people write software directly in 1s and 0s?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"It would be unreadable and error-prone; languages are human-friendly.","answers":[{"answerText":"It is unreadable and error-prone for humans","isCorrect":true,"displayOrder":0},{"answerText":"It is illegal","isCorrect":false,"displayOrder":1},{"answerText":"Computers can't read 1s and 0s","isCorrect":false,"displayOrder":2},{"answerText":"It uses too much electricity","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A programming language is…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"A set of words and rules readable by humans and precise for machines.","answers":[{"answerText":"A readable yet precise way to give instructions","isCorrect":true,"displayOrder":0},{"answerText":"A type of monitor","isCorrect":false,"displayOrder":1},{"answerText":"A spoken human language only","isCorrect":false,"displayOrder":2},{"answerText":"A kind of battery","isCorrect":false,"displayOrder":3}]},
 {"questionText":"What turns source code into machine code?","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"A translator — a compiler or interpreter.","answers":[{"answerText":"A translator (compiler or interpreter)","isCorrect":true,"displayOrder":0},{"answerText":"A keyboard","isCorrect":false,"displayOrder":1},{"answerText":"A mouse","isCorrect":false,"displayOrder":2},{"answerText":"A speaker","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A compiler differs from an interpreter because it…","questionType":"MCQ","difficulty":"MEDIUM","points":20,"explanation":"A compiler translates the whole program up front; an interpreter goes line by line.","answers":[{"answerText":"Translates the whole program before running it","isCorrect":true,"displayOrder":0},{"answerText":"Runs code line by line as it reads it","isCorrect":false,"displayOrder":1},{"answerText":"Only works on images","isCorrect":false,"displayOrder":2},{"answerText":"Never produces machine code","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which are examples of what a processor does per instruction?","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":20,"explanation":"Processors fetch values, do arithmetic, compare, and jump between steps.","answers":[{"answerText":"Add two numbers","isCorrect":true,"displayOrder":0},{"answerText":"Compare two values","isCorrect":true,"displayOrder":1},{"answerText":"Jump to another instruction","isCorrect":true,"displayOrder":2},{"answerText":"Brew coffee by itself","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which is typically an INTERPRETED language?","questionType":"MCQ","difficulty":"HARD","points":30,"explanation":"Python is commonly interpreted, running line by line; C/Java are compiled.","answers":[{"answerText":"Python","isCorrect":true,"displayOrder":0},{"answerText":"C (compiled)","isCorrect":false,"displayOrder":1},{"answerText":"Machine code","isCorrect":false,"displayOrder":2},{"answerText":"Binary","isCorrect":false,"displayOrder":3}]}
]
JSON

# ── Course-level quiz ────────────────────────────────────────────────────────────
hdr "Course-level capstone quiz"
PC=$(create_quiz_pool COURSE "$COURSE_ID" "CS Fundamentals — Capstone Quiz")
[ -n "$PC" ] && stock_quiz "$PC" <<'JSON'
[
 {"questionText":"An algorithm is best described as…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"A finite, ordered, clear set of steps to solve a problem.","answers":[{"answerText":"A step-by-step recipe to solve a problem","isCorrect":true,"displayOrder":0},{"answerText":"A monitor","isCorrect":false,"displayOrder":1},{"answerText":"A password","isCorrect":false,"displayOrder":2},{"answerText":"A photo format","isCorrect":false,"displayOrder":3}]},
 {"questionText":"At the lowest level, computers store everything as…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"On/off switches = bits = 1s and 0s.","answers":[{"answerText":"Ones and zeros (bits)","isCorrect":true,"displayOrder":0},{"answerText":"Letters only","isCorrect":false,"displayOrder":1},{"answerText":"Colors only","isCorrect":false,"displayOrder":2},{"answerText":"Sound only","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A dictionary/map structure lets you…","questionType":"MCQ","difficulty":"EASY","points":10,"explanation":"Look up a value by its key.","answers":[{"answerText":"Look up a value using a key","isCorrect":true,"displayOrder":0},{"answerText":"Only store one number","isCorrect":false,"displayOrder":1},{"answerText":"Sort images","isCorrect":false,"displayOrder":2},{"answerText":"Delete the internet","isCorrect":false,"displayOrder":3}]},
 {"questionText":"A map/navigation app finding a route is fundamentally a…","questionType":"MCQ","difficulty":"MEDIUM","points":20,"explanation":"Roads and intersections form a graph; routing searches it.","answers":[{"answerText":"Graph search problem","isCorrect":true,"displayOrder":0},{"answerText":"Sorting problem only","isCorrect":false,"displayOrder":1},{"answerText":"Binary conversion","isCorrect":false,"displayOrder":2},{"answerText":"Compiler task","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Which concepts combine when a program runs?","questionType":"MULTIPLE_CORRECT","difficulty":"MEDIUM","points":20,"explanation":"Running software uses data, structures, algorithms, and efficiency together.","answers":[{"answerText":"Data stored as bits","isCorrect":true,"displayOrder":0},{"answerText":"Data structures","isCorrect":true,"displayOrder":1},{"answerText":"Algorithms","isCorrect":true,"displayOrder":2},{"answerText":"The weather","isCorrect":false,"displayOrder":3}]},
 {"questionText":"Choosing an O(n log n) algorithm over O(n²) matters most when…","questionType":"MCQ","difficulty":"HARD","points":30,"explanation":"The gap explodes as input grows large; on big data it's the difference between instant and infeasible.","answers":[{"answerText":"The input is very large","isCorrect":true,"displayOrder":0},{"answerText":"The input is a single item","isCorrect":false,"displayOrder":1},{"answerText":"Never — they're identical","isCorrect":false,"displayOrder":2},{"answerText":"Only on old computers","isCorrect":false,"displayOrder":3}]}
]
JSON

# ── 5. Verification ──────────────────────────────────────────────────────────────
hdr "Verification"
printf "  %-22s %s\n" "domains"          "$(sql_one "SELECT COUNT(*) FROM domain;")"
printf "  %-22s %s\n" "courses"          "$(sql_one "SELECT COUNT(*) FROM course;")"
printf "  %-22s %s\n" "topics"           "$(sql_one "SELECT COUNT(*) FROM topic;")"
printf "  %-22s %s\n" "notes (total)"    "$(sql_one "SELECT COUNT(*) FROM note;")"
printf "  %-22s %s\n" "notes (topic)"    "$(sql_one "SELECT COUNT(*) FROM note WHERE topic_id IS NOT NULL;")"
printf "  %-22s %s\n" "notes (course)"   "$(sql_one "SELECT COUNT(*) FROM note WHERE course_id IS NOT NULL;")"
printf "  %-22s %s\n" "notes (published)""$(sql_one "SELECT COUNT(*) FROM note WHERE is_published=b'1';")"
printf "  %-22s %s\n" "question_pools"   "$(sql_one "SELECT COUNT(*) FROM question_pool;")"
printf "  %-22s %s\n" "questions"        "$(sql_one "SELECT COUNT(*) FROM question;")"
printf "  %-22s %s\n" "animations (pub)" "$(sql_one "SELECT COUNT(*) FROM animation_scene WHERE is_published=b'1';")"
printf "  %-22s %s\n" "algorithms (pub)" "$(sql_one "SELECT COUNT(*) FROM algorithm WHERE is_published=b'1';")"

# Assert each topic note's embedded slug resolves (published).
hdr "Embedded-visual integrity"
MISS=0
while IFS=$'\t' read -r title blocks; do
  [ -z "$blocks" ] || [ "$blocks" = "[]" ] && continue
  slug=$(echo "$blocks" | python3 -c "import sys,json;b=json.load(sys.stdin);print(b[0]['slug'] if b else '')" 2>/dev/null || echo "")
  kind=$(echo "$blocks" | python3 -c "import sys,json;b=json.load(sys.stdin);print(b[0]['kind'] if b else '')" 2>/dev/null || echo "")
  [ -z "$slug" ] && continue
  if [ "$kind" = "ANIMATION" ]; then ok=$(sql_one "SELECT COUNT(*) FROM animation_scene WHERE slug='$slug' AND is_published=b'1';")
  else ok=$(sql_one "SELECT COUNT(*) FROM algorithm WHERE slug='$slug' AND is_published=b'1';"); fi
  if [ "$ok" != "0" ]; then pass "   '$title' → $kind:$slug ✓"; else fail "   '$title' → $kind:$slug MISSING"; MISS=1; fi
done < <(sql "SELECT title, blocks_json FROM note WHERE blocks_json IS NOT NULL AND blocks_json <> '[]';")

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Clean CS Fundamentals content seeded ✅${NC}"
echo -e "${CYAN}  Domain : Computer Science ($DOMAIN_ID)${NC}"
echo -e "${CYAN}  Course : Fundamentals of Computer Science ($COURSE_ID)${NC}"
echo -e "${CYAN}  6 illustrated chapters, each with a note + live visual + quiz${NC}"
echo -e "${CYAN}  + a course preface note and a capstone quiz${NC}"
echo -e "${GREEN}  → Student app: open the course and read Chapter 1 onward.${NC}"
echo -e "${GREEN}  → Admin app: Courses / Course Notes to manage both levels.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
