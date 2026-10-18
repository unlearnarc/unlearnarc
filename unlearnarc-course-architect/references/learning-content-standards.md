# Learning Content Standards

> Reference for Phase 6 of the UnlearnArc Course Architect skill.  
> Defines what high-quality notes look like and how to write them for different subject types.

---

## The HTML note structure

Notes are stored as sanitized HTML. Use semantic tags. The UnlearnArc renderer supports:
- Headings: `<h2>`, `<h3>`, `<h4>`
- Paragraphs: `<p>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Code blocks: `<pre><code class="language-python">...</code></pre>`
- Tables: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>`
- Emphasis: `<strong>`, `<em>`, `<code>`
- Horizontal rules: `<hr>`
- Blockquotes: `<blockquote>`

Avoid:
- Inline `style` attributes (stripped by sanitizer)
- JavaScript (`<script>`) — stripped
- External images via `<img src="http://...">` — prefer text descriptions
- `<iframe>` embeds — stripped
- CSS classes other than `language-*` on `<code>` blocks

---

## Minimum content requirements

| Requirement | Threshold |
|-------------|-----------|
| Minimum word count | ~500 substantive words |
| Must have learning objectives | Yes (first section) |
| Must have at least one code example | Yes, for programming/algorithm topics |
| Code must be syntactically correct | Yes — trace manually |
| Must have complexity analysis | Yes, for algorithm topics |
| Must have real-world applications | Yes |
| Must have a knowledge check | Yes (2–3 questions before the quiz) |

---

## Section templates by topic type

### Algorithm and data structure topics

```html
<h2>Learning Objectives</h2>
<ul>
  <li>Understand the intuition behind [algorithm name]</li>
  <li>Implement [algorithm] from scratch in Python and Java</li>
  <li>Analyze its time and space complexity</li>
  <li>Identify when to apply [algorithm] vs. alternatives</li>
</ul>

<h2>Intuition and Motivation</h2>
<p>[Why does this algorithm exist? What problem does it solve that simpler approaches cannot?]</p>
<p>[Concrete, relatable analogy before any formal definition]</p>

<h2>Core Concept</h2>
<p>[Define all terms before using them. Build up from the simplest mental model.]</p>
<h3>Key invariants</h3>
<ul>
  <li>[Invariant 1 — what stays true throughout the algorithm]</li>
  <li>[Invariant 2]</li>
</ul>

<h2>Worked Example</h2>
<p><strong>Input:</strong> [concrete example]</p>
<p>Walk through each step with intermediate state shown:</p>
<ol>
  <li><strong>Step 1:</strong> [what happens, what the state is]</li>
  <li><strong>Step 2:</strong> [...]</li>
</ol>
<p><strong>Output:</strong> [result]</p>

<h2>Implementation</h2>
<pre><code class="language-python">
def algorithm_name(input):
    # Explain non-obvious lines with inline comments
    ...
</code></pre>

<h3>Java Implementation</h3>
<pre><code class="language-java">
static ReturnType algorithmName(InputType input) {
    // ...
}
</code></pre>

<h2>Complexity Analysis</h2>
<table>
  <thead><tr><th>Metric</th><th>Complexity</th><th>Reason</th></tr></thead>
  <tbody>
    <tr><td>Time — best</td><td>O(...)</td><td>[why]</td></tr>
    <tr><td>Time — average</td><td>O(...)</td><td>[why]</td></tr>
    <tr><td>Time — worst</td><td>O(...)</td><td>[why]</td></tr>
    <tr><td>Space</td><td>O(...)</td><td>[why]</td></tr>
  </tbody>
</table>

<h3>Trade-offs</h3>
<ul>
  <li>[When this algorithm is preferred over alternatives]</li>
  <li>[Limitations and when NOT to use it]</li>
</ul>

<h2>Common Mistakes</h2>
<ul>
  <li><strong>[Mistake 1]:</strong> [description and how to avoid or fix it]</li>
  <li><strong>[Mistake 2]:</strong> [...]</li>
  <li><strong>Edge cases to test:</strong> empty input, single element, all-duplicates, etc.</li>
</ul>

<h2>Real-World Applications</h2>
<ul>
  <li>[Application 1 — specific system or domain that uses this algorithm]</li>
  <li>[Application 2]</li>
  <li>[Application 3]</li>
</ul>

<h2>Key Takeaways</h2>
<ul>
  <li>[Most important idea 1]</li>
  <li>[Most important idea 2]</li>
  <li>[Most important idea 3]</li>
  <li>[When to use vs when not to use]</li>
</ul>

<h2>Knowledge Check</h2>
<ol>
  <li>[Short question 1 that reinforces the core concept]</li>
  <li>[Short question 2 about complexity or edge case]</li>
  <li>[Short question 3 about application]</li>
</ol>
```

