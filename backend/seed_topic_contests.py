#!/usr/bin/env python3
"""Seed four topic contests. Validate offline with --validate; otherwise use BASE,
ADMIN_EMAIL and ADMIN_PASS. Existing contests/problems are never overwritten.
"""
import argparse
import json
import os
import sys
from collections import Counter
from topic_practice_bank import additions
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


STARTER = '''import json
import sys


def solve(data):
    # TODO: implement the algorithm described in the statement.
    raise NotImplementedError


data = json.loads(sys.stdin.read())
answer = solve(data)
if isinstance(answer, list):
    print(" ".join(map(str, answer)) if answer else "EMPTY")
else:
    print(answer)
'''


def problem(title, difficulty, statement, constraints, examples):
    return {
        "title": title, "difficulty": difficulty,
        "maxPoints": {"EASY": 100, "MEDIUM": 200, "HARD": 300}[difficulty],
        "statement": statement + "\n\nInput is one JSON object on stdin. Print only the requested answer. "
        "For list outputs, print space-separated values, or EMPTY for an empty list. "
        "The Python starter handles JSON parsing and output formatting; implement solve(data).",
        "constraints": constraints,
        "harnessType": "STDIN_STDOUT", "timeLimitMs": 2000,
        "starterCodeJson": json.dumps({"python": STARTER}),
        "testCases": [
            {"input": json.dumps(data, separators=(",", ":")), "expectedOutput": expected,
             "isHidden": i >= 2, "weight": 1 if i < 2 else 2,
             "strictMatch": False, "displayOrder": i}
            for i, (data, expected) in enumerate(examples)
        ],
    }


