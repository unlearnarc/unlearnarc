#!/usr/bin/env python3
"""Verified, repeatable sorting/searching visualizer content. See algoviz_specs/README.md."""
import argparse
import copy
import json
import os
from pathlib import Path
import sys
from urllib.error import HTTPError
from urllib.request import Request, urlopen


# These are the actual displayed implementations; tracing executes the same code.
PYTHON = {
    'bubble-sort': '''def bubble_sort(a):
    for end in range(len(a) - 1, 0, -1):
        swapped = False  # Begin a pass over the unsorted prefix.
        for j in range(end):
            if a[j] > a[j + 1]:  # Compare adjacent values.
                a[j], a[j + 1] = a[j + 1], a[j]  # Swap out-of-order neighbours.
                swapped = True
        if not swapped:  # A pass without swaps proves the array is sorted.
            break
    return a
''',
    'selection-sort': '''def selection_sort(a):
    for i in range(len(a) - 1):
        minimum = i  # The sorted prefix ends just before i.
        for j in range(i + 1, len(a)):
            if a[j] < a[minimum]:  # Find the minimum of the remaining suffix.
                minimum = j
        a[i], a[minimum] = a[minimum], a[i]  # Put the minimum into its final position.
    return a
''',
    'insertion-sort': '''def insertion_sort(a):
    for i in range(1, len(a)):
        key = a[i]  # Save the value to insert into the sorted prefix.
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]  # Shift a larger value right; key is saved separately.
            j -= 1
        a[j + 1] = key  # Fill the gap with the saved key.
    return a
''',
    'merge-sort': '''def merge_sort(a):
    def sort(lo, hi):
        if hi - lo <= 1:
            return
        mid = (lo + hi) // 2  # Split the half-open range [lo, hi).
        sort(lo, mid)
        sort(mid, hi)
        left, right = a[lo:mid], a[mid:hi]  # Copy the two sorted halves.
        i = j = 0
        k = lo
        while i < len(left) and j < len(right):
            if left[i] <= right[j]:  # Taking left on ties preserves stability.
                a[k] = left[i]
                i += 1
            else:
                a[k] = right[j]
                j += 1
            k += 1
        while i < len(left):
            a[k] = left[i]  # Copy the remaining left values.
            i += 1
            k += 1
        while j < len(right):
            a[k] = right[j]  # Copy the remaining right values.
            j += 1
            k += 1
    sort(0, len(a))
    return a
''',
    'quick-sort': '''def quick_sort(a):
    def sort(lo, hi):
        if lo >= hi:
            return
        pivot = a[hi]  # Lomuto partition uses the last value as pivot.
        i = lo
        for j in range(lo, hi):
            if a[j] <= pivot:
                a[i], a[j] = a[j], a[i]  # Grow the partition of values <= pivot.
                i += 1
        a[i], a[hi] = a[hi], a[i]  # Put the pivot in its final position.
        sort(lo, i - 1)
        sort(i + 1, hi)
    sort(0, len(a) - 1)
    return a
''',
    'heap-sort': '''def heap_sort(a):
    def sift(root, end):
        while 2 * root + 1 < end:
            child = 2 * root + 1  # Left child in the array-backed max heap.
            if child + 1 < end and a[child + 1] > a[child]:
                child += 1
            if a[root] >= a[child]:  # The heap property is already satisfied.
                break
            a[root], a[child] = a[child], a[root]  # Move the larger child upward.
            root = child
    for start in range(len(a) // 2 - 1, -1, -1):
        sift(start, len(a))  # Build the max heap bottom-up.
    for end in range(len(a) - 1, 0, -1):
        a[0], a[end] = a[end], a[0]  # Extract the maximum into the sorted suffix.
        sift(0, end)
    return a
''',
    'linear-search': '''def linear_search(a, target):
    for i in range(len(a)):
        if a[i] == target:  # Check each value from left to right.
            return i  # Return the first matching zero-based index.
    return -1  # No value matched, including when the array is empty.
''',
    'binary-search': '''def binary_search(a, target):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = lo + (hi - lo) // 2  # Probe the middle of the inclusive range.
        if a[mid] == target:
            return mid  # Any matching index is valid when duplicates exist.
        if a[mid] < target:
            lo = mid + 1  # Discard the middle and everything to its left.
        else:
            hi = mid - 1  # Discard the middle and everything to its right.
    return -1  # An empty candidate range means the target is absent.
''',
}

