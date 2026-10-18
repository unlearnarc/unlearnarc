/**
 * Evaluation Engine
 *
 * Attaches runtime evaluate() functions to the declarative EvaluationRule
 * stubs that live in scenario definitions (which cannot contain functions
 * because they are JSON-serializable).
 *
 * Each rule receives the final SimulationState and returns 'pass' | 'fail' | 'partial'.
 */

import type {
  EvaluationRule,
  ScoreCard,
  SimulationState,
  LabScenario,
  EvaluationResult,
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// BUILT-IN RULE IMPLEMENTATIONS
// ─────────────────────────────────────────────────────────────────────────────

type RuleImpl = (state: SimulationState, scenario: LabScenario) => EvaluationResult;

const RULE_IMPLS: Record<string, RuleImpl> = {

  'survive-burst': (state) => {
    const allMetrics = Object.values(state.metrics);
    if (!allMetrics.length) return 'fail';
    const avgError = allMetrics.reduce((s, m) => s + m.errorRate, 0) / allMetrics.length;
    if (avgError < 0.05) return 'pass';
    if (avgError < 0.25) return 'partial';
    return 'fail';
  },

  'latency-p99': (state) => {
    const serviceMetrics = Object.values(state.metrics).filter(
      m => !m.nodeId.startsWith('client'),
    );
    if (!serviceMetrics.length) return 'fail';
    const maxLatency = Math.max(...serviceMetrics.map(m => m.avgLatencyMs));
    if (maxLatency < 500) return 'pass';
    if (maxLatency < 1500) return 'partial';
    return 'fail';
  },

  'add-protection': (state) => {
    const protectedKinds = ['cache', 'rate_limiter', 'load_balancer', 'cdn', 'circuit_breaker'];
    const hasProtection = state.topology.nodes.some(n =>
      protectedKinds.includes(n.kind),
    );
    return hasProtection ? 'pass' : 'fail';
  },

  'db-connections': (state) => {
    const dbMetrics = Object.values(state.metrics).filter(
      m => {
        const node = state.topology.nodes.find(n => n.id === m.nodeId);
        return node?.kind === 'database';
      },
    );
    if (!dbMetrics.length) return 'fail';
    const maxSaturation = Math.max(...dbMetrics.map(m => m.saturation));
    if (maxSaturation < 0.75) return 'pass';
    if (maxSaturation < 0.9)  return 'partial';
    return 'fail';
  },

  // Generic fallback for rules not yet implemented
  '_default': () => 'partial',
};

const RULE_POINTS: Record<string, number> = {
  'survive-burst':   30,
  'latency-p99':     25,
  'add-protection':  25,
  'db-connections':  20,
};

// ─────────────────────────────────────────────────────────────────────────────
// RULE HINTS
// ─────────────────────────────────────────────────────────────────────────────

const RULE_HINTS: Record<string, Record<EvaluationResult, string | undefined>> = {
  'survive-burst': {
    pass:    'Great — error rate stayed below 5% during the surge.',
    partial: 'Error rate was elevated. Try adding a cache or rate limiter.',
    fail:    'Too many errors during the surge. Protect the service with a cache or rate limiter.',
    pending: undefined,
  },
  'latency-p99': {
    pass:    'Response latency stayed healthy throughout the scenario.',
    partial: 'Latency was high during the burst. Scale out or add caching to reduce origin load.',
    fail:    'Latency exceeded 1.5 s. Add capacity or reduce requests reaching the backend.',
    pending: undefined,
  },
  'add-protection': {
    pass:    'You added a protective layer — good systems thinking.',
    partial: undefined,
    fail:    'Add at least one component: cache, rate limiter, load balancer, CDN, or circuit breaker.',
    pending: undefined,
  },
  'db-connections': {
    pass:    'Database connection pool stayed within safe limits.',
    partial: 'Connection pool reached 75–90%. Consider read replicas or query caching.',
    fail:    'Database was overwhelmed. Add a cache in front, or use connection pooling / read replicas.',
    pending: undefined,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export function buildRules(scenario: LabScenario): EvaluationRule[] {
  return scenario.evaluationRules.map(stub => ({
    ...stub,
    evaluate: (state: SimulationState): EvaluationResult => {
      const impl = RULE_IMPLS[stub.id] ?? RULE_IMPLS['_default']!;
      return impl(state, scenario);
    },
  }));
}

export function evaluateScenario(
  scenario: LabScenario,
  finalState: SimulationState,
): ScoreCard[] {
  const rules = buildRules(scenario);
  return rules.map(rule => {
    const result = rule.evaluate(finalState);
    const maxPoints = RULE_POINTS[rule.id] ?? 10;
    const awarded =
      result === 'pass'    ? maxPoints :
      result === 'partial' ? Math.round(maxPoints * 0.5) :
      0;
    const hintMap = RULE_HINTS[rule.id];
    return {
      ruleId:        rule.id,
      description:   rule.description,
      result,
      pointsAwarded: awarded,
      maxPoints,
      hint:          hintMap?.[result],
    };
  });
}
