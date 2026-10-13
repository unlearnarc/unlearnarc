import { useCallback, useState } from 'react';
import { contestAPI } from '../api/endpoints';
import { useSandbox } from './useSandbox';
import type { Language } from './types';
import type {
  Challenge, ContestProblem, SubmissionRequest, SubmissionResponse, TestOutcome,
} from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// useContestGrader
//
// Orchestrates the full LOCAL-EXECUTION contest flow entirely from the client:
//
//   1. GET  /challenge            → signed test inputs (public + hidden)
//   2. run user code locally      → in the sandbox worker, per test case
//   3. POST /submit               → echo signatures + captured outputs
//   4. server re-validates        → authoritative verdict + score returned here
//
// The sandbox worker does all execution off the main thread; the WASM runtime is
// installed once per machine (Cache API) and reused on every subsequent run.
// ─────────────────────────────────────────────────────────────────────────────

export interface LocalCaseResult {
  testCaseId: string;
  isHidden: boolean;
  displayOrder: number;
  producedOutput: string;
  clientStatus: NonNullable<TestOutcome['clientStatus']>;
  runtimeMs: number;
  /** Local best-effort pass check against the public expected output only. */
  localPassed?: boolean;
}

export type GradePhase =
  | 'idle'
  | 'fetching-challenge'
  | 'running'
  | 'submitting'
  | 'done'
  | 'error';

export interface UseContestGrader {
  phase: GradePhase;
  /** 0..1 progress while running the local test cases. */
  runProgress: number;
  localResults: LocalCaseResult[];
  submission: SubmissionResponse | null;
  error: string | null;
  sandboxStatus: ReturnType<typeof useSandbox>['status'];
  sandboxProgress: number;
  installedFromCache: boolean;
  /** Warm/install the runtime for this language (safe to call repeatedly). */
  prepare: () => Promise<void>;
  /** Run against public sample cases only — fast feedback, no submission. */
  runSamples: (code: string, problem: ContestProblem) => Promise<LocalCaseResult[]>;
  /** Full graded submission: challenge → run all cases → submit. */
  gradeAndSubmit: (
    code: string,
    contestId: string,
    problem: ContestProblem,
  ) => Promise<SubmissionResponse | null>;
}

const PER_CASE_TIMEOUT_FALLBACK = 5_000;