JAVA = {
'bubble-sort': '''static void bubbleSort(int[] a) {
    for (int end = a.length - 1; end > 0; end--) {
        boolean swapped = false;
        for (int j = 0; j < end; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                swapped = true;
            }
        }
        if (!swapped) break;
    }
}''',
'selection-sort': '''static void selectionSort(int[] a) {
    for (int i = 0; i < a.length - 1; i++) {
        int minimum = i;
        for (int j = i + 1; j < a.length; j++)
            if (a[j] < a[minimum]) minimum = j;
        int t = a[i]; a[i] = a[minimum]; a[minimum] = t;
    }
}''',
'insertion-sort': '''static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) {
            a[j + 1] = a[j];
            j--;
        }
        a[j + 1] = key;
    }
}''',
'merge-sort': '''static void mergeSort(int[] a) {
    mergeRange(a, 0, a.length);
}
static void mergeRange(int[] a, int lo, int hi) {
    if (hi - lo <= 1) return;
    int mid = lo + (hi - lo) / 2;
    mergeRange(a, lo, mid);
    mergeRange(a, mid, hi);
    int[] left = java.util.Arrays.copyOfRange(a, lo, mid);
    int[] right = java.util.Arrays.copyOfRange(a, mid, hi);
    int i = 0, j = 0, k = lo;
    while (i < left.length && j < right.length)
        a[k++] = left[i] <= right[j] ? left[i++] : right[j++];
    while (i < left.length) a[k++] = left[i++];
    while (j < right.length) a[k++] = right[j++];
}''',
'quick-sort': '''static void quickSort(int[] a) {
    quickRange(a, 0, a.length - 1);
}
static void quickRange(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++) {
        if (a[j] <= pivot) {
            int t = a[i]; a[i] = a[j]; a[j] = t;
            i++;
        }
    }
    int t = a[i]; a[i] = a[hi]; a[hi] = t;
    quickRange(a, lo, i - 1);
    quickRange(a, i + 1, hi);
}''',
'heap-sort': '''static void heapSort(int[] a) {
    for (int start = a.length / 2 - 1; start >= 0; start--)
        sift(a, start, a.length);
    for (int end = a.length - 1; end > 0; end--) {
        int t = a[0]; a[0] = a[end]; a[end] = t;
        sift(a, 0, end);
    }
}
static void sift(int[] a, int root, int end) {
    while (2 * root + 1 < end) {
        int child = 2 * root + 1;
        if (child + 1 < end && a[child + 1] > a[child]) child++;
        if (a[root] >= a[child]) break;
        int t = a[root]; a[root] = a[child]; a[child] = t;
        root = child;
    }
}''',
'linear-search': '''static int linearSearch(int[] a, int target) {
    for (int i = 0; i < a.length; i++)
        if (a[i] == target) return i;
    return -1;
}''',
'binary-search': '''static int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}''',
}

