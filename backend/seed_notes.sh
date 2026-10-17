#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_notes.sh
# -------------
# Smoke-tests the Notes (book-style lesson) feature end to end:
#   1. Admin login
#   2. Ensure a Domain → Course → Topic chain exists (reuses or creates)
#   3. Create a sample Note with rich HTML, an embedded image and an embedded
#      animation block (referenced by slug)
#   4. Publish it
#   5. Verify the student-facing list + full-body endpoints return it
#   6. Verify a DRAFT note is hidden from the student read endpoint
#
# Run the backend first:  cd backend && ./mvnw spring-boot:run
#
# Usage:   ./seed_notes.sh
#          BASE=http://localhost:8085 ADMIN_EMAIL=... ADMIN_PASS=... ./seed_notes.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="${BASE:-http://localhost:8085}"
ADMIN_EMAIL="${ADMIN_EMAIL:-unlearnarc@gmail.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"
API="$BASE/api/v1"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; exit 1; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

jqget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

# ── 1. Admin login ────────────────────────────────────────────────────────────
info "1. Admin login"
LOGIN=$(curl -sf -X POST "$API/auth/login" -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | jqget "['data']['accessToken']") || fail "login failed"
[ -n "$TOKEN" ] && pass "logged in" || fail "no token"
AUTH="Authorization: Bearer $TOKEN"

# ── 2. Domain → Course → Topic ─────────────────────────────────────────────────
# Idempotent: reuse an existing demo Course/Topic if a previous run created them,
# otherwise create the chain fresh. (curl -sf aborts on the 400 you'd get from a
# duplicate-name create, so we look things up first.)
info "2. Ensure Domain / Course / Topic"

