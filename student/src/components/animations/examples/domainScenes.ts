/* =============================================================================
   domainScenes — a gallery of reference traces proving the Canvas Animation
   Engine renders ANY tutorial domain from the same primitives (circles, rects,
   nodes, cylinders, matrices, tables, packets, connections).

   Each builder returns a plain AnimationTrace — identical in shape to what the
   backend simulators emit — so these can be swapped for API-fetched scenes with
   zero renderer changes. Every scene ships with step instructions, a mid-way
   checkpoint, and general "where to use" notes.
   ============================================================================= */

import type { AnimationTrace } from '../../../types/animation';
import { TraceBuilder } from '../simulator/traceBuilder';

const DARK = '#0F172A';

/* ─────────────────────────────────────────────────────────────────────────
   1) SYSTEM DESIGN — a request routed Client → Load Balancer → DB (read replica)
   Uses: packet shape + connections with travelling-packet progress + cylinder DB.
   ───────────────────────────────────────────────────────────────────────── */
export function buildSystemDesignTrace(): AnimationTrace {
  const W = 720;
  const H = 360;
  const b = new TraceBuilder({
    id: 'sd-request-routing',
    title: 'Request Routing through a Load Balancer',
    description: 'A read request flows from a client through a load balancer to a replica.',
    viewport: { width: W, height: H },
    category: 'SYSTEM_DESIGN',
    theme: { background: DARK },
    notes: {
      summary:
        'A load balancer spreads incoming traffic across backend instances and ' +
        'routes read traffic to replicas to offload the primary database.',
      whereToUse: [
        'Horizontally-scaled web tiers behind an L4/L7 load balancer.',
        'Read-heavy workloads using primary/replica database topologies.',
        'Blue-green / canary routing and health-check based failover.',
      ],
      keyPoints: [
        'Reads can go to replicas; writes must go to the primary.',
        'The LB is a single logical entry point but is itself replicated for HA.',
      ],
    },
  });

  const client = { id: 'client', x: 70, y: 160 };
  const lb = { id: 'lb', x: 300, y: 120 };
  const primary = { id: 'primary', x: 560, y: 60 };
  const replica = { id: 'replica', x: 560, y: 220 };

  b.set('client', {
    id: 'client', shape: 'pill', x: client.x, y: client.y, width: 120, height: 48,
    color: '#2563EB', label: 'Client', status: 'IDLE',
  });
  b.set('lb', {
    id: 'lb', shape: 'rect', x: lb.x, y: lb.y, width: 130, height: 60,
    color: '#0EA5E9', label: 'Load Balancer', status: 'IDLE',
  });
  b.set('primary', {
    id: 'primary', shape: 'cylinder', x: primary.x, y: primary.y, width: 90, height: 64,
    color: '#7C3AED', label: 'DB primary', status: 'IDLE',
  });
  b.set('replica', {
    id: 'replica', shape: 'cylinder', x: replica.x, y: replica.y, width: 90, height: 64,
    color: '#16A34A', label: 'DB replica', status: 'IDLE',
  });

  b.step('Idle topology', 'A client, a load balancer and a primary + replica database.')
    .say('A read request is about to be issued by the client.')
    .commit(600);

  // client → LB
  b.set('client', { status: 'ACTIVE' })
    .link('c-lb', { from: 'client', to: 'lb', color: '#2563EB', progress: 0, label: 'GET /item' })
    .step('Request sent', 'The client sends a read request to the load balancer.')
    .say('Client sends GET /item to the load balancer.')
    .commit(200);
  b.link('c-lb', { from: 'client', to: 'lb', progress: 1 }).commit(500);

  // checkpoint: where should a READ go?
  b.checkpoint({
    kind: 'single',
    prompt: 'This is a READ request. Where should the load balancer route it?',
    options: [
      { id: 'primary', label: 'The primary database' },
      { id: 'replica', label: 'A read replica' },
      { id: 'client', label: 'Back to the client' },
    ],
    answer: 'replica',
    explanation: 'Reads are routed to replicas to offload the primary, which handles writes.',
    hint: 'Primaries handle writes; replicas serve reads.',
    blocking: true,
  });

  // LB → replica
  b.set('lb', { status: 'ACTIVE' })
    .unlink('c-lb')
    .link('lb-r', { from: 'lb', to: 'replica', color: '#16A34A', progress: 0, label: 'route read' })
    .step('Routed to replica', 'The LB forwards the read to a replica.')
    .say('Load balancer routes the read to a replica.')
    .commit(200);
  b.link('lb-r', { from: 'lb', to: 'replica', progress: 1 }).commit(500);

  // replica responds
  b.set('replica', { status: 'SUCCESS' })
    .unlink('lb-r')
    .link('r-c', { from: 'replica', to: 'client', color: '#16A34A', progress: 0, label: 'rows', dashed: true })
    .step('Replica responds', 'The replica returns the rows to the client.')
    .say('Replica returns the data to the client.')
    .commit(200);
  b.link('r-c', { from: 'replica', to: 'client', progress: 1 })
    .set('client', { status: 'SUCCESS' })
    .commit(600);

  return b.build();
}