def catalog():
    topics = [
        ("Arrays", "arrays", [
            problem("Maximum Array Value", "EASY",
                    'Given data["nums"], return its maximum value. Do not sort the array. Target O(n) time and O(1) extra space.',
                    'nums: 1..100000 integers, each between -10^9 and 10^9. Output: one integer.', [
                        ({"nums": [3, 1, 9, 2]}, "9"), ({"nums": [-8, -3, -10]}, "-3"),
                        ({"nums": [0]}, "0"), ({"nums": [7, 7, 7]}, "7"),
                        ({"nums": [1000000000, -1000000000]}, "1000000000"),
                        ({"nums": [-1000000000]}, "-1000000000"),
                        ({"nums": list(range(100000))}, "99999"),
                        ({"nums": [5, 4, 3, 2, 1]}, "5")]),
            problem("Product of Array Except Self", "MEDIUM",
                    'Return a list where answer[i] is the product of all nums values except nums[i]. Do not use division. Target O(n) time, O(1) extra space excluding output.',
                    'nums: 2..100000 integers in [-10,10]. Every prefix, suffix and answer product fits signed 64-bit. Output: list in original index order.', [
                        ({"nums": [1, 2, 3, 4]}, "24 12 8 6"),
                        ({"nums": [-1, 1, 0, -3, 3]}, "0 0 9 0 0"),
                        ({"nums": [0, 0]}, "0 0"), ({"nums": [2, 3]}, "3 2"),
                        ({"nums": [-1, -2, -3]}, "6 3 2"),
                        ({"nums": [0, 2, 4]}, "8 0 0"),
                        ({"nums": [1] * 1000}, " ".join(["1"] * 1000)),
                        ({"nums": [10] * 10}, " ".join(["1000000000"] * 10))]),
            problem("Trapping Rain Water", "HARD",
                    'Given unit-width bars with heights data["heights"], return the total units of rain water trapped between bars. Target O(n) time and O(1) extra space.',
                    'heights: 0..100000 integers in [0,10^9]. Use a 64-bit result. Output: one integer.', [
                        ({"heights": [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]}, "6"),
                        ({"heights": [4, 2, 0, 3, 2, 5]}, "9"),
                        ({"heights": []}, "0"), ({"heights": [7]}, "0"),
                        ({"heights": [1, 2, 3, 4]}, "0"), ({"heights": [4, 3, 2, 1]}, "0"),
                        ({"heights": [3, 0, 3]}, "3"),
                        ({"heights": [1000000000] + [0] * 1000 + [1000000000]}, "1000000000000")]),
        ]),
        ("Hash Maps", "hashmaps", [
            problem("First Unique Number", "EASY",
                    'Return the first value in data["nums"] that appears exactly once, preserving input order. Return NONE (a string) if no such value exists. Use a frequency hash map. Target O(n) time.',
                    'nums: 0..100000 integers in [-10^9,10^9]. Output: integer or NONE.', [
                        ({"nums": [4, 5, 4, 6, 5]}, "6"), ({"nums": [2, 2, 3, 3]}, "NONE"),
                        ({"nums": []}, "NONE"), ({"nums": [0]}, "0"),
                        ({"nums": [-1, 2, -1, 3]}, "2"), ({"nums": [9, 1, 2]}, "9"),
                        ({"nums": [7] * 1000 + [8]}, "8"),
                        ({"nums": [-1000000000, 1000000000]}, "-1000000000")]),
            problem("Subarray Sum Equals K", "MEDIUM",
                    'Return the number of non-empty contiguous subarrays of data["nums"] whose sum equals data["k"]. Use prefix sums and a frequency hash map. Target O(n) time.',
                    'nums: 0..100000 integers in [-10^9,10^9]; k in [-10^14,10^14]. Use 64-bit sums and counts. Output: one integer.', [
                        ({"nums": [1, 1, 1], "k": 2}, "2"),
                        ({"nums": [1, 2, 3], "k": 3}, "2"),
                        ({"nums": [], "k": 0}, "0"), ({"nums": [0, 0, 0], "k": 0}, "6"),
                        ({"nums": [1, -1, 0], "k": 0}, "3"),
                        ({"nums": [-1, -1, 1], "k": -1}, "3"),
                        ({"nums": [0] * 100000, "k": 0}, "5000050000"),
                        ({"nums": [1000000000, 1000000000], "k": 2000000000}, "1")]),
            problem("Minimum Window Substring", "HARD",
                    'Return the shortest contiguous substring of data["s"] containing every character of data["t"], including multiplicity. If several shortest windows exist, return the earliest. Return NONE if no window exists or t is empty. Use a sliding window and frequency hash map. Target O(len(s)+len(t)) time.',
                    's and t contain only ASCII letters; case-sensitive; lengths 0..100000. Output: substring or NONE.', [
                        ({"s": "ADOBECODEBANC", "t": "ABC"}, "BANC"),
                        ({"s": "a", "t": "aa"}, "NONE"),
                        ({"s": "", "t": "a"}, "NONE"), ({"s": "abc", "t": ""}, "NONE"),
                        ({"s": "a", "t": "a"}, "a"),
                        ({"s": "AAABBC", "t": "AABC"}, "AABBC"),
                        ({"s": "abxba", "t": "ab"}, "ab"),
                        ({"s": "a" * 10000 + "B", "t": "aB"}, "aB")]),
        ]),
        ("Sets", "sets", [
            problem("Distinct Intersection", "EASY",
                    'Return the distinct values present in both data["a"] and data["b"], sorted in ascending numerical order. Use sets. Target O(n+m+r log r) time where r is the result size.',
                    'a and b: 0..100000 integers each in [-10^9,10^9]. Output: sorted list.', [
                        ({"a": [1, 2, 2, 1], "b": [2, 2]}, "2"),
                        ({"a": [4, 9, 5], "b": [9, 4, 9, 8, 4]}, "4 9"),
                        ({"a": [], "b": [1]}, "EMPTY"), ({"a": [1], "b": []}, "EMPTY"),
                        ({"a": [1, 2], "b": [3, 4]}, "EMPTY"),
                        ({"a": [-2, 0, 2], "b": [2, -2]}, "-2 2"),
                        ({"a": [7] * 1000, "b": [7] * 1000}, "7"),
                        ({"a": [1000000000, -1000000000], "b": [-1000000000]}, "-1000000000")]),
            problem("Longest Consecutive Sequence", "MEDIUM",
                    'Return the length of the longest run of consecutive integer values in data["nums"]. Input order does not matter and duplicates do not extend a run. Use a set without sorting. Target O(n) expected time.',
                    'nums: 0..100000 integers in [-10^9,10^9]. Output: one integer.', [
                        ({"nums": [100, 4, 200, 1, 3, 2]}, "4"),
                        ({"nums": [0, 3, 7, 2, 5, 8, 4, 6, 0, 1]}, "9"),
                        ({"nums": []}, "0"), ({"nums": [5]}, "1"),
                        ({"nums": [2, 2, 2]}, "1"), ({"nums": [-2, -1, 0, 2]}, "3"),
                        ({"nums": list(range(100000, 0, -1))}, "100000"),
                        ({"nums": [-1000000000, 1000000000]}, "1")]),
            problem("First Missing Positive", "HARD",
                    'Return the smallest positive integer absent from data["nums"]. Zero and negative values are not positive. A set-based O(n)-space solution is a useful starting point, but the challenge is O(n) time and O(1) extra space by rearranging the input in place.',
                    'nums: 0..100000 integers in [-10^9,10^9]. Output: one positive integer. Output tests verify correctness, not auxiliary-space usage.', [
                        ({"nums": [1, 2, 0]}, "3"), ({"nums": [3, 4, -1, 1]}, "2"),
                        ({"nums": []}, "1"), ({"nums": [7, 8, 9, 11, 12]}, "1"),
                        ({"nums": [1, 1]}, "2"), ({"nums": [-1, -2, 0]}, "1"),
                        ({"nums": list(range(1, 100001))}, "100001"),
                        ({"nums": [1000000000, 1, 2, 4]}, "3")]),
        ]),
        ("Linked Lists", "linkedlists", [
            problem("Reverse a Linked List", "EASY",
                    'data["values"] serializes a singly linked list in head-to-tail order. Build nodes with value and next fields, reverse the next pointers, then return the values from the new head. Do not solve by reversing an array. Target O(n) time and O(1) extra space after building nodes.',
                    'values: 0..100000 integers in [-10^9,10^9]. Output: reversed list. Pointer-use requirements are instructional and not enforced by stdout grading.', [
                        ({"values": [1, 2, 3, 4, 5]}, "5 4 3 2 1"),
                        ({"values": [1, 2]}, "2 1"), ({"values": []}, "EMPTY"),
                        ({"values": [42]}, "42"), ({"values": [7, 7, 7]}, "7 7 7"),
                        ({"values": [-1, 0, 1]}, "1 0 -1"),
                        ({"values": list(range(1000))}, " ".join(map(str, range(999, -1, -1)))),
                        ({"values": [-1000000000, 1000000000]}, "1000000000 -1000000000")]),
            problem("Remove Nth Node From End", "MEDIUM",
                    'Build a singly linked list from data["values"]. Remove the data["n"]-th node counted from the tail (n=1 removes the tail), and return the remaining values. Use a dummy head and two pointers. Target O(length) time, one pass, O(1) extra space after building nodes.',
                    'values: 1..100000 integers in [-10^9,10^9]; 1 <= n <= length. Output: remaining list. Pointer-use requirements are instructional, not enforced by stdout grading.', [
                        ({"values": [1, 2, 3, 4, 5], "n": 2}, "1 2 3 5"),
                        ({"values": [1], "n": 1}, "EMPTY"),
                        ({"values": [1, 2], "n": 2}, "2"),
                        ({"values": [1, 2], "n": 1}, "1"),
                        ({"values": [7, 7, 7], "n": 2}, "7 7"),
                        ({"values": [-2, 0, 2], "n": 3}, "0 2"),
                        ({"values": list(range(1000)), "n": 1}, " ".join(map(str, range(999)))),
                        ({"values": [9, 8, 7, 6], "n": 3}, "9 7 6")]),
            problem("Reverse Nodes in K Groups", "HARD",
                    'Build a singly linked list from data["values"]. Reverse nodes in each complete group of data["k"] nodes; leave a final incomplete group unchanged. Change next pointers, not node values. Return values from the new head. Target O(n) time and O(1) extra space after building nodes.',
                    'values: 0..100000 integers in [-10^9,10^9]; 1 <= k <= 100000 (k may exceed length). Output: resulting list. Pointer-use requirements are instructional, not enforced by stdout grading.', [
                        ({"values": [1, 2, 3, 4, 5], "k": 2}, "2 1 4 3 5"),
                        ({"values": [1, 2, 3, 4, 5], "k": 3}, "3 2 1 4 5"),
                        ({"values": [], "k": 2}, "EMPTY"),
                        ({"values": [1, 2, 3], "k": 1}, "1 2 3"),
                        ({"values": [1, 2], "k": 3}, "1 2"),
                        ({"values": [-1, 0, 1], "k": 3}, "1 0 -1"),
                        ({"values": [7, 7, 8, 8], "k": 2}, "7 7 8 8"),
                        ({"values": list(range(1000)), "k": 1000}, " ".join(map(str, range(999, -1, -1))))]),
        ]),
    ]
    result = []
    extra = additions(problem)
    for name, slug, problems in topics:
        problems.extend(extra[name])
        for order, item in enumerate(problems, 1):
            item["displayOrder"] = order
        result.append({"contest": {
            "title": f"{name} — Easy to Hard", "slug": f"topic-{slug}-easy-to-hard",
            "description": f"Practice {name.lower()} with Easy (100 points), Medium (200 points), and Hard (300 points) challenges. Includes public samples and hidden edge and boundary cases. Read each problem's JSON input contract before coding.",
            "visibility": "PUBLIC", "startTime": None, "endTime": None,
            "durationMinutes": 0, "allowedLanguages": "python", "wrongSubmissionPenalty": 0,
        }, "problems": problems})
    return result


