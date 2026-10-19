# Executor error contract

`SandboxClient.init()` rejects when runtime startup fails. `SandboxClient.run()`
resolves an `ExecutionResult` for both successful and failed programs; callers
should inspect `ok` and `timedOut` rather than catch student exceptions.

Failures retain the compatible `error` and `stderr` strings and additionally
expose `errorDetails`:

- `kind`: `syntax`, `runtime`, `timeout`, `initialization`, `worker`, or `cancelled`.
- `name` and `message`: original exception identity and explanation.
- `line`, `column`, `sourceLine`: source location when reliably available.
- `traceback`: original exception/stack for debugging, not learner-facing output.

Python syntax, indentation and tab errors display the exception, source line and
caret instead of Pyodide's compiler internals. Runtime exceptions display the
last student-code frame. JavaScript preserves exception names; locations are
omitted rather than guessing engine-dependent `Function` wrapper offsets.

Ordinary stderr output is not itself a failure. Output before an exception,
worker crash or timeout is retained. Stdout/stderr callbacks support live output;
use the final result to also display failures that do not emit stream events.

The runtime handles one run at a time. Overlapping runs return a failure rather
than corrupting shared Python stdin/stdout. Disposal settles outstanding runs as
cancelled. Timeouts replace the worker so an abandoned coroutine cannot affect
later runs. Failed initialization can be retried by calling `init()` again.

Run executor tests: `npx vitest run src/sandbox`.