# Find an existing "Notes Demo Course" (by name), else create it.
COURSE_ID=$(curl -sf "$API/courses" -H "$AUTH" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',[])
m=[c for c in d if c.get('name')=='Notes Demo Course']
print(m[0]['id'] if m else '')" 2>/dev/null || echo "")

if [ -z "$COURSE_ID" ]; then
  # Domain is only needed on first creation; ignore a duplicate-name 400.
  curl -s -X POST "$API/domains" -H "Content-Type: application/json" -H "$AUTH" \
    -d '{"name":"Notes Demo Domain"}' >/dev/null 2>&1 || true
  COURSE=$(curl -sf -X POST "$API/courses" -H "Content-Type: application/json" -H "$AUTH" \
    -d '{"name":"Notes Demo Course","imgUrl":1,"totalTime":"01:00:00","topicsCount":1,"level":"BEGINNER"}')
  COURSE_ID=$(echo "$COURSE" | jqget "['data']['id']")
fi
[ -n "$COURSE_ID" ] || fail "could not resolve demo course"

# Find an existing topic under that course, else create one.
TOPIC_ID=$(curl -sf "$API/topics/by-course/$COURSE_ID" -H "$AUTH" | python3 -c "
import sys,json
d=json.load(sys.stdin).get('data',[])
m=[t for t in d if t.get('name')=='Big-O Notation']
print(m[0]['id'] if m else (d[0]['id'] if d else ''))" 2>/dev/null || echo "")

if [ -z "$TOPIC_ID" ]; then
  TOPIC=$(curl -sf -X POST "$API/topics" -H "Content-Type: application/json" -H "$AUTH" \
    -d "{\"name\":\"Big-O Notation\",\"time\":\"00:20:00\",\"topicOrder\":1,\"level\":\"BEGINNER\",\"courseId\":\"$COURSE_ID\"}")
  TOPIC_ID=$(echo "$TOPIC" | jqget "['data']['id']")
fi
[ -n "$TOPIC_ID" ] || fail "could not resolve demo topic"
pass "course=$COURSE_ID topic=$TOPIC_ID"

# ── 3. Find a published animation slug to embed (optional) ──────────────────────
info "3. Look for a published animation to embed"
SCENES=$(curl -sf "$API/animation-scenes/published" -H "$AUTH" || echo '{"data":[]}')
SLUG=$(echo "$SCENES" | python3 -c "import sys,json;d=json.load(sys.stdin).get('data',[]);print(d[0]['slug'] if d else '')" 2>/dev/null || echo "")
if [ -n "$SLUG" ]; then
  BLOCKS="[{\"kind\":\"ANIMATION\",\"slug\":\"$SLUG\",\"caption\":\"Watch it run step by step\"}]"
  pass "embedding animation slug: $SLUG"
else
  BLOCKS="[]"
  info "no published animation found — note will have no embedded visual"
fi

# ── 3b. Clean any notes from a previous run (keep the script idempotent) ────────
info "3b. Remove existing demo notes on this topic/course"
for scope in "topic/$TOPIC_ID" "course/$COURSE_ID"; do
  curl -sf "$API/notes/admin/$scope" -H "$AUTH" \
    | python3 -c "import sys,json;[print(n['id']) for n in json.load(sys.stdin).get('data',[])]" 2>/dev/null \
    | while read -r nid; do
        [ -n "$nid" ] && curl -s -X DELETE "$API/notes/$nid" -H "$AUTH" >/dev/null 2>&1 || true
      done
done
pass "old demo notes cleared"

# ── 4. Create the sample note (published) ──────────────────────────────────────
info "4. Create sample note"
read -r -d '' CONTENT <<'HTML' || true
<h2>What is Big-O Notation?</h2>
<p><strong>Big-O</strong> describes how an algorithm's running time grows as the input size <em>n</em> grows. It is the language we use to compare algorithms independent of hardware.</p>
<figure>
  <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Comparison_computational_complexity.svg" alt="Growth of common complexity classes" />
  <figcaption>Common complexity classes, from O(1) to O(n!).</figcaption>
</figure>
<h3>The classes you must know</h3>
<ul>
  <li><strong>O(1)</strong> — constant: array index access.</li>
  <li><strong>O(log n)</strong> — logarithmic: binary search.</li>
  <li><strong>O(n)</strong> — linear: a single loop over the input.</li>
  <li><strong>O(n log n)</strong> — merge sort, quick sort (average).</li>
  <li><strong>O(n²)</strong> — nested loops: bubble sort.</li>
</ul>
<blockquote>Rule of thumb: drop constants and keep only the fastest-growing term.</blockquote>
<hr />
<p>Read on, then watch the embedded visualization below to see it in action.</p>
HTML

# Build the JSON payload safely with python (escapes the HTML + blocks).
PAYLOAD=$(python3 - "$TOPIC_ID" "$CONTENT" "$BLOCKS" <<'PY'
import json, sys
topic_id, content, blocks = sys.argv[1], sys.argv[2], sys.argv[3]
print(json.dumps({
    "title": "Big-O Notation — A Visual Primer",
    "summary": "Understand algorithmic complexity with pictures and a live animation.",
    "contentHtml": content,
    "coverImageUrl": "https://images.unsplash.com/photo-1526379095098-d400fd0bf935?w=1200",
    "blocksJson": blocks,
    "topicId": topic_id,
    "noteOrder": 1,
    "readMinutes": 6,
    "isPublished": True,
}))
PY
)
NOTE=$(curl -sf -X POST "$API/notes" -H "Content-Type: application/json" -H "$AUTH" -d "$PAYLOAD")
NOTE_ID=$(echo "$NOTE" | jqget "['data']['id']")
[ -n "$NOTE_ID" ] && pass "note created: $NOTE_ID" || fail "note create failed: $NOTE"

# ── 5. Create a DRAFT note (should be hidden from students) ─────────────────────
info "5. Create a draft note"
DRAFT=$(curl -sf -X POST "$API/notes" -H "Content-Type: application/json" -H "$AUTH" -d "$(python3 - "$TOPIC_ID" <<'PY'
import json,sys
print(json.dumps({
    "title":"(Draft) Amortized Analysis",
    "contentHtml":"<p>Still being written…</p>",
    "topicId":sys.argv[1],
    "noteOrder":2,
    "isPublished":False,
}))
PY
)")
DRAFT_ID=$(echo "$DRAFT" | jqget "['data']['id']")
pass "draft created: $DRAFT_ID"

# ── 5b. Create a COURSE-level note (published) ──────────────────────────────────
# Notes support BOTH topic- and course-level scoping; seed one of each so the
# student Course detail page shows the "Course lessons" section too.
info "5b. Create a course-level note"
CNOTE=$(curl -sf -X POST "$API/notes" -H "Content-Type: application/json" -H "$AUTH" -d "$(python3 - "$COURSE_ID" <<'PY'
import json,sys
print(json.dumps({
    "title":"Course Overview — How to Study This Course",
    "summary":"A course-wide guide that spans every topic.",
    "contentHtml":"<h2>Welcome 👋</h2><p>This is a <strong>course-level</strong> note — it is not tied to any single topic. Use it as the book's preface.</p><ul><li>Start with Big-O Notation</li><li>Practice with the embedded visualizers</li></ul>",
    "coverImageUrl":"https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=1200",
    "courseId":sys.argv[1],
    "noteOrder":1,
    "readMinutes":3,
    "isPublished":True,
}))
PY
)")
CNOTE_ID=$(echo "$CNOTE" | jqget "['data']['id']")
[ -n "$CNOTE_ID" ] && pass "course-level note created: $CNOTE_ID" || fail "course note create failed: $CNOTE"

info "   verify course-level list"
CLIST=$(curl -sf "$API/notes/course/$COURSE_ID" -H "$AUTH")
echo "$CLIST" | python3 -c "import sys,json;ids=[n['id'] for n in json.load(sys.stdin)['data']];assert '$CNOTE_ID' in ids" \
  && pass "course note visible to students" || fail "course note not returned"

# ── 6. Student-facing verifications ─────────────────────────────────────────────
info "6. Verify student list returns ONLY the published note"
LIST=$(curl -sf "$API/notes/topic/$TOPIC_ID" -H "$AUTH")
COUNT=$(echo "$LIST" | python3 -c "import sys,json;print(len(json.load(sys.stdin)['data']))")
IDS=$(echo "$LIST" | python3 -c "import sys,json;print([n['id'] for n in json.load(sys.stdin)['data']])")
if echo "$IDS" | grep -q "$NOTE_ID" && ! echo "$IDS" | grep -q "$DRAFT_ID"; then
  pass "published visible, draft hidden ($COUNT note(s) returned)"
else
  fail "visibility wrong — ids=$IDS"
fi

info "   full body fetch"
FULL=$(curl -sf "$API/notes/$NOTE_ID" -H "$AUTH")
HAS_HTML=$(echo "$FULL" | python3 -c "import sys,json;print('Big-O' in json.load(sys.stdin)['data']['contentHtml'])")
[ "$HAS_HTML" = "True" ] && pass "full body returns rich HTML" || fail "body missing content"

info "   sanitizer kept <img> / <figure>"
KEPT=$(echo "$FULL" | python3 -c "import sys,json;h=json.load(sys.stdin)['data']['contentHtml'];print('<img' in h and '<figure' in h)")
[ "$KEPT" = "True" ] && pass "images/figures survived sanitization" || info "note: sanitizer stripped img/figure (check allow-list)"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Notes smoke test passed ✅${NC}"
echo -e "${CYAN}  Topic-level note  : $NOTE_ID${NC}"
echo -e "${CYAN}  Course-level note : $CNOTE_ID${NC}"
echo -e "${CYAN}  Course id         : $COURSE_ID${NC}"
echo -e "${CYAN}  Topic id          : $TOPIC_ID${NC}"
echo -e "${CYAN}  → Open the course in the student app to read both.${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
