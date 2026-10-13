/* =============================================================================
   programScenes — reference scenes that teach SOURCE CODE alongside the
   animation. These prove the "load programs" capability:

     • A LeetCode problem (Two Sum) — runnable Python, with the array animation
       and code line-highlighting advancing in lock-step.
     • An SQL query walk-through (INNER JOIN) — display-only SQL, highlighted
       clause by clause as the table animation plays.

   Each builder returns a plain AnimationTrace carrying `programs` — identical in
   shape to what the backend emits, so these can be swapped for API-fetched
   scenes with zero renderer changes.
   ============================================================================= */

import type { AnimationTrace } from '../../../types/animation';
import { TraceBuilder } from '../simulator/traceBuilder';

const DARK = '#0F172A';

/* ─────────────────────────────────────────────────────────────────────────
   LeetCode #1 — Two Sum (hash-map, O(n)).
   The array is drawn as `arrayCell`s; as the scan proceeds, the active index
   and the complement lookup light up in both the canvas AND the code.
   ───────────────────────────────────────────────────────────────────────── */
export function buildTwoSumTrace(): AnimationTrace {
  const W = 720;
  const H = 300;
  const nums = [2, 7, 11, 15];
  const target = 9;

  const PY = `def two_sum(nums, target):
    seen = {}                      # value -> index
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

print(two_sum([2, 7, 11, 15], 9))`;

  const b = new TraceBuilder({
    id: 'leetcode-two-sum',
    title: 'LeetCode 1 — Two Sum (hash map)',
    description: 'Scan once, remembering seen values so each complement is an O(1) lookup.',
    viewport: { width: W, height: H },
    category: 'DSA',
    theme: { background: DARK },
    notes: {
      summary:
        'Two Sum returns indices of the two numbers that add to target. The ' +
        'hash-map approach stores each value’s index as it scans, turning the ' +
        'inner search into an O(1) lookup — overall O(n) time, O(n) space.',
      whereToUse: [
        'Pair-sum / complement problems (3Sum builds on this).',
        'Any “have I seen X before?” scan where order of discovery matters.',
      ],
      keyPoints: [
        'Check for the complement BEFORE inserting the current value (avoids using one element twice).',
        'Brute force is O(n²); the hash map trades space for time to reach O(n).',
      ],
    },
    programs: [
      {
        id: 'py',
        label: 'Two Sum — O(n)',
        language: 'python',
        source: PY,
        runnable: true,
        explanation: 'Hash-map solution — O(n) time, O(n) space. Press Run to execute it live.',
      },
      {
        id: 'brute',
        label: 'Brute force — O(n²)',
        language: 'python',
        source: `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]
    return []

print(two_sum([2, 7, 11, 15], 9))`,
        runnable: true,
        explanation: 'The naive O(n²) baseline — check every pair. Correct but slow for large n.',
      },
    ],
  });

  // Draw the array cells.
  const x0 = 90;
  const gap = 110;
  nums.forEach((n, i) => {
    b.set(`c${i}`, {
      id: `c${i}`, shape: 'arrayCell', x: x0 + i * gap, y: 110,
      width: 80, height: 80, color: '#334155', label: String(n), sublabel: `i=${i}`,
      status: 'IDLE',
    });
  });
  b.set('need', { id: 'need', shape: 'text', x: W / 2, y: 230, color: '#94A3B8', label: `target = ${target}` });

  b.step('Setup', 'Scan left→right, remembering each value in a hash map.')
    .highlightCode('py', [1, 2], 'Initialise an empty map of value → index.')
    .say('Two Sum on [2, 7, 11, 15], target 9.')
    .commit(650);

  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const x = nums[i];
    const need = target - x;

    b.set(`c${i}`, { color: '#2563EB', status: 'ACTIVE' })
      .set('need', { label: `need = ${target} − ${x} = ${need}` })
      .highlightCode('py', [3, 4], `At i=${i}, x=${x} → need ${need}.`)
      .step(`i = ${i}`, `x = ${x}; complement needed = ${need}.`)
      .say(`x=${x}, need=${need}.`)
      .commit(600);

    if (seen.has(need)) {
      const j = seen.get(need)!;
      b.set(`c${j}`, { color: '#16A34A', status: 'SUCCESS' })
        .set(`c${i}`, { color: '#16A34A', status: 'SUCCESS' })
        .set('need', { label: `found! indices [${j}, ${i}]` })
        .highlightCode('py', [5, 6], `${need} was seen at index ${j} → answer [${j}, ${i}].`)
        .step('Match found', `seen contains ${need} at index ${j} → return [${j}, ${i}].`)
        .say(`Found pair → [${j}, ${i}].`)
        .commit(900);
      break;
    } else {
      // first iteration → ask the learner what we store
      if (i === 0) {
        b.checkpoint({
          kind: 'single',
          prompt: 'The complement 7 is not in the map yet. What do we do with x = 2?',
          options: [
            { id: 'store', label: 'Store 2 → index 0, then continue' },
            { id: 'return', label: 'Return immediately' },
            { id: 'skip', label: 'Skip it entirely' },
          ],
          answer: 'store',
          explanation: 'We record value→index so a later element can find it as its complement.',
          hint: 'We need to remember values we have already seen.',
          blocking: true,
        });
      }
      seen.set(x, i);
      b.set(`c${i}`, { color: '#475569', status: 'WAITING', sublabel: `seen[${x}]=${i}` })
        .highlightCode('py', [7], `Store seen[${x}] = ${i}.`)
        .step(`Store ${x}`, `${need} not seen yet → record seen[${x}] = ${i}.`)
        .say(`Store seen[${x}]=${i}.`)
        .commit(600);
    }
  }

  b.step('Done', 'The answer is returned in a single pass.')
    .say('Two Sum complete.')
    .commit(500);

  return b.build();
}

