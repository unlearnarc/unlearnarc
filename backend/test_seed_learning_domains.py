import copy
import unittest

from seed_learning_domains import catalog, seed


class FakeAPI:
    def __init__(self):
        self.rows = {'domains': [], 'skills': [], 'domain-skill-mappings': []}
        self.writes = 0

    def call(self, method, path, payload=None):
        if method == 'GET':
            return copy.deepcopy(self.rows[path])
        if method != 'POST':
            raise AssertionError('Only additive operations are allowed')
        self.writes += 1
        row = {'id': str(self.writes), **payload}
        self.rows[path].append(row)
        return copy.deepcopy(row)


class CatalogTests(unittest.TestCase):
    def test_catalog_has_unique_domains_and_valid_levels(self):
        entries = catalog()
        self.assertEqual(16, len(entries))
        self.assertEqual(len(entries), len({d['name'].casefold() for d in entries}))
        for domain in entries:
            self.assertGreaterEqual(len(domain['skills']), 9)
            self.assertTrue(any(s['level'] == 'BEGINNER' for s in domain['skills']) or
                            domain['name'] == 'Software Architecture & System Design')
            for skill in domain['skills']:
                self.assertIn(skill['level'], {'BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'})

    def test_repeat_is_idempotent(self):
        api = FakeAPI()
        first = seed(api)
        self.assertEqual(16, first['created']['domains'])
        before = copy.deepcopy(api.rows)
        result = seed(api)
        self.assertEqual({'domains': 0, 'skills': 0, 'mappings': 0}, result['created'])
        self.assertEqual(before, api.rows)

    def test_existing_content_and_levels_are_preserved(self):
        api = FakeAPI()
        api.rows['domains'] = [{'id': 'domain', 'name': ' frontend development '}]
        api.rows['skills'] = [{'id': 'html', 'name': 'html', 'level': 'EXPERT'}]
        api.rows['domain-skill-mappings'] = [
            {'id': 'mapping', 'domainId': 'domain', 'skillId': 'html'}]
        seed(api)
        self.assertEqual('EXPERT', api.rows['skills'][0]['level'])
        self.assertEqual(1, sum(s['name'].casefold() == 'html' for s in api.rows['skills']))
        self.assertEqual(1, sum(d['name'].strip().casefold() == 'frontend development'
                                for d in api.rows['domains']))

    def test_exact_level_preferred_when_multiple_exist(self):
        api = FakeAPI()
        api.rows['skills'] = [{'id': 'expert', 'name': 'HTML', 'level': 'EXPERT'},
                              {'id': 'beginner', 'name': 'HTML', 'level': 'BEGINNER'}]
        seed(api)
        ids = {m['skillId'] for m in api.rows['domain-skill-mappings']}
        self.assertIn('beginner', ids)
        self.assertNotIn('expert', ids)

    def test_ambiguous_domain_fails(self):
        api = FakeAPI()
        api.rows['domains'] = [
            {'id': 'a', 'name': 'Computer & Programming Foundations'},
            {'id': 'b', 'name': 'computer & programming foundations'}]
        with self.assertRaisesRegex(ValueError, 'Ambiguous'):
            seed(api)
        self.assertEqual(0, api.writes)

    def test_verification_detects_missing_mapping(self):
        class BrokenAPI(FakeAPI):
            def call(self, method, path, payload=None):
                result = super().call(method, path, payload)
                if method == 'GET' and path == 'domain-skill-mappings':
                    return []
                return result
        with self.assertRaisesRegex(RuntimeError, 'Verification failed'):
            seed(BrokenAPI())


if __name__ == '__main__':
    unittest.main()