/* ─────────────────────────────────────────────────────────────────────────
   2) DSA — Breadth-First Search over a small graph (node shape + connections).
   ───────────────────────────────────────────────────────────────────────── */
export function buildGraphBfsTrace(): AnimationTrace {
  const W = 640;
  const H = 380;
  const b = new TraceBuilder({
    id: 'dsa-bfs',
    title: 'Breadth-First Search (BFS)',
    description: 'BFS explores a graph level by level from a start node.',
    viewport: { width: W, height: H },
    category: 'DSA',
    theme: { background: DARK },
    notes: {
      summary:
        'BFS visits all neighbours at the current depth before moving deeper, ' +
        'using a FIFO queue. It finds shortest paths in unweighted graphs.',
      whereToUse: [
        'Shortest path in unweighted graphs / grids.',
        'Level-order traversal, connected components, web crawling.',
        'Finding the minimum number of moves (puzzles, mazes).',
      ],
      keyPoints: [
        'BFS uses a queue (FIFO); DFS uses a stack (LIFO).',
        'A node is enqueued once — mark it visited when discovered.',
      ],
    },
  });

  const nodes: Record<string, { x: number; y: number }> = {
    A: { x: 110, y: 80 }, B: { x: 320, y: 70 }, C: { x: 520, y: 90 },
    D: { x: 250, y: 220 }, E: { x: 460, y: 240 }, F: { x: 330, y: 330 },
  };
  const edges: [string, string][] = [
    ['A', 'B'], ['A', 'D'], ['B', 'C'], ['B', 'E'], ['D', 'E'], ['E', 'F'], ['C', 'E'],
  ];

  Object.entries(nodes).forEach(([id, p]) => {
    b.set(id, { id, shape: 'node', x: p.x, y: p.y, radius: 22, color: '#334155', label: id, status: 'IDLE' });
  });
  edges.forEach(([u, v]) =>
    b.link(`${u}${v}`, { from: u, to: v, color: '#475569', opacity: 0.6 }),
  );

  b.step('Start at A', 'Enqueue the start node A and mark it visited.')
    .set('A', { color: '#2563EB', status: 'ACTIVE', sublabel: 'start' })
    .vars({ queue: 'A', visited: 'A' })
    .say('BFS from A. Queue = [A].')
    .commit(700);

  const order = ['B', 'D', 'C', 'E', 'F'];
  let visited = 'A';

  b.set('B', { color: '#F59E0B', status: 'WAITING' })
    .set('D', { color: '#F59E0B', status: 'WAITING' })
    .step('Visit A → neighbours', 'Discover A’s neighbours B and D; add them to the queue.')
    .vars({ queue: 'B, D', visited })
    .say('Visit A → discover B, D. Queue = [B, D].')
    .commit(650);

  b.checkpoint({
    kind: 'single',
    prompt: 'BFS just dequeued A and found B and D. Which node is processed NEXT?',
    options: [
      { id: 'B', label: 'B (added first)' },
      { id: 'D', label: 'D' },
      { id: 'E', label: 'E' },
    ],
    answer: 'B',
    explanation: 'BFS uses a FIFO queue, so the earliest-enqueued node (B) is processed first.',
    hint: 'Queue = First In, First Out.',
    blocking: true,
  });

  order.forEach((id) => {
    visited += ', ' + id;
    b.set(id, { color: '#16A34A', status: 'SUCCESS' })
      .step(`Visit ${id}`, `Dequeue ${id}, mark it visited, enqueue unseen neighbours.`)
      .vars({ visited })
      .say(`Visit ${id}.`)
      .commit(520);
  });

  b.step('Done', 'Every reachable node has been visited in level order.')
    .say('BFS complete — all nodes visited.')
    .commit(600);

  return b.build();
}

