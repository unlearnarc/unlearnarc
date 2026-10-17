import copy
import unittest

from catalog_names import course_name, skill_name
from learning_course_bank import catalog
from shorten_catalog_names import apply, plan


class FakeAPI:
    def __init__(self):
        self.rows = {
            'courses': [dict(id='course', name='Backend Development: Server and HTTP Basics',
                             imgUrl='cover', totalTime='04:00:00', topicsCount=4,
                             qusPool='pool', level='BEGINNER')],
            'skills': [dict(id='skill', name='Backend Development — Beginner Practice', level='BEGINNER')],
        }

    def call(self, method, path, payload=None):
        resource, ident = path.split('/')
        row = next(r for r in self.rows[resource] if r['id'] == ident)
        if method == 'PUT':
            row.update(copy.deepcopy(payload))
        return copy.deepcopy(row)


class NameTests(unittest.TestCase):
    def test_course_prefix_only(self):
        self.assertEqual('Server and HTTP Basics', course_name('Backend Development: Server and HTTP Basics'))
        self.assertEqual('HTTP: A Guide', course_name('HTTP: A Guide'))

    def test_short_skill_labels(self):
        self.assertEqual('System Design — Intermediate', skill_name(
            'Software Architecture & System Design — Intermediate Practice'))
        self.assertEqual('OOP', skill_name('Object-Oriented Programming'))
        self.assertEqual('RAG', skill_name('Retrieval-Augmented Generation'))
        self.assertEqual('Python', skill_name('Python'))

    def test_seed_catalog_uses_new_names(self):
        entries = catalog()
        self.assertEqual(64, len({e['name'] for e in entries}))
        self.assertEqual(64, len({e['skill'] for e in entries}))
        for entry in entries:
            self.assertNotIn(entry['domain'] + ': ', entry['name'])
            self.assertNotIn(' Practice', entry['skill'])
            self.assertLessEqual(len(entry['skill']), 32)

    def test_updates_preserve_ids_metadata_and_are_idempotent(self):
        api = FakeAPI()
        before = copy.deepcopy(api.rows)
        apply(api, plan(api.rows))
        self.assertEqual([], plan(api.rows))
        for resource in before:
            for old, new in zip(before[resource], api.rows[resource]):
                self.assertEqual({k: v for k, v in old.items() if k != 'name'},
                                 {k: v for k, v in new.items() if k != 'name'})

    def test_collision_fails_before_writes(self):
        api = FakeAPI()
        api.rows['courses'].append({**api.rows['courses'][0], 'id': 'other', 'name': 'Server and HTTP Basics'})
        with self.assertRaisesRegex(ValueError, 'collide'):
            plan(api.rows)

    def test_failure_restores_original_names(self):
        class Broken(FakeAPI):
            def call(self, method, path, payload=None):
                if method == 'PUT' and path == 'skills/skill' and payload['name'] == 'Backend — Beginner':
                    raise RuntimeError('write failed')
                return super().call(method, path, payload)
        api = Broken()
        before = copy.deepcopy(api.rows)
        with self.assertRaisesRegex(RuntimeError, 'write failed'):
            apply(api, plan(api.rows))
        self.assertEqual(before, api.rows)

    def test_concurrent_change_is_not_overwritten(self):
        api = FakeAPI()
        changes = plan(api.rows)
        api.rows['courses'][0]['name'] = 'Edited by admin'
        with self.assertRaisesRegex(RuntimeError, 'changed since preview'):
            apply(api, changes)
        self.assertEqual('Edited by admin', api.rows['courses'][0]['name'])


if __name__ == '__main__':
    unittest.main()
