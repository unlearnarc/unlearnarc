# Curriculum Design Guide

> Reference for Phase 3 of the UnlearnArc Course Architect skill.  
> Provides principles, templates, and worked examples for designing well-structured curricula.

---

## Core design principles

### 1. Dependency-first ordering

Topics must be ordered so that every topic's prerequisites are covered by earlier topics.

Good order for Graph Algorithms:
```
1. Graph Fundamentals and Terminology    ← no prerequisite
2. Graph Representations                 ← needs: Fundamentals
3. BFS                                   ← needs: Representations
4. DFS                                   ← needs: Representations
5. Connected Components                  ← needs: BFS, DFS
6. Cycle Detection                       ← needs: DFS
7. Topological Sorting                   ← needs: DFS, Cycle Detection
8. Shortest Path Algorithms              ← needs: BFS, Weighted Graphs
9. Minimum Spanning Trees               ← needs: Weighted Graphs
10. Advanced Problems and Applications   ← needs: all above
```

Bad order (DFS before graph representation — the learner cannot implement DFS without knowing how the graph is stored):
```
1. Graph Fundamentals
2. DFS
3. BFS
4. Graph Representations   ← too late
```

### 2. Scope calibration

| Course breadth | Target topic count | Notes |
|---------------|-------------------|-------|
| Focused / single algorithm family | 4–6 topics | e.g. "Sorting Algorithms" |
| Standard course | 6–10 topics | e.g. "Graph Algorithms" |
| Comprehensive survey | 10–14 topics | e.g. "Data Structures and Algorithms" |
| Do NOT exceed | 15 topics | Split into two courses instead |

Avoid:
- **Topic splitting**: dividing "BFS" into "BFS Part 1" and "BFS Part 2" when they could be one cohesive topic.
- **Topic merging**: combining "BFS" and "Dijkstra's" into one topic when they are distinct algorithms.

### 3. Difficulty progression

Each topic's `level` should reflect its complexity relative to the course audience, not just the subject's absolute complexity.

For a `BEGINNER`-level course:
- Topics 1–3: `BEGINNER`
- Topics 4–7: `INTERMEDIATE` (if needed)
- Avoid `ADVANCED` topics

For an `INTERMEDIATE`-level course:
- Topics 1–2: `BEGINNER` (prerequisites)
- Topics 3–8: `INTERMEDIATE`
- Topics 9–10: `ADVANCED` (optional stretch topics)

### 4. Time estimates

Estimate `time` per topic in `HH:MM:SS` based on content density:
- Short conceptual topic (terminology, overview): `00:20:00`
- Standard algorithm topic with examples: `00:30:00` to `00:45:00`
- Complex topic with multiple algorithms: `01:00:00` to `01:30:00`

Set `total_time` on the course to the sum of all topic times.

---

## Curriculum templates by subject type

### Algorithms and data structures

```
1. Introduction and Motivation
   - What problem this family of algorithms solves
   - When to use this type vs alternatives
   - Prerequisites review

2. Fundamental Concept A
   - Core idea
   - Simple example

3. Fundamental Concept B
   - Builds on A
   - Slightly more complex

4. [Main Algorithm / Technique 1]
   - Algorithm with visualization
   - Complexity

5. [Main Algorithm / Technique 2]
   - Algorithm with visualization
   - Comparison with Technique 1

... (repeat for each main algorithm)

N-1. Advanced Applications
   - Real problems solved by these algorithms
   - Optimization strategies

N. Review and Practice
   - Summary of all algorithms
   - When to pick which one
```

### Systems and architecture

```
1. Problem Statement and Motivation
2. Basic Components and Terminology
3. [Component A] — how it works
4. [Component B] — how it works
5. Interaction between components
6. Failure modes and mitigation
7. Scalability considerations
8. Real-world examples
```

### Programming language or framework

```
1. Setup and Hello World
2. Core syntax and types
3. Control flow and functions
4. Data structures
5. Object-oriented concepts
6. Standard library essentials
7. Error handling
8. Testing
9. Practical project
```

### Mathematics and theory

```
1. Intuition and motivation (before formal definitions)
2. Formal definitions and notation
3. Core theorems with proofs or proof sketches
4. Worked examples
5. Algorithms / procedures derived from the theory
6. Applications
7. Common misconceptions and edge cases
```

---

## Topic description template

Each topic should have a description that covers:

```
<Topic Name>

What: [One sentence — what this topic teaches]
Why: [One sentence — why it matters / what problem it solves]
How: [One sentence — the core technique or approach]

Prerequisites: [Previous topics in this course or assumed knowledge]
Objectives: 
  - Learner will understand [conceptual outcome]
  - Learner will be able to [skill outcome]
  - Learner will be able to analyze [analysis outcome]
```

---

## Example: Graph Algorithms curriculum

### Course metadata

| Field | Value |
|-------|-------|
| Name | Graph Algorithms |
| Level | INTERMEDIATE |
| Total time | `05:30:00` |
| Topics count | 10 |

### Topics

| Order | Title | Level | Time | Visual |
|-------|-------|-------|------|--------|
| 1 | Graph Fundamentals and Terminology | BEGINNER | 00:25:00 | None |
| 2 | Graph Representations | BEGINNER | 00:30:00 | Animation |
| 3 | Breadth-First Search | INTERMEDIATE | 00:35:00 | AlgoViz (GRAPH) |
| 4 | Depth-First Search | INTERMEDIATE | 00:35:00 | AlgoViz (GRAPH) |
| 5 | Connected Components | INTERMEDIATE | 00:30:00 | AlgoViz (GRAPH) |
| 6 | Cycle Detection | INTERMEDIATE | 00:30:00 | AlgoViz (GRAPH) |
| 7 | Topological Sorting | INTERMEDIATE | 00:35:00 | AlgoViz (GRAPH) |
| 8 | Shortest Path Algorithms | ADVANCED | 00:45:00 | AlgoViz (GRAPH) |
| 9 | Minimum Spanning Trees | ADVANCED | 00:40:00 | AlgoViz (GRAPH) |
| 10 | Advanced Applications | ADVANCED | 00:25:00 | None |

---

## Avoiding common curriculum mistakes

| Mistake | Correction |
|---------|-----------|
| Too many topics (> 15) | Split into two distinct courses |
| First topic is too hard | Add a prerequisites/overview topic first |
| Topics repeat material | Audit each topic's scope; consolidate or cut |
| Topics have no clear sequence | Map the dependency graph and reorder |
| All topics are the same difficulty | Ensure genuine difficulty progression |
| Course has no hands-on component | Add a practical applications topic at the end |
| Every course follows the same template | Adapt to the subject's actual structure |

---

## Checking for existing courses before designing

Before finalizing curriculum:

1. Call `list_courses()` and scan for the course name and related names.
2. Call `list_domains()` and `list_skills()` to understand how similar subjects are organized.
3. Check whether any existing course covers > 60% of the planned topics.
   - If yes: prefer extending the existing course rather than creating a parallel one.
   - Document the decision: "Extended existing course X rather than creating Y because..."
4. If two courses cover the same subject at different levels (e.g. "Introduction to Graphs" and "Advanced Graph Algorithms"), they may legitimately coexist.
