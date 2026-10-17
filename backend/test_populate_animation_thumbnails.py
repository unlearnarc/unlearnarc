import copy
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET
import populate_animation_thumbnails as population


class ThumbnailPopulationTest(unittest.TestCase):
    def test_inventory_includes_unpublished_and_repeat_is_noop(self):
        records = [
            {'id': 'a', 'slug': 'sql-inner-join', 'isPublished': True},
            {'id': 'b', 'slug': 'atomic-cas-5-threads', 'isPublished': False},
            {'id': 'c', 'slug': 'graph-bfs-traversal', 'thumbnailUrl': 'https://cdn.example.org/custom.svg'},
        ]
        patches = []

        def api(base, token, path, method='GET', payload=None):
            if path == '/animation-scenes':
                return copy.deepcopy(records)
            identifier = path.split('/')[2]
            record = next(record for record in records if record['id'] == identifier)
            if method == 'PATCH':
                self.assertEqual(path, f'/animation-scenes/{identifier}/thumbnail')
                patches.append(payload)
                record.update(payload)
            return copy.deepcopy(record)

        with tempfile.TemporaryDirectory() as directory, patch.object(population, 'ASSETS', Path(directory)), patch.object(population, 'api', api):
            self.assertEqual(population.populate('base', 'token', True), 2)
            before = {p.name: p.read_bytes() for p in Path(directory).iterdir()}
            self.assertEqual(population.populate('base', 'token', True), 0)
            self.assertEqual(len(patches), 2)
            self.assertEqual(before, {p.name: p.read_bytes() for p in Path(directory).iterdir()})
            self.assertEqual(records[2]['thumbnailUrl'], 'https://cdn.example.org/custom.svg')
            for p in Path(directory).glob('*.svg'):
                ET.parse(p)
            self.assertEqual(len(json.loads((Path(directory) / 'manifest.json').read_text())), 3)

    def test_existing_lessons_have_distinct_valid_lightweight_assets(self):
        slugs = ['sql-inner-join', 'sql-join-query-walkthrough', 'atomic-cas-3-threads', 'atomic-cas-5-threads', 'graph-bfs-traversal', 'leetcode-two-sum', 'request-routing-load-balancer', 'matrix-multiply-dot-products', 'authored-hello-pulse']
        assets = [population.svg({'slug': slug}) for slug in slugs]
        self.assertEqual(len(set(assets)), len(slugs))
        for asset in assets:
            ET.fromstring(asset)
            self.assertLess(len(asset), 12000)
            self.assertNotIn('<animate', asset)
            self.assertIn('prefers-color-scheme:dark', asset)


if __name__ == '__main__':
    unittest.main()