### Systems and design topics

Replace `Implementation` with:
```html
<h2>Architecture Diagram</h2>
<p>[Describe the architecture in text since we cannot embed images. Use ASCII diagrams if helpful.]</p>
<pre>
Client → Load Balancer → [App Server 1]
                      → [App Server 2]
                      → [App Server 3]
                              ↓
                         [Database]
</pre>

<h2>Component Responsibilities</h2>

<h2>Failure Modes and Mitigations</h2>

<h2>Scalability Considerations</h2>
```

### SQL and database topics

Replace `Code Example` with:
```html
<h2>SQL Examples</h2>
<pre><code class="language-sql">
-- Comment explaining what this query does
SELECT ...
FROM ...
WHERE ...
</code></pre>

<p>Trace through the result step by step:</p>
<ol>
  <li>[What the FROM clause loads]</li>
  <li>[What the WHERE clause filters]</li>
  <li>[What SELECT projects]</li>
</ol>
```

---

## Code quality standards

### Python
- Follow PEP 8 naming: `snake_case` for variables and functions.
- Use type hints where they improve clarity: `def search(arr: list, target: int) -> int:`.
- Use f-strings for formatted output.
- Show the return value or output explicitly.

### Java
- Use `static` methods for standalone examples.
- Note that class declarations are required but can be omitted from the shown snippet with a comment.
- Use clear variable names, not single letters except for conventional loop variables.

### Code accuracy rules

1. Every code example must produce the output shown in the worked example.
2. Do not show pseudocode as Python or Java — use a comment like `# conceptual pseudocode`.
3. If the code has edge cases (empty array, etc.), note them explicitly.
4. O(1) extra space algorithms: clearly state that the algorithm is in-place.
5. Recursive examples: show the base case first and explain why it terminates.

---

## Writing style rules

| Rule | Example |
|------|---------|
| Define before use | "A **vertex** (also called a **node**) is a fundamental unit of a graph." |
| Build complexity gradually | Start with the 3-node example before the 10-node example |
| Avoid vague qualifiers | "fast" → "O(log n) per query" |
| Never fabricate measurements | Don't say "3× faster in benchmarks" without a real source |
| Use consistent terminology | Pick one: "vertex" or "node", not both randomly |
| Explain the why, not just the what | "We use a queue (not a stack) because BFS processes nodes level by level" |
| Show failure cases | "If the input array is not sorted, binary search produces incorrect results" |

---

## Checklist before saving a note

- [ ] Has a `<h2>Learning Objectives</h2>` section.
- [ ] Has a core explanation section that defines all terms before using them.
- [ ] Has at least one worked example with intermediate states shown.
- [ ] Has at least one code block (for algorithmic topics).
- [ ] Code compiles and produces the stated output (manually verified).
- [ ] Has a complexity table or summary (for algorithm topics).
- [ ] Has a knowledge check section with 2–3 short questions.
- [ ] Does not repeat content from other topics in the same course verbatim.
- [ ] Does not contain fabricated external references or benchmark numbers.
- [ ] `is_published = True` so students can see it immediately.
