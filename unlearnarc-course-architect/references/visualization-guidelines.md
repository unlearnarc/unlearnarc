# Visualization Guidelines

> Reference for Phase 7 of the UnlearnArc Course Architect skill.  
> How to choose and create algorithm visualizations and animation scenes.

---

## Decision tree: Which visual type to use?

```
Is the topic an algorithm with discrete, traceable steps?
    YES → Does it operate on arrays, graphs, stacks, matrices, or trees?
              YES → Use create_algorithm() (AlgoViz)
              NO  → Use create_animation_scene() (AUTHORED or GENERATED)
    NO  → Is the concept better understood through a diagram or flow?
              YES → Use create_animation_scene()
              NO  → No visual needed; rely on well-structured notes
```

### Use `create_algorithm` (AlgoViz) for

These topics benefit from step-by-step execution traces:

| Topic | Visualizer type |
|-------|----------------|
| Binary Search | ARRAY |
| Linear Search | ARRAY |
| Bubble Sort | ARRAY |
| Selection Sort | ARRAY |
| Insertion Sort | ARRAY |
| Merge Sort | ARRAY |
| Quick Sort | ARRAY |
| Heap Sort | ARRAY |
| BFS | GRAPH |
| DFS | GRAPH |
| Dijkstra's Algorithm | GRAPH |
| Bellman-Ford | GRAPH |
| Topological Sort (DFS) | GRAPH |
| Prim's MST | GRAPH |
| Kruskal's MST | GRAPH |
| Stack Operations | STACK |
| Queue Operations | STACK (or ARRAY) |
| Matrix Chain Multiplication | MATRIX |
| Flood Fill | MATRIX |

### Use `create_animation_scene` for

These topics work better as concept diagrams or state-transition animations:

| Topic | Source type |
|-------|------------|
| Graph Representations (adjacency list vs matrix) | GENERATED or AUTHORED |
| Connected Components (conceptual diagram) | GENERATED |
| Hash Table collision resolution | GENERATED |
| SQL JOIN visualization | GENERATED |
| HTTP request lifecycle | AUTHORED |
| Database indexing | AUTHORED |
| Cache eviction policies | AUTHORED |
| TCP three-way handshake | AUTHORED |

### No visual needed for

- Pure terminology/reference topics (e.g. "Graph Fundamentals and Terminology").
- Mathematical proof topics.
- Topics where the note's code examples are already the clearest representation.

---

## Algorithm visualization spec format

### ARRAY visualizer

Used for: sorting algorithms, binary search, sliding window, two-pointer techniques.

```json
{
  "visualizer": "ARRAY",
  "initialState": {
    "array": [5, 2, 4, 1, 3]
  },
  "variables": [
    { "name": "i",   "label": "outer" },
    { "name": "j",   "label": "inner" },
    { "name": "lo",  "label": "lo" },
    { "name": "hi",  "label": "hi" },
    { "name": "mid", "label": "mid" }
  ],
  "steps": [
    {
      "title": "Initial array",
      "explanation": "Unsorted input. We will sort it ascending.",
      "state": { "array": [5, 2, 4, 1, 3] },
      "variables": {},
      "pointers": {},
      "highlights": [],
      "input": {
        "key": "sort-prediction",
        "type": "NUMBER",
        "prompt": "What value will be at index 0 after sorting?",
        "expected": 1
      }
    },
    {
      "title": "Compare indices 0 and 1",
      "explanation": "5 > 2, so a swap is needed.",
      "state": { "array": [5, 2, 4, 1, 3] },
      "variables": { "i": 0, "j": 0 },
      "pointers": { "j": 0 },
      "highlights": [{ "target": "array", "indices": [0, 1], "style": "COMPARE" }],
      "line": 4,
      "lang": "python"
    },
    {
      "title": "Swap complete",
      "explanation": "Values swapped. Array is now [2, 5, 4, 1, 3].",
      "state": { "array": [2, 5, 4, 1, 3] },
      "variables": { "i": 0, "j": 0 },
      "pointers": { "j": 0 },
      "highlights": [{ "target": "array", "indices": [0, 1], "style": "SWAP" }],
      "line": 5,
      "lang": "python"
    }
  ]
}
```

### GRAPH visualizer

Used for: BFS, DFS, Dijkstra's, topological sort, cycle detection.

```json
{
  "visualizer": "GRAPH",
  "initialState": {
    "nodes": [
      { "id": "A" }, { "id": "B" }, { "id": "C" },
      { "id": "D" }, { "id": "E" }
    ],
    "edges": [
      { "from": "A", "to": "B" },
      { "from": "A", "to": "C" },
      { "from": "B", "to": "D" },
      { "from": "C", "to": "E" }
    ]
  },
  "variables": [
    { "name": "current", "label": "current" },
    { "name": "queue",   "label": "queue" }
  ],
  "steps": [
    {
      "title": "Start at A",
      "explanation": "Enqueue A and mark it visited.",
      "state": {
        "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
        "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
      },
      "variables": { "current": "A", "queue": "[]" },
      "highlights": [{ "target": "nodes", "indices": ["A"], "style": "ACTIVE" }],
      "line": 3,
      "lang": "python"
    },
    {
      "title": "Visit A's neighbors",
      "explanation": "Dequeue A. Enqueue neighbors B and C (level 1).",
      "state": {
        "nodes": [{ "id": "A" }, { "id": "B" }, { "id": "C" }, { "id": "D" }, { "id": "E" }],
        "edges": [{ "from": "A", "to": "B" }, { "from": "A", "to": "C" }, { "from": "B", "to": "D" }, { "from": "C", "to": "E" }]
      },
      "variables": { "current": "A", "queue": "[B, C]" },
      "highlights": [
        { "target": "nodes", "indices": ["A"], "style": "DONE" },
        { "target": "nodes", "indices": ["B", "C"], "style": "VISIT" },
        { "target": "edges", "indices": [0, 1], "style": "PATH" }
      ],
      "input": {
        "key": "bfs-level-check",
        "type": "BOOLEAN",
        "prompt": "Is D visited before C in this BFS traversal?",
        "expected": false
      }
    }
  ]
}
```

