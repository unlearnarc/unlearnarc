#!/usr/bin/env python3
"""Preview or apply catalog label updates through the local backend's admin API."""
import argparse
import json
import os
from pathlib import Path
import tempfile
from urllib.parse import urlparse
from urllib.error import URLError

from catalog_names import course_name, skill_name
from seed_learning_domains import API

FIELDS = {
    'courses': ('name', 'imgUrl', 'totalTime', 'topicsCount', 'qusPool', 'level'),
    'skills': ('name', 'level'),
}


def plan(rows):
    changes = []
    for resource, rename in (('courses', course_name), ('skills', skill_name)):
        targets = {}
        for row in rows[resource]:
            name = rename(row['name'])
            key = (name.casefold(), row['level'] if resource == 'skills' else '')
            targets.setdefault(key, []).append(row)
            if name != row['name']:
                before = {field: row.get(field) for field in FIELDS[resource]}
                changes.append(dict(resource=resource, id=row['id'], before=before,
                                    after={**before, 'name': name}))
        for candidates in targets.values():
            if len(candidates) > 1 and any(rename(r['name']) != r['name'] for r in candidates):
                raise ValueError('Rename would collide: ' + candidates[0]['name'])
    return changes


def apply(api, changes):
    """Verify each write, restoring earlier names if an update or verification fails."""
    attempted = []
    try:
        for change in changes:
            path = change['resource'] + '/' + change['id']
            saved = api.call('GET', path)
            if any(saved.get(k) != v for k, v in change['before'].items()):
                raise RuntimeError('Record changed since preview: ' + path)
            # Include the current request in rollback in case its response is lost.
            attempted.append(change)
            api.call('PUT', path, change['after'])
            saved = api.call('GET', path)
            if any(saved.get(k) != v for k, v in change['after'].items()):
                raise RuntimeError('Verification failed: ' + path)
    except Exception:
        failures = []
        for change in reversed(attempted):
            path = change['resource'] + '/' + change['id']
            try:
                api.call('PUT', path, change['before'])
            except Exception:
                failures.append(path)
        if failures:
            raise RuntimeError('Restore these records from the backup: ' + ', '.join(failures)) from None
        raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default=os.getenv('BASE', 'http://localhost:8085'))
    parser.add_argument('--apply', action='store_true', help='Persist changes (default: preview only)')
    args = parser.parse_args()
    target = urlparse(args.base)
    if target.scheme not in ('http', 'https') or target.hostname not in ('localhost', '127.0.0.1', '::1'):
        parser.error('Only a local HTTP(S) backend is allowed')
    api = API(args.base)
    rows = {resource: api.call('GET', resource) for resource in FIELDS}
    changes = plan(rows)
    for change in changes:
        print(f"{change['resource']}: {change['before']['name']} -> {change['after']['name']}")
    print(json.dumps({resource: sum(c['resource'] == resource for c in changes) for resource in FIELDS}))
    if not args.apply or not changes:
        return
    email, password = os.getenv('ADMIN_EMAIL'), os.getenv('ADMIN_PASSWORD')
    if not email or not password:
        parser.error('ADMIN_EMAIL and ADMIN_PASSWORD must be supplied via environment')
    api.token = api.call('POST', 'auth/login', {'email': email, 'password': password})['accessToken']
    backup_dir = Path(tempfile.mkdtemp(prefix='unlearnarc-catalog-names-'))
    backup = backup_dir / 'changes.json'
    backup.write_text(json.dumps(changes, indent=2), encoding='utf8')
    backup.chmod(0o600)
    print('Original names and restore payloads saved to: ' + str(backup), flush=True)
    apply(api, changes)
    saved = {resource: api.call('GET', resource) for resource in FIELDS}
    if plan(saved):
        raise RuntimeError('Final verification found remaining renames; inspect backup before retrying')
    print('Verified saved names; no further updates needed.')


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, KeyError, URLError) as exc:
        raise SystemExit(str(exc)) from None
