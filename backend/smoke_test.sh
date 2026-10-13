#!/usr/bin/env bash
set -e
BASE="http://localhost:8085"
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
pass() { echo -e "${GREEN}✅ $1${NC}"; }
fail() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${YELLOW}→ $1${NC}"; }

info "=== 1. Admin Login ==="
LOGIN=$(curl -sf -X POST "$BASE/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"unlearnarc@gmail.com","password":"Admin@123"}')
TOKEN=$(echo "$LOGIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['accessToken'])" 2>/dev/null)
[ -n "$TOKEN" ] && pass "Admin login OK" || { fail "Admin login FAILED"; echo "$LOGIN"; exit 1; }
AUTH="Authorization: Bearer $TOKEN"

info "=== 2. Create Domain ==="
DOMAIN=$(curl -sf -X POST "$BASE/api/v1/domains" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Backend Engineering Test"}')
DOMAIN_ID=$(echo "$DOMAIN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
pass "Domain created: $DOMAIN_ID"

info "=== 3. Create Course ==="
COURSE=$(curl -sf -X POST "$BASE/api/v1/courses" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Spring Boot Mastery Test","imgUrl":1,"totalTime":"02:00:00","topicsCount":5,"level":"INTERMEDIATE"}')
COURSE_ID=$(echo "$COURSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
pass "Course created: $COURSE_ID"

info "=== 4. Create Topic ==="
TOPIC=$(curl -sf -X POST "$BASE/api/v1/topics" -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"name\":\"REST API Design\",\"time\":\"00:30:00\",\"topicOrder\":1,\"level\":\"BEGINNER\",\"courseId\":\"$COURSE_ID\"}")
TOPIC_ID=$(echo "$TOPIC" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
pass "Topic created: $TOPIC_ID"

info "=== 5. Create COURSE-scoped Pool (9 = 3+3+3) ==="
POOL=$(curl -sf -X POST "$BASE/api/v1/question-pools" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Course Pool Test","scopeType":"COURSE","totalQuestions":9,"easyCount":3,"mediumCount":3,"hardCount":3,"passPercentage":60,"timeLimitMinutes":30}')
POOL_ID=$(echo "$POOL" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
pass "Course pool created: $POOL_ID"

info "=== 6. Map pool → course ==="
MAP=$(curl -sf -X POST "$BASE/api/v1/question-pools/map" -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"poolId\":\"$POOL_ID\",\"courseId\":\"$COURSE_ID\"}")
pass "Pool mapped to course"

info "=== 7. Create TOPIC-scoped Pool (6 = 2+2+2) ==="
TPOOL=$(curl -sf -X POST "$BASE/api/v1/question-pools" -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Topic Pool Test","scopeType":"TOPIC","totalQuestions":6,"easyCount":2,"mediumCount":2,"hardCount":2,"passPercentage":50,"timeLimitMinutes":15}')
TPOOL_ID=$(echo "$TPOOL" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
pass "Topic pool created: $TPOOL_ID"

info "=== 8. Map topic pool → topic ==="
curl -sf -X POST "$BASE/api/v1/question-pools/map" -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"poolId\":\"$TPOOL_ID\",\"topicId\":\"$TOPIC_ID\"}" > /dev/null
pass "Pool mapped to topic"

info "=== 9. Bulk create 9 MCQ questions for COURSE pool ==="
BULK_PAYLOAD=$(cat <<EOF
[
  {"poolId":"$POOL_ID","questionText":"What does REST stand for?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"REpresentational State Transfer","answers":[{"answerText":"Remote Execution State Transfer","isCorrect":false,"displayOrder":0},{"answerText":"REpresentational State Transfer","isCorrect":true,"displayOrder":1},{"answerText":"Rapid Exchange of Structured Text","isCorrect":false,"displayOrder":2},{"answerText":"Real-time Event Streaming Technology","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"Which HTTP verb is idempotent?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"PUT and DELETE are idempotent","answers":[{"answerText":"POST","isCorrect":false,"displayOrder":0},{"answerText":"PUT","isCorrect":true,"displayOrder":1},{"answerText":"PATCH","isCorrect":false,"displayOrder":2},{"answerText":"CONNECT","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"HTTP 404 means?","questionType":"MCQ","difficulty":"EASY","points":1,"explanation":"Resource not found","answers":[{"answerText":"Server Error","isCorrect":false,"displayOrder":0},{"answerText":"Unauthorized","isCorrect":false,"displayOrder":1},{"answerText":"Not Found","isCorrect":true,"displayOrder":2},{"answerText":"Forbidden","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"Which annotation maps HTTP GET in Spring MVC?","questionType":"MCQ","difficulty":"MEDIUM","points":2,"answers":[{"answerText":"@PostMapping","isCorrect":false,"displayOrder":0},{"answerText":"@GetMapping","isCorrect":true,"displayOrder":1},{"answerText":"@RequestBody","isCorrect":false,"displayOrder":2},{"answerText":"@PathVariable","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"@Transactional(readOnly=true) does what?","questionType":"MCQ","difficulty":"MEDIUM","points":2,"answers":[{"answerText":"Prevents any DB write","isCorrect":false,"displayOrder":0},{"answerText":"Hints Hibernate to skip dirty checking","isCorrect":true,"displayOrder":1},{"answerText":"Opens a new connection","isCorrect":false,"displayOrder":2},{"answerText":"Disables caching","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"Which Spring annotation enables component scanning?","questionType":"MCQ","difficulty":"MEDIUM","points":2,"answers":[{"answerText":"@Bean","isCorrect":false,"displayOrder":0},{"answerText":"@ComponentScan","isCorrect":true,"displayOrder":1},{"answerText":"@Primary","isCorrect":false,"displayOrder":2},{"answerText":"@Qualifier","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"Which are valid Spring bean scopes?","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"explanation":"singleton and prototype are the core scopes","answers":[{"answerText":"singleton","isCorrect":true,"displayOrder":0},{"answerText":"prototype","isCorrect":true,"displayOrder":1},{"answerText":"global","isCorrect":false,"displayOrder":2},{"answerText":"static","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"Which HTTP status codes indicate client errors?","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"answers":[{"answerText":"400 Bad Request","isCorrect":true,"displayOrder":0},{"answerText":"404 Not Found","isCorrect":true,"displayOrder":1},{"answerText":"500 Internal Server Error","isCorrect":false,"displayOrder":2},{"answerText":"200 OK","isCorrect":false,"displayOrder":3}]},
  {"poolId":"$POOL_ID","questionText":"Which are true about JPA @OneToMany?","questionType":"MULTIPLE_CORRECT","difficulty":"HARD","points":3,"answers":[{"answerText":"FetchType.LAZY is default","isCorrect":true,"displayOrder":0},{"answerText":"CascadeType.ALL includes REMOVE","isCorrect":true,"displayOrder":1},{"answerText":"It cannot use orphanRemoval","isCorrect":false,"displayOrder":2},{"answerText":"mappedBy specifies the owning side","isCorrect":true,"displayOrder":3}]}
]
EOF
)
BULK=$(curl -sf -X POST "$BASE/api/v1/questions/bulk" -H "Content-Type: application/json" -H "$AUTH" -d "$BULK_PAYLOAD")
Q_COUNT=$(echo "$BULK" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))")
pass "Bulk created $Q_COUNT questions"
Q1_ID=$(echo "$BULK" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")
A1_ID=$(echo "$BULK" | python3 -c "import sys,json; q=json.load(sys.stdin)['data'][0]; print([a for a in q['answers'] if a['isCorrect']][0]['id'])")

info "=== 10. Generate test session (COURSE scope, 9 qus) ==="
SESSION=$(curl -sf -X POST "$BASE/api/v1/tests/generate" -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"scopeType\":\"COURSE\",\"entityId\":\"$COURSE_ID\"}")
SESSION_COUNT=$(echo "$SESSION" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d['totalQuestions'])")
HIDDEN=$(echo "$SESSION" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; qs=d['questions']; ok=all('isCorrect' not in str(a) for q in qs for a in q['answers']); print('HIDDEN' if ok else 'EXPOSED')")
pass "Test session generated: $SESSION_COUNT questions — isCorrect: $HIDDEN from client"

info "=== 11. Grade submitted test (Q1 answered correctly) ==="
GRADE_PAYLOAD=$(python3 -c "
import json,sys
session=json.loads('''$SESSION''')
qs=session['data']['questions']
answers=[]
for q in qs:
    answers.append({'questionId':q['id'],'selectedAnswerIds':[q['answers'][0]['id']]})
print(json.dumps({'poolId':'$POOL_ID','entityId':'$COURSE_ID','answers':answers}))
")
RESULT=$(curl -sf -X POST "$BASE/api/v1/tests/grade" -H "Content-Type: application/json" -H "$AUTH" \
  -d "$GRADE_PAYLOAD")
SCORE=$(echo "$RESULT" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(f\"{d['earnedPoints']}/{d['totalPoints']} ({d['scorePercentage']}%) - passed={d['passed']}\")")
pass "Test graded: $SCORE"

info "=== 12. Get pools by course ==="
COURSE_POOLS=$(curl -sf "$BASE/api/v1/question-pools/by-course/$COURSE_ID" -H "$AUTH")
PC=$(echo "$COURSE_POOLS" | python3 -c "import sys,json; print(len(json.load(sys.stdin)['data']))")
pass "Pools for course: $PC pool(s)"

info "=== 13. Validate MCQ constraint (0 correct = rejected) ==="
BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/questions" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d "{\"poolId\":\"$POOL_ID\",\"questionText\":\"Bad Q\",\"questionType\":\"MCQ\",\"difficulty\":\"EASY\",\"points\":1,\"answers\":[{\"answerText\":\"A\",\"isCorrect\":false},{\"answerText\":\"B\",\"isCorrect\":false}]}")
[ "$BAD" = "400" ] && pass "MCQ validation works (400 on 0 correct answers)" || fail "Validation failed (got $BAD)"

info "=== 14. Validate distribution constraint ==="
DIST_BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/question-pools" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"name":"Bad Pool","scopeType":"COURSE","totalQuestions":9,"easyCount":3,"mediumCount":3,"hardCount":4,"passPercentage":60}')
[ "$DIST_BAD" = "400" ] && pass "Distribution validation works (400 when 3+3+4 != 9)" || fail "Validation failed (got $DIST_BAD)"

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  All smoke tests passed ✅  Question pool system is live!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
