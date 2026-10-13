#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_animations.sh
# ------------------
# Seeds the Canvas Animation Engine with a gallery of scenes spanning every
# supported tutorial domain, publishes them, and verifies the student-facing
# endpoints return them.
#
# Architecture reminder (see canvasanim/*):
#   • A scene is either AUTHORED (client/admin supplies the full trace JSON) or
#     GENERATED (server runs a SceneSimulator by `kind` + params to build it).
#   • New simulators register themselves via Spring DI — no table/controller
#     changes. This script seeds one GENERATED scene per registered simulator
#     plus an AUTHORED scene to exercise both paths.
#
# Run the backend first:  cd backend && ./mvnw spring-boot:run
#
# Usage:   ./seed_animations.sh
#          BASE=http://localhost:8085 ADMIN_EMAIL=... ADMIN_PASS=... ./seed_animations.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="${BASE:-http://localhost:8085}"
ADMIN_EMAIL="${ADMIN_EMAIL:-unlearnarc@gmail.com}"
ADMIN_PASS="${ADMIN_PASS:-Admin@123}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
head() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }
jqget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

# ── 1. Admin login ──────────────────────────────────────────────────────────────
head "Admin login"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | jqget "['data']['accessToken']" 2>/dev/null || true)
[ -n "${TOKEN:-}" ] || { fail "Admin login failed"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
pass "Logged in as $ADMIN_EMAIL"

# ── 2. Discover available simulators (self-documenting registry) ─────────────────
head "Discover simulators"
SIMS=$(curl -sf "$BASE/api/v1/animation-scenes/simulators" -H "$AUTH")
echo "$SIMS" | python3 -c "
import sys, json
for s in json.load(sys.stdin)['data']:
    print(f\"  • {s['kind']:<18} {s['displayName']}\")
" || true

# ── helper: upsert a scene then publish ──────────────────────────────────────────
# upsert <slug> <json-body> <title>
upsert() {
  local slug="$1" body="$2" title="$3"
  info "Seeding: $title  ($slug)"
  local resp id
  resp=$(curl -s -X POST "$BASE/api/v1/animation-scenes" \
    -H "Content-Type: application/json" -H "$AUTH" -d "$body")
  id=$(echo "$resp" | jqget "['data']['id']" 2>/dev/null || echo "")
  if [ -z "$id" ]; then
    # Already exists → fetch by slug, then PUT update.
    local exist
    exist=$(curl -s "$BASE/api/v1/animation-scenes/slug/$slug" -H "$AUTH")
    id=$(echo "$exist" | jqget "['data']['id']" 2>/dev/null || echo "")
    if [ -n "$id" ]; then
      curl -s -X PUT "$BASE/api/v1/animation-scenes/$id" \
        -H "Content-Type: application/json" -H "$AUTH" -d "$body" >/dev/null
      pass "  Updated existing ($id)"
    else
      fail "  Create failed"; echo "$resp"; return 1
    fi
  else
    pass "  Created ($id)"
  fi
  curl -s -X PATCH "$BASE/api/v1/animation-scenes/$id/publish?value=true" -H "$AUTH" >/dev/null
  pass "  Published"
}

head "Seed scenes (one per domain)"

# ── S1: Concurrency — Atomic Compare-And-Swap (3 threads) ───────────────────────
upsert "atomic-cas-3-threads" "$(cat <<'EOF'
{
  "slug": "atomic-cas-3-threads",
  "title": "Atomic Compare-And-Swap — 3 Threads",
  "description": "Three threads race to increment a shared counter with a lock-free CAS loop. Watch one winner per round while the losers observe a stale read, fail their CAS, and retry.",
  "category": "CONCURRENCY",
  "source": "GENERATED",
  "kind": "atomic-cas",
  "simulatorParams": { "threads": 3 },
  "isPublished": true
}
EOF
)" "Atomic CAS — 3 Threads"

# ── S2: Concurrency — heavier contention (5 threads) ────────────────────────────
upsert "atomic-cas-5-threads" "$(cat <<'EOF'
{
  "slug": "atomic-cas-5-threads",
  "title": "Atomic Compare-And-Swap — High Contention",
  "description": "The same CAS loop under heavier contention (5 threads). Great for showing how retry storms grow as more threads fight over one cache line.",
  "category": "CONCURRENCY",
  "source": "GENERATED",
  "kind": "atomic-cas",
  "simulatorParams": { "threads": 5 },
  "isPublished": true
}
EOF
)" "Atomic CAS — 5 Threads"

