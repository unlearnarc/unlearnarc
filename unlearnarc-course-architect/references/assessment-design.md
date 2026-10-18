# Assessment Design Guide

> Reference for Phase 8 of the UnlearnArc Course Architect skill.  
> How to build high-quality question pools for every topic.

---

## Question pool configuration

### Recommended pool settings (topic-level)

```
scope_type         = "TOPIC"
total_questions    = 9    # drawn per quiz session
easy_count         = 3
medium_count       = 3
hard_count         = 3
pass_percentage    = 60
time_limit_minutes = 0    # unlimited
```

For topics with very rich content, increase the pool to draw from a larger bank:
```
total_questions = 12
easy_count      = 4
medium_count    = 4
hard_count      = 4
```

**Constraint:** `easy_count + medium_count + hard_count` must equal `total_questions` exactly.

### Question bank target

Aim to create **more questions than the session draws**, so the pool stays fresh:
- If `total_questions = 9`, create at least **12–15 questions** (at least 4 per difficulty).
- If `total_questions = 12`, create at least **18 questions**.

The engine samples randomly from available active questions. A bank 1.5× the session size ensures variety across retries.

---

## Question type selection

| Question type | Use when |
|--------------|----------|
| `MCQ` | Testing a single correct answer: definitions, complexity, output prediction, identification |
| `MULTIPLE_CORRECT` | Testing combinations: "which of these are true?", "which algorithms apply here?", "which properties hold?" |

Use `MULTIPLE_CORRECT` sparingly (roughly 20–30% of questions). It is harder to write correctly and harder for learners to answer confidently.

---

## Difficulty calibration

### EASY questions

Target: recall and basic comprehension. Answerable immediately after reading the notes.

Characteristics:
- Single-concept questions.
- Direct recall of definitions, properties, or complexity bounds.
- "What does X stand for?"
- "Which data structure does BFS use?"
- Multiple clear wrong answers (not tricky distractors).

### MEDIUM questions

Target: application and analysis. Requires thinking, not just recall.

Characteristics:
- Code tracing: "What is the output of this code?"
- State prediction: "After step N, what is the state of the data structure?"
- Comparison: "What is the key difference between BFS and DFS?"
- Small worked examples: "Given this graph, which node is visited first?"
- Plausible distractors that reflect common misconceptions.

### HARD questions

Target: synthesis, edge cases, and complexity reasoning.

Characteristics:
- Non-obvious complexity analysis.
- Edge cases: empty input, single element, disconnected graph, negative weights.
- "Which of these implementations has a bug?"
- "What happens when we apply algorithm X to input Y?"
- "In which scenario would algorithm A outperform B?"
- Multi-step reasoning required.

---

## Question templates by topic type

### Algorithm topic — EASY

```
What is the time complexity of [Algorithm] in the worst case?
A) O(n)
B) O(n log n)  ← correct (or whichever is right)
C) O(n²)
D) O(log n)

Explanation: [Algorithm] divides/conquers/processes ... in O(n log n) because ...
```

```
Which data structure does Breadth-First Search use internally?
A) Stack
B) Priority Queue
C) Queue  ← correct
D) Linked List

Explanation: BFS processes nodes level by level. A FIFO queue ensures we visit all neighbors at distance k before any at distance k+1.
```

### Algorithm topic — MEDIUM (code trace)

```
Given the following Python code:

def bfs(graph, start):
    visited = set()
    queue = [start]
    order = []
    while queue:
        node = queue.pop(0)
        if node not in visited:
            visited.add(node)
            order.append(node)
            queue.extend(graph[node])
    return order

For graph = {'A': ['B','C'], 'B': ['D'], 'C': [], 'D': []}, what does bfs(graph, 'A') return?
A) ['A', 'B', 'D', 'C']
B) ['A', 'C', 'B', 'D']
C) ['A', 'B', 'C', 'D']  ← correct
D) ['A', 'D', 'B', 'C']

Explanation: BFS explores A first (order: [A]). Enqueues B, C. Dequeues B (order: [A,B]), enqueues D. Dequeues C (order: [A,B,C]), no unvisited neighbors. Dequeues D (order: [A,B,C,D]). Result: ['A','B','C','D'].
```

### Algorithm topic — HARD (edge case / analysis)

```
An undirected graph has V vertices and E edges. BFS is run from every vertex. What is the total time complexity?
A) O(V + E)
B) O(V² + E)
C) O(V × (V + E))  ← correct
D) O(V² × E)

Explanation: Each BFS call costs O(V + E). Running it from all V vertices costs O(V × (V + E)). This simplifies to O(V² + VE), which is O(V × (V + E)) in the general case.
```

```
Dijkstra's algorithm with a binary heap fails to produce correct shortest paths when:
A) The graph is directed
B) The graph has cycles
C) The graph has negative edge weights  ← correct
D) The graph is disconnected

Explanation: Dijkstra's relies on the greedy property that once a node is finalized, its shortest path is known. With negative weights, a previously finalized node might have a shorter path discovered later, violating this invariant. Use Bellman-Ford for graphs with negative weights.
```