# title, summary, explanation/use cases, time, space, properties
DETAILS = {
'bubble-sort': ('Bubble Sort', 'Compare neighbours and swap inverted pairs until no swaps remain.',
    'Each pass moves the largest remaining value to the end. The suffix is final after each pass. Use for learning adjacent comparisons, not large datasets. The early-exit flag avoids extra passes on sorted input.',
    'O(n²) average/worst; O(n) best', 'O(1)', 'Stable: yes (equal neighbours are not swapped). In-place: yes.'),
'selection-sort': ('Selection Sort', 'Select the smallest remaining value and place it at the next sorted position.',
    'Scan the unsorted suffix for its minimum, then swap it with the first unsorted value. The prefix grows by one final value per pass. Useful for teaching invariants and limiting writes, but still scans quadratically even on sorted input.',
    'O(n²) best/average/worst', 'O(1)', 'Stable: no (a long-distance swap can reorder equal values). In-place: yes.'),
'insertion-sort': ('Insertion Sort', 'Grow a sorted prefix by shifting larger values and inserting the saved key.',
    'Save the next key, shift larger prefix elements one position right, then fill the gap. Temporary duplicate bars during shifts are expected: the key remains in a separate variable. Useful for small or nearly sorted inputs and as a base case in hybrid sorting.',
    'O(n²) average/worst; O(n) best', 'O(1)', 'Stable: yes (shift only strictly greater values). In-place: yes.'),
'merge-sort': ('Merge Sort', 'Recursively split the input and merge sorted halves by choosing the smaller front value.',
    'Ranges are half-open: [lo, hi). Recursively sort both halves, copy them, then write back their smallest remaining fronts. The merge invariant is that the written prefix is sorted. Useful when stable ordering and guaranteed running time matter. Temporary duplicates while writing back are normal; the copied halves retain the original values.',
    'O(n log n) best/average/worst', 'O(n) auxiliary + O(log n) stack', 'Stable: yes (choose the left value on ties). In-place: no in this implementation.'),
'quick-sort': ('Quick Sort', 'Partition around a pivot, fix its final position, then recursively sort both sides.',
    'This example uses Lomuto partitioning with the last element as pivot. Values <= pivot are collected before index i; after scanning, the pivot is swapped into i. Useful for learning partitioning and generally fast in-memory sorting. Sorted, reversed, or all-equal inputs can cause quadratic work and deep recursion here; randomized or three-way partitioning improves practical robustness.',
    'O(n log n) average; O(n²) worst', 'O(log n) average stack; O(n) worst', 'Stable: no. In-place partitioning: yes, but recursion uses stack space. For very large adversarial inputs use an iterative or depth-limited implementation.'),
'heap-sort': ('Heap Sort', 'Build a max heap, then repeatedly move its maximum into a growing sorted suffix.',
    'A max heap stores each parent >= its children. In a zero-based array, children are 2*r+1 and 2*r+2. Build the heap bottom-up in O(n), swap its root with the last heap value, shrink the heap, and sift down. Useful when worst-case bounds and constant auxiliary memory matter. The visualization shows the heap in array form, not as a tree.',
    'O(n log n) worst/average; O(n) best with all equal values', 'O(1)', 'Stable: no. In-place: yes; sift-down is iterative.'),
'linear-search': ('Linear Search', 'Scan left to right and return the first index whose value equals the target.',
    'No sorting is required. After checking index i without a match, all earlier indices are known not to contain the target. Useful for small or unsorted collections, and when you need the first occurrence. Returns a zero-based index or -1 if absent; an empty input returns -1.',
    'O(n) worst/average; O(1) best', 'O(1)', 'Precondition: none beyond a valid array. Does not modify input. Duplicates: returns first occurrence.'),
'binary-search': ('Binary Search', 'Probe the middle of a sorted range and discard the half that cannot contain the target.',
    'Input MUST be sorted in ascending order before searching. Maintain inclusive bounds lo and hi; compare a[mid] with the target, then exclude mid when moving a bound. At every step a possible match remains within [lo, hi]. Useful for repeated lookup in sorted arrays. Sorting an unsorted array first costs extra and changes original indices. Returns a zero-based index or -1 when absent.',
    'O(log n) worst/average; O(1) best', 'O(1)', 'Precondition: ascending sorted array. Does not modify input. Duplicates: any matching index, not necessarily the first. Empty input returns -1.'),
}