/* ─────────────────────────────────────────────────────────────────────────
   3) SQL — an INNER JOIN between two tables (table shape + highlight rows).
   ───────────────────────────────────────────────────────────────────────── */
export function buildSqlJoinTrace(): AnimationTrace {
  const W = 720;
  const H = 360;
  const b = new TraceBuilder({
    id: 'sql-inner-join',
    title: 'SQL INNER JOIN',
    description: 'Matching rows from two tables on a shared key.',
    viewport: { width: W, height: H },
    category: 'DATABASE',
    theme: { background: DARK },
    notes: {
      summary:
        'An INNER JOIN returns only rows where the join predicate matches in ' +
        'both tables. Unmatched rows are excluded.',
      whereToUse: [
        'Combining normalized tables (orders ⋈ customers).',
        'Filtering to records that exist in both sides of a relationship.',
      ],
      keyPoints: [
        'INNER JOIN drops non-matching rows from BOTH tables.',
        'Use LEFT JOIN to keep all left rows even when there’s no match.',
      ],
    },
  });

  b.set('users', {
    id: 'users', shape: 'table', x: 40, y: 60, width: 260, color: '#2563EB',
    meta: {
      title: 'users', columns: ['id', 'name'],
      rows: [[1, 'Ana'], [2, 'Ben'], [3, 'Cy']],
    },
  });
  b.set('orders', {
    id: 'orders', shape: 'table', x: 420, y: 60, width: 260, color: '#0EA5E9',
    meta: {
      title: 'orders', columns: ['user_id', 'item'],
      rows: [[1, 'Book'], [2, 'Pen'], [5, 'Lamp']],
    },
  });

  b.step('Two tables', 'users and orders share the key users.id = orders.user_id.')
    .say('INNER JOIN users ⋈ orders ON users.id = orders.user_id')
    .commit(700);

  // highlight matching rows
  b.set('users', { meta: { title: 'users', columns: ['id', 'name'], rows: [[1, 'Ana'], [2, 'Ben'], [3, 'Cy']], highlightRow: 0 } })
    .set('orders', { meta: { title: 'orders', columns: ['user_id', 'item'], rows: [[1, 'Book'], [2, 'Pen'], [5, 'Lamp']], highlightRow: 0 } })
    .link('m1', { from: 'users', to: 'orders', color: '#16A34A', label: 'id=1 ✓' })
    .step('Match id = 1', 'Ana (id 1) matches order user_id 1 → included.')
    .say('Row id=1 matches → kept.')
    .commit(650);

  b.checkpoint({
    kind: 'single',
    prompt: 'order row user_id = 5 has no matching users.id. With INNER JOIN, is it in the result?',
    options: [
      { id: 'yes', label: 'Yes, with NULLs' },
      { id: 'no', label: 'No, it is dropped' },
    ],
    answer: 'no',
    explanation: 'INNER JOIN excludes rows without a match on both sides, so user_id=5 is dropped.',
    hint: 'INNER keeps only rows present on BOTH sides.',
    blocking: false,
  });

  b.unlink('m1')
    .set('result', {
      id: 'result', shape: 'table', x: 220, y: 240, width: 300, color: '#16A34A',
      meta: {
        title: 'result (INNER JOIN)', columns: ['id', 'name', 'item'],
        rows: [[1, 'Ana', 'Book'], [2, 'Ben', 'Pen']],
      },
    })
    .step('Result', 'Only matched rows remain; id 3 and user_id 5 are gone.')
    .say('Result keeps only matching rows.')
    .commit(700);

  return b.build();
}

