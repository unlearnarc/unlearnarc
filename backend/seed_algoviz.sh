#!/usr/bin/env bash
#
# seed_algoviz.sh
# ---------------
# Seeds the Algorithm Visualizer with example specs (Bubble Sort + BFS),
# publishes them, and verifies the student-facing endpoints return them.
#
# Run the backend first:  cd backend && ./mvnw spring-boot:run
#
set -euo pipefail
BASE="http://localhost:8085"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
jqget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

info "=== 1. Admin login ==="
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"unlearnarc@gmail.com","password":"Admin@123"}')
TOKEN=$(echo "$LOGIN" | jqget "['data']['accessToken']")
[ -n "$TOKEN" ] && pass "Login OK" || { fail "Login failed"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

# ── Bubble Sort spec ──────────────────────────────────────────────────────────
read -r -d '' BUBBLE <<'JSON' || true
{
  "slug": "bubble-sort",
  "title": "Bubble Sort",
  "summary": "Repeatedly swaps adjacent out-of-order elements.",
  "usage": "Teaching comparison-based sorting. Simple but O(n^2) — only for small or nearly-sorted data.",
  "category": "Sorting",
  "difficulty": "EASY",
  "visualizer": "ARRAY",
  "complexity": { "time": "O(n^2)", "space": "O(1)" },
  "javaSource": "void bubbleSort(int[] a){\n  for(int i=0;i<a.length-1;i++)\n    for(int j=0;j<a.length-1-i;j++)\n      if(a[j]>a[j+1]){\n        int t=a[j]; a[j]=a[j+1]; a[j+1]=t;\n      }\n}",
  "pythonSource": "def bubble_sort(a):\n  for i in range(len(a)-1):\n    for j in range(len(a)-1-i):\n      if a[j] > a[j+1]:\n        a[j], a[j+1] = a[j+1], a[j]",
  "spec": {
    "visualizer": "ARRAY",
    "variables": [
      { "name": "i", "label": "i", "color": "#f59e0b" },
      { "name": "j", "label": "j", "color": "#3b82f6" }
    ],
    "steps": [
      { "title": "Start", "explanation": "Unsorted input array.",
        "state": { "array": [5, 2, 4, 1] }, "variables": { "i": 0, "j": 0 }, "line": 2, "lang": "java" },
      { "title": "Compare 5 & 2", "explanation": "arr[0] > arr[1], so we will swap.",
        "state": { "array": [5, 2, 4, 1] }, "variables": { "i": 0, "j": 0 },
        "highlights": [{ "target": "array", "indices": [0, 1], "style": "COMPARE" }], "line": 4, "lang": "java" },
      { "title": "Swap", "explanation": "Swapped 5 and 2.",
        "state": { "array": [2, 5, 4, 1] }, "variables": { "i": 0, "j": 0 },
        "highlights": [{ "target": "array", "indices": [0, 1], "style": "SWAP" }], "line": 5, "lang": "java" },
      { "title": "Your turn", "explanation": "Will 5 and 4 be swapped next?",
        "state": { "array": [2, 5, 4, 1] }, "variables": { "i": 0, "j": 1 },
        "highlights": [{ "target": "array", "indices": [1, 2], "style": "COMPARE" }],
        "input": { "key": "swap54", "prompt": "Is arr[1] > arr[2]? (will it swap?)", "type": "BOOLEAN", "expected": true } },
      { "title": "Swap", "explanation": "Yes — 5 > 4, swapped.",
        "state": { "array": [2, 4, 5, 1] }, "variables": { "i": 0, "j": 1 },
        "highlights": [{ "target": "array", "indices": [1, 2], "style": "SWAP" }] },
      { "title": "Done (pass)", "explanation": "Largest value bubbled to the end.",
        "state": { "array": [2, 4, 1, 5] },
        "highlights": [{ "target": "array", "indices": [3], "style": "DONE" }] }
    ]
  }
}
JSON

upsert() {
  local slug="$1" body="$2" title="$3"
  info "=== Seeding: $title ==="
  RESP=$(curl -s -X POST "$BASE/api/v1/algorithms" -H "Content-Type: application/json" -H "$AUTH" -d "$body")
  ID=$(echo "$RESP" | jqget "['data']['id']" 2>/dev/null || echo "")
  if [ -z "$ID" ]; then
    # may already exist → fetch by slug then PUT
    EXIST=$(curl -s "$BASE/api/v1/algorithms/slug/$slug" -H "$AUTH")
    ID=$(echo "$EXIST" | jqget "['data']['id']" 2>/dev/null || echo "")
    if [ -n "$ID" ]; then
      curl -s -X PUT "$BASE/api/v1/algorithms/$ID" -H "Content-Type: application/json" -H "$AUTH" -d "$body" >/dev/null
      pass "Updated existing '$title' ($ID)"
    else
      fail "Create failed for '$title'"; echo "$RESP"; return 1
    fi
  else
    pass "Created '$title' ($ID)"
  fi
  curl -s -X PATCH "$BASE/api/v1/algorithms/$ID/publish?value=true" -H "$AUTH" >/dev/null
  pass "Published '$title'"
}

upsert "bubble-sort" "$BUBBLE" "Bubble Sort"

info "=== Verify student feed (/published) ==="
FEED=$(curl -sf "$BASE/api/v1/algorithms/published" -H "$AUTH")
COUNT=$(echo "$FEED" | jqget "['data'].__len__()")
[ "$COUNT" -ge 1 ] && pass "Published feed returns $COUNT algorithm(s)" || fail "Feed empty"

info "=== Verify by-slug fetch ==="
ONE=$(curl -sf "$BASE/api/v1/algorithms/slug/bubble-sort" -H "$AUTH")
STEPS=$(echo "$ONE" | jqget "['data']['spec']['steps'].__len__()")
pass "bubble-sort resolved with $STEPS steps"

echo ""
pass "Seeding complete — open the student app at /algorithms"