def execute(slug, values, target=None, trace=False):
    """Execute the exact Python example; optionally record line-before-execution frames."""
    source = PYTHON[slug]
    filename = f'<visualizer:{slug}>'
    namespace = {}
    exec(compile(source, filename, 'exec'), namespace)
    a = list(values)
    frames = []
    pointer_names = {'i', 'j', 'k', 'lo', 'hi', 'mid', 'minimum', 'root', 'child', 'end', 'start'}

    def record(frame, event, arg):
        if frame.f_code.co_filename == filename and event == 'line':
            local = frame.f_locals
            variables = {k: v for k, v in local.items()
                         if isinstance(v, (int, bool))}
            line = frame.f_lineno
            text = source.splitlines()[line - 1].strip()
            pointers = {k: v for k, v in variables.items()
                        if k in pointer_names and type(v) is int and 0 <= v < len(a)}
            frames.append({
                'title': text.split(' #')[0],
                'explanation': (text.split('#', 1)[1].strip() if '#' in text else
                                'Execute this Python line using the displayed variables. The array shows its state before the line runs.'),
                'state': {'array': a.copy()}, 'variables': variables,
                'pointers': pointers, 'line': line, 'lang': 'python',
                'highlights': [{'target': 'array', 'indices': sorted(set(pointers.values())),
                                'style': 'COMPARE' if text.startswith('if ') or text.startswith('while ') else 'ACTIVE'}],
            })
        return record

    previous = sys.gettrace()
    try:
        if trace:
            sys.settrace(record)
        fn = namespace[slug.replace('-', '_')]
        result = fn(a, target) if slug.endswith('search') else fn(a)
    finally:
        if trace:
            sys.settrace(previous)
    return result, a, frames


def catalog():
    result = []
    for slug, (title, summary, explanation, time, space, properties) in DETAILS.items():
        search = slug.endswith('search')
        values = [2, 5, 8, 12, 16, 23, 38] if slug == 'binary-search' else [5, 2, 4, 1, 3]
        target = 16 if slug == 'binary-search' else 1
        answer, final, frames = execute(slug, values, target, trace=True)
        start = {'title': 'Start the walkthrough',
                 'explanation': ('Find target ' + str(target) + '. Indices are zero-based.' if search else
                                 'Sort ascending. Python steps show the state BEFORE each highlighted line executes.'),
                 'state': {'array': values.copy()},
                 'variables': {'target': target} if search else {},
                 'input': {'key': slug + '-prediction', 'type': 'NUMBER',
                           'prompt': f'Predict the returned index for target {target}.' if search else
                                     'Which value will be at index 0 after sorting?',
                           'expected': answer if search else min(values)}}
        # Ask for a concrete prediction immediately before a state-changing transition.
        for index in range(len(frames) - 1):
            before, after = frames[index]['state']['array'], frames[index + 1]['state']['array']
            if before != after:
                changed = next(i for i in range(len(before)) if before[i] != after[i])
                frames[index]['input'] = {
                    'key': slug + '-next', 'type': 'NUMBER',
                    'prompt': f'After the highlighted Python line executes, what value will be at index {changed}?',
                    'expected': after[changed]}
                break
        if search:
            # Independent conceptual checkpoint in the middle of the search trace.
            frames[len(frames) // 2]['input'] = {
                'key': slug + '-concept', 'type': 'BOOLEAN',
                'prompt': 'Does this algorithm require the input to be sorted ascending?',
                'expected': slug == 'binary-search'}
        finish = {'title': 'Found target' if search else 'Fully sorted',
                  'explanation': f'Return {answer}: a[{answer}] = {target}.' if search else
                                 'All values are now in ascending order. Every input value is preserved.',
                  'state': {'array': final},
                  'variables': {'result': answer} if search else {},
                  'highlights': [{'target': 'array', 'indices': [answer] if search else list(range(len(final))), 'style': 'DONE'}]}
        result.append({
            'slug': slug, 'title': title, 'summary': summary,
            'thumbnailUrl': f'/images/algorithms/{slug}.svg',
            'usage': f'How it works\n{explanation}\n\nProperties and prerequisites\n{properties}\n\nComplexity\nTime: {time}. Space: {space}.\n\nExample\nInput: {values}' +
                     (f'; target = {target}. Output: index {answer}.' if search else f'. Output: {final}.') +
                     '\n\nTry it\nUse Play/Pause, Previous/Next, the timeline, and playback speed. Answer the prediction checkpoints to continue; feedback reveals the expected answer. Python is the line-synchronized walkthrough; Java is an equivalent complete implementation. Sorting functions accept empty arrays, duplicates, negative values, and already sorted inputs. Java methods belong inside a class; Python functions can be called directly.',
            'category': 'Searching' if search else 'Sorting',
            'difficulty': 'MEDIUM' if slug in {'merge-sort', 'quick-sort', 'heap-sort'} else 'EASY',
            'visualizer': 'ARRAY', 'complexity': {'time': time, 'space': space},
            'pythonSource': PYTHON[slug], 'javaSource': JAVA[slug],
            'spec': {'visualizer': 'ARRAY', 'initialState': {'array': values},
                     'variables': [{'name': k, 'label': k} for k in sorted({k for f in frames for k in f['variables']})],
                     'steps': [start, *frames, finish]},
        })
    return result


