#!/usr/bin/env bash
#
# attach-algoviz.sh
# -----------------
# Builds the standalone @unlearnarc/algo-visualizer package and attaches it to
# BOTH the admin and student frontends via a local "file:" dependency, then
# verifies each app can resolve & type-check against it.
#
# Idempotent: safe to re-run. Pass --dev to also start a watch build.
#
# Usage:
#   ./attach-algoviz.sh            # build + link + verify
#   ./attach-algoviz.sh --no-verify
#   ./attach-algoviz.sh --dev      # link + leave package in watch mode
#
set -euo pipefail

# ── Paths (resolve relative to this script, so it works from anywhere) ────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PKG_DIR="$ROOT/packages/algo-visualizer"
ADMIN_DIR="$ROOT/admin"
STUDENT_DIR="$ROOT/student"
PKG_NAME="@unlearnarc/algo-visualizer"
PKG_SPEC="file:../packages/algo-visualizer"

# ── Pretty output ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
step() { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✅ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠  $1${NC}"; }
die()  { echo -e "${RED}❌ $1${NC}"; exit 1; }

DEV_MODE=false
DO_VERIFY=true
for arg in "$@"; do
  case "$arg" in
    --dev)        DEV_MODE=true ;;
    --no-verify)  DO_VERIFY=false ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ── 0. Sanity checks ──────────────────────────────────────────────────────────
step "Checking workspace layout"
[ -d "$PKG_DIR" ]     || die "Package not found at $PKG_DIR"
[ -d "$ADMIN_DIR" ]   || die "admin/ not found"
[ -d "$STUDENT_DIR" ] || die "student/ not found"
command -v npm >/dev/null 2>&1 || die "npm is not installed"
ok "Found package + admin + student"

# ── 1. Install package deps & build dist ──────────────────────────────────────
step "Building $PKG_NAME"
cd "$PKG_DIR"
if [ ! -d node_modules ]; then
  echo "   installing package dev deps…"
  npm install --silent
fi
npm run build
[ -f "$PKG_DIR/dist/index.js" ] && [ -f "$PKG_DIR/dist/index.d.ts" ] \
  || die "Build did not produce dist/ (index.js + index.d.ts)"
ok "Package built → packages/algo-visualizer/dist"

# ── 2. Ensure the file: dependency is declared, then install in each app ───────
ensure_dep() {
  local app_dir="$1" app_name="$2"
  step "Attaching to $app_name"
  cd "$app_dir"

  # Add/update the dependency line in package.json using node (no jq dependency).
  node -e '
    const fs = require("fs");
    const p = "package.json";
    const j = JSON.parse(fs.readFileSync(p, "utf8"));
    j.dependencies = j.dependencies || {};
    const name = process.argv[1], spec = process.argv[2];
    if (j.dependencies[name] !== spec) {
      j.dependencies[name] = spec;
      fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n");
      console.log("   package.json updated →", name, spec);
    } else {
      console.log("   dependency already present");
    }
  ' "$PKG_NAME" "$PKG_SPEC"

  # Install so node_modules/@unlearnarc/algo-visualizer symlink/copy is created.
  echo "   running npm install…"
  npm install --silent

  local linked="$app_dir/node_modules/$PKG_NAME/dist/index.js"
  [ -e "$linked" ] || die "$app_name: package did not resolve in node_modules"
  ok "$app_name linked to $PKG_NAME"
}

ensure_dep "$ADMIN_DIR"   "admin"
ensure_dep "$STUDENT_DIR" "student"

# ── 3. Verify each app type-checks against the package ─────────────────────────
if [ "$DO_VERIFY" = true ]; then
  verify_app() {
    local app_dir="$1" app_name="$2"
    step "Type-checking $app_name"
    cd "$app_dir"
    if npx tsc -p tsconfig.json --noEmit; then
      ok "$app_name type-checks clean"
    else
      warn "$app_name has type errors (see above) — package is still linked"
    fi
  }
  verify_app "$ADMIN_DIR"   "admin"
  verify_app "$STUDENT_DIR" "student"
else
  warn "Skipping type-check (--no-verify)"
fi

# ── 4. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}──────────────────────────────────────────────${NC}"
ok "algo-visualizer is attached to admin + student"
echo -e "   • Admin:   import { AlgorithmVisualizer } from '$PKG_NAME'"
echo -e "   • Student: import { AlgorithmVisualizer } from '$PKG_NAME'"
echo -e "   • Routes:  admin  → /algorithms   (authoring + preview)"
echo -e "              student→ /algorithms , /algorithms/:slug"
echo -e "${GREEN}──────────────────────────────────────────────${NC}"
echo ""
echo "Next:"
echo "   1) start backend  :  cd backend && ./mvnw spring-boot:run"
echo "   2) start admin    :  cd admin   && npm run dev   (http://localhost:3000)"
echo "   3) start student  :  cd student && npm run dev   (http://localhost:3002)"

# ── 5. Optional watch mode ────────────────────────────────────────────────────
if [ "$DEV_MODE" = true ]; then
  step "Starting package in watch mode (Ctrl+C to stop)"
  cd "$PKG_DIR"
  warn "Edits to the package will rebuild dist/. Re-run app dev servers if they don't pick up changes."
  npm run dev
fi