### Conceptual topic — MULTIPLE_CORRECT

```
Which of the following statements about DFS are correct? (Select all that apply.)
A) DFS can be implemented iteratively using a stack  ← correct
B) DFS always finds the shortest path in unweighted graphs
C) DFS can detect cycles in both directed and undirected graphs  ← correct
D) DFS visits all nodes in a connected component  ← correct
E) DFS uses O(V) space for the call stack or explicit stack  ← correct

Explanation: 
A — DFS can be done iteratively with an explicit stack mirroring the call stack.
B — False. BFS finds shortest paths in unweighted graphs; DFS does not.
C — True. Cycle detection is a classic DFS application.
D — True. DFS from any node in a connected component reaches all nodes.
E — True. The recursion depth (or explicit stack) is at most O(V).
```

---

## Writing high-quality distractors

The quality of wrong answers is as important as the correct answer.

### Good distractors are
- Plausible to a learner who partially understands the concept.
- Based on real misconceptions (e.g. confusing BFS and DFS complexities).
- Symmetric in style to the correct answer (same length, same format).

### Bad distractors
- Obviously wrong to anyone who has read the notes.
- Nonsensical or unrelated to the topic.
- Identical to each other except for a number change.
- Too clever or deliberately misleading on a technicality.

### Common misconception distractors for algorithms

| Algorithm | Common misconception | Distractor to use |
|-----------|---------------------|-------------------|
| BFS | Uses a stack | "Stack" as a distractor for "Queue" |
| DFS | Finds shortest path | Include "finds shortest path" as an incorrect option |
| Dijkstra | Works with negative weights | Include "negative weights" as an incorrect option |
| Merge Sort | In-place | "O(1) space" as a distractor |
| Quick Sort | Always O(n log n) | "O(n log n) worst case" as a distractor |
| Binary Search | Works on unsorted arrays | "does not require sorted input" as a distractor |
| Topological Sort | Works on cyclic graphs | Include a cyclic graph scenario |
| Prim's vs Kruskal's | They produce the same MST edge set | "always produce the same edges" as distractor |

---

## Explanation quality rules

Every question must have an explanation. The explanation must:

1. **State why the correct answer is correct** — not just repeat it.
2. **Address at least one common wrong answer** — explain why it is wrong.
3. **Teach something** — the explanation should be a mini-lesson.
4. For code questions: **trace through the code** in the explanation.
5. For complexity questions: **justify the complexity** in the explanation.

### Bad explanation
```
"The answer is O(n log n) because Merge Sort is O(n log n)."
```

### Good explanation
```
"Merge Sort divides the array in half at each level (log n levels) and merges 
n elements across all nodes at each level. This gives O(n) work per level × 
O(log n) levels = O(n log n) total. The best and worst cases are the same 
because the array is always fully divided regardless of input order."
```

---

## Question bank checklist

Before finalizing a topic's question pool:

- [ ] At least 4 EASY questions (recalls, definitions, properties).
- [ ] At least 5 MEDIUM questions (code traces, comparisons, application).
- [ ] At least 4 HARD questions (edge cases, complexity, synthesis).
- [ ] No two questions test exactly the same fact.
- [ ] Every MCQ has exactly 1 correct answer.
- [ ] Every MULTIPLE_CORRECT has at least 2 correct answers.
- [ ] Every question has an explanation that teaches.
- [ ] Distractors are plausible and based on real misconceptions.
- [ ] Code in questions is syntactically correct.
- [ ] Expected outputs in code questions match the actual code behavior.
- [ ] The pool `easy_count + medium_count + hard_count = total_questions`.
- [ ] `map_question_pool_to_entity` has been called to bind the pool to the topic.

---

## Batch creation workflow

When creating 10+ questions for a topic, use `bulk_create_questions` for efficiency.

```python
bulk_create_questions([
    # EASY batch (4 questions)
    { "poolId": "<pool_id>", "questionType": "MCQ", "difficulty": "EASY", ... },
    { "poolId": "<pool_id>", "questionType": "MCQ", "difficulty": "EASY", ... },
    { "poolId": "<pool_id>", "questionType": "MCQ", "difficulty": "EASY", ... },
    { "poolId": "<pool_id>", "questionType": "MULTIPLE_CORRECT", "difficulty": "EASY", ... },

    # MEDIUM batch (5 questions)
    { "poolId": "<pool_id>", "questionType": "MCQ", "difficulty": "MEDIUM", ... },
    ...

    # HARD batch (4 questions)
    { "poolId": "<pool_id>", "questionType": "MCQ", "difficulty": "HARD", ... },
    ...
])
```

If the batch exceeds 20 questions, split it into two separate `bulk_create_questions` calls to reduce the risk of a single large failure rolling back a lot of work.

After each batch, call `list_questions_for_pool(pool_id)` to verify the count.
