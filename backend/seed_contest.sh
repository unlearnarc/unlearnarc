#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# seed_contest.sh
# Populates the DB with a LeetCode/NeetCode-style coding contest + a batch of
# useful problems, each with PUBLIC (sample) and HIDDEN (grading) test cases.
#
# Architecture reminder: code runs on the CLIENT. The server only stores
# problems + test cases and re-validates reported stdout against the stored
# expected outputs. All test cases here use the STDIN_STDOUT harness, so the
# client runner reads `input` on stdin and must print exactly `expectedOutput`.
#
# Usage:   ./seed_contest.sh            (uses defaults below)
#          BASE=http://localhost:8085 ADMIN_EMAIL=... ADMIN_PASS=... ./seed_contest.sh
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

# ── 1. Admin login ────────────────────────────────────────────────────────────
head "Admin login"
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")
TOKEN=$(echo "$LOGIN" | jqget "['data']['accessToken']" 2>/dev/null || true)
[ -n "${TOKEN:-}" ] || { fail "Admin login failed"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"
pass "Logged in as $ADMIN_EMAIL"

# ── 2. Create the contest ───────────────────────────────────────────────────────
head "Create contest"
# Window: opens now, closes in 30 days.
START=$(python3 -c "import datetime; print(datetime.datetime.utcnow().isoformat()+'Z')")
END=$(python3 -c "import datetime; print((datetime.datetime.utcnow()+datetime.timedelta(days=30)).isoformat()+'Z')")

CONTEST=$(curl -sf -X POST "$BASE/api/v1/admin/contests" -H "Content-Type: application/json" -H "$AUTH" -d @- <<EOF
{
  "title": "UnlearnArc Weekly — Blind 75 Starter",
  "slug": "unlearnarc-weekly-blind-75-starter",
  "description": "A curated set of classic LeetCode/NeetCode problems to warm up on arrays, strings, hashing, stacks, two-pointers and dynamic programming. Code runs locally in your browser — your outputs are re-validated on the server.",
  "visibility": "PUBLIC",
  "startTime": "$START",
  "endTime": "$END",
  "durationMinutes": 0,
  "allowedLanguages": "python,java,cpp,javascript",
  "wrongSubmissionPenalty": 5
}
EOF
)
CONTEST_ID=$(echo "$CONTEST" | jqget "['data']['id']")
pass "Contest created: $CONTEST_ID"

# ── helper: add a problem ──────────────────────────────────────────────────────
# add_problem <order> <json-file-body>
add_problem() {
  local body="$1"
  local resp
  resp=$(curl -sf -X POST "$BASE/api/v1/admin/contests/$CONTEST_ID/problems" \
    -H "Content-Type: application/json" -H "$AUTH" -d "$body")
  local pid; pid=$(echo "$resp" | jqget "['data']['id']")
  local title; title=$(echo "$resp" | jqget "['data']['title']")
  pass "  Problem added: $title ($pid)"
}

head "Add problems"

# ── P1: Two Sum (Easy) ──────────────────────────────────────────────────────────
# stdin: line1 = space-separated array, line2 = target
# stdout: two indices (ascending) space-separated
add_problem "$(cat <<'EOF'
{
  "title": "Two Sum",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 1,
  "statement": "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers that add up to `target`.\n\nYou may assume exactly one solution exists and you may not use the same element twice. Return the indices in ascending order.",
  "constraints": "**Input**\nLine 1: space-separated integers (the array)\nLine 2: the target integer\n\n**Output**\nThe two 0-based indices, ascending, space-separated.\n\n2 <= nums.length <= 10^4, -10^9 <= nums[i], target <= 10^9",
  "starterCodeJson": "{\"python\":\"import sys\\n\\ndef two_sum(nums, target):\\n    # TODO\\n    pass\\n\\ndata = sys.stdin.read().split('\\\\n')\\nnums = list(map(int, data[0].split()))\\ntarget = int(data[1])\\nprint(*two_sum(nums, target))\",\"javascript\":\"const lines = require('fs').readFileSync(0,'utf8').split('\\\\n');\\nconst nums = lines[0].trim().split(/\\\\s+/).map(Number);\\nconst target = Number(lines[1]);\\nfunction twoSum(nums, target){ /* TODO */ }\\nconsole.log(twoSum(nums, target).join(' '));\"}",
  "testCases": [
    {"input": "2 7 11 15\n9",  "expectedOutput": "0 1", "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "3 2 4\n6",      "expectedOutput": "1 2", "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "3 3\n6",        "expectedOutput": "0 1", "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "-1 -2 -3 -4 -5\n-8", "expectedOutput": "2 4", "isHidden": true, "weight": 2, "displayOrder": 3},
    {"input": "0 4 3 0\n0",    "expectedOutput": "0 3", "isHidden": true,  "weight": 2, "displayOrder": 4}
  ]
}
EOF
)"

# ── P2: Valid Palindrome (Easy) ─────────────────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Valid Palindrome",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 2,
  "statement": "Given a string `s`, return `true` if it is a palindrome considering only alphanumeric characters and ignoring case, otherwise `false`.",
  "constraints": "**Input**: a single line string `s` (may be empty).\n**Output**: `true` or `false` (lowercase).\n\n1 <= s.length <= 2*10^5",
  "starterCodeJson": "{\"python\":\"import sys\\ns = sys.stdin.readline().rstrip('\\\\n')\\n# TODO\\nprint('true')\"}",
  "testCases": [
    {"input": "A man, a plan, a canal: Panama", "expectedOutput": "true",  "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "race a car",                      "expectedOutput": "false", "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": " ",                               "expectedOutput": "true",  "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "0P",                              "expectedOutput": "false", "isHidden": true,  "weight": 2, "displayOrder": 3},
    {"input": "Was it a car or a cat I saw?",    "expectedOutput": "true",  "isHidden": true,  "weight": 2, "displayOrder": 4}
  ]
}
EOF
)"