class Client:
    def __init__(self, base):
        self.base = base.rstrip('/')
        self.token = None

    def request(self, method, path, body=None):
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        request = Request(self.base + path, method=method, headers=headers,
                          data=json.dumps(body).encode() if body is not None else None)
        try:
            with urlopen(request, timeout=30) as response:
                return json.load(response).get('data')
        except HTTPError as exc:
            raise RuntimeError(f'{method} {path}: HTTP {exc.code}') from None


def seed(client, entries):
    root = '/api/v1/algorithms'
    # Validate every payload before making any persistent changes.
    for entry in entries:
        client.request('POST', root + '/validate', entry)
    existing = {e['slug']: e for e in client.request('GET', root)}
    for entry in entries:
        current = existing.get(entry['slug'])
        if current:
            saved = client.request('GET', root + '/' + current['id'])
            if all(saved.get(k) == v for k, v in entry.items()):
                item = saved
            else:
                item = client.request('PUT', root + '/' + current['id'], entry)
        else:
            item = client.request('POST', root, entry)
        if not item.get('isPublished'):
            client.request('PATCH', root + '/' + item['id'] + '/publish?value=true')
        saved = client.request('GET', root + '/slug/' + entry['slug'])
        if not saved.get('isPublished') or not all(saved.get(k) == v for k, v in entry.items()):
            raise RuntimeError('Saved content mismatch: ' + entry['slug'])
        print(f"Verified published: {entry['title']} ({len(entry['spec']['steps'])} steps)")
    published = {e['slug'] for e in client.request('GET', root + '/published')}
    if not all(e['slug'] in published for e in entries):
        raise RuntimeError('Published feed is missing seeded content')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--validate', action='store_true', help='Build content offline without database writes')
    parser.add_argument('--export', action='store_true', help='Export JSON specs without database writes')
    args = parser.parse_args()
    entries = catalog()
    if args.export:
        directory = Path(__file__).parent / 'algoviz_specs'
        for entry in entries:
            (directory / (entry['slug'] + '.json')).write_text(json.dumps(entry, indent=2) + '\n')
    if args.validate or args.export:
        print(f'Built {len(entries)} algorithms, {sum(len(e["spec"]["steps"]) for e in entries)} steps')
        return
    client = Client(os.environ.get('BASE', 'http://localhost:8085'))
    client.token = client.request('POST', '/api/v1/auth/login', {
        'email': os.environ.get('ADMIN_EMAIL', 'unlearnarc@gmail.com'),
        'password': os.environ.get('ADMIN_PASS', 'Admin@123')})['accessToken']
    seed(client, entries)


if __name__ == '__main__':
    main()
