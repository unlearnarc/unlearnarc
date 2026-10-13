#!/usr/bin/env bash
#
# seed_algoviz_starter.sh
# -----------------------
# Seeds a starter pack of 8 algorithm visualizations covering every renderer:
#   Sorting (ARRAY) : insertion-sort, selection-sort, merge-sort, quick-sort
#   Search  (ARRAY) : binary-search
#   Graph   (GRAPH) : bfs, dfs
#   Stack   (STACK) : balanced-parentheses
#   Matrix  (MATRIX): flood-fill
# Each is upserted (create or update-by-slug), published, then verified.
#
# State shapes match the renderers exactly:
#   ARRAY  -> state.array
#   GRAPH  -> state.nodes [{id,label}] / state.edges [{from,to,weight?}]
#             highlights target "nodes" indexed by node id, "edges" by edge index
#   STACK  -> state.stack  (highlights target "stack" by index)
#   MATRIX -> state.matrix[][], state.cursor [r,c], state.visited [[r,c],...]
#
# Usage:  cd backend && ./seed_algoviz_starter.sh
set -euo pipefail
BASE="${BASE:-http://localhost:8085}"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }
jqget() { python3 -c "import sys,json; print(json.load(sys.stdin)$1)"; }

info "=== Admin login ==="
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"unlearnarc@gmail.com","password":"Admin@123"}')
TOKEN=$(echo "$LOGIN" | jqget "['data']['accessToken']")
[ -n "$TOKEN" ] && pass "Login OK" || { fail "Login failed"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

SEED_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/algoviz_specs"
mkdir -p "$SEED_DIR"

upsert() {
  local slug="$1" file="$2" title="$3"
  info "=== Seeding: $title ($slug) ==="
  local body; body="$(cat "$file")"
  RESP=$(curl -s -X POST "$BASE/api/v1/algorithms" -H "Content-Type: application/json" -H "$AUTH" -d "$body")
  ID=$(echo "$RESP" | jqget "['data']['id']" 2>/dev/null || echo "")
  if [ -z "$ID" ]; then
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

# ─────────────────────────────────────────────────────────────── insertion-sort
cat > "$SEED_DIR/insertion-sort.json" <<'JSON'
{
  "slug": "insertion-sort",
  "title": "Insertion Sort",
  "summary": "Builds the sorted array one element at a time by inserting each item into its correct position.",
  "usage": "Efficient for small or nearly-sorted data; stable and in-place. O(n^2) worst case.",
  "category": "Sorting",
  "difficulty": "EASY",
  "visualizer": "ARRAY",
  "complexity": { "time": "O(n^2)", "space": "O(1)" },
  "javaSource": "void insertionSort(int[] a){\n  for(int i=1;i<a.length;i++){\n    int key=a[i], j=i-1;\n    while(j>=0 && a[j]>key){ a[j+1]=a[j]; j--; }\n    a[j+1]=key;\n  }\n}",
  "pythonSource": "def insertion_sort(a):\n    for i in range(1, len(a)):\n        key = a[i]; j = i - 1\n        while j >= 0 and a[j] > key:\n            a[j+1] = a[j]; j -= 1\n        a[j+1] = key",
  "spec": {
    "visualizer": "ARRAY",
    "initialState": { "array": [5, 2, 4, 1] },
    "variables": [
      { "name": "i", "label": "i", "color": "#f59e0b" },
      { "name": "key", "label": "key", "color": "#3b82f6" }
    ],
    "steps": [
      { "title": "Start", "explanation": "Element 0 is trivially sorted. We insert from index 1 onward.",
        "state": { "array": [5, 2, 4, 1] }, "variables": { "i": 1, "key": 2 }, "line": 2, "lang": "java" },
      { "title": "Insert 2", "explanation": "key=2 < 5, shift 5 right.",
        "state": { "array": [5, 5, 4, 1] }, "variables": { "i": 1, "key": 2 },
        "highlights": [{ "target": "array", "indices": [0, 1], "style": "COMPARE" }], "line": 4, "lang": "java" },
      { "title": "Placed 2", "explanation": "Sorted region: [2, 5].",
        "state": { "array": [2, 5, 4, 1] }, "variables": { "i": 2, "key": 4 },
        "highlights": [{ "target": "array", "indices": [0], "style": "DONE" }] },
      { "title": "Insert 4", "explanation": "key=4 < 5, shift 5; 4 > 2 so stop.",
        "state": { "array": [2, 4, 5, 1] }, "variables": { "i": 3, "key": 1 },
        "highlights": [{ "target": "array", "indices": [1], "style": "INSERT" }],
        "input": { "key": "pred1", "prompt": "Does key=1 move to the very front?", "type": "BOOLEAN", "expected": true } },
      { "title": "Insert 1", "explanation": "1 is smaller than all; it moves to the front.",
        "state": { "array": [1, 2, 4, 5] }, "variables": { "i": 3, "key": 1 },
        "highlights": [{ "target": "array", "indices": [0], "style": "INSERT" }] },
      { "title": "Done", "explanation": "Array fully sorted.",
        "state": { "array": [1, 2, 4, 5] },
        "highlights": [{ "target": "array", "indices": [0, 1, 2, 3], "style": "DONE" }] }
    ]
  }
}
JSON

# ─────────────────────────────────────────────────────────────── selection-sort
cat > "$SEED_DIR/selection-sort.json" <<'JSON'
{
  "slug": "selection-sort",
  "title": "Selection Sort",
  "summary": "Repeatedly selects the minimum of the unsorted region and swaps it into place.",
  "usage": "Simple, in-place, minimal writes. O(n^2) comparisons; not stable.",
  "category": "Sorting",
  "difficulty": "EASY",
  "visualizer": "ARRAY",
  "complexity": { "time": "O(n^2)", "space": "O(1)" },
  "javaSource": "void selectionSort(int[] a){\n  for(int i=0;i<a.length-1;i++){\n    int m=i;\n    for(int j=i+1;j<a.length;j++) if(a[j]<a[m]) m=j;\n    int t=a[i]; a[i]=a[m]; a[m]=t;\n  }\n}",
  "pythonSource": "def selection_sort(a):\n    for i in range(len(a)-1):\n        m = i\n        for j in range(i+1, len(a)):\n            if a[j] < a[m]: m = j\n        a[i], a[m] = a[m], a[i]",
  "spec": {
    "visualizer": "ARRAY",
    "initialState": { "array": [5, 2, 4, 1] },
    "variables": [
      { "name": "i", "label": "i", "color": "#f59e0b" },
      { "name": "m", "label": "min", "color": "#22c55e" }
    ],
    "steps": [
      { "title": "Find min in [0..3]", "explanation": "Scan for the smallest value; it is 1 at index 3.",
        "state": { "array": [5, 2, 4, 1] }, "variables": { "i": 0, "m": 3 },
        "highlights": [{ "target": "array", "indices": [3], "style": "ACTIVE" }], "line": 4, "lang": "java" },
      { "title": "Swap into place", "explanation": "Swap min (1) with index 0.",
        "state": { "array": [1, 2, 4, 5] }, "variables": { "i": 0, "m": 3 },
        "highlights": [{ "target": "array", "indices": [0, 3], "style": "SWAP" }], "line": 5, "lang": "java" },
      { "title": "Find min in [1..3]", "explanation": "Smallest is 2 — already at index 1.",
        "state": { "array": [1, 2, 4, 5] }, "variables": { "i": 1, "m": 1 },
        "highlights": [{ "target": "array", "indices": [0], "style": "DONE" }] },
      { "title": "Done", "explanation": "Remaining elements already ordered.",
        "state": { "array": [1, 2, 4, 5] },
        "highlights": [{ "target": "array", "indices": [0, 1, 2, 3], "style": "DONE" }] }
    ]
  }
}
JSON

# ─────────────────────────────────────────────────────────────────── merge-sort
cat > "$SEED_DIR/merge-sort.json" <<'JSON'
{
  "slug": "merge-sort",
  "title": "Merge Sort",
  "summary": "Divide-and-conquer: split the array, sort halves recursively, then merge.",
  "usage": "Stable, guaranteed O(n log n). Great for linked lists and external sorting.",
  "category": "Sorting",
  "difficulty": "MEDIUM",
  "visualizer": "ARRAY",
  "complexity": { "time": "O(n log n)", "space": "O(n)" },
  "javaSource": "void mergeSort(int[] a,int l,int r){\n  if(l>=r) return;\n  int m=(l+r)/2;\n  mergeSort(a,l,m); mergeSort(a,m+1,r);\n  merge(a,l,m,r);\n}",
  "pythonSource": "def merge_sort(a):\n    if len(a) <= 1: return a\n    m = len(a)//2\n    L, R = merge_sort(a[:m]), merge_sort(a[m:])\n    return merge(L, R)",
  "spec": {
    "visualizer": "ARRAY",
    "initialState": { "array": [5, 2, 4, 1] },
    "variables": [{ "name": "m", "label": "mid", "color": "#8b5cf6" }],
    "steps": [
      { "title": "Split", "explanation": "Divide into [5,2] and [4,1].",
        "state": { "array": [5, 2, 4, 1] }, "variables": { "m": 1 },
        "highlights": [{ "target": "array", "indices": [0, 1], "style": "ACTIVE" }, { "target": "array", "indices": [2, 3], "style": "PIVOT" }], "line": 3, "lang": "java" },
      { "title": "Sort left", "explanation": "Merge [5,2] -> [2,5].",
        "state": { "array": [2, 5, 4, 1] },
        "highlights": [{ "target": "array", "indices": [0, 1], "style": "DONE" }] },
      { "title": "Sort right", "explanation": "Merge [4,1] -> [1,4].",
        "state": { "array": [2, 5, 1, 4] },
        "highlights": [{ "target": "array", "indices": [2, 3], "style": "DONE" }] },
      { "title": "Merge halves", "explanation": "Merge [2,5] and [1,4] by picking smallest fronts.",
        "state": { "array": [1, 2, 4, 5] },
        "highlights": [{ "target": "array", "indices": [0, 1, 2, 3], "style": "DONE" }] }
    ]
  }
}
JSON

# ─────────────────────────────────────────────────────────────────── quick-sort
cat > "$SEED_DIR/quick-sort.json" <<'JSON'
{
  "slug": "quick-sort",
  "title": "Quick Sort",
  "summary": "Partition around a pivot so smaller elements go left, larger go right; recurse.",
  "usage": "Fast in-place average O(n log n). Most-used general sort. Worst case O(n^2).",
  "category": "Sorting",
  "difficulty": "MEDIUM",
  "visualizer": "ARRAY",
  "complexity": { "time": "O(n log n) avg", "space": "O(log n)" },
  "javaSource": "void quickSort(int[] a,int lo,int hi){\n  if(lo>=hi) return;\n  int p=partition(a,lo,hi);\n  quickSort(a,lo,p-1); quickSort(a,p+1,hi);\n}",
  "pythonSource": "def quick_sort(a, lo, hi):\n    if lo >= hi: return\n    p = partition(a, lo, hi)\n    quick_sort(a, lo, p-1); quick_sort(a, p+1, hi)",
  "spec": {
    "visualizer": "ARRAY",
    "initialState": { "array": [5, 2, 4, 1] },
    "variables": [{ "name": "pivot", "label": "pivot", "color": "#eab308" }],
    "steps": [
      { "title": "Choose pivot", "explanation": "Pivot = last element (1).",
        "state": { "array": [5, 2, 4, 1] }, "variables": { "pivot": 1 },
        "highlights": [{ "target": "array", "indices": [3], "style": "PIVOT" }], "line": 3, "lang": "java" },
      { "title": "Partition", "explanation": "All values > 1, so pivot moves to the front.",
        "state": { "array": [1, 2, 4, 5] }, "variables": { "pivot": 1 },
        "highlights": [{ "target": "array", "indices": [0], "style": "SWAP" }] },
      { "title": "Recurse right", "explanation": "Sort [2,4,5]; pivot now 5.",
        "state": { "array": [1, 2, 4, 5] }, "variables": { "pivot": 5 },
        "highlights": [{ "target": "array", "indices": [3], "style": "PIVOT" }],
        "input": { "key": "qsdone", "prompt": "Is the array already sorted at this point?", "type": "BOOLEAN", "expected": true } },
      { "title": "Done", "explanation": "All partitions settled.",
        "state": { "array": [1, 2, 4, 5] },
        "highlights": [{ "target": "array", "indices": [0, 1, 2, 3], "style": "DONE" }] }
    ]
  }
}
JSON

# ───────────────────────────────────────────────────────────────── binary-search
cat > "$SEED_DIR/binary-search.json" <<'JSON'
{
  "slug": "binary-search",
  "title": "Binary Search",
  "summary": "Repeatedly halves a sorted range to locate a target in O(log n).",
  "usage": "Lookup in sorted arrays / monotonic predicates. Requires sorted input.",
  "category": "Searching",
  "difficulty": "EASY",
  "visualizer": "ARRAY",
  "complexity": { "time": "O(log n)", "space": "O(1)" },
  "javaSource": "int binarySearch(int[] a,int t){\n  int lo=0, hi=a.length-1;\n  while(lo<=hi){\n    int mid=(lo+hi)/2;\n    if(a[mid]==t) return mid;\n    if(a[mid]<t) lo=mid+1; else hi=mid-1;\n  }\n  return -1;\n}",
  "pythonSource": "def binary_search(a, t):\n    lo, hi = 0, len(a)-1\n    while lo <= hi:\n        mid = (lo+hi)//2\n        if a[mid] == t: return mid\n        if a[mid] < t: lo = mid+1\n        else: hi = mid-1\n    return -1",
  "spec": {
    "visualizer": "ARRAY",
    "initialState": { "array": [1, 3, 5, 7, 9, 11] },
    "variables": [
      { "name": "lo", "label": "lo", "color": "#3b82f6" },
      { "name": "mid", "label": "mid", "color": "#22c55e" },
      { "name": "hi", "label": "hi", "color": "#f59e0b" }
    ],
    "steps": [
      { "title": "Target = 9", "explanation": "Search range covers the whole array.",
        "state": { "array": [1, 3, 5, 7, 9, 11] }, "variables": { "lo": 0, "mid": 2, "hi": 5 },
        "highlights": [{ "target": "array", "indices": [2], "style": "COMPARE" }], "line": 4, "lang": "java" },
      { "title": "a[mid]=5 < 9", "explanation": "Go right: lo = mid + 1.",
        "state": { "array": [1, 3, 5, 7, 9, 11] }, "variables": { "lo": 3, "mid": 4, "hi": 5 },
        "highlights": [{ "target": "array", "indices": [4], "style": "COMPARE" }],
        "input": { "key": "found", "prompt": "Is a[mid] now equal to the target 9?", "type": "BOOLEAN", "expected": true } },
      { "title": "Found!", "explanation": "a[4] == 9. Return index 4.",
        "state": { "array": [1, 3, 5, 7, 9, 11] }, "variables": { "lo": 3, "mid": 4, "hi": 5 },
        "highlights": [{ "target": "array", "indices": [4], "style": "DONE" }] }
    ]
  }
}
JSON

# ─────────────────────────────────────────────────────────────────────────── bfs
cat > "$SEED_DIR/bfs.json" <<'JSON'
{
  "slug": "bfs",
  "title": "Breadth-First Search",
  "summary": "Explores a graph level by level using a FIFO queue.",
  "usage": "Shortest path in unweighted graphs, level-order traversal, connectivity.",
  "category": "Graph",
  "difficulty": "MEDIUM",
  "visualizer": "GRAPH",
  "complexity": { "time": "O(V + E)", "space": "O(V)" },
  "javaSource": "void bfs(List<List<Integer>> g,int s){\n  boolean[] seen=new boolean[g.size()];\n  Queue<Integer> q=new LinkedList<>();\n  q.add(s); seen[s]=true;\n  while(!q.isEmpty()){\n    int u=q.poll();\n    for(int v:g.get(u)) if(!seen[v]){ seen[v]=true; q.add(v); }\n  }\n}",
  "pythonSource": "from collections import deque\ndef bfs(g, s):\n    seen = {s}; q = deque([s])\n    while q:\n        u = q.popleft()\n        for v in g[u]:\n            if v not in seen: seen.add(v); q.append(v)",
  "spec": {
    "visualizer": "GRAPH",
    "initialState": {
      "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
      "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
    },
    "steps": [
      { "title": "Start at A", "explanation": "Enqueue A and mark visited.",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A"], "style": "ACTIVE" }], "line": 4, "lang": "java" },
      { "title": "Visit neighbours of A", "explanation": "Enqueue B and C (level 1).",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A"], "style": "DONE" }, { "target": "nodes", "indices": ["B", "C"], "style": "VISIT" }, { "target": "edges", "indices": [0, 1], "style": "PATH" }] },
      { "title": "Expand B then C", "explanation": "Enqueue D (from B) and E (from C) — level 2.",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A", "B", "C"], "style": "DONE" }, { "target": "nodes", "indices": ["D", "E"], "style": "VISIT" }, { "target": "edges", "indices": [2, 3], "style": "PATH" }],
        "input": { "key": "order", "prompt": "In BFS, is D visited before E?", "type": "BOOLEAN", "expected": true } },
      { "title": "Complete", "explanation": "All nodes visited in order A,B,C,D,E.",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A", "B", "C", "D", "E"], "style": "DONE" }] }
    ]
  }
}
JSON

# ─────────────────────────────────────────────────────────────────────────── dfs
cat > "$SEED_DIR/dfs.json" <<'JSON'
{
  "slug": "dfs",
  "title": "Depth-First Search",
  "summary": "Explores as far as possible along each branch before backtracking.",
  "usage": "Cycle detection, topological sort, connected components, path finding.",
  "category": "Graph",
  "difficulty": "MEDIUM",
  "visualizer": "GRAPH",
  "complexity": { "time": "O(V + E)", "space": "O(V)" },
  "javaSource": "void dfs(List<List<Integer>> g,int u,boolean[] seen){\n  seen[u]=true;\n  for(int v:g.get(u)) if(!seen[v]) dfs(g,v,seen);\n}",
  "pythonSource": "def dfs(g, u, seen):\n    seen.add(u)\n    for v in g[u]:\n        if v not in seen: dfs(g, v, seen)",
  "spec": {
    "visualizer": "GRAPH",
    "initialState": {
      "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
      "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
    },
    "steps": [
      { "title": "Start at A", "explanation": "Visit A, then dive into its first neighbour.",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A"], "style": "ACTIVE" }], "line": 2, "lang": "java" },
      { "title": "A -> B -> D", "explanation": "Follow the deepest path first: A, then B, then D.",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A", "B"], "style": "DONE" }, { "target": "nodes", "indices": ["D"], "style": "ACTIVE" }, { "target": "edges", "indices": [0, 2], "style": "PATH" }] },
      { "title": "Backtrack to A -> C -> E", "explanation": "D has no unvisited neighbours; backtrack and explore C then E.",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A", "B", "D", "C"], "style": "DONE" }, { "target": "nodes", "indices": ["E"], "style": "ACTIVE" }, { "target": "edges", "indices": [1, 3], "style": "PATH" }],
        "input": { "key": "dfsorder", "prompt": "Is E visited after D in this DFS?", "type": "BOOLEAN", "expected": true } },
      { "title": "Complete", "explanation": "DFS order: A, B, D, C, E.",
        "state": {
          "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
          "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
        },
        "highlights": [{ "target": "nodes", "indices": ["A", "B", "C", "D", "E"], "style": "DONE" }] }
    ]
  }
}
JSON

# ──────────────────────────────────────────────────────────── balanced-parentheses
cat > "$SEED_DIR/balanced-parentheses.json" <<'JSON'
{
  "slug": "balanced-parentheses",
  "title": "Balanced Parentheses",
  "summary": "Uses a stack to verify every opening bracket has a matching close in the right order.",
  "usage": "Expression parsing, compiler/syntax validation, editor bracket matching.",
  "category": "Stack",
  "difficulty": "EASY",
  "visualizer": "STACK",
  "complexity": { "time": "O(n)", "space": "O(n)" },
  "javaSource": "boolean isValid(String s){\n  Deque<Character> st=new ArrayDeque<>();\n  Map<Character,Character> m=Map.of(')','(',']','[','}','{');\n  for(char c:s.toCharArray()){\n    if(m.containsValue(c)) st.push(c);\n    else if(st.isEmpty()||st.pop()!=m.get(c)) return false;\n  }\n  return st.isEmpty();\n}",
  "pythonSource": "def is_valid(s):\n    st = []; pairs = {')':'(', ']':'[', '}':'{'}\n    for c in s:\n        if c in '([{': st.append(c)\n        elif not st or st.pop() != pairs[c]: return False\n    return not st",
  "spec": {
    "visualizer": "STACK",
    "initialState": { "stack": [] },
    "steps": [
      { "title": "Input: ( [ ] )", "explanation": "Scan left to right. Push opening brackets.",
        "state": { "stack": [] }, "line": 4, "lang": "java" },
      { "title": "Read '('", "explanation": "Opening bracket — push onto stack.",
        "state": { "stack": ["("] },
        "highlights": [{ "target": "stack", "indices": [0], "style": "INSERT" }] },
      { "title": "Read '['", "explanation": "Opening bracket — push.",
        "state": { "stack": ["(", "["] },
        "highlights": [{ "target": "stack", "indices": [1], "style": "INSERT" }] },
      { "title": "Read ']'", "explanation": "Closing — top is '[', it matches, so pop.",
        "state": { "stack": ["("] },
        "highlights": [{ "target": "stack", "indices": [0], "style": "DELETE" }],
        "input": { "key": "match", "prompt": "Does ']' correctly match the stack top '['?", "type": "BOOLEAN", "expected": true } },
      { "title": "Read ')'", "explanation": "Closing — top is '(', matches, pop. Stack empty.",
        "state": { "stack": [] } },
      { "title": "Valid", "explanation": "Stack is empty at the end — the string is balanced.",
        "state": { "stack": [] } }
    ]
  }
}
JSON

# ────────────────────────────────────────────────────────────────────── flood-fill
cat > "$SEED_DIR/flood-fill.json" <<'JSON'
{
  "slug": "flood-fill",
  "title": "Flood Fill",
  "summary": "Fills a connected region of a grid starting from a seed cell (like paint bucket).",
  "usage": "Image paint-bucket, connected-region labeling, maze/region analysis.",
  "category": "Matrix",
  "difficulty": "MEDIUM",
  "visualizer": "MATRIX",
  "complexity": { "time": "O(rows * cols)", "space": "O(rows * cols)" },
  "javaSource": "void fill(int[][] g,int r,int c,int from,int to){\n  if(r<0||c<0||r>=g.length||c>=g[0].length||g[r][c]!=from) return;\n  g[r][c]=to;\n  fill(g,r+1,c,from,to); fill(g,r-1,c,from,to);\n  fill(g,r,c+1,from,to); fill(g,r,c-1,from,to);\n}",
  "pythonSource": "def fill(g, r, c, src, tgt):\n    if r<0 or c<0 or r>=len(g) or c>=len(g[0]) or g[r][c]!=src: return\n    g[r][c] = tgt\n    for dr,dc in ((1,0),(-1,0),(0,1),(0,-1)):\n        fill(g, r+dr, c+dc, src, tgt)",
  "spec": {
    "visualizer": "MATRIX",
    "initialState": { "matrix": [[1, 1, 0], [1, 0, 0], [0, 0, 1]], "cursor": [0, 0], "visited": [] },
    "steps": [
      { "title": "Seed at (0,0)", "explanation": "Start fill from the top-left '1' region.",
        "state": { "matrix": [[1, 1, 0], [1, 0, 0], [0, 0, 1]], "cursor": [0, 0], "visited": [] }, "line": 3, "lang": "java" },
      { "title": "Fill (0,0)", "explanation": "Mark (0,0) and move to its '1' neighbours.",
        "state": { "matrix": [[2, 1, 0], [1, 0, 0], [0, 0, 1]], "cursor": [0, 1], "visited": [[0, 0]] } },
      { "title": "Fill (0,1) & (1,0)", "explanation": "Both are part of the same connected region.",
        "state": { "matrix": [[2, 2, 0], [2, 0, 0], [0, 0, 1]], "cursor": [1, 0], "visited": [[0, 0], [0, 1]] },
        "input": { "key": "corner", "prompt": "Will the bottom-right '1' at (2,2) get filled?", "type": "BOOLEAN", "expected": false } },
      { "title": "Region complete", "explanation": "(2,2) is disconnected, so it stays. Only the connected region changed.",
        "state": { "matrix": [[2, 2, 0], [2, 0, 0], [0, 0, 1]], "cursor": [1, 0], "visited": [[0, 0], [0, 1], [1, 0]] } }
    ]
  }
}
JSON

upsert "insertion-sort"       "$SEED_DIR/insertion-sort.json"       "Insertion Sort"
upsert "selection-sort"       "$SEED_DIR/selection-sort.json"       "Selection Sort"
upsert "merge-sort"           "$SEED_DIR/merge-sort.json"           "Merge Sort"
upsert "quick-sort"           "$SEED_DIR/quick-sort.json"           "Quick Sort"
upsert "binary-search"        "$SEED_DIR/binary-search.json"        "Binary Search"
upsert "bfs"                  "$SEED_DIR/bfs.json"                  "Breadth-First Search"
upsert "dfs"                  "$SEED_DIR/dfs.json"                  "Depth-First Search"
upsert "balanced-parentheses" "$SEED_DIR/balanced-parentheses.json" "Balanced Parentheses"
upsert "flood-fill"           "$SEED_DIR/flood-fill.json"           "Flood Fill"

echo ""
info "=== Verify published feed ==="
FEED=$(curl -sf "$BASE/api/v1/algorithms/published" -H "$AUTH")
COUNT=$(echo "$FEED" | jqget "['data'].__len__()")
pass "Published feed returns $COUNT algorithm(s)"
echo "$FEED" | python3 -c "import sys,json; [print(f\"  - {a['slug']:22} {a.get('visualizer'):8} steps={len(a.get('spec',{}).get('steps',[]))}\") for a in json.load(sys.stdin)['data']]"

echo ""
pass "Starter pack seeding complete — open the student app at /algorithms"