def validate_catalog(items):
    assert len(items) == 4
    assert len({x["contest"]["slug"] for x in items}) == 4
    for item in items:
        assert Counter(p["difficulty"] for p in item["problems"]) == {"EASY": 15, "MEDIUM": 15, "HARD": 15}
        assert len({p["title"] for p in item["problems"]}) == 45
        assert [p["displayOrder"] for p in item["problems"]] == list(range(1, 46))
        for p in item["problems"]:
            assert len(p["testCases"]) >= 8
            assert sum(not c["isHidden"] for c in p["testCases"]) == 2
            compile(json.loads(p["starterCodeJson"])["python"], "starter", "exec")
            for case in p["testCases"]:
                assert isinstance(json.loads(case["input"]), dict)
                assert isinstance(case["expectedOutput"], str) and case["expectedOutput"]


class Client:
    def __init__(self, base):
        self.base = base.rstrip("/")
        self.token = None

    def request(self, method, path, body=None):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        data = None if body is None else json.dumps(body).encode()
        request = Request(self.base + path, data=data, headers=headers, method=method)
        try:
            with urlopen(request, timeout=60) as response:
                return json.load(response)["data"]
        except HTTPError as exc:
            # Do not include response bodies: authentication responses may contain secrets.
            raise RuntimeError(f"{method} {path}: HTTP {exc.code}") from None


