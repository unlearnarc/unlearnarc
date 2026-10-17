"""Offline correctness and API-workflow tests; no server or credentials required."""
import copy
import json
import math
import unittest
from collections import Counter

from seed_topic_contests import catalog, seed, validate_catalog
from topic_practice_bank import additions, lru, remove_zero, reverse_operations, nqueens, ladder_count
from seed_topic_contests import problem


def render(value):
    if isinstance(value, list):
        return " ".join(map(str, value)) if value else "EMPTY"
    return str(value)


def reference(title, d):
    """Independent reference computations for the authored expected outputs."""
    if title == "Maximum Array Value":
        return max(d["nums"])
    if title == "Product of Array Except Self":
        a = d["nums"]
        return [math.prod(a[:i] + a[i + 1:]) for i in range(len(a))]
    if title == "Trapping Rain Water":
        a = d["heights"]
        return sum(max(0, min(max(a[:i + 1]), max(a[i:])) - h) for i, h in enumerate(a))
    if title == "First Unique Number":
        counts = Counter(d["nums"])
        return next((x for x in d["nums"] if counts[x] == 1), "NONE")
    if title == "Subarray Sum Equals K":
        a, k = d["nums"], d["k"]
        if len(a) > 1000:
            # Boundary fixture: all zeros, independently use combinatorial count.
            assert set(a) == {0} and k == 0
            return len(a) * (len(a) + 1) // 2
        count = 0
        for i in range(len(a)):
            total = 0
            for x in a[i:]:
                total += x
                count += total == k
        return count
    if title == "Minimum Window Substring":
        s, t = d["s"], d["t"]
        if not t:
            return "NONE"
        if len(s) > 1000:
            assert s == "a" * 10000 + "B" and t == "aB"
            return "aB"
        need = Counter(t)
        for size in range(len(t), len(s) + 1):
            for i in range(len(s) - size + 1):
                candidate = s[i:i + size]
                if not (need - Counter(candidate)):
                    return candidate
        return "NONE"
    if title == "Distinct Intersection":
        return sorted(set(d["a"]).intersection(d["b"]))
    if title == "Longest Consecutive Sequence":
        ordered = sorted(set(d["nums"]))
        best = run = 0
        previous = None
        for x in ordered:
            run = run + 1 if previous is not None and x == previous + 1 else 1
            best = max(best, run)
            previous = x
        return best
    if title == "First Missing Positive":
        seen = set(d["nums"])
        return next(x for x in range(1, len(seen) + 2) if x not in seen)
    if title == "Reverse a Linked List":
        return d["values"][::-1]
    if title == "Remove Nth Node From End":
        a = d["values"][:]
        del a[-d["n"]]
        return a
    if title == "Reverse Nodes in K Groups":
        a, k = d["values"], d["k"]
        result = []
        for i in range(0, len(a), k):
            chunk = a[i:i + k]
            result.extend(chunk[::-1] if len(chunk) == k else chunk)
        return result
    raise AssertionError(title)


class MemoryApi:
    def __init__(self):
        self.contests = []
        self.problems = {}
        self.calls = []

    def request(self, method, path, body=None):
        self.calls.append((method, path))
        root = "/api/v1/admin/contests"
        if path == root:
            if method == "GET":
                return copy.deepcopy(self.contests)
            assert method == "POST"
            c = dict(body, id=str(len(self.contests) + 1), status="DRAFT", participantCount=0)
            self.contests.append(c)
            self.problems[c["id"]] = []
            return copy.deepcopy(c)
        suffix = path[len(root) + 1:].split("/")
        cid = suffix[0]
        if suffix[1] == "problems":
            if method == "GET":
                return copy.deepcopy(self.problems[cid])
            assert method == "POST"
            p = dict(copy.deepcopy(body), id=f"p{len(self.problems[cid])}")
            self.problems[cid].append(p)
            return copy.deepcopy(p)
        assert method == "PATCH" and suffix[1:] == ["status", "PUBLISHED"]
        c = next(c for c in self.contests if c["id"] == cid)
        assert len(self.problems[cid]) == 45
        c["status"] = "PUBLISHED"
        return copy.deepcopy(c)


