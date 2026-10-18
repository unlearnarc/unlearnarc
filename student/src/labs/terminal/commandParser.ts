/**
 * Simulated Terminal — Command Parser
 *
 * Parses and executes a restricted set of diagnostic commands against the
 * simulation state. Never calls eval(), Function(), or executes shell commands.
 *
 * Grammar (simplified BNF):
 *   command   ::= verb [ noun ] [ flags ]
 *   verb      ::= 'show' | 'list' | 'top' | 'scale' | 'failover' | 'help' | 'clear'
 *   noun      ::= 'nodes' | 'metrics' | 'logs' | 'queues' | 'cache' | 'db' | 'services'
 *   flags     ::= '--node' <id> | '--last' <n> | '--level' <level>
 *
 * All output is derived from the live simulation state.
 */

import type { SimulationState, ComponentMetrics } from '../engine/types';

export interface TerminalLine {
  kind: 'output' | 'error' | 'info' | 'header';
  text: string;
}

export type CommandHandler = (
  args: string[],
  state: SimulationState,
) => TerminalLine[];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

function ms(v: number): string {
  return `${Math.round(v)}ms`;
}

function bar(saturation: number, width = 20): string {
  const filled = Math.round(saturation * width);
  const empty  = width - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}

function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sLeft = s % 60;
  if (m > 0) return `${m}m ${sLeft}s`;
  return `${s}s`;
}

function nodeLabel(state: SimulationState, nodeId: string): string {
  return state.topology.nodes.find(n => n.id === nodeId)?.label ?? nodeId;
}