# ── P3: Best Time to Buy and Sell Stock (Easy) ──────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Best Time to Buy and Sell Stock",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 3,
  "statement": "You are given an array `prices` where `prices[i]` is the price of a stock on day `i`. Maximise profit by choosing a day to buy and a later day to sell. Return the max profit, or `0` if no profit is possible.",
  "constraints": "**Input**: one line of space-separated prices.\n**Output**: the maximum profit (integer).\n\n1 <= prices.length <= 10^5, 0 <= prices[i] <= 10^4",
  "starterCodeJson": "{\"python\":\"import sys\\nprices = list(map(int, sys.stdin.read().split()))\\n# TODO\\nprint(0)\"}",
  "testCases": [
    {"input": "7 1 5 3 6 4", "expectedOutput": "5", "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "7 6 4 3 1",   "expectedOutput": "0", "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "1",           "expectedOutput": "0", "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "2 4 1",       "expectedOutput": "2", "isHidden": true,  "weight": 2, "displayOrder": 3},
    {"input": "3 2 6 5 0 3", "expectedOutput": "4", "isHidden": true,  "weight": 2, "displayOrder": 4}
  ]
}
EOF
)"

# ── P4: Contains Duplicate (Easy) ───────────────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Contains Duplicate",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 4,
  "statement": "Given an integer array `nums`, return `true` if any value appears at least twice, and `false` if every element is distinct.",
  "constraints": "**Input**: one line of space-separated integers.\n**Output**: `true` or `false`.\n\n1 <= nums.length <= 10^5",
  "starterCodeJson": "{\"python\":\"import sys\\nnums = list(map(int, sys.stdin.read().split()))\\n# TODO\\nprint('false')\"}",
  "testCases": [
    {"input": "1 2 3 1",       "expectedOutput": "true",  "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "1 2 3 4",       "expectedOutput": "false", "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "1 1 1 3 3 4 3 2 4 2", "expectedOutput": "true", "isHidden": true, "weight": 2, "displayOrder": 2},
    {"input": "42",            "expectedOutput": "false", "isHidden": true,  "weight": 2, "displayOrder": 3}
  ]
}
EOF
)"

# ── P5: Valid Anagram (Easy) ────────────────────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Valid Anagram",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 5,
  "statement": "Given two strings `s` and `t`, return `true` if `t` is an anagram of `s`, otherwise `false`.",
  "constraints": "**Input**\nLine 1: string s\nLine 2: string t\n**Output**: `true` or `false`.\n\n1 <= s.length, t.length <= 5*10^4 (lowercase letters)",
  "starterCodeJson": "{\"python\":\"import sys\\nlines = sys.stdin.read().split('\\\\n')\\ns, t = lines[0], lines[1]\\n# TODO\\nprint('false')\"}",
  "testCases": [
    {"input": "anagram\nnagaram", "expectedOutput": "true",  "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "rat\ncar",         "expectedOutput": "false", "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "a\nab",            "expectedOutput": "false", "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "listen\nsilent",   "expectedOutput": "true",  "isHidden": true,  "weight": 2, "displayOrder": 3}
  ]
}
EOF
)"

