# UnlearnARC Engineering Labs — Architecture

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, TypeScript 6, Vite 8, Tailwind CSS 4 |
| Simulation Engine | Pure TypeScript, Web Worker, no runtime dependencies |
| Design System | UnlearnARC tokens (`var(--ua-*)`) |
| Backend catalog (Phase 3+) | Spring Boot 3.5, MySQL, JPA |
| Test runner (engine) | Vitest 5 |
| Test runner (UI) | Playwright |

---

## Three-Layer Architecture

### Layer A — Visual Simulation (default, all students)

Runs entirely in the browser. A deterministic simulation engine models
distributed-system behavior using explicit resource capacities, arrival rates,
queueing, failures, and recovery rules.

```
Browser (React) ←──── typed messages ────→ Web Worker
                                                │
                                         SimulationEngine
                                         SeededRandom
                                         ScheduledEvents
```

No cloud compute is required. The same seed + scenario + actions always
produce the same result.

### Layer B — Real Execution (deferred, Phase 5)

An `ExecutionProvider` interface is defined but not implemented. When added,
it will run actual processes (containers, databases, brokers) in isolated
temporary environments.

The interface (`src/labs/engine/types.ts`: `LabAttemptRequest`) is stable.

### Layer C — Learning & Orchestration (Spring Boot)

The existing Spring Boot backend manages:

- Lab scenario catalog (`lab_scenario` table)
- Student attempt records (`lab_attempt` table)
- Student-saved designs (`lab_design` table)
- Authentication, authorization, XP/scoring
- Future: environment provisioning, real load test coordination

---

## File Structure

```
student/src/labs/
  engine/
    types.ts               ← All shared interfaces (stable contracts)
    seededRandom.ts        ← Mulberry32 PRNG (deterministic)
    simulationEngine.ts    ← Core simulation loop (framework-free)
    simulationWorker.ts    ← Web Worker entry point
    useSimulation.ts       ← React hook (spawns/manages worker)
    evaluationEngine.ts    ← Scoring rule functions
    simulationEngine.test.ts ← Vitest tests (28 tests, all pass)
  scenarios/
    trafficSurge.ts        ← Phase 1 scenario: Traffic Surge Incident
  terminal/
    commandParser.ts       ← Simulated terminal command allowlist
  ui/
    LabWorkspace.tsx       ← Main lab shell (composes all panels)
    TopologyCanvas.tsx     ← SVG graph editor
    ComponentInspector.tsx ← Right-panel: selected node config + metrics
    ComponentPalette.tsx   ← Left-panel: add components
    MetricsPanel.tsx       ← Sparkline metrics grid
    SimulationTerminal.tsx ← Simulated diagnostic terminal
  ARCHITECTURE.md          ← This file
```

---

## Scenario Versioning

Every scenario carries:
- `engineVersion: '1.0.0'` — must match `ENGINE_VERSION` constant
- `schemaVersion: 1` — bumped on breaking definition changes

Old attempt replays are reproducible by matching `engineVersion` + `seed` +
ordered actions. Scenario definitions are JSON-serializable (no functions).
Runtime evaluation functions are attached at evaluation time by `evaluationEngine.ts`.

---

## Simulation Engine Design

**Virtual time** — `simulationTime` is tracked independently from wall-clock.
Real time (`Date.now()`) is only used for the `wallTime` display field.

**Fixed time step** — each `tick(deltaMs)` call advances exactly `deltaMs` ms
of virtual time (default 100ms).

**Event queue** — `scheduledEvents` sorted by `scheduledAt`. All events due
at or before current `simulationTime` are processed before node modeling.

**Component models**:
- `rate_limiter` — token bucket, drops arrivals above capacity
- `load_balancer` — connection-based saturation, small jitter
- `service` / `api_gateway` / `worker` — M/D/1 approximation; queue depth
  and latency rise exponentially above 80% saturation