function header(text: string): TerminalLine {
  return { kind: 'header', text };
}
function out(text: string): TerminalLine {
  return { kind: 'output', text };
}
function info(text: string): TerminalLine {
  return { kind: 'info', text };
}
function err(text: string): TerminalLine {
  return { kind: 'error', text };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMAND HANDLERS
// ─────────────────────────────────────────────────────────────────────────────

const HELP_TEXT = `
Available commands:

  show nodes              List all components in the topology
  show services           List application services
  show db                 Show database metrics
  show cache              Show cache hit/miss rates
  show queues             Show queue depths and consumer lag
  show logs [--last N]    Show recent simulation logs
  show metrics --node ID  Detailed metrics for a specific node
  top                     Live saturation overview of all components
  help                    Show this help text
  clear                   Clear the terminal

Simulation time is virtual. Metrics reflect the simulated state, not production.
`.trim();

const COMMANDS: Record<string, CommandHandler> = {

  help: () => HELP_TEXT.split('\n').map(line => info(line)),

  clear: () => [],   // UI handles clear specially; return empty

  top: (_args, state) => {
    const lines: TerminalLine[] = [
      header(`UnlearnARC Labs — System Health  t=${fmtTime(state.simulationTime)}  [SIMULATED]`),
      out(''),
      out('Component                   Status      Saturation        RPS-in   Latency   Errors'),
      out('─'.repeat(88)),
    ];
    for (const node of state.topology.nodes) {
      const m: ComponentMetrics | undefined = state.metrics[node.id];
      if (!m) continue;
      const label = node.label.padEnd(28).slice(0, 28);
      const statusEmoji =
        m.errorRate > 0.5   ? '✗ FAILED  ' :
        m.saturation > 0.9  ? '⚠ OVERLOAD' :
        m.saturation > 0.7  ? '~ BUSY    ' :
                               '✓ HEALTHY ';
      const satBar = bar(m.saturation, 16);
      const rps    = Math.round(m.requestsIn).toString().padStart(7);
      const lat    = ms(m.avgLatencyMs).padStart(9);
      const errPct = pct(m.errorRate).padStart(7);
      lines.push(out(`${label} ${statusEmoji} ${satBar} ${rps}  ${lat}  ${errPct}`));
    }
    lines.push(out(''));
    if (state.activeIncidents.length) {
      lines.push(header(`ACTIVE INCIDENTS: ${state.activeIncidents.join(', ')}`));
    }
    return lines;
  },

  show: (args, state) => {
    const noun = args[0]?.toLowerCase();
    switch (noun) {
      case 'nodes': {
        const lines: TerminalLine[] = [
          header(`Topology (${state.topology.nodes.length} nodes, ${state.topology.edges.length} edges)  [SIMULATED]`),
        ];
        for (const node of state.topology.nodes) {
          lines.push(out(`  ${node.kind.padEnd(18)} id=${node.id.slice(0, 12)}  label="${node.label}"`));
        }
        return lines;
      }

      case 'services': {
        const services = state.topology.nodes.filter(n =>
          ['service', 'api_gateway', 'worker'].includes(n.kind),
        );
        if (!services.length) return [info('No service components in topology.')];
        const lines: TerminalLine[] = [header('Application Services  [SIMULATED]'), out('')];
        for (const node of services) {
          const m = state.metrics[node.id];
          if (!m) continue;
          const cfg = node.config as Record<string, number>;
          lines.push(
            header(`  ${node.label} (${node.kind})`),
            out(`    Replicas:     ${cfg['replicas'] ?? 1}`),
            out(`    Saturation:   ${pct(m.saturation)} ${bar(m.saturation, 20)}`),
            out(`    RPS in/out:   ${Math.round(m.requestsIn)} / ${Math.round(m.requestsOut)}`),
            out(`    Dropped:      ${Math.round(m.requestsDropped)}`),
            out(`    Avg latency:  ${ms(m.avgLatencyMs)}`),
            out(`    Error rate:   ${pct(m.errorRate)}`),
            out(`    Connections:  ${m.connections ?? '-'} / ${m.maxConnections ?? '-'}`),
            out(''),
          );
        }
        return lines;
      }

      case 'db': {
        const dbs = state.topology.nodes.filter(n =>
          ['database', 'read_replica'].includes(n.kind),
        );
        if (!dbs.length) return [info('No database components in topology.')];
        const lines: TerminalLine[] = [header('Database Metrics  [SIMULATED]'), out('')];
        for (const node of dbs) {
          const m = state.metrics[node.id];
          if (!m) continue;
          const cfg = node.config as Record<string, unknown>;
          lines.push(
            header(`  ${node.label} (${node.kind})`),
            out(`    Engine:       ${cfg['engine'] ?? 'unknown'}`),
            out(`    Connections:  ${m.connections ?? '-'} / ${m.maxConnections ?? '-'}`),
            out(`    Saturation:   ${pct(m.saturation)} ${bar(m.saturation, 20)}`),
            out(`    Avg query:    ${ms(m.avgLatencyMs)}`),
            out(`    Error rate:   ${pct(m.errorRate)}`),
            out(`    Queue depth:  ${m.queueDepth}`),
            m.replicationLagMs != null && m.replicationLagMs > 0
              ? out(`    Replica lag:  ${ms(m.replicationLagMs)}`)
              : out(`    Replication:  disabled`),
            out(''),
          );
        }
        return lines;
      }

      case 'cache': {
        const caches = state.topology.nodes.filter(n =>
          ['cache', 'cdn'].includes(n.kind),
        );
        if (!caches.length) return [info('No cache or CDN components in topology.')];
        const lines: TerminalLine[] = [header('Cache / CDN Metrics  [SIMULATED]'), out('')];
        for (const node of caches) {
          const m = state.metrics[node.id];
          if (!m) continue;
          const total = (m.cacheHits ?? 0) + (m.cacheMisses ?? 0);
          const hitRatio = total > 0 ? (m.cacheHits ?? 0) / total : 0;
          lines.push(
            header(`  ${node.label} (${node.kind})`),
            out(`    Hit ratio:    ${pct(hitRatio)} ${bar(hitRatio, 20)}`),
            out(`    Hits:         ${Math.round(m.cacheHits ?? 0)}`),
            out(`    Misses:       ${Math.round(m.cacheMisses ?? 0)}`),
            out(`    Avg latency:  ${ms(m.avgLatencyMs)}`),
            out(''),
          );
        }
        return lines;
      }

      case 'queues': {
        const queues = state.topology.nodes.filter(n =>
          ['queue', 'event_stream'].includes(n.kind),
        );
        if (!queues.length) return [info('No queue or event stream components in topology.')];
        const lines: TerminalLine[] = [header('Queue Metrics  [SIMULATED]'), out('')];
        for (const node of queues) {
          const m = state.metrics[node.id];
          if (!m) continue;
          const cfg = node.config as Record<string, number>;
          const maxDepth = cfg['maxDepth'] ?? 10000;
          lines.push(
            header(`  ${node.label} (${node.kind})`),
            out(`    Depth:        ${m.queueDepth} / ${maxDepth}`),
            out(`    Saturation:   ${pct(m.saturation)} ${bar(m.saturation, 20)}`),
            out(`    Producer RPS: ${Math.round(m.requestsIn)}`),
            out(`    Consumer RPS: ${Math.round(m.requestsOut)}`),
            out(`    Dropped:      ${Math.round(m.requestsDropped)}`),
            out(''),
          );
        }
        return lines;
      }

      case 'logs': {
        const nArg  = args.indexOf('--last');
        const n     = nArg >= 0 ? parseInt(args[nArg + 1] ?? '20', 10) : 20;
        const level = args[args.indexOf('--level') + 1];
        let entries = [...state.logs];
        if (level) entries = entries.filter(e => e.level === level);
        const recent = entries.slice(-Math.max(1, Math.min(n, 100)));
        const lines: TerminalLine[] = [
          header(`Recent Logs (${recent.length} entries)  [SIMULATED]`), out(''),
        ];
        for (const entry of recent) {
          const t = `[${fmtTime(entry.simulationTime).padStart(6)}]`;
          const lvl =
            entry.level === 'error' ? '✗' :
            entry.level === 'warn'  ? '⚠' :
            entry.level === 'debug' ? '·' : 'ℹ';
          const src = entry.nodeId ? `[${nodeLabel(state, entry.nodeId).slice(0, 16).padEnd(16)}]` : ' '.repeat(18);
          const kind: TerminalLine['kind'] =
            entry.level === 'error' ? 'error' :
            entry.level === 'warn'  ? 'info'  : 'output';
          lines.push({ kind, text: `${t} ${lvl} ${src} ${entry.message}` });
        }
        return lines;
      }

      case 'metrics': {
        const nodeFlag = args.indexOf('--node');
        const nodeId   = nodeFlag >= 0 ? args[nodeFlag + 1] : undefined;
        if (!nodeId) return [err('Usage: show metrics --node <id>'), info('Use "show nodes" to list component IDs.')];
        const m = state.metrics[nodeId];
        if (!m) return [err(`No metrics found for node "${nodeId}".`)];
        const label = nodeLabel(state, nodeId);
        return [
          header(`Metrics: ${label}  [SIMULATED]`),
          out(`  Node ID:      ${nodeId}`),
          out(`  RPS in:       ${Math.round(m.requestsIn)}`),
          out(`  RPS out:      ${Math.round(m.requestsOut)}`),
          out(`  Dropped:      ${Math.round(m.requestsDropped)}`),
          out(`  Queue depth:  ${m.queueDepth}`),
          out(`  Avg latency:  ${ms(m.avgLatencyMs)}`),
          out(`  Error rate:   ${pct(m.errorRate)}`),
          out(`  Saturation:   ${pct(m.saturation)} ${bar(m.saturation, 20)}`),
          ...(m.cacheHits != null ? [out(`  Cache hits:   ${Math.round(m.cacheHits)}`)] : []),
          ...(m.cacheMisses != null ? [out(`  Cache misses: ${Math.round(m.cacheMisses)}`)] : []),
          ...(m.replicationLagMs != null && m.replicationLagMs > 0
            ? [out(`  Replica lag:  ${ms(m.replicationLagMs)}`)]
            : []),
          ...(m.connections != null
            ? [out(`  Connections:  ${m.connections} / ${m.maxConnections ?? '-'}`)]
            : []),
        ];
      }

      default:
        return [
          err(`Unknown target: "${noun}". Try: nodes | services | db | cache | queues | logs | metrics`),
        ];
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC PARSER
// ─────────────────────────────────────────────────────────────────────────────

export function parseAndExecute(
  input: string,
  state: SimulationState,
): { lines: TerminalLine[]; clear: boolean } {
  const trimmed = input.trim();
  if (!trimmed) return { lines: [], clear: false };

  const tokens = trimmed.toLowerCase().split(/\s+/);
  const verb   = tokens[0];
  const rest   = tokens.slice(1);

  if (verb === 'clear') return { lines: [], clear: true };

  const handler = COMMANDS[verb];
  if (!handler) {
    return {
      lines: [
        err(`Command not found: "${verb}"`),
        info('Type "help" to see available commands.'),
      ],
      clear: false,
    };
  }

  const lines = handler(rest, state);
  return { lines, clear: false };
}
