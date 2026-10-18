/**
 * SimulationTerminal — the simulated diagnostic terminal for the lab workspace.
 *
 * Renders a read-only terminal emulator UI that interprets commands against the
 * live simulation state via commandParser.ts.
 *
 * Security:
 *   - No eval(), no Function(), no shell access
 *   - Commands are parsed via explicit allowlist grammar
 *   - All output is derived from simulation state (never trusted user strings)
 *   - A visible "SIMULATED TERMINAL" badge keeps the mode unambiguous
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Terminal, Info } from 'lucide-react';
import { parseAndExecute, type TerminalLine } from '../terminal/commandParser';
import type { SimulationState } from '../engine/types';

interface SimulationTerminalProps {
  state: SimulationState | null;
  className?: string;
}

const WELCOME_LINES: TerminalLine[] = [
  { kind: 'header', text: '╔══════════════════════════════════════════╗' },
  { kind: 'header', text: '║  UnlearnARC Engineering Labs — Terminal  ║' },
  { kind: 'header', text: '║  ⚠ SIMULATED  ·  Not a real shell       ║' },
  { kind: 'header', text: '╚══════════════════════════════════════════╝' },
  { kind: 'info',   text: "Type 'help' for available commands." },
  { kind: 'output', text: '' },
];

const MAX_HISTORY = 50;

function lineColor(kind: TerminalLine['kind']): string {
  switch (kind) {
    case 'header': return 'var(--ua-primary-400)';
    case 'error':  return 'var(--ua-danger)';
    case 'info':   return 'var(--ua-warning)';
    default:       return 'var(--ua-text-primary)';
  }
}

export const SimulationTerminal: React.FC<SimulationTerminalProps> = ({ state, className }) => {
  const [inputValue, setInputValue] = useState('');
  const [lines, setLines] = useState<TerminalLine[]>(WELCOME_LINES);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Auto-scroll on new output
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const runCommand = useCallback((raw: string) => {
    if (!raw.trim()) return;

    // Echo the command
    setLines(prev => [
      ...prev,
      { kind: 'output', text: `$ ${raw}` },
    ]);

    if (!state) {
      setLines(prev => [
        ...prev,
        { kind: 'error', text: 'Simulation not running. Start the simulation first.' },
        { kind: 'output', text: '' },
      ]);
      return;
    }

    const { lines: newLines, clear } = parseAndExecute(raw, state);

    if (clear) {
      setLines(WELCOME_LINES);
    } else {
      setLines(prev => [
        ...prev,
        ...newLines,
        { kind: 'output', text: '' },
      ]);
    }

    // Trim overall length
    setLines(prev => prev.length > 500 ? prev.slice(prev.length - 500) : prev);

    // Update command history
    setCmdHistory(prev => {
      const updated = [raw, ...prev.filter(c => c !== raw)].slice(0, MAX_HISTORY);
      return updated;
    });
    setHistoryIdx(-1);
  }, [state]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = inputValue.trim();
      setInputValue('');
      runCommand(cmd);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const nextIdx = Math.min(historyIdx + 1, cmdHistory.length - 1);
      setHistoryIdx(nextIdx);
      setInputValue(cmdHistory[nextIdx] ?? '');
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(nextIdx);
      setInputValue(nextIdx === -1 ? '' : cmdHistory[nextIdx] ?? '');
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion for common commands
      const completions = ['show nodes', 'show services', 'show db', 'show cache',
        'show queues', 'show logs', 'show metrics --node', 'top', 'help', 'clear'];
      const match = completions.find(c => c.startsWith(inputValue));
      if (match) setInputValue(match);
    }
  }, [inputValue, historyIdx, cmdHistory, runCommand]);

  return (
    <div
      className={`flex flex-col rounded-xl overflow-hidden ${className ?? ''}`}
      style={{
        background: '#0d1117',
        border: '1px solid var(--ua-border)',
        minHeight: 280,
      }}
      role="region"
      aria-label="Simulated diagnostic terminal"
    >
      {/* Title bar */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ background: '#161b22', borderBottom: '1px solid #30363d' }}
      >
        <Terminal size={14} style={{ color: '#58a6ff' }} />
        <span className="text-xs font-medium" style={{ color: '#c9d1d9' }}>
          Terminal
        </span>
        <span
          className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono"
          style={{ background: '#388bfd26', color: '#58a6ff' }}
        >
          SIMULATED
        </span>
        <div className="flex gap-1.5" aria-hidden="true">
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
          <div className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
        </div>
      </div>

      {/* Output area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed"
        style={{ color: '#c9d1d9' }}
        onClick={() => inputRef.current?.focus()}
        role="log"
        aria-live="polite"
        aria-label="Terminal output"
      >
        {lines.map((line, i) => (
          <div
            key={i}
            style={{ color: lineColor(line.kind), whiteSpace: 'pre' }}
          >
            {line.text}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div
        className="flex items-center gap-2 px-4 py-2 shrink-0"
        style={{ borderTop: '1px solid #30363d', background: '#0d1117' }}
      >
        <span className="font-mono text-xs" style={{ color: '#58a6ff' }}>
          {state ? `lab@${state.engineVersion}:~$` : 'lab:~$'}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type a command…"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-1 bg-transparent outline-none font-mono text-xs"
          style={{ color: '#c9d1d9', caretColor: '#58a6ff' }}
          aria-label="Terminal input"
        />
      </div>

      {/* Disclaimer */}
      <div
        className="flex items-center gap-1.5 px-4 py-1.5 text-xs shrink-0"
        style={{ background: '#161b22', color: '#8b949e', borderTop: '1px solid #21262d' }}
      >
        <Info size={10} />
        This is a simulated terminal. All output reflects the simulation model, not a real system.
      </div>
    </div>
  );
};
