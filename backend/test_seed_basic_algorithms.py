"""Offline content, executable examples, trace and API integration tests."""
import copy
import json
from pathlib import Path
import random
import shutil
import subprocess
import tempfile
import unittest

from seed_basic_algorithms import JAVA, PYTHON, catalog, execute, seed


class FakeClient:
    def __init__(self):
        self.entries = {'unrelated': {'id': 'other', 'slug': 'unrelated', 'isPublished': True}}
        self.writes = 0
        self.validated = []

    def request(self, method, path, body=None):
        root = '/api/v1/algorithms'
        if path == root + '/validate':
            self.validated.append(body['slug'])
            return None
        if method == 'GET' and path in (root, root + '/published'):
            return copy.deepcopy([e for e in self.entries.values()
                                  if path == root or e['isPublished']])
        if path.startswith(root + '/slug/'):
            return copy.deepcopy(self.entries[path.split('/')[-1]])
        if method == 'POST' and path == root:
            self.assert_validated()
            self.writes += 1
            entry = dict(copy.deepcopy(body), id=body['slug'], isPublished=False)
            self.entries[entry['slug']] = entry
            return copy.deepcopy(entry)
        ident = path[len(root) + 1:].split('/')[0]
        entry = next(e for e in self.entries.values() if e['id'] == ident)
        if method == 'PUT':
            self.writes += 1
            entry.update(copy.deepcopy(body))
        elif method == 'PATCH':
            self.writes += 1
            entry['isPublished'] = True
        return copy.deepcopy(entry)

    def assert_validated(self):
        assert set(self.validated) == set(PYTHON)


class BasicAlgorithmsTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.entries = catalog()

    def test_catalog_contract_and_checkpoints(self):
        self.assertEqual(len(self.entries), 8)
        for entry in self.entries:
            self.assertLessEqual(len(entry['summary']), 1000)
            self.assertIn('Properties', entry['usage'])
            spec = entry['spec']
            steps = spec['steps']
            self.assertGreaterEqual(sum('input' in s for s in steps), 2)
            self.assertEqual(len({s['input']['key'] for s in steps if 'input' in s}), 2)
            self.assertEqual(spec['initialState'], steps[0]['state'])
            for step in steps:
                for highlight in step.get('highlights', []):
                    for i in highlight['indices']:
                        self.assertTrue(0 <= i < len(step['state']['array']))
                if 'line' in step:
                    self.assertEqual(step['lang'], 'python')
                    self.assertTrue(1 <= step['line'] <= len(entry['pythonSource'].splitlines()))
            if entry['category'] == 'Sorting':
                self.assertEqual(steps[-1]['state']['array'], sorted(spec['initialState']['array']))
            else:
                answer = steps[-1]['variables']['result']
                self.assertEqual(steps[-1]['state']['array'][answer], steps[0]['variables']['target'])

    def test_python_examples_edge_cases_and_random_inputs(self):
        rng = random.Random(2026)
        cases = [[], [1], [2, 1], [4] * 8, [-3, 0, -1, 3], list(range(20)), list(range(20, 0, -1))]
        cases += [[rng.randint(-20, 20) for _ in range(rng.randint(0, 35))] for _ in range(60)]
        for slug in PYTHON:
            for values in cases:
                if slug.endswith('search'):
                    a = sorted(values) if slug == 'binary-search' else values
                    for target in [-30, 0, 30, *a[:3]]:
                        answer, final, _ = execute(slug, a, target)
                        self.assertEqual(final, a)
                        if target not in a:
                            self.assertEqual(answer, -1)
                        elif slug == 'linear-search':
                            self.assertEqual(answer, a.index(target))
                        else:
                            self.assertEqual(a[answer], target)
                else:
                    answer, final, _ = execute(slug, values)
                    self.assertEqual(answer, sorted(values), slug)
                    self.assertEqual(final, sorted(values), slug)

    def test_trace_reproducible_and_prediction_truth(self):
        self.assertEqual(self.entries, catalog())
        for entry in self.entries:
            steps = entry['spec']['steps']
            for index, step in enumerate(steps):
                prompt = step.get('input', {}).get('prompt', '')
                if prompt.startswith('After the highlighted'):
                    changed = int(prompt.split('index ')[1].split('?')[0])
                    self.assertEqual(step['input']['expected'], steps[index + 1]['state']['array'][changed])
                    self.assertNotEqual(step['state']['array'][changed], step['input']['expected'])

    def test_exported_specs_match_catalog(self):
        for entry in self.entries:
            path = Path(__file__).parent / 'algoviz_specs' / (entry['slug'] + '.json')
            self.assertEqual(json.loads(path.read_text()), entry)

    def test_seed_is_idempotent_and_preserves_other_content(self):
        client = FakeClient()
        seed(client, self.entries)
        self.assertEqual(len(client.entries), 9)
        writes = client.writes
        seed(client, self.entries)
        self.assertEqual(client.writes, writes)
        self.assertEqual(client.entries['unrelated']['id'], 'other')
        changed = copy.deepcopy(self.entries)
        changed[0]['summary'] += ' Updated.'
        seed(client, changed)
        self.assertEqual(client.writes, writes + 1)
        self.assertEqual(client.entries[changed[0]['slug']]['id'], changed[0]['slug'])

    def test_java_examples_compile_and_execute(self):
        if not shutil.which('javac') or not shutil.which('java'):
            self.skipTest('JDK unavailable')
        rng = random.Random(2026)
        cases = [[], [1], [3, 2, 1], [2, 2, 2], [-3, 0, -1, 3]]
        cases += [[rng.randint(-20, 20) for _ in range(20)] for _ in range(12)]
        statements = []
        for slug in JAVA:
            method = slug.split('-')[0] + slug.split('-')[1].title()
            for values in cases:
                a = sorted(values) if slug == 'binary-search' else values
                literal = 'new int[]{' + ','.join(map(str, a)) + '}'
                if slug.endswith('search'):
                    for target in [-30, 0, 30, *a[:2]]:
                        expected = a.index(target) if target in a else -1
                        check = ('r != ' + str(expected) if slug == 'linear-search' or expected == -1 else
                                 f'r < 0 || r >= a.length || a[r] != {target}')
                        statements.append(f'{{ int[] a={literal}; int r={method}(a,{target}); if ({check}) throw new AssertionError("{slug}"); }}')
                else:
                    statements.append(f'{{ int[] a={literal}; int[] expected=a.clone(); java.util.Arrays.sort(expected); {method}(a); if (!java.util.Arrays.equals(a,expected)) throw new AssertionError("{slug}"); }}')
        source = 'public class ExampleCheck {\n' + '\n'.join(JAVA.values()) + '\npublic static void main(String[] args) {\n' + '\n'.join(statements) + '\n}}'
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'ExampleCheck.java'
            path.write_text(source)
            subprocess.run(['javac', str(path)], check=True, capture_output=True, text=True)
            subprocess.run(['java', '-cp', directory, 'ExampleCheck'], check=True, capture_output=True, text=True)


if __name__ == '__main__':
    unittest.main()
