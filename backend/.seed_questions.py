#!/usr/bin/env python3
"""Helper for seed_extras.sh — emits a JSON array of questions for one pool.

Usage: python3 .seed_questions.py <poolId> <easy> <medium> <hard> <label>
Prints a JSON array (with poolId on every item) ready for POST /questions/bulk.
Kept as a standalone file to avoid shell-quoting issues with apostrophes/parens.
"""
import sys, json

BANK = {
    "EASY": [
        ("Which data structure uses FIFO (first-in, first-out) ordering?",
         [("Queue", True), ("Stack", False), ("Tree", False), ("Graph", False)],
         "A queue removes elements in the same order they were added (FIFO)."),
        ("What is the time complexity of accessing an element in an array by index?",
         [("O(1)", True), ("O(n)", False), ("O(log n)", False), ("O(n log n)", False)],
         "Array index access is constant time."),
        ("Which keyword declares a constant in modern JavaScript?",
         [("const", True), ("var", False), ("let", False), ("final", False)],
         "const declares a block-scoped constant binding."),
        ("Which of these is NOT a primitive type in Java?",
         [("String", True), ("int", False), ("boolean", False), ("double", False)],
         "String is a class/object; int, boolean and double are primitives."),
        ("What does the SQL SELECT * clause return?",
         [("All columns of the matching rows", True), ("Only the primary key", False),
          ("The row count", False), ("Nothing", False)],
         "* selects every column of the matching rows."),
        ("Which symbol starts a single-line comment in Python?",
         [("#", True), ("//", False), ("--", False), ("/*", False)],
         "Python uses # for single-line comments."),
    ],
    "MEDIUM": [
        ("Which statements about hash maps are correct?",
         [("Average lookup is O(1)", True),
          ("They preserve insertion order in every language by default", False),
          ("Collisions are handled via chaining or open addressing", True),
          ("Keys must always be integers", False)],
         "Hash maps give amortised O(1) lookups and resolve collisions via chaining/open addressing.",
         "MULTIPLE_CORRECT"),
        ("What is the worst-case time complexity of binary search on a sorted array?",
         [("O(log n)", True), ("O(n)", False), ("O(1)", False), ("O(n log n)", False)],
         "Binary search halves the search space each step, so O(log n)."),
        ("In OOP, which concept lets a subclass provide its own version of a method?",
         [("Overriding", True), ("Overloading", False), ("Encapsulation", False), ("Abstraction", False)],
         "Method overriding replaces the inherited implementation."),
        ("Which HTTP status code means the client must authenticate?",
         [("401 Unauthorized", True), ("403 Forbidden", False),
          ("404 Not Found", False), ("500 Internal Server Error", False)],
         "401 indicates missing or invalid authentication."),
        ("Which of these are valid ways to avoid SQL injection?",
         [("Parameterised queries", True), ("Concatenating user input into SQL", False),
          ("Prepared statements", True), ("ORMs with bound parameters", True)],
         "Bound parameters and prepared statements keep data separate from SQL code.",
         "MULTIPLE_CORRECT"),
        ("In ACID, what does the letter I stand for?",
         [("Isolation", True), ("Indexing", False), ("Integrity", False), ("Inheritance", False)],
         "ACID = Atomicity, Consistency, Isolation, Durability."),
    ],
    "HARD": [
        ("Which statements about the CAP theorem are correct?",
         [("During a partition you trade consistency for availability", True),
          ("You can always guarantee all three simultaneously", False),
          ("CAP = Consistency, Availability, Partition tolerance", True),
          ("Partition tolerance is optional on networked systems", False)],
         "Under a network partition a system must choose between consistency and availability.",
         "MULTIPLE_CORRECT"),
        ("What is the amortised time complexity of appending to a dynamic array?",
         [("O(1) amortised", True), ("O(n) always", False), ("O(log n)", False), ("O(n log n)", False)],
         "Occasional O(n) resizes average out to O(1) per append."),
        ("Which conditions are required for a deadlock?",
         [("Mutual exclusion", True), ("Hold and wait", True),
          ("Circular wait", True), ("Unlimited memory", False)],
         "The Coffman conditions: mutual exclusion, hold-and-wait, no preemption, circular wait.",
         "MULTIPLE_CORRECT"),
        ("Which tree guarantees O(log n) search by staying height-balanced?",
         [("AVL tree", True), ("An unbalanced binary search tree", False),
          ("Linked list", False), ("Hash table", False)],
         "AVL trees self-balance to keep height O(log n)."),
        ("What problem does an idempotency key primarily solve in an API?",
         [("Prevents duplicate processing on client retries", True), ("Encrypts the payload", False),
          ("Compresses the response", False), ("Guarantees global ordering", False)],
         "It makes safe client retries not apply the same operation twice."),
        ("In distributed systems, what does eventual consistency guarantee?",
         [("Replicas converge if no new updates arrive", True), ("Immediate global consistency", False),
          ("That no data is ever lost", False), ("Strict linearizability", False)],
         "Given no new writes, all replicas eventually return the last written value."),
    ],
}


def emit(pool, diff, n, label):
    pts = {"EASY": 1, "MEDIUM": 2, "HARD": 3}[diff]
    items = BANK[diff]
    out = []
    for i in range(n):
        q = items[i % len(items)]
        text, answers, expl = q[0], q[1], q[2]
        qtype = q[3] if len(q) > 3 else "MCQ"
        if i >= len(items):
            text = f"{text} (variant {i // len(items) + 1})"
        out.append({
            "poolId": pool,
            "questionText": f"[{label}] {text}",
            "questionType": qtype,
            "difficulty": diff,
            "points": pts,
            "explanation": expl,
            "answers": [{"answerText": a, "isCorrect": c} for a, c in answers],
        })
    return out


def main():
    pool, easy, medium, hard, label = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    arr = emit(pool, "EASY", easy, label) + emit(pool, "MEDIUM", medium, label) + emit(pool, "HARD", hard, label)
    print(json.dumps(arr))


if __name__ == "__main__":
    main()
