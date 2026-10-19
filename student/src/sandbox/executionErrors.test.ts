import { describe, expect, it } from 'vitest';
import { failedExecution, formatExecutionError, normalizeExecutionError } from './executionErrors';

describe('execution error normalization', () => {
  it.each(['SyntaxError', 'IndentationError', 'TabError'])('handles Python %s without interpreter frames', name => {
    const raw = `Traceback (most recent call last):\n  File "/lib/python312.zip/_pyodide/_base.py", line 149, in compile\n  File "<exec>", line 2\n    if True\n           ^\n${name}: invalid syntax\n`;
    const result = normalizeExecutionError(new Error(raw), { language: 'python', code: 'print(1)\nif True' });
    expect(result).toMatchObject({ kind: 'syntax', name, message: 'invalid syntax', line: 2, column: 8, sourceLine: 'if True' });
    const formatted = formatExecutionError(result);
    expect(formatted).toContain(`${name}: invalid syntax\n  Line 2, column 8`);
    expect(formatted).not.toContain('_pyodide');
    expect(result.traceback).toContain('_pyodide');
  });

  it.each(['NameError', 'TypeError', 'ValueError', 'ZeroDivisionError', 'IndexError', 'KeyError', 'ImportError', 'EOFError', 'PermissionError', 'MemoryError', 'RecursionError', 'SystemExit', 'KeyboardInterrupt'])('retains Python %s identity', name => {
    const raw = `Traceback (most recent call last):\n  File "<exec>", line 1, in <module>\n  File "<exec>", line 3, in solve\n${name}: original message\n`;
    expect(normalizeExecutionError(new Error(raw), { language: 'python' })).toMatchObject({ kind: 'runtime', name, message: 'original message', line: 3 });
  });

  it('uses the final exception in a chained traceback', () => {
    const error = normalizeExecutionError('ValueError: first\n\nDuring handling of the above exception, another exception occurred:\n\n  File "<exec>", line 4\nRuntimeError: final', { language: 'python' });
    expect(error).toMatchObject({ name: 'RuntimeError', message: 'final', line: 4 });
  });

  it('handles JS syntax, runtime and non-Error thrown values', () => {
    expect(normalizeExecutionError(new SyntaxError('Unexpected token'))).toMatchObject({ kind: 'syntax', name: 'SyntaxError' });
    expect(normalizeExecutionError(new TypeError('not callable'))).toMatchObject({ kind: 'runtime', name: 'TypeError' });
    expect(formatExecutionError(normalizeExecutionError(null))).toBe('Error: null');
    expect(formatExecutionError(normalizeExecutionError('failure'))).toBe('Error: failure');
  });

  it('keeps partial output for infrastructure failures', () => {
    expect(failedExecution('time limit', 'timeout', 100, 'before\n', 'warning\n')).toMatchObject({
      ok: false, timedOut: true, durationMs: 100, stdout: 'before\n', stderr: 'warning\nError: time limit\n', errorDetails: { kind: 'timeout' },
    });
  });
});