class ContestSeedTests(unittest.TestCase):
    def test_schema_and_all_expected_outputs(self):
        items = catalog()
        validate_catalog(items)
        count = 0
        for item in items:
            for p in item["problems"]:
                for case in p["testCases"]:
                    with self.subTest(title=p["title"], case=case["displayOrder"]):
                        if p["displayOrder"] <= 3:
                            self.assertEqual(case["expectedOutput"], render(reference(p["title"], json.loads(case["input"]))))
                        self.assertIsInstance(json.loads(case["input"]), dict)
                        self.assertTrue(case["expectedOutput"])
                        count += 1
        self.assertEqual(count, 1440)

    def test_populate_publish_and_repeat_without_duplicates(self):
        api = MemoryApi()
        seed(api, catalog())
        self.assertEqual(len(api.contests), 4)
        self.assertTrue(all(c["status"] == "PUBLISHED" for c in api.contests))
        self.assertEqual(sum(len(p) for p in api.problems.values()), 180)
        api.calls.clear()
        seed(api, catalog())
        self.assertTrue(all(method == "GET" for method, _ in api.calls))

    def test_resume_incomplete_drafts(self):
        api = MemoryApi()
        seed(api, catalog(), publish=False)
        self.assertTrue(all(c["status"] == "DRAFT" for c in api.contests))
        api.problems["1"].pop()
        seed(api, catalog())
        self.assertEqual(len(api.problems["1"]), 45)
        self.assertTrue(all(c["status"] == "PUBLISHED" for c in api.contests))

    def test_changed_content_is_not_overwritten_or_published(self):
        api = MemoryApi()
        seed(api, catalog(), publish=False)
        api.problems["1"][0]["testCases"][0]["expectedOutput"] = "wrong"
        api.calls.clear()
        with self.assertRaisesRegex(RuntimeError, "Stored test cases differ"):
            seed(api, catalog())
        self.assertTrue(all(method == "GET" for method, _ in api.calls))
        self.assertEqual(api.contests[0]["status"], "DRAFT")

    def test_expand_original_published_contests_preserves_existing_content(self):
        api = MemoryApi()
        seed(api, catalog())
        for cid in api.problems:
            api.problems[cid] = api.problems[cid][:3]
        originals = copy.deepcopy(api.problems)
        api.calls.clear()
        with self.assertRaisesRegex(RuntimeError, "expand-published"):
            seed(api, catalog())
        self.assertTrue(all(m == "GET" for m, _ in api.calls))
        seed(api, catalog(), expand_published=True)
        for cid, problems in api.problems.items():
            self.assertEqual(problems[:3], originals[cid])
            self.assertEqual(len(problems), 45)
        api.calls.clear()
        seed(api, catalog(), expand_published=True)
        self.assertTrue(all(m == "GET" for m, _ in api.calls))

    def test_expansion_refuses_participants_and_content_drift(self):
        for participant_count in (1, None):
            api = MemoryApi()
            seed(api, catalog())
            api.problems["1"] = api.problems["1"][:3]
            api.contests[0]["participantCount"] = participant_count
            api.calls.clear()
            with self.assertRaisesRegex(RuntimeError, "participants"):
                seed(api, catalog(), expand_published=True)
            self.assertTrue(all(m == "GET" for m, _ in api.calls))
        api = MemoryApi()
        seed(api, catalog())
        api.problems["1"] = api.problems["1"][:3]
        api.problems["1"][2]["statement"] = "changed"
        api.calls.clear()
        with self.assertRaisesRegex(RuntimeError, "Stored statement differs"):
            seed(api, catalog(), expand_published=True)
        self.assertTrue(all(m == "GET" for m, _ in api.calls))

    def test_all_new_samples_and_distinct_hidden_fixtures(self):
        # Construction checks 336 hand-authored sample answers against oracles.
        bank = additions(problem)
        self.assertEqual(sum(map(len, bank.values())), 168)
        for problems in bank.values():
            for p in problems:
                hidden = [c["input"] for c in p["testCases"] if c["isHidden"]]
                self.assertEqual(len(set(hidden)), 6, p["title"])

    def test_known_advanced_reference_answers(self):
        self.assertEqual([nqueens(n) for n in range(1, 9)], [1,0,0,2,10,4,40,92])
        self.assertEqual(ladder_count("hit", "cog", ["hot","dot","dog","lot","log","cog"]), 2)
        self.assertEqual(remove_zero([1,3,2,-3,-2,5,5,-5,1]), [1,5,1])
        ops = [["put",1,1],["put",2,2],["get",1],["get",1],["get",2],["put",3,3],["get",1],["get",2]]
        self.assertEqual(lru(2, ops), [1,1,2,-1,2])
        self.assertEqual(lru(2, ops, True), [1,1,2,1,-1])

    def test_reverse_operations_against_explicit_reversal_graph(self):
        # Independent graph construction actually reverses token arrays.
        from collections import deque
        for n in range(1, 9):
            for k in range(1, n+1):
                for p in range(n):
                    banned = {i for i in range(n) if i % 3 == 0 and i != p}
                    dist = [-1]*n
                    dist[p] = 0
                    q = deque([p])
                    while q:
                        i = q.popleft()
                        for left in range(n-k+1):
                            if not left <= i < left+k:
                                continue
                            a = [0]*n
                            a[i] = 1
                            a[left:left+k] = a[left:left+k][::-1]
                            j = a.index(1)
                            if j not in banned and dist[j] == -1:
                                dist[j] = dist[i]+1
                                q.append(j)
                    self.assertEqual(reverse_operations(n,p,banned,k), dist)

    def test_archived_contest_is_not_republished(self):
        api = MemoryApi()
        seed(api, catalog(), publish=False)
        api.contests[0]["status"] = "ARCHIVED"
        with self.assertRaisesRegex(RuntimeError, "archived"):
            seed(api, catalog())


if __name__ == "__main__":
    unittest.main()