### STACK visualizer

Used for: stack operations, DFS (iterative), expression evaluation.

```json
{
  "visualizer": "STACK",
  "initialState": {
    "stack": []
  },
  "variables": [
    { "name": "top", "label": "top" }
  ],
  "steps": [
    {
      "title": "Empty stack",
      "explanation": "The stack starts empty.",
      "state": { "stack": [] },
      "variables": {}
    },
    {
      "title": "Push 5",
      "explanation": "Push 5 onto the stack.",
      "state": { "stack": [5] },
      "variables": { "top": 5 },
      "highlights": [{ "target": "stack", "indices": [0], "style": "INSERT" }]
    },
    {
      "title": "Push 3",
      "explanation": "Push 3. It sits on top of 5.",
      "state": { "stack": [5, 3] },
      "variables": { "top": 3 },
      "highlights": [{ "target": "stack", "indices": [1], "style": "INSERT" }]
    }
  ]
}
```

---

## Spec quality rules

1. **Every step must have a complete `state`** — not a diff. If the array doesn't change between two steps, copy it verbatim.
2. **Include at least one `input` checkpoint** per visualization. This pauses playback and asks the learner a question, reinforcing active learning.
3. **Use `pointers`** for array visualizations to show where `lo`, `hi`, `mid`, `i`, `j` currently point.
4. **Coordinate `line` with the code source** — the highlighted line number must correspond to what is happening in that step, not a generic line.
5. **Use the correct `style` for highlights:**
   - `ACTIVE` — the element currently being processed.
   - `COMPARE` — elements being compared (not yet swapped or selected).
   - `SWAP` — elements that were just swapped.
   - `VISIT` — elements added to the queue/stack/frontier.
   - `DONE` — elements that have been fully processed and will not change.
   - `PATH` — edges that are part of the current traversal path.
   - `PIVOT` — the pivot element in Quick Sort.
   - `INSERT` / `DELETE` — for insert/delete operations on stacks, queues.
6. **Graph edges use integer indices** (0-based, in the order listed in `edges`), not node IDs.
7. **Graph nodes use string IDs** in `highlights.indices`.

---

## Checking for existing visualizations

Before creating a new algorithm visualization:

1. Call `list_algorithms()`.
2. Search for slugs matching: the algorithm name, common abbreviations (bfs, dfs, dijkstra), and related names.
3. If found, call `get_algorithm(slug)` to inspect the spec.
4. Reuse if:
   - The algorithm is the same.
   - The spec has a working `initialState` and at least 3 steps.
   - It is published or can be published.
5. Create new only when no suitable existing visualization is found.

**Existing visualizations in the system (as of initial setup):**
- `bfs` — Breadth-First Search (GRAPH)
- `dfs` — Depth-First Search (GRAPH)
- `binary-search` — Binary Search (ARRAY)
- `bubble-sort` — Bubble Sort (ARRAY)
- `merge-sort` — Merge Sort (ARRAY)
- `quick-sort` — Quick Sort (ARRAY)
- `heap-sort` — Heap Sort (ARRAY)
- `insertion-sort` — Insertion Sort (ARRAY)
- `selection-sort` — Selection Sort (ARRAY)
- `linear-search` — Linear Search (ARRAY)
- `balanced-parentheses` — Stack (STACK)
- `flood-fill` — Matrix (MATRIX)

Always `list_algorithms()` for the current state — new ones may have been added.

---

## Animation scene guidelines

When creating an animation scene with `source = "GENERATED"`:
- Provide a `kind` that matches an available simulator in the system.
- Use `description` to explain what the scene teaches.
- Keep `category` consistent with the course subject (e.g. "Graph", "Sorting", "System Design").

When creating with `source = "AUTHORED"`:
- The `trace` object follows the AnimationTrace schema.
- Design the trace to have 5–15 meaningful steps with clear labels.
- Each step should have a meaningful `explanation` that tells the learner what to observe.

**Do not invent simulator names.** Only use `kind` values known to be supported by the backend.

---

## Connecting visuals to topic notes

Algorithm visualizations and animation scenes are **not directly linked to topics by a database relationship** in the current system — there is no MCP tool for this association.

**The correct approach:** embed a reference to the visualization in the topic's note HTML:

```html
<h2>Interactive Visualization</h2>
<p>
  Explore the BFS algorithm step-by-step using the interactive visualizer.
  You can find it in the <strong>Algorithms</strong> section of the platform,
  titled <em>"Breadth-First Search"</em>.
</p>
<p>
  As you watch the visualization, pay attention to:
</p>
<ul>
  <li>How the queue grows and shrinks at each step.</li>
  <li>How nodes are marked as visited before being dequeued.</li>
  <li>The level-by-level expansion pattern.</li>
</ul>
```

This is a known limitation of the current MCP tool set. Report it in the completion report if direct topic-to-visualization association is requested.