# ── S3: DSA — Breadth-First Search ──────────────────────────────────────────────
upsert "graph-bfs-traversal" "$(cat <<'EOF'
{
  "slug": "graph-bfs-traversal",
  "title": "Breadth-First Search (BFS) Traversal",
  "description": "BFS explores a graph level by level using a FIFO queue. Nodes light up as they are discovered, dequeued, and finished — the canonical shortest-path-on-unweighted-graphs pattern.",
  "category": "DSA",
  "source": "GENERATED",
  "kind": "graph-bfs",
  "isPublished": true
}
EOF
)" "BFS Traversal"

# ── S4: AI/ML — Matrix Multiplication ───────────────────────────────────────────
upsert "matrix-multiply-dot-products" "$(cat <<'EOF'
{
  "slug": "matrix-multiply-dot-products",
  "title": "Matrix Multiplication — Dot Products",
  "description": "C = A·B computed one dot product at a time. Highlights the active row of A and column of B feeding each output cell — the core arithmetic behind dense neural-network layers.",
  "category": "AI_ML",
  "source": "GENERATED",
  "kind": "matrix-multiply",
  "isPublished": true
}
EOF
)" "Matrix Multiplication"

# ── S5: Database — SQL INNER JOIN ───────────────────────────────────────────────
upsert "sql-inner-join" "$(cat <<'EOF'
{
  "slug": "sql-inner-join",
  "title": "SQL INNER JOIN",
  "description": "Rows from two tables are matched on a join key; only pairs that satisfy the predicate flow into the result set. Shows exactly which rows survive an INNER JOIN.",
  "category": "DATABASE",
  "source": "GENERATED",
  "kind": "sql-inner-join",
  "isPublished": true
}
EOF
)" "SQL INNER JOIN"

# ── S6: System Design — Request Routing via Load Balancer ───────────────────────
upsert "request-routing-load-balancer" "$(cat <<'EOF'
{
  "slug": "request-routing-load-balancer",
  "title": "Request Routing through a Load Balancer",
  "description": "A read request travels Client → Load Balancer → Replica and back. Packets animate along each hop, illustrating fan-out, replica selection, and the response path.",
  "category": "SYSTEM_DESIGN",
  "source": "GENERATED",
  "kind": "request-routing",
  "isPublished": true
}
EOF
)" "Request Routing"

# ── S7: DSA problem WITH CODE — LeetCode Two Sum (runnable program) ─────────────
# GENERATED by the leetcode-two-sum simulator: the trace carries a runnable
# Python program whose lines highlight in lock-step with the array animation.
upsert "leetcode-two-sum" "$(cat <<'EOF'
{
  "slug": "leetcode-two-sum",
  "title": "LeetCode 1 — Two Sum (with code)",
  "description": "Teach a LeetCode problem end-to-end: the array animation and the Python solution highlight together, a checkpoint quizzes the learner, and the code is runnable in the sandbox.",
  "category": "DSA",
  "source": "GENERATED",
  "kind": "leetcode-two-sum",
  "simulatorParams": { "nums": "2,7,11,15", "target": 9 },
  "isPublished": true
}
EOF
)" "LeetCode Two Sum (with code)"

