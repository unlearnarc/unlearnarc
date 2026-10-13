import React from 'react';
import { Eye, EyeOff, PlusCircle, Trash2, Lock, AlertCircle } from 'lucide-react';
import { TestCase, emptyTestCase } from './types';

/**
 * Editor for a problem's test cases.
 *
 * PUBLIC cases (eye) are sample cases shipped to students with their expected
 * output. HIDDEN cases (lock) keep the expected output server-side; only the
 * input is ever sent to the client runner, and the server re-validates the
 * reported output against this expected value. At least one hidden case is
 * strongly recommended so students cannot fabricate a pass.
 */
export const TestCaseEditor: React.FC<{
  testCases: TestCase[];
  onChange: (next: TestCase[]) => void;
}> = ({ testCases, onChange }) => {
  const set = (i: number, patch: Partial<TestCase>) =>
    onChange(testCases.map((tc, idx) => (idx === i ? { ...tc, ...patch } : tc)));

  const add = (hidden: boolean) =>
    onChange([...testCases, emptyTestCase(testCases.length, hidden)]);

  const remove = (i: number) =>
    onChange(testCases.filter((_, idx) => idx !== i).map((tc, idx) => ({ ...tc, displayOrder: idx })));

  const hiddenCount = testCases.filter((t) => t.isHidden).length;
  const publicCount = testCases.length - hiddenCount;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Test Cases</p>
          <span className="text-xs text-emerald-400">{publicCount} public</span>
          <span className="text-slate-600 text-xs">·</span>
          <span className="text-xs text-violet-400">{hiddenCount} hidden</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => add(false)}
            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition"
          >
            <PlusCircle size={13} /> Public case
          </button>
          <button
            type="button"
            onClick={() => add(true)}
            className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"
          >
            <PlusCircle size={13} /> Hidden case
          </button>
        </div>
      </div>

      {hiddenCount === 0 && (
        <div className="flex items-center gap-1.5 text-xs text-amber-400 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/25">
          <AlertCircle size={12} />
          Add at least one hidden case — grading relies on hidden expected outputs the student never sees.
        </div>
      )}

      {testCases.length === 0 ? (
        <p className="text-xs text-slate-600 italic py-3 text-center">No test cases yet.</p>
      ) : (
        <div className="space-y-2">
          {testCases.map((tc, i) => (
            <div
              key={i}
              className={`rounded-xl border p-3 space-y-2 ${
                tc.isHidden
                  ? 'bg-violet-500/5 border-violet-500/20'
                  : 'bg-emerald-500/5 border-emerald-500/20'
              }`}
            >
              {/* row header */}
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/8 text-slate-400 text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => set(i, { isHidden: !tc.isHidden })}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition ${
                    tc.isHidden
                      ? 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {tc.isHidden ? <Lock size={11} /> : <Eye size={11} />}
                  {tc.isHidden ? 'Hidden' : 'Public'}
                </button>

                <div className="flex-1" />

                <label className="flex items-center gap-1 text-xs text-slate-400">
                  Weight
                  <input
                    type="number"
                    min={1}
                    value={tc.weight}
                    onChange={(e) => set(i, { weight: parseInt(e.target.value) || 1 })}
                    className="w-14 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                  />
                </label>

                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tc.strictMatch}
                    onChange={(e) => set(i, { strictMatch: e.target.checked })}
                    className="accent-violet-500"
                  />
                  Strict match
                </label>

                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {/* input / expected output */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 block">Input (stdin / JSON args)</label>
                  <textarea
                    value={tc.input}
                    onChange={(e) => set(i, { input: e.target.value })}
                    rows={3}
                    placeholder="e.g. 5\n1 2 3 4 5"
                    className="w-full px-2.5 py-2 rounded-lg bg-bg border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500/40 resize-y"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 mb-1 flex items-center gap-1">
                    Expected output
                    {tc.isHidden && (
                      <span className="inline-flex items-center gap-0.5 text-violet-400">
                        <EyeOff size={10} /> never sent to student
                      </span>
                    )}
                  </label>
                  <textarea
                    value={tc.expectedOutput}
                    onChange={(e) => set(i, { expectedOutput: e.target.value })}
                    rows={3}
                    placeholder="e.g. 15"
                    className="w-full px-2.5 py-2 rounded-lg bg-bg border border-white/10 text-white placeholder-slate-600 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-violet-500/40 resize-y"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