# ── P6: Valid Parentheses (Easy/Stack) ──────────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Valid Parentheses",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 6,
  "statement": "Given a string `s` containing just the characters `()[]{}`, determine if the input string is valid. Brackets must close in the correct order and every bracket must have a matching pair.",
  "constraints": "**Input**: one line string of brackets.\n**Output**: `true` or `false`.\n\n1 <= s.length <= 10^4",
  "starterCodeJson": "{\"python\":\"import sys\\ns = sys.stdin.readline().rstrip('\\\\n')\\n# TODO (use a stack)\\nprint('false')\"}",
  "testCases": [
    {"input": "()",     "expectedOutput": "true",  "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "()[]{}", "expectedOutput": "true",  "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "(]",     "expectedOutput": "false", "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "([)]",   "expectedOutput": "false", "isHidden": true,  "weight": 2, "displayOrder": 3},
    {"input": "{[]}",   "expectedOutput": "true",  "isHidden": true,  "weight": 2, "displayOrder": 4}
  ]
}
EOF
)"

# ── P7: Maximum Subarray (Medium / Kadane) ──────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Maximum Subarray",
  "difficulty": "MEDIUM",
  "maxPoints": 150,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 7,
  "statement": "Given an integer array `nums`, find the contiguous subarray (containing at least one number) which has the largest sum, and return that sum (Kadane's algorithm).",
  "constraints": "**Input**: one line of space-separated integers.\n**Output**: the largest subarray sum.\n\n1 <= nums.length <= 10^5, -10^4 <= nums[i] <= 10^4",
  "starterCodeJson": "{\"python\":\"import sys\\nnums = list(map(int, sys.stdin.read().split()))\\n# TODO\\nprint(max(nums))\"}",
  "testCases": [
    {"input": "-2 1 -3 4 -1 2 1 -5 4", "expectedOutput": "6",  "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "1",                      "expectedOutput": "1",  "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "5 4 -1 7 8",             "expectedOutput": "23", "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "-1 -2 -3",               "expectedOutput": "-1", "isHidden": true,  "weight": 2, "displayOrder": 3},
    {"input": "-5",                     "expectedOutput": "-5", "isHidden": true,  "weight": 2, "displayOrder": 4}
  ]
}
EOF
)"

# ── P8: Product of Array Except Self (Medium) ───────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Product of Array Except Self",
  "difficulty": "MEDIUM",
  "maxPoints": 150,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 8,
  "statement": "Given an integer array `nums`, return an array `answer` such that `answer[i]` equals the product of all elements of `nums` except `nums[i]`. Solve without division and in O(n).",
  "constraints": "**Input**: one line of space-separated integers.\n**Output**: the answer array, space-separated.\n\n2 <= nums.length <= 10^5. The product fits in a 32-bit integer.",
  "starterCodeJson": "{\"python\":\"import sys\\nnums = list(map(int, sys.stdin.read().split()))\\n# TODO (prefix/suffix products)\\nprint(*nums)\"}",
  "testCases": [
    {"input": "1 2 3 4",    "expectedOutput": "24 12 8 6",   "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "-1 1 0 -3 3", "expectedOutput": "0 0 9 0 0",  "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "2 3",        "expectedOutput": "3 2",         "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "5 1 2 4",    "expectedOutput": "8 40 20 10",  "isHidden": true,  "weight": 2, "displayOrder": 3}
  ]
}
EOF
)"

# ── P9: Group Anagrams (Medium) ─────────────────────────────────────────────────
# Output: each group sorted internally; groups sorted lexicographically; one group per line.
add_problem "$(cat <<'EOF'
{
  "title": "Group Anagrams",
  "difficulty": "MEDIUM",
  "maxPoints": 150,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 3000,
  "displayOrder": 9,
  "statement": "Given a list of strings, group the anagrams together.\n\n**Output format (deterministic):** sort the words inside each group lexicographically; then sort the groups lexicographically by their first word; print one group per line, words space-separated.",
  "constraints": "**Input**: one line of space-separated lowercase words.\n**Output**: groups, one per line (see format above).\n\n1 <= number of words <= 10^4",
  "starterCodeJson": "{\"python\":\"import sys\\nwords = sys.stdin.read().split()\\n# TODO: group, sort within + across, print one group per line\\n\"}",
  "testCases": [
    {"input": "eat tea tan ate nat bat", "expectedOutput": "ate eat tea\nbat\nnat tan", "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "a",                        "expectedOutput": "a",                        "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "abc bca cab xyz zyx",      "expectedOutput": "abc bca cab\nxyz zyx",     "isHidden": true,  "weight": 3, "displayOrder": 2}
  ]
}
EOF
)"