# ── S8: SQL query walk-through WITH CODE (AUTHORED, display-only SQL program) ────
# Proves authored scenes can ALSO carry a `programs` array — here a display-only
# SQL query that is highlighted clause-by-clause alongside the table animation.
upsert "sql-join-query-walkthrough" "$(cat <<'EOF'
{
  "slug": "sql-join-query-walkthrough",
  "title": "SQL — INNER JOIN, clause by clause (with code)",
  "description": "Walk a JOIN query line by line. The highlighted SQL clause tracks the current step as the two tables resolve into a joined result. SQL is display-only; highlighting still syncs to the timeline.",
  "category": "DATABASE",
  "source": "AUTHORED",
  "isPublished": true,
  "trace": {
    "id": "sql-join-query-walkthrough",
    "title": "SQL — INNER JOIN, clause by clause",
    "duration": 2600,
    "viewport": { "width": 720, "height": 340 },
    "category": "DATABASE",
    "theme": { "background": "#0F172A" },
    "notes": {
      "summary": "SQL is declarative: FROM/JOIN build the row set, ON/WHERE filter it, SELECT projects, ORDER BY sorts.",
      "whereToUse": ["Combining normalized tables on a foreign key.", "Reporting queries joining facts to dimensions."],
      "keyPoints": ["Logical order ≠ written order: FROM → JOIN/ON → WHERE → SELECT → ORDER BY.", "INNER JOIN drops rows with no match on either side."]
    },
    "programs": [
      {
        "id": "sql",
        "label": "Query",
        "language": "sql",
        "runnable": false,
        "explanation": "Read-along query. The highlighted clause matches the current step.",
        "source": "SELECT u.id, u.name, o.item\nFROM users AS u\nINNER JOIN orders AS o\n  ON u.id = o.user_id\nWHERE o.item IS NOT NULL\nORDER BY u.id;",
        "highlights": [
          { "time": 0,    "lines": [2],    "note": "FROM picks the driving table (users)." },
          { "time": 700,  "lines": [3, 4], "note": "INNER JOIN matches on the shared key." },
          { "time": 1400, "lines": [5],    "note": "WHERE prunes the joined rows." },
          { "time": 2000, "lines": [1, 6], "note": "SELECT projects columns; ORDER BY sorts." }
        ]
      }
    ],
    "instructions": [
      { "id": "i1", "time": 0,    "title": "FROM users", "detail": "Start from the users table." },
      { "id": "i2", "time": 700,  "title": "JOIN … ON",  "detail": "Match users to orders on the key." },
      { "id": "i3", "time": 1400, "title": "WHERE",      "detail": "Filter the joined rows." },
      { "id": "i4", "time": 2000, "title": "SELECT",     "detail": "Project and sort the result." }
    ],
    "checkpoints": [
      {
        "id": "cp1", "time": 1000, "kind": "single",
        "prompt": "orders has user_id = 5 but users has no id = 5. With INNER JOIN, that row…",
        "options": [
          { "id": "drop", "label": "is dropped (no match)" },
          { "id": "null", "label": "appears with NULL user columns" }
        ],
        "answer": "drop",
        "explanation": "INNER JOIN keeps only rows matched on both sides.",
        "hint": "LEFT JOIN would keep it with NULLs — INNER does not.",
        "blocking": false
      }
    ],
    "keyframes": [
      { "time": 0, "entities": {
          "users":  { "id": "users",  "shape": "table", "x": 40,  "y": 70, "width": 260, "color": "#2563EB", "meta": { "title": "users (u)",  "columns": ["id","name"],     "rows": [[1,"Ana"],[2,"Ben"],[3,"Cy"]] } },
          "orders": { "id": "orders", "shape": "table", "x": 420, "y": 70, "width": 260, "color": "#0EA5E9", "meta": { "title": "orders (o)", "columns": ["user_id","item"], "rows": [[1,"Book"],[2,"Pen"],[5,"Lamp"]] } }
        }, "caption": "FROM users AS u" },
      { "time": 700, "entities": {
          "users":  { "id": "users",  "shape": "table", "x": 40,  "y": 70, "width": 260, "color": "#2563EB", "meta": { "title": "users (u)",  "columns": ["id","name"],     "rows": [[1,"Ana"],[2,"Ben"],[3,"Cy"]], "highlightRow": 0 } },
          "orders": { "id": "orders", "shape": "table", "x": 420, "y": 70, "width": 260, "color": "#0EA5E9", "meta": { "title": "orders (o)", "columns": ["user_id","item"], "rows": [[1,"Book"],[2,"Pen"],[5,"Lamp"]], "highlightRow": 0 } }
        }, "connections": { "j": { "id": "j", "from": "users", "to": "orders", "color": "#16A34A", "label": "u.id = o.user_id" } }, "caption": "Join on u.id = o.user_id" },
      { "time": 1400, "entities": {
          "users":  { "id": "users",  "shape": "table", "x": 40,  "y": 70, "width": 260, "color": "#2563EB", "meta": { "title": "users (u)",  "columns": ["id","name"],     "rows": [[1,"Ana"],[2,"Ben"],[3,"Cy"]] } },
          "orders": { "id": "orders", "shape": "table", "x": 420, "y": 70, "width": 260, "color": "#0EA5E9", "meta": { "title": "orders (o)", "columns": ["user_id","item"], "rows": [[1,"Book"],[2,"Pen"],[5,"Lamp"]] } }
        }, "caption": "WHERE o.item IS NOT NULL" },
      { "time": 2000, "entities": {
          "users":  { "id": "users",  "shape": "table", "x": 40,  "y": 70, "width": 260, "color": "#2563EB", "meta": { "title": "users (u)",  "columns": ["id","name"],     "rows": [[1,"Ana"],[2,"Ben"],[3,"Cy"]] } },
          "orders": { "id": "orders", "shape": "table", "x": 420, "y": 70, "width": 260, "color": "#0EA5E9", "meta": { "title": "orders (o)", "columns": ["user_id","item"], "rows": [[1,"Book"],[2,"Pen"],[5,"Lamp"]] } },
          "result": { "id": "result", "shape": "table", "x": 210, "y": 230, "width": 300, "color": "#16A34A", "meta": { "title": "result", "columns": ["id","name","item"], "rows": [[1,"Ana","Book"],[2,"Ben","Pen"]] } }
        }, "caption": "Projected, sorted result." },
      { "time": 2600, "entities": {
          "users":  { "id": "users",  "shape": "table", "x": 40,  "y": 70, "width": 260, "color": "#2563EB", "meta": { "title": "users (u)",  "columns": ["id","name"],     "rows": [[1,"Ana"],[2,"Ben"],[3,"Cy"]] } },
          "orders": { "id": "orders", "shape": "table", "x": 420, "y": 70, "width": 260, "color": "#0EA5E9", "meta": { "title": "orders (o)", "columns": ["user_id","item"], "rows": [[1,"Book"],[2,"Pen"],[5,"Lamp"]] } },
          "result": { "id": "result", "shape": "table", "x": 210, "y": 230, "width": 300, "color": "#16A34A", "meta": { "title": "result", "columns": ["id","name","item"], "rows": [[1,"Ana","Book"],[2,"Ben","Pen"]] } }
        }, "caption": "Done." }
    ]
  }
}
EOF
)" "SQL JOIN Query (with code)"

