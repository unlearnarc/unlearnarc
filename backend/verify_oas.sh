#!/usr/bin/env bash
# Scripted smoke check: boots is assumed running on :8085.
# Verifies the OpenAPI spec is served and core auth flow works.
set -euo pipefail
BASE="${BASE:-http://localhost:8085}"

echo "== 1. OpenAPI JSON spec =="
curl -fsS "$BASE/v3/api-docs" | python3 -c 'import sys,json; d=json.load(sys.stdin); print("openapi:",d["openapi"]); print("paths:",len(d["paths"]))'

echo "== 2. Public endpoint =="
curl -fsS -o /dev/null -w "domains HTTP %{http_code}\n" "$BASE/api/v1/domains"

echo "== 3. Protected endpoint without token (expect 401/403) =="
curl -fsS -o /dev/null -w "me HTTP %{http_code}\n" "$BASE/api/v1/auth/me" || true

echo "== 4. Login + authed /me =="
TOKEN=$(curl -fsS -X POST "$BASE/api/v1/auth/login" \
  -H 'Content-Type: application/json' \
  -d '{"email":"unlearnarc@gmail.com","password":"Admin@123"}' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["data"]["accessToken"])')
echo "token acquired: ${TOKEN:0:20}..."
curl -fsS -o /dev/null -w "me (authed) HTTP %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" "$BASE/api/v1/auth/me"

echo "All checks passed."
