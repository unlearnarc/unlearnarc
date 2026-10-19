/// <reference types="node" />
import { execFileSync } from 'node:child_process';
import { beforeAll, describe, expect, it } from 'vitest';
import { formatExecutionError, normalizeExecutionError } from './executionErrors';

const cases = [
  ['if True\n    pass', 'SyntaxError', 'syntax', 1],
  ['if True:\npass', 'IndentationError', 'syntax', 2],
  ['print(missing_variable)', 'NameError', 'runtime', 1],
  ['def solve():\n    return 1 / 0\nsolve()', 'ZeroDivisionError', 'runtime', 2],
  ['raise ValueError("bad input")', 'ValueError', 'runtime', 1],
  ['import nonexistent_student_module', 'ModuleNotFoundError', 'runtime', 1],
] as const;
let results: { error: string; recovered: number }[];

beforeAll(() => {
  // A native Node process avoids Vite transforming Emscripten's CommonJS loader.
  const script = `
    const { loadPyodide } = require('pyodide');
    (async () => {
      const py = await loadPyodide();
      const results = [];
      for (const code of ${JSON.stringify(cases.map(([code]) => code))}) {
        let error = '';
        try { await py.runPythonAsync(code); } catch (e) { error = e.message; }
        results.push({ error, recovered: await py.runPythonAsync('6 * 7') });
      }
      process.stdout.write(JSON.stringify(results));
    })().catch(e => { console.error(e); process.exit(1); });
  `;
  results = JSON.parse(execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 60_000 }));
}, 65_000);

describe('real Pyodide exception formatting', () => {
  cases.forEach(([code, name, kind, line], index) => {
    it(`formats ${name} and recovers`, () => {
      const { error: raw, recovered } = results[index];
      expect(raw).not.toBe('');
      const error = normalizeExecutionError(new Error(raw), { language: 'python', code });
      expect(error).toMatchObject({ name, kind, line });
      expect(formatExecutionError(error)).toContain(`Line ${line}`);
      expect(formatExecutionError(error)).not.toContain('_pyodide');
      expect(error.traceback).toContain(name);
      expect(recovered).toBe(42);
    });
  });
});