# ── S9: AUTHORED scene (exercises the non-simulator path) ───────────────────────
# A tiny hand-authored trace: an entity fades/moves between two keyframes. This
# proves AUTHORED scenes validate + persist + replay identically to GENERATED ones.
upsert "authored-hello-pulse" "$(cat <<'EOF'
{
  "slug": "authored-hello-pulse",
  "title": "Hello Pulse (Authored Demo)",
  "description": "A minimal hand-authored trace — a single node slides and changes state. Demonstrates the AUTHORED path: full trace supplied by the client, validated and replayed by the same engine.",
  "category": "OTHER",
  "source": "AUTHORED",
  "isPublished": true,
  "trace": {
    "id": "authored-hello-pulse",
    "title": "Hello Pulse",
    "duration": 3000,
    "viewport": { "width": 640, "height": 360 },
    "category": "OTHER",
    "theme": { "background": "#0F172A" },
    "notes": {
      "summary": "Smallest possible authored animation: one entity interpolating between two keyframes.",
      "whereToUse": ["Use authored traces for bespoke diagrams that no simulator covers."],
      "keyPoints": ["Position and opacity are linearly interpolated (lerp).", "Status fields snap at keyframe boundaries."]
    },
    "instructions": [
      { "id": "i1", "time": 0, "title": "Start", "detail": "The node begins idle on the left." },
      { "id": "i2", "time": 1500, "title": "Activate", "detail": "It slides right and becomes ACTIVE." },
      { "id": "i3", "time": 3000, "title": "Done", "detail": "It settles into the DONE state." }
    ],
    "keyframes": [
      { "time": 0,    "entities": { "n1": { "id": "n1", "shape": "node", "x": 120, "y": 180, "label": "A", "status": "IDLE",   "color": "#64748B", "opacity": 1 } }, "variables": { "t": 0 } },
      { "time": 1500, "entities": { "n1": { "id": "n1", "shape": "node", "x": 320, "y": 180, "label": "A", "status": "ACTIVE", "color": "#6366F1", "opacity": 1 } }, "variables": { "t": 1 } },
      { "time": 3000, "entities": { "n1": { "id": "n1", "shape": "node", "x": 520, "y": 180, "label": "A", "status": "DONE",   "color": "#22C55E", "opacity": 1 } }, "variables": { "t": 2 } }
    ]
  }
}
EOF
)" "Hello Pulse (Authored)"