export function useContestGrader(language: Language): UseContestGrader {
  const sandbox = useSandbox(language);
  const [phase, setPhase] = useState<GradePhase>('idle');
  const [runProgress, setRunProgress] = useState(0);
  const [localResults, setLocalResults] = useState<LocalCaseResult[]>([]);
  const [submission, setSubmission] = useState<SubmissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const prepare = useCallback(async () => {
    await sandbox.init();
  }, [sandbox]);

  // Wrap the user's code so stdin for a single case is fed and stdout captured.
  // For FUNCTION_RETURN harnesses the problem's starter defines `solve(...)`;
  // here we keep it STDIN/STDOUT-first (the common case) and surface the raw
  // stdout as producedOutput, matching the server's OutputValidator contract.
  const executeCase = useCallback(
    async (
      code: string,
      input: string,
      timeoutMs: number,
    ): Promise<{ output: string; status: LocalCaseResult['clientStatus']; runtimeMs: number }> => {
      const result = await sandbox.run(code, { stdin: input, timeoutMs });
      let status: LocalCaseResult['clientStatus'] = 'OK';
      if (result.timedOut) status = 'TIMEOUT';
      else if (!result.ok) status = 'RUNTIME_ERROR';
      // Prefer stdout; fall back to a stringified return value for FUNCTION_RETURN.
      const output =
        result.stdout && result.stdout.length > 0
          ? result.stdout.replace(/\n$/, '')
          : result.returnValue != null
            ? String(result.returnValue)
            : '';
      return { output, status, runtimeMs: Math.round(result.durationMs) };
    },
    [sandbox],
  );

  const runSamples = useCallback(
    async (code: string, problem: ContestProblem): Promise<LocalCaseResult[]> => {
      setError(null);
      setPhase('running');
      setRunProgress(0);
      await sandbox.init();

      const timeout = problem.timeLimitMs || PER_CASE_TIMEOUT_FALLBACK;
      const out: LocalCaseResult[] = [];
      const cases = problem.sampleTestCases ?? [];
      for (let i = 0; i < cases.length; i++) {
        const tc = cases[i];
        const r = await executeCase(code, tc.input, timeout);
        out.push({
          testCaseId: tc.id,
          isHidden: false,
          displayOrder: tc.displayOrder,
          producedOutput: r.output,
          clientStatus: r.status,
          runtimeMs: r.runtimeMs,
          localPassed:
            r.status === 'OK' &&
            normalize(r.output) === normalize(tc.expectedOutput),
        });
        setRunProgress((i + 1) / cases.length);
      }
      setLocalResults(out);
      setPhase('done');
      return out;
    },
    [sandbox, executeCase],
  );

  const gradeAndSubmit = useCallback(
    async (
      code: string,
      contestId: string,
      problem: ContestProblem,
    ): Promise<SubmissionResponse | null> => {
      try {
        setError(null);
        setSubmission(null);
        await sandbox.init();

        // 1. Pull signed inputs (public + hidden). Hidden expected outputs are
        //    never exposed — we only receive the inputs + signatures.
        setPhase('fetching-challenge');
        const challengeRes = await contestAPI.challenge(contestId, problem.id);
        const challenge: Challenge = challengeRes.data?.data ?? challengeRes.data;

        // 2. Execute locally against every case.
        setPhase('running');
        setRunProgress(0);
        const timeout = challenge.timeLimitMs || problem.timeLimitMs || PER_CASE_TIMEOUT_FALLBACK;
        const outcomes: TestOutcome[] = [];
        const local: LocalCaseResult[] = [];

        for (let i = 0; i < challenge.cases.length; i++) {
          const c = challenge.cases[i];
          const r = await executeCase(code, c.input, timeout);
          outcomes.push({
            testCaseId: c.testCaseId,
            signature: c.signature,
            input: c.input,
            producedOutput: r.output,
            clientStatus: r.status,
            runtimeMs: r.runtimeMs,
          });
          local.push({
            testCaseId: c.testCaseId,
            isHidden: c.isHidden,
            displayOrder: c.displayOrder,
            producedOutput: r.output,
            clientStatus: r.status,
            runtimeMs: r.runtimeMs,
          });
          setRunProgress((i + 1) / challenge.cases.length);
        }
        setLocalResults(local);

        // 3. Submit — server verifies signatures + re-validates outputs.
        setPhase('submitting');
        const req: SubmissionRequest = {
          problemId: problem.id,
          language,
          sourceCode: code,
          results: outcomes,
        };
        const subRes = await contestAPI.submit(contestId, req);
        const graded: SubmissionResponse = subRes.data?.data ?? subRes.data;
        setSubmission(graded);
        setPhase('done');
        return graded;
      } catch (e) {
        const msg = extractError(e);
        setError(msg);
        setPhase('error');
        return null;
      }
    },
    [sandbox, executeCase, language],
  );

  return {
    phase,
    runProgress,
    localResults,
    submission,
    error,
    sandboxStatus: sandbox.status,
    sandboxProgress: sandbox.progress,
    installedFromCache: sandbox.installedFromCache,
    prepare,
    runSamples,
    gradeAndSubmit,
  };
}

// Mirror the server's lenient default comparison (trim + collapse trailing WS).
function normalize(s: string): string {
  return s.replace(/\r\n/g, '\n').replace(/[ \t]+$/gm, '').replace(/\n+$/, '').trim();
}

function extractError(e: unknown): string {
  if (typeof e === 'object' && e && 'response' in e) {
    // axios error
    const resp = (e as { response?: { data?: { error?: string; message?: string } } }).response;
    return resp?.data?.error ?? resp?.data?.message ?? 'Request failed';
  }
  return e instanceof Error ? e.message : String(e);
}