- `database` — connection pool model; replication lag when enabled
- `read_replica` — read-only pool, propagates lag from primary
- `cache` — hit/miss ratio with configurable warmup period
- `queue` — backlog grows when consumers lag; DLQ not yet modeled
- `cdn` — hit/miss ratio, fixed edge latency
- `circuit_breaker` — opens on downstream error rate threshold, auto-closes

**Bounded resources**:
- Max log entries: 500
- Max metric samples: 2,000
- Max event history in snapshot: 200
- Node/edge limits: enforced per scenario constraints

**Determinism**: same `seed` + same `scheduledEvents` + same ordered
`StudentAction` sequence → identical snapshots.

---

## Simulated Terminal

Commands are parsed by an **explicit allowlist grammar** in `commandParser.ts`.
No `eval()`, no `Function()`, no shell access.

Available commands:
```
show nodes | services | db | cache | queues | logs | metrics
top
help
clear
```

All output derives from the live `SimulationState` passed to `parseAndExecute()`.
A visible "SIMULATED" badge in the terminal UI makes the mode unambiguous.

---

## Database Migration

`backend/migrations/V11__lab_scenarios.sql` adds three tables:
- `lab_scenario` — versioned scenario catalog
- `lab_design` — student topology saves
- `lab_attempt` — attempt records with result JSON

Later phases add `lab_checkpoint`, `execution_environment`, `load_test_run`.

---

## Security Notes

- The simulation engine runs in a Web Worker, isolated from the React UI thread.
- Student topology actions are validated against `constraints.maxNodes`,
  `constraints.maxEdges`, and `constraints.lockedNodeIds` before being applied.
- No student-provided strings are ever `eval()`-ed or passed to `Function()`.
- The terminal command parser uses an explicit allowlist; unknown verbs return
  a safe error message.
- Real execution is not implemented. The `ExecutionProvider` interface is defined
  in `types.ts` as `LabAttemptRequest` / `LabAttemptResult` for future integration.
- When real execution is added, it must run in an isolated worker/container,
  never inside the main Spring Boot process or on the application host.

---

## Completed Features (Phase 1)

| # | Feature |
|---|---------|
| 1 | Typed simulation engine interfaces (`types.ts`) |
| 2 | Seeded PRNG (`SeededRandom`) — deterministic randomness |
| 3 | Simulation engine with 10 component models |
| 4 | Web Worker integration (`simulationWorker.ts`) |
| 5 | React hook (`useSimulation`) with lifecycle management |
| 6 | Traffic Surge scenario (30→300 RPS burst at t=30s) |
| 7 | Evaluation engine (4 scoring rules) |
| 8 | Simulated terminal with command allowlist |
| 9 | SVG topology canvas (drag, pan, zoom, select) |
| 10 | Component palette (13 kinds) |
| 11 | Component inspector (metrics, scale, failure testing) |
| 12 | Sparkline metrics panel |
| 13 | Mission / debrief panel with scoring |
| 14 | Labs catalog page (`/labs`) with full-screen workspace |
| 15 | Sidebar navigation entry "Lab" |
| 16 | Theme-compatible (light + dark mode) |
| 17 | Database migration `V11__lab_scenarios.sql` |
| 18 | 28 engine tests — all passing |
| 19 | TypeScript strict-mode clean — 0 errors |
| 20 | Production build clean — worker bundled separately |

## Deferred Capabilities

| Phase | Feature |
|-------|---------|
| 2 | Checkpoint save/restore mid-simulation |
| 3 | Database partitioning/sharding model |
| 3 | Kafka/event stream consumer group model |
| 3 | Additional scenarios (DB replication, consumer lag) |
| 4 | Interview challenge mode, workload config UI |
| 5 | Real execution provider interface + isolated environments |
| 6 | Real load testing, real database experiments |

---

## Local Development

```bash
# Frontend
cd student
npm install
npm run dev          # http://localhost:3002/labs

# Engine tests
npx vitest run src/labs/engine/simulationEngine.test.ts

# Backend (for auth + future catalog API)
cd backend
./mvnw spring-boot:run
```

Visit `/labs` after login to see the Engineering Labs catalog.
Launch the **Traffic Surge Incident** lab to use the workspace.