/* ─────────────────────────────────────────────────────────────────────────
   4) AI/ML — a 2×2 matrix multiply step (matrix shape + highlighted cells).
   ───────────────────────────────────────────────────────────────────────── */
export function buildMatrixMultiplyTrace(): AnimationTrace {
  const W = 680;
  const H = 320;
  const b = new TraceBuilder({
    id: 'aiml-matmul',
    title: 'Matrix Multiplication (dot products)',
    description: 'Computing C = A · B one output cell at a time.',
    viewport: { width: W, height: H },
    category: 'AI_ML',
    theme: { background: DARK },
    notes: {
      summary:
        'Each output cell C[i][j] is the dot product of row i of A and column j ' +
        'of B. This is the core operation of dense neural-network layers.',
      whereToUse: [
        'Fully-connected / linear layers (y = Wx + b).',
        'Attention score computation (QKᵀ) in transformers.',
        'Any linear algebra: transforms, PCA, graphics.',
      ],
      keyPoints: [
        'C is (rowsA × colsB); the inner dimensions must match.',
        'GPUs parallelize these independent dot products massively.',
      ],
    },
  });

  const A = [[1, 2], [3, 4]];
  const B = [[5, 6], [7, 8]];
  const C: (number | string)[][] = [['·', '·'], ['·', '·']];

  b.set('A', { id: 'A', shape: 'matrix', x: 40, y: 90, width: 120, height: 120, color: '#2563EB', meta: { rows: 2, cols: 2, values: A } });
  b.set('B', { id: 'B', shape: 'matrix', x: 250, y: 90, width: 120, height: 120, color: '#0EA5E9', meta: { rows: 2, cols: 2, values: B } });
  b.set('C', { id: 'C', shape: 'matrix', x: 500, y: 90, width: 120, height: 120, color: '#16A34A', meta: { rows: 2, cols: 2, values: JSON.parse(JSON.stringify(C)) } });
  b.set('eq1', { id: 'eq1', shape: 'text', x: 190, y: 150, color: '#94A3B8', label: '×' });
  b.set('eq2', { id: 'eq2', shape: 'text', x: 430, y: 150, color: '#94A3B8', label: '=' });

  b.step('C = A · B', 'Each C[i][j] = row i of A · column j of B.')
    .say('Multiply A (2×2) by B (2×2).')
    .commit(650);

  const cells: [number, number][] = [[0, 0], [0, 1], [1, 0], [1, 1]];
  cells.forEach(([i, j], idx) => {
    const val = A[i][0] * B[0][j] + A[i][1] * B[1][j];
    C[i][j] = val;
    b.set('A', { meta: { rows: 2, cols: 2, values: A, highlight: [[i, 0], [i, 1]] } })
      .set('B', { meta: { rows: 2, cols: 2, values: B, highlight: [[0, j], [1, j]] } })
      .set('C', { meta: { rows: 2, cols: 2, values: JSON.parse(JSON.stringify(C)), highlight: [[i, j]] } })
      .step(`C[${i}][${j}]`, `= A[${i}][0]·B[0][${j}] + A[${i}][1]·B[1][${j}] = ${val}`)
      .say(`C[${i}][${j}] = ${A[i][0]}·${B[0][j]} + ${A[i][1]}·${B[1][j]} = ${val}`)
      .commit(700);

    if (idx === 0) {
      b.checkpoint({
        kind: 'number',
        prompt: 'What is C[0][1] = row 0 of A · column 1 of B?  (A row0 = [1,2], B col1 = [6,8])',
        answer: 1 * 6 + 2 * 8,
        explanation: '1·6 + 2·8 = 6 + 16 = 22.',
        hint: 'Multiply element-wise then add: 1·6 + 2·8.',
        blocking: false,
      });
    }
  });

  b.step('Done', 'All four output cells are filled.')
    .say('Matrix product complete.')
    .commit(600);

  return b.build();
}