def seed(client, items, publish=True, expand_published=False):
    root = "/api/v1/admin/contests"
    existing = client.request("GET", root)
    for item in items:
        spec = item["contest"]
        matches = [c for c in existing if c["slug"] == spec["slug"]]
        if len(matches) > 1:
            raise RuntimeError(f"Ambiguous slug: {spec['slug']}")
        contest = matches[0] if matches else client.request("POST", root, spec)
        path = f"{root}/{contest['id']}"
        stored = client.request("GET", path + "/problems")
        expected_titles = {p["title"] for p in item["problems"]}
        if any(p["title"] not in expected_titles for p in stored):
            raise RuntimeError(f"Unexpected problems in {spec['slug']}; refusing to publish")
        if contest["status"] == "ARCHIVED":
            raise RuntimeError("Refusing to modify an archived contest")
        # Verify all existing content before writing anything to this contest.
        missing = []
        for p in item["problems"]:
            matches = [s for s in stored if s["title"] == p["title"]]
            if len(matches) > 1:
                raise RuntimeError(f"Duplicate problem: {p['title']}")
            if matches:
                verify_problem(p, matches[0])
            else:
                missing.append(p)
        if missing and contest["status"] != "DRAFT":
            if not expand_published or contest["status"] != "PUBLISHED":
                raise RuntimeError("Cannot add missing problems to a non-draft contest without --expand-published")
            if contest.get("participantCount") != 0:
                raise RuntimeError("Refusing to expand a published contest with participants or unknown participant count")
        for p in missing:
            client.request("POST", path + "/problems", p)
        # Re-fetch and compare all authored fields/test cases before publishing.
        stored = client.request("GET", path + "/problems")
        if len(stored) != len(item["problems"]):
            raise RuntimeError("Stored problem count mismatch")
        for p in item["problems"]:
            actual = next(s for s in stored if s["title"] == p["title"])
            verify_problem(p, actual)
        if publish and contest["status"] == "DRAFT":
            client.request("PATCH", path + "/status/PUBLISHED")
        elif publish and contest["status"] != "PUBLISHED":
            raise RuntimeError("Refusing to republish an archived contest")
        count = sum(len(p["testCases"]) for p in item["problems"])
        print(f"Verified: {spec['title']} — {len(stored)} problems, {count} test cases ({contest['id']})")


def verify_problem(expected, actual):
    for key, value in expected.items():
        if key == "testCases":
            actual_cases = [{k: c[k] for k in value[0]} for c in actual[key]]
            if actual_cases != value:
                raise RuntimeError(f"Stored test cases differ: {expected['title']}")
        elif actual.get(key) != value:
            raise RuntimeError(f"Stored {key} differs: {expected['title']}; existing content left unchanged")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--validate", action="store_true", help="offline data checks only")
    parser.add_argument("--draft", action="store_true", help="do not publish new contests")
    parser.add_argument("--expand-published", action="store_true", help="add missing questions only to published contests with zero participants")
    args = parser.parse_args()
    items = catalog()
    validate_catalog(items)
    if args.validate:
        print("Validated 4 contests, 180 problems, 1440 test cases (360 public / 1080 hidden).")
        return
    password = os.environ.get("ADMIN_PASS")
    if not password:
        parser.error("Set ADMIN_PASS to the local administrator password")
    client = Client(os.environ.get("BASE", "http://localhost:8085"))
    client.token = client.request("POST", "/api/v1/auth/login", {
        "email": os.environ.get("ADMIN_EMAIL", "unlearnarc@gmail.com"), "password": password,
    })["accessToken"]
    seed(client, items, publish=not args.draft, expand_published=args.expand_published)


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, URLError, KeyError, ValueError, AssertionError) as exc:
        print(f"Seeding failed: {exc}", file=sys.stderr)
        sys.exit(1)