# ── 3. Verify student-facing feed ────────────────────────────────────────────────
head "Verify published feed (/published)"
FEED=$(curl -sf "$BASE/api/v1/animation-scenes/published" -H "$AUTH")
COUNT=$(echo "$FEED" | jqget "['data'].__len__()")
[ "$COUNT" -ge 1 ] && pass "Published feed returns $COUNT scene(s)" || fail "Feed empty"

echo "$FEED" | python3 -c "
import sys, json
for s in sorted(json.load(sys.stdin)['data'], key=lambda x: (x.get('category') or '', x['slug'])):
    kf = s.get('keyframeCount'); dur = s.get('duration')
    kf = kf if kf is not None else '?'
    dur = f\"{dur/1000:.1f}s\" if isinstance(dur, (int, float)) else '?'
    print(f\"  • [{(s.get('category') or 'OTHER'):<13}] {s['title']:<42} {kf} keyframes / {dur}\")
"

# ── 4. Spot-check one scene resolves fully (trace present) ────────────────────────
head "Verify by-slug fetch (trace resolves)"
for slug in atomic-cas-3-threads graph-bfs-traversal matrix-multiply-dot-products sql-inner-join request-routing-load-balancer leetcode-two-sum sql-join-query-walkthrough authored-hello-pulse; do
  ONE=$(curl -sf "$BASE/api/v1/animation-scenes/slug/$slug" -H "$AUTH")
  KF=$(echo "$ONE" | jqget "['data']['trace']['keyframes'].__len__()" 2>/dev/null || echo "0")
  if [ "$KF" -ge 1 ]; then pass "$slug → $KF keyframes"; else fail "$slug → no trace"; fi
done

# ── 4b. Verify attached CODE PROGRAMS resolve (load-programs feature) ────────────
head "Verify code programs attach to scenes"
for slug in leetcode-two-sum sql-join-query-walkthrough; do
  ONE=$(curl -sf "$BASE/api/v1/animation-scenes/slug/$slug" -H "$AUTH")
  echo "$ONE" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']['trace']
progs = d.get('programs') or []
if not progs:
    print('  ❌ $slug → no programs'); sys.exit(1)
for p in progs:
    hl = len(p.get('highlights') or [])
    run = 'runnable' if p.get('runnable') else 'display-only'
    print(f\"  ✅ $slug → program '{p['label']}' [{p['language']}, {run}] {hl} highlight(s)\")
" || fail "$slug program check failed"
done

# ── 5. Filter by category (scalability check) ────────────────────────────────────
head "Verify category filter"
for cat in CONCURRENCY DSA AI_ML DATABASE SYSTEM_DESIGN; do
  N=$(curl -sf "$BASE/api/v1/animation-scenes/published?category=$cat" -H "$AUTH" | jqget "['data'].__len__()")
  pass "category=$cat → $N scene(s)"
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Seeded $COUNT animation scene(s) — PUBLISHED ✅${NC}"
echo -e "${GREEN}  Open the student app at /animations${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
