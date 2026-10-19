#!/usr/bin/env bash
#
# dev.sh — one command to rule them all.
# --------------------------------------
# Attaches @unlearnarc/algo-visualizer, then boots every dev process:
#   • backend          Spring Boot  → http://localhost:8085
#   • admin frontend   Vite         → http://localhost:3000
#   • student frontend Vite         → http://localhost:3002
#   • mcp              Python MCP   → stdio (Zoho Code IDE / Claude Desktop)
#   • algo-visualizer  tsup --watch (optional, with --watch-pkg)
#
# All child processes are tracked in a process group and torn down cleanly
# on Ctrl+C (SIGINT), SIGTERM, or normal exit — no orphaned processes.
#
# Usage:
#   ./dev.sh                 # attach (if needed) + start backend/admin/student/mcp
#   ./dev.sh --no-attach     # skip the attach-algoviz step (faster restarts)
#   ./dev.sh --watch-pkg     # also run algo-visualizer in watch/rebuild mode
#   ./dev.sh --skip-backend  # don't start the Spring Boot backend
#   ./dev.sh --skip-mcp      # don't start the MCP server
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
ADMIN_DIR="$ROOT/admin"
STUDENT_DIR="$ROOT/student"
PKG_DIR="$ROOT/packages/algo-visualizer"
MCP_DIR="$ROOT/mcp"
LOG_DIR="$ROOT/.dev-logs"

# ── Pretty output ─────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
CYAN='\033[0;36m'; MAGENTA='\033[0;35m'; WHITE='\033[1;37m'; NC='\033[0m'
step()  { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()    { echo -e "${GREEN}✅ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠  $1${NC}"; }
die()   { echo -e "${RED}❌ $1${NC}"; exit 1; }
info()  { echo -e "${WHITE}   $1${NC}"; }

# ── Flags ─────────────────────────────────────────────────────────────────────
DO_ATTACH=true
WATCH_PKG=false
START_BACKEND=true
START_MCP=true

for arg in "$@"; do
  case "$arg" in
    --no-attach)    DO_ATTACH=false ;;
    --watch-pkg)    WATCH_PKG=true ;;
    --skip-backend) START_BACKEND=false ;;
    --skip-mcp)     START_MCP=false ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) warn "Unknown flag: $arg" ;;
  esac
done

# ── Track child PIDs for clean shutdown ───────────────────────────────────────
# NOTE: macOS ships Bash 3.2, which has no associative arrays (`declare -A`),
# so we use two parallel indexed arrays: PIDS[i] <-> PID_NAMES[i].
PIDS=()
PID_NAMES=()

name_of() {  # name_of <pid> → prints the label, or "pid <n>" if unknown
  local want="$1" i
  for i in "${!PIDS[@]}"; do
    if [ "${PIDS[$i]}" = "$want" ]; then
      echo "${PID_NAMES[$i]}"
      return
    fi
  done
  echo "pid $want"
}

CLEANED_UP=false
cleanup() {
  $CLEANED_UP && return
  CLEANED_UP=true
  echo ""
  step "Shutting down… (Ctrl+C received)"
  # Kill each tracked child plus its whole descendant tree so that
  # Vite/Maven-spawned grandchildren (node, java, esbuild) also die.
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      echo -e "   ${YELLOW}stopping $(name_of "$pid") (pid $pid)${NC}"
      kill_tree "$pid" TERM
    fi
  done
  # Give them a moment, then hard-kill anything still alive.
  sleep 2
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill_tree "$pid" KILL
    fi
  done
  ok "All dev processes stopped."
  exit 0
}

# Recursively signal a process and all of its descendants.
# Works on macOS (no setsid/pkill -g reliance) and Linux alike.
kill_tree() {
  local parent="$1" sig="$2" child
  for child in $(pgrep -P "$parent" 2>/dev/null); do
    kill_tree "$child" "$sig"
  done
  kill -"$sig" "$parent" 2>/dev/null || true
}
# Trap INT/TERM for Ctrl+C; EXIT as a safety net.
trap cleanup INT TERM

# Launch a command in the background, tee its output to a log, and prefix every
# line with a coloured [label] so interleaved logs stay readable. The returned
# PID is the root of the child tree; cleanup() walks it with kill_tree().
start_proc() {
  local label="$1" color="$2" dir="$3"; shift 3
  local logfile="$LOG_DIR/${label}.log"
  echo -e "${color}▶ starting ${label}${NC}  (logs → ${logfile})"
  (
    cd "$dir"
    exec "$@"
  # Fan-out to three sinks, kept strictly LINE-buffered via fflush():
  #   1) per-process plain log ($logfile)
  #   2) combined timestamped session log ($SESSION_LOG), prefixed with [label]
  #   3) colourised console output (stdout)
  ) > >(awk \
          -v plain="$logfile" \
          -v sess="$SESSION_LOG" \
          -v lbl="$label" \
          -v pfx="$(printf '%b' "${color}[${label}]${NC} ")" \
          '{
             print            >> plain; fflush(plain);
             print "["lbl"] " $0 >> sess;  fflush(sess);
             print pfx $0;                  fflush(stdout);
           }') 2>&1 &
  local pid=$!
  PIDS+=("$pid")
  PID_NAMES+=("$label")
}

# ── 0. Sanity ────────────────────────────────────────────────────────────────
step "Checking workspace"
[ -d "$ADMIN_DIR" ]   || die "admin/ not found"
[ -d "$STUDENT_DIR" ] || die "student/ not found"
[ -d "$BACKEND_DIR" ] || die "backend/ not found"
[ -d "$MCP_DIR" ]     || { warn "mcp/ not found — MCP server disabled"; START_MCP=false; }
command -v npm >/dev/null 2>&1 || die "npm is not installed"
mkdir -p "$LOG_DIR"