/* ─────────────────────────────────────────────────────────────────────────
   SQL — teach an INNER JOIN query clause-by-clause (display-only SQL program),
   with the two tables animating as the matching rows are discovered.
   ───────────────────────────────────────────────────────────────────────── */
export function buildSqlQueryTrace(): AnimationTrace {
  const W = 720;
  const H = 340;

  const SQL = `SELECT u.id, u.name, o.item
FROM users AS u
INNER JOIN orders AS o
  ON u.id = o.user_id
WHERE o.item IS NOT NULL
ORDER BY u.id;`;

  const b = new TraceBuilder({
    id: 'sql-join-query',
    title: 'SQL — INNER JOIN, clause by clause',
    description: 'Walk through how the engine resolves a JOIN query against two tables.',
    viewport: { width: W, height: H },
    category: 'DATABASE',
    theme: { background: DARK },
    notes: {
      summary:
        'SQL is declarative: you describe the result, the planner decides how. ' +
        'Logically, FROM/JOIN builds the row set, ON/WHERE filter it, SELECT ' +
        'projects columns, and ORDER BY sorts.',
      whereToUse: [
        'Combining normalized tables on a foreign key.',
        'Reporting queries that join facts to dimensions.',
      ],
      keyPoints: [
        'Logical order ≠ written order: FROM → JOIN/ON → WHERE → SELECT → ORDER BY.',
        'INNER JOIN drops rows with no match on either side.',
      ],
    },
    programs: [
      {
        id: 'sql',
        label: 'Query',
        language: 'sql',
        source: SQL,
        runnable: false, // display-only — SQL isn’t in the client sandbox
        explanation: 'Read-along query. The highlighted clause corresponds to the current step.',
      },
    ],
  });

  b.set('users', {
    id: 'users', shape: 'table', x: 40, y: 70, width: 260, color: '#2563EB',
    meta: { title: 'users (u)', columns: ['id', 'name'], rows: [[1, 'Ana'], [2, 'Ben'], [3, 'Cy']] },
  });
  b.set('orders', {
    id: 'orders', shape: 'table', x: 420, y: 70, width: 260, color: '#0EA5E9',
    meta: { title: 'orders (o)', columns: ['user_id', 'item'], rows: [[1, 'Book'], [2, 'Pen'], [5, 'Lamp']] },
  });

  b.step('FROM users', 'Start from the users table — the driving row source.')
    .highlightCode('sql', [2], 'FROM picks the first table (aliased u).')
    .say('FROM users AS u')
    .commit(650);

  b.set('users', { meta: { title: 'users (u)', columns: ['id', 'name'], rows: [[1, 'Ana'], [2, 'Ben'], [3, 'Cy']], highlightRow: 0 } })
    .set('orders', { meta: { title: 'orders (o)', columns: ['user_id', 'item'], rows: [[1, 'Book'], [2, 'Pen'], [5, 'Lamp']], highlightRow: 0 } })
    .link('j', { from: 'users', to: 'orders', color: '#16A34A', label: 'u.id = o.user_id' })
    .step('JOIN … ON', 'Match each user to orders where u.id = o.user_id.')
    .highlightCode('sql', [3, 4], 'INNER JOIN on the shared key.')
    .say('Join on u.id = o.user_id')
    .commit(700);

  b.checkpoint({
    kind: 'single',
    prompt: 'orders has user_id = 5, but users has no id = 5. With INNER JOIN, that order row…',
    options: [
      { id: 'drop', label: 'is dropped (no match)' },
      { id: 'null', label: 'appears with NULL user columns' },
    ],
    answer: 'drop',
    explanation: 'INNER JOIN keeps only rows matched on both sides, so user_id = 5 is excluded.',
    hint: 'LEFT JOIN would keep it with NULLs — INNER does not.',
    blocking: false,
  });

  b.unlink('j')
    .step('WHERE filter', 'Keep only rows where o.item is present.')
    .highlightCode('sql', [5], 'WHERE prunes the joined rows.')
    .say('WHERE o.item IS NOT NULL')
    .commit(600);

  b.set('result', {
    id: 'result', shape: 'table', x: 210, y: 230, width: 300, color: '#16A34A',
    meta: { title: 'result', columns: ['id', 'name', 'item'], rows: [[1, 'Ana', 'Book'], [2, 'Ben', 'Pen']] },
  })
    .step('SELECT + ORDER BY', 'Project the chosen columns and sort by u.id.')
    .highlightCode('sql', [1, 6], 'SELECT the projection, ORDER BY sorts it.')
    .say('Projected, sorted result.')
    .commit(700);

  return b.build();
}