# ── P10: Climbing Stairs (Easy/DP) ──────────────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Climbing Stairs",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 10,
  "statement": "You are climbing a staircase that takes `n` steps to reach the top. Each time you can climb 1 or 2 steps. In how many distinct ways can you climb to the top?",
  "constraints": "**Input**: a single integer n.\n**Output**: the number of distinct ways.\n\n1 <= n <= 45",
  "starterCodeJson": "{\"python\":\"import sys\\nn = int(sys.stdin.read())\\n# TODO (Fibonacci-style DP)\\nprint(1)\"}",
  "testCases": [
    {"input": "2",  "expectedOutput": "2",         "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "3",  "expectedOutput": "3",         "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "1",  "expectedOutput": "1",         "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "10", "expectedOutput": "89",        "isHidden": true,  "weight": 2, "displayOrder": 3},
    {"input": "45", "expectedOutput": "1836311903", "isHidden": true, "weight": 2, "displayOrder": 4}
  ]
}
EOF
)"

# ── P11: Binary Search (Easy) ───────────────────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Binary Search",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 11,
  "statement": "Given a sorted (ascending) array of distinct integers `nums` and a `target`, return the index of `target` if it exists, otherwise return `-1`. Must run in O(log n).",
  "constraints": "**Input**\nLine 1: sorted space-separated integers\nLine 2: target\n**Output**: the index or -1.\n\n1 <= nums.length <= 10^4",
  "starterCodeJson": "{\"python\":\"import sys\\nd = sys.stdin.read().split('\\\\n')\\nnums = list(map(int, d[0].split()))\\ntarget = int(d[1])\\n# TODO\\nprint(-1)\"}",
  "testCases": [
    {"input": "-1 0 3 5 9 12\n9", "expectedOutput": "4",  "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "-1 0 3 5 9 12\n2", "expectedOutput": "-1", "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "5\n5",            "expectedOutput": "0",  "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "5\n-5",           "expectedOutput": "-1", "isHidden": true,  "weight": 2, "displayOrder": 3}
  ]
}
EOF
)"

# ── P12: Fibonacci Number (Easy) ────────────────────────────────────────────────
add_problem "$(cat <<'EOF'
{
  "title": "Fibonacci Number",
  "difficulty": "EASY",
  "maxPoints": 100,
  "harnessType": "STDIN_STDOUT",
  "timeLimitMs": 2000,
  "displayOrder": 12,
  "statement": "The Fibonacci numbers form the sequence F(0)=0, F(1)=1, F(n)=F(n-1)+F(n-2) for n>1. Given `n`, return F(n).",
  "constraints": "**Input**: a single integer n.\n**Output**: F(n).\n\n0 <= n <= 30",
  "starterCodeJson": "{\"python\":\"import sys\\nn = int(sys.stdin.read())\\n# TODO\\nprint(0)\"}",
  "testCases": [
    {"input": "2",  "expectedOutput": "1",   "isHidden": false, "weight": 1, "displayOrder": 0},
    {"input": "4",  "expectedOutput": "3",   "isHidden": false, "weight": 1, "displayOrder": 1},
    {"input": "0",  "expectedOutput": "0",   "isHidden": true,  "weight": 2, "displayOrder": 2},
    {"input": "10", "expectedOutput": "55",  "isHidden": true,  "weight": 2, "displayOrder": 3},
    {"input": "30", "expectedOutput": "832040", "isHidden": true, "weight": 2, "displayOrder": 4}
  ]
}
EOF
)"

# ── 3. Publish the contest ──────────────────────────────────────────────────────
head "Publish contest"
PUB=$(curl -sf -X PATCH "$BASE/api/v1/admin/contests/$CONTEST_ID/status/PUBLISHED" -H "$AUTH")
STATUS=$(echo "$PUB" | jqget "['data']['status']")
pass "Contest status → $STATUS"

# ── 4. Summary ──────────────────────────────────────────────────────────────────
head "Summary"
PROBLEMS=$(curl -sf "$BASE/api/v1/admin/contests/$CONTEST_ID/problems" -H "$AUTH")
COUNT=$(echo "$PROBLEMS" | jqget "['data'].__len__()")
echo "$PROBLEMS" | python3 -c "
import sys, json
d = json.load(sys.stdin)['data']
for p in sorted(d, key=lambda x: x.get('displayOrder', 0)):
    tcs = p.get('testCases', [])
    hidden = sum(1 for t in tcs if t.get('isHidden'))
    public = len(tcs) - hidden
    print(f\"  • [{p['difficulty']:<6}] {p['title']:<36} pts={p['maxPoints']:<4} tests={public}pub/{hidden}hidden\")
"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  Seeded contest '$CONTEST_ID' with $COUNT problems — PUBLISHED ✅${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
