import copy
import unittest
from unittest.mock import patch

from learning_course_bank import ALIASES, CURRICULA, LEVELS, ROADMAPS, catalog, guide
from seed_learning_courses import seed, validate


class FakeAPI:
    def __init__(self):
        self.rows = {p: [] for p in ['domains', 'skills', 'courses', 'topics', 'roles',
                                    'domain-skill-mappings', 'skill-course-mappings', 'notes', 'roles/skills']}
        self.rows['domains'] = [{'id': str(i), 'name': name}
                               for i, name in enumerate(list(CURRICULA) + list(ALIASES))]
        self.writes = 0

    def call(self, method, path, payload=None):
        if method == 'POST':
            self.writes += 1
            row = {'id': 'new-' + str(self.writes), **payload}
            self.rows[path].append(row)
            return copy.deepcopy(row)
        if method != 'GET':
            raise AssertionError('Only additive writes are permitted')
        if path.startswith(('notes/admin/course/', 'notes/course/')):
            return copy.deepcopy([r for r in self.rows['notes'] if r['courseId'] == path.split('/')[-1]])
        if path.startswith('notes/'):
            return copy.deepcopy(next(r for r in self.rows['notes'] if r['id'] == path.split('/')[-1]))
        if path.startswith('roles/'):
            rid = path.split('/')[-1]
            return {'skills': [{'id': m['skillId']} for m in self.rows['roles/skills'] if m['roleId'] == rid]}
        if path.startswith('roadmap/role/'):
            rid = path.split('/')[-1]
            skills = {m['skillId'] for m in self.rows['roles/skills'] if m['roleId'] == rid}
            return {'stages': [dict(level=level, skills=[dict(courses=[{'courseId': m['courseId']}
                    for m in self.rows['skill-course-mappings'] if m['skillId'] == s['id']])
                    for s in self.rows['skills'] if s['id'] in skills and s['level'] == level])
                    for level in LEVELS]}
        return copy.deepcopy(self.rows[path])


class CourseTests(unittest.TestCase):
    def run_seed(self, api):
        with patch('builtins.print'):
            return seed(api)

    def test_complete_curriculum_and_guides(self):
        self.assertEqual(64, len(validate()))
        for e in catalog():
            text = guide(e)
            for section in ['Prerequisites', 'Learning sequence', 'Practical project', 'Completion rubric', 'Official study reference']:
                self.assertIn(section, text)
        self.assertEqual(5, len(ROADMAPS))

    def test_populate_and_idempotent_repeat(self):
        api = FakeAPI()
        first = self.run_seed(api)
        self.assertEqual(64, first['created']['courses'])
        self.assertEqual(256, first['created']['topics'])
        self.assertEqual(64, first['created']['notes'])
        self.assertEqual(5, first['created']['roles'])
        before = copy.deepcopy(api.rows)
        second = self.run_seed(api)
        self.assertEqual({}, second['created'])
        self.assertEqual(before, api.rows)

    def test_conflicting_course_fails_before_writes(self):
        api = FakeAPI()
        api.rows['courses'] = [{'id': 'conflict', 'name': catalog()[0]['name'], 'level': 'EXPERT'}]
        with self.assertRaises(ValueError):
            self.run_seed(api)
        self.assertEqual(0, api.writes)

    def test_existing_shared_skills_are_unchanged(self):
        api = FakeAPI()
        original = {'id': 'python', 'name': 'Python', 'level': 'EXPERT'}
        api.rows['skills'].append(copy.deepcopy(original))
        self.run_seed(api)
        self.assertEqual(original, api.rows['skills'][0])
        self.assertFalse(any(m['skillId'] == 'python' for m in api.rows['skill-course-mappings']))

    def test_alias_domains_reuse_courses(self):
        api = FakeAPI()
        self.run_seed(api)
        for alias, canonical in ALIASES.items():
            ids = {d['name']: d['id'] for d in api.rows['domains']}
            mapped = lambda name: {m['skillId'] for m in api.rows['domain-skill-mappings']
                                   if m['domainId'] == ids[name]}
            self.assertEqual(mapped(alias), mapped(canonical))
            self.assertEqual(4, len(mapped(alias)))

    def test_resume_partial_import(self):
        class Interrupted(FakeAPI):
            fail = True
            def call(self, method, path, payload=None):
                if method == 'POST' and self.writes == 12 and self.fail:
                    raise RuntimeError('simulated interruption')
                return super().call(method, path, payload)
        api = Interrupted()
        with self.assertRaises(RuntimeError):
            self.run_seed(api)
        api.fail = False
        self.run_seed(api)
        self.assertEqual(64, len(api.rows['courses']))
        self.assertEqual(256, len(api.rows['topics']))

    def test_missing_saved_mapping_is_detected(self):
        class Broken(FakeAPI):
            def call(self, method, path, payload=None):
                if method == 'POST' and path == 'skill-course-mappings':
                    return {'id': 'lost', **payload}
                return super().call(method, path, payload)
        with self.assertRaisesRegex(ValueError, 'missing its progression skill'):
            self.run_seed(Broken())


if __name__ == '__main__':
    unittest.main()