# ── Combined, timestamped session log ─────────────────────────────────────────
# Every start creates a fresh timestamped file AND updates a stable
# "latest" symlink so tailing is always: tail -f .dev-logs/session-latest.log
SESSION_LOG="$LOG_DIR/session-$(date +%Y%m%d-%H%M%S).log"
LATEST_LINK="$LOG_DIR/session-latest.log"
: > "$SESSION_LOG"
ln -sf "$(basename "$SESSION_LOG")" "$LATEST_LINK"
echo "=== dev session started $(date) ===" >> "$SESSION_LOG"
ok "Workspace OK"
ok "Session log → $SESSION_LOG (symlinked as $LATEST_LINK)"

# ── 1. Attach algo-visualizer (build + link into admin & student) ─────────────
if [ "$DO_ATTACH" = true ]; then
  if [ -x "$ROOT/attach-algoviz.sh" ]; then
    step "Attaching @unlearnarc/algo-visualizer"
    "$ROOT/attach-algoviz.sh" --no-verify
  else
    warn "attach-algoviz.sh not found/executable — skipping attach step"
  fi
else
  warn "Skipping attach step (--no-attach)"
fi

# ── 2. Pick Maven runner (prefer wrapper, else system mvn) ────────────────────
MVN_CMD=""
if [ "$START_BACKEND" = true ]; then
  if [ -x "$BACKEND_DIR/mvnw" ]; then
    MVN_CMD="./mvnw"
  elif command -v mvn >/dev/null 2>&1; then
    MVN_CMD="mvn"
  else
    warn "No Maven wrapper or system mvn found — backend will NOT start"
    START_BACKEND=false
  fi
fi

# ── 3. Resolve MCP Python interpreter ────────────────────────────────────────
MCP_PYTHON=""
if [ "$START_MCP" = true ]; then
  if [ -x "$MCP_DIR/.venv/bin/python" ]; then
    MCP_PYTHON="$MCP_DIR/.venv/bin/python"
  elif command -v python3 >/dev/null 2>&1; then
    warn "mcp/.venv not found — falling back to system python3 (may be missing deps)"
    MCP_PYTHON="$(command -v python3)"
  else
    warn "No Python interpreter found — MCP server will NOT start"
    warn "  Fix: cd mcp && python3 -m venv .venv && .venv/bin/pip install -e ."
    START_MCP=false
  fi
  # Verify the package is importable before we try to start it
  if [ "$START_MCP" = true ]; then
    if ! "$MCP_PYTHON" -c "import unlearnarc_mcp" 2>/dev/null; then
      warn "unlearnarc_mcp package not importable — MCP server will NOT start"
      warn "  Fix: cd mcp && .venv/bin/pip install -e ."
      START_MCP=false
    fi
  fi
  # Warn if .env is missing (server will still start but auth will fail at runtime)
  if [ "$START_MCP" = true ] && [ ! -f "$MCP_DIR/.env" ]; then
    warn "mcp/.env not found — MCP server will start but admin auth will fail"
    warn "  Fix: cp mcp/.env.example mcp/.env  and fill in credentials"
  fi
fi

# ── 4. Boot everything ────────────────────────────────────────────────────────
step "Launching dev processes"

if [ "$WATCH_PKG" = true ] && [ -d "$PKG_DIR" ]; then
  start_proc "algoviz" "$MAGENTA" "$PKG_DIR" npm run dev
fi

if [ "$START_BACKEND" = true ]; then
  # shellcheck disable=SC2086
  # Isolate the running server from IDE compilation and Maven test/clean output.
  # Never clean this directory while the backend is running.
  start_proc "backend" "$CYAN" "$BACKEND_DIR" $MVN_CMD -Dapp.build.directory=target-dev spring-boot:run
fi

start_proc "admin"   "$GREEN"  "$ADMIN_DIR"   npm run dev
start_proc "student" "$YELLOW" "$STUDENT_DIR" npm run dev

if [ "$START_MCP" = true ]; then
  # MCP servers communicate over stdio — we redirect stdin from /dev/null
  # so the process doesn't block waiting for MCP client input, and just
  # keeps its own lifecycle running for logging purposes.
  # Zoho Code IDE / Claude Desktop each spawn their OWN instance over stdio
  # when a tool call arrives; this background instance is only for dev logging.
  start_proc "mcp" "$WHITE" "$MCP_DIR" \
    "$MCP_PYTHON" -m unlearnarc_mcp.server
fi

# ── 5. Summary ────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}──────────────────────────────────────────────${NC}"
ok "Dev stack is starting up"
[ "$START_BACKEND" = true ] && info "Backend  : http://localhost:8085"
info "Admin    : http://localhost:3000"
info "Student  : http://localhost:3002"
[ "$START_MCP" = true ]     && info "MCP      : $MCP_DIR (stdio — IDE/Claude Desktop)"
info "Logs     : $LOG_DIR/*.log"
info "Tail all : tail -f $LATEST_LINK"
echo -e "${GREEN}──────────────────────────────────────────────${NC}"
echo -e "${BLUE}Press Ctrl+C to stop everything.${NC}\n"

# ── 6. Wait — block here until Ctrl+C, then trap handles teardown ─────────────
# If any single process dies, keep the others running; only Ctrl+C tears down.
wait
