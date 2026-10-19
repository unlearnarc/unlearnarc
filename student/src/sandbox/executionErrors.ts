import type { ExecutionError, ExecutionErrorKind, ExecutionResult, Language } from './types';

/** Convert runtime-specific exceptions into a serialisable, stable public error. */
export function normalizeExecutionError(
  value: unknown,
  options: { language?: Language; code?: string; kind?: ExecutionErrorKind } = {},
): ExecutionError {
  let raw: string;
  try {
    raw = value instanceof Error ? value.message : String(value);
  } catch {
    raw = 'Unknown execution error';
  }
  let name = value instanceof Error ? value.name : 'Error';
  let message = raw || 'Unknown execution error';
  let line: number | undefined;
  let column: number | undefined;

  if (options.language === 'python') {
    // Pyodide wraps both compile-time and runtime exceptions in PythonError.
    // Read the final exception, not the wrapper or the first traceback frame.
    const lines = raw.split('\n');
    const summary = lines.findLast(text => /^[\w.]+(?::|$)/.test(text) && text.trim());
    const match = summary?.match(/^([\w.]+)(?::\s?(.*))?$/);
    if (match) {
      name = match[1];
      message = match[2] ?? '';
    }
    const frames = [...raw.matchAll(/File "<(?:exec|student|string)>", line (\d+)([^\n]*)(?=\n([^\n]*)(?:\n([^\n]*))?)/g)];
    const frame = frames.at(-1);
    if (frame) {
      line = Number(frame[1]);
      // Traceback source is padded by four spaces. Don't infer a column from
      // runtime markers (~~~^~~~), only a syntax-error caret.
      if (/^(SyntaxError|IndentationError|TabError)$/.test(name) && /^\s*\^/.test(frame[4] ?? '')) {
        column = Math.max(1, frame[4].indexOf('^') - 4 + 1);
      }
    } else {
      const location = [...raw.matchAll(/File "<(?:exec|student|string)>", line (\d+)/g)].at(-1);
      if (location) line = Number(location[1]);
    }
  }

  const kind = options.kind ?? (
    /^(SyntaxError|IndentationError|TabError)$/.test(name) ? 'syntax' : 'runtime'
  );
  return {
    kind,
    name,
    message,
    ...(line !== undefined ? { line } : {}),
    ...(column !== undefined ? { column } : {}),
    ...(line !== undefined && options.code !== undefined
      ? { sourceLine: options.code.split('\n')[line - 1] }
      : {}),
    // Keep the original exception/traceback for diagnostics, without forcing
    // learners to read interpreter internals in the output panel.
    traceback: value instanceof Error ? value.stack ?? raw : raw,
  };
}

export function formatExecutionError(error: ExecutionError): string {
  const summary = `${error.name}${error.message ? `: ${error.message}` : ''}`;
  if (error.line === undefined) return summary;
  const location = `  Line ${error.line}${error.column === undefined ? '' : `, column ${error.column}`}`;
  const source = error.sourceLine === undefined ? '' : `\n    ${error.sourceLine}`;
  const caret = error.column === undefined ? '' : `\n    ${' '.repeat(error.column - 1)}^`;
  return `${summary}\n${location}${source}${caret}`;
}

/** Infrastructure failures follow the same result contract as user errors. */
export function failedExecution(
  value: unknown,
  kind: ExecutionErrorKind,
  durationMs = 0,
  stdout = '',
  stderr = '',
): ExecutionResult {
  const errorDetails = normalizeExecutionError(value, { kind });
  const error = formatExecutionError(errorDetails);
  return {
    ok: false, stdout, stderr: stderr + error + '\n', durationMs,
    timedOut: kind === 'timeout', error, errorDetails,
  };
}
