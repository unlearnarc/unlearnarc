/* =============================================================================
   atomicOperationsTrace — a procedurally-generated AnimationTrace that visualises
   Compare-And-Swap (CAS) on a shared counter contended by three threads.

   Story it tells:
     • A shared memory cell holds `value`.
     • Three threads each want to increment it with a CAS loop:
         expected = read(value); if CAS(value, expected, expected+1) succeed else retry
     • One thread wins the race (SUCCESS), the losers observe a stale `expected`,
       their CAS FAILS, and they RETRY — eventually all three succeed.

   This mirrors the interactive concurrency tutorials: lock/attempt/retry/commit.

   The output is a plain AnimationTrace, so it is identical in shape to anything
   a backend simulator could emit — the renderer never knows the difference.
   ============================================================================= */

import type { AnimationTrace } from '../../../types/animation';
import { TraceBuilder } from '../simulator/traceBuilder';

const W = 720;
const H = 440;

const CELL = { x: W / 2 - 70, y: 40, w: 140, h: 70 };

const THREAD_LANES = [
  { id: 'T1', x: 140, color: '#6366F1' },
  { id: 'T2', x: W / 2, color: '#0EA5E9' },
  { id: 'T3', x: W - 140, color: '#EC4899' },
];
const THREAD_Y = 320;
const THREAD_R = 30;

interface ThreadPlan {
  id: string;
  /** the value it reads as `expected` for its attempt */
  readsValue: number;
  /** does the CAS succeed given the current value when it attempts */
  order: number; // 1 = first to attempt in this round
}

/**
 * Build the trace. `rounds` describes successive CAS attempts; each entry is the
 * list of threads attempting (in order) against the current shared value.
 */
export function buildAtomicOperationsTrace(): AnimationTrace {
  const b = new TraceBuilder({
    id: 'atomic-cas',
    title: 'Atomic Compare-And-Swap (CAS)',
    description:
      'Three threads race to increment a shared counter using a lock-free CAS loop.',
    viewport: { width: W, height: H },
    category: 'CONCURRENCY',
    theme: {
      background: '#0F172A',
      statusColors: {
        IDLE: '#475569',
        ACTIVE: '#2563EB',
        LOCKED: '#F59E0B',
        SUCCESS: '#16A34A',
        FAILED: '#DC2626',
        RETRY: '#D97706',
      },
    },
    notes: {
      summary:
        'Compare-And-Swap (CAS) is an atomic CPU instruction: it writes a new ' +
        'value only if the current value still equals an expected value. It is ' +
        'the foundation of lock-free data structures.',
      whereToUse: [
        'Lock-free counters, stacks and queues under high contention.',
        'Implementing atomics (AtomicInteger.compareAndSet, std::atomic).',
        'Optimistic concurrency control (version checks before writes).',
      ],
      keyPoints: [
        'Only one thread wins per round; the rest observe a stale value and retry.',
        'CAS avoids locks but can livelock/spin under extreme contention.',
        'The "ABA problem" can make a changed value look unchanged — guard with tags/versions.',
      ],
    },
  });

  let value = 0;

  // ── initial world ─────────────────────────────────────────────────────────
  b.set('cell', {
    id: 'cell',
    shape: 'rect',
    x: CELL.x,
    y: CELL.y,
    width: CELL.w,
    height: CELL.h,
    color: '#1E293B',
    label: 'counter',
    sublabel: String(value),
    status: 'IDLE',
  });
  THREAD_LANES.forEach((t) => {
    b.set(t.id, {
      id: t.id,
      shape: 'circle',
      x: t.x,
      y: THREAD_Y,
      radius: THREAD_R,
      color: t.color,
      label: t.id,
      sublabel: 'idle',
      status: 'IDLE',
    });
  });
  b.vars({ counter: value, successes: 0, retries: 0 })
    .step('Setup', 'A shared counter starts at 0; three threads will each try to increment it.')
    .say('Shared counter = 0. Three threads will each CAS-increment it.')
    .commit(700);

  let retries = 0;
  let successes = 0;

  // Each thread must successfully increment exactly once. We simulate contention:
  // in every round, all remaining threads read the SAME value, but only the
  // first to CAS wins; the others fail (stale expected) and retry next round.
  let remaining = THREAD_LANES.map((t) => t.id);

  while (remaining.length > 0) {
    const expected = value;

    // 1) all remaining threads READ the shared value (expected) ──────────────
    remaining.forEach((id) => {
      const lane = THREAD_LANES.find((t) => t.id === id)!;
      b.set(id, {
        status: 'ACTIVE',
        sublabel: `read ${expected}`,
      });
      // draw a read connection from thread up to the cell
      b.link(`read-${id}`, {
        from: id,
        to: 'cell',
        color: lane.color,
        dashed: true,
        opacity: 0.5,
        progress: 0,
      });
    });
    b.say(`Each thread reads expected = ${expected}.`).commit(250);

    // animate the read packet travelling to the cell
    remaining.forEach((id) => b.link(`read-${id}`, { from: id, to: 'cell', progress: 1 }));
    b.commit(450);
    remaining.forEach((id) => b.unlink(`read-${id}`));

    // Mid-animation question on the very first contended round.
    if (expected === 0 && remaining.length > 1) {
      b.checkpoint({
        kind: 'single',
        prompt: `All ${remaining.length} threads just read expected = 0. When they CAS concurrently, how many can succeed?`,
        options: [
          { id: 'all', label: `All ${remaining.length}` },
          { id: 'one', label: 'Exactly one' },
          { id: 'none', label: 'None' },
        ],
        answer: 'one',
        explanation:
          'CAS is atomic: only the first thread matches expected=0. Once it writes 1, the others’ expected (0) no longer matches, so their CAS fails.',
        hint: 'CAS only succeeds if the current value still equals the expected value.',
        blocking: true,
      });
    }

    // 2) first thread wins the CAS ───────────────────────────────────────────
    const winner = remaining[0];
    const losers = remaining.slice(1);

    // Mid-animation checkpoint on the FIRST round, right after all threads read.
    if (expected === 0 && remaining.length > 1) {
      b.step('Everyone reads the same value', 'All contending threads read expected = 0 before any write.');
      b.checkpoint({
        kind: 'single',
        prompt: 'All threads just read expected = 0. When they each try CAS, how many can succeed?',
        options: [
          { id: 'all', label: 'All of them' },
          { id: 'one', label: 'Exactly one' },
          { id: 'none', label: 'None' },
        ],
        answer: 'one',
        explanation: 'CAS is atomic — only the first thread sees value == expected, so exactly one succeeds. The rest fail and retry.',
        hint: 'Remember CAS only writes if the current value still equals the expected value.',
        blocking: true,
      });
    }

    // lock phase
    b.set('cell', { status: 'LOCKED', color: '#78350F' })
      .set(winner, { status: 'LOCKED', sublabel: `CAS(${expected}→${expected + 1})` })
      .step(`${winner} attempts CAS`, `${winner} tries CAS(expected=${expected}, new=${expected + 1}).`)
      .say(`${winner} performs CAS(expected=${expected}, new=${expected + 1}) — acquiring.`)
      .commit(600);

    // commit success
    value = expected + 1;
    successes += 1;
    b.set('cell', {
      status: 'SUCCESS',
      color: '#14532D',
      sublabel: String(value),
    })
      .set(winner, { status: 'SUCCESS', sublabel: 'committed ✓' })
      .vars({ counter: value, successes, retries })
      .step(`${winner} succeeds`, `The CAS matched, so ${winner} atomically wrote ${value}.`)
      .say(`${winner} succeeds! counter is now ${value}.`)
      .commit(650);

    // winner retires to idle/done
    b.set(winner, { status: 'DONE', color: '#14532D', sublabel: 'done', opacity: 0.55 });

    // 3) losers observe stale expected → CAS FAILS → retry ───────────────────
    if (losers.length > 0) {
      losers.forEach((id) => {
        b.set(id, {
          status: 'FAILED',
          sublabel: `CAS fails (saw ${value}≠${expected})`,
        });
      });
      b.set('cell', { status: 'IDLE', color: '#1E293B' })
        .step('Losers detect the change', `Their expected (${expected}) no longer matches the value (${value}), so CAS fails.`)
        .say(
          `${losers.join(', ')} find the value changed (${value} ≠ ${expected}) — CAS fails.`,
        )
        .commit(650);

      retries += losers.length;
      losers.forEach((id) => {
        b.set(id, { status: 'RETRY', sublabel: 'retrying…' });
      });
      b.vars({ retries })
        .say(`${losers.join(', ')} back off and retry the CAS loop.`)
        .commit(550);
    } else {
      b.set('cell', { status: 'IDLE', color: '#1E293B' });
    }

    remaining = losers;
  }

  b.set('cell', { status: 'SUCCESS', color: '#14532D', sublabel: String(value) })
    .step('All done', `Every thread eventually succeeded. Final counter = ${value}.`)
    .say(`All threads succeeded. Final counter = ${value}, after ${retries} retries.`)
    .commit(900);

  return b.build();
}

export type { ThreadPlan };
