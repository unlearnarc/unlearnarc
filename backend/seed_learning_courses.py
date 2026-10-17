#!/usr/bin/env python3
"""Add four-level guided courses and five curated roadmaps to the local catalog."""
import argparse
from collections import Counter
import json
import os
from urllib.parse import urlparse
from urllib.error import URLError

from learning_course_bank import ALIASES, CURRICULA, LEVELS, ROADMAPS, catalog, guide
from seed_learning_domains import API, index_names
from populate_cs_intro import plain_text, seconds


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate():
    entries = catalog()
    require(len(entries) == 64, 'Expected 64 courses')
    require(len({e['name'].casefold() for e in entries}) == 64, 'Duplicate course names')
    for domain in CURRICULA:
        require([e['level'] for e in entries if e['domain'] == domain] == list(LEVELS),
                'Missing progression: ' + domain)
    for e in entries:
        require(len(e['name']) <= 200, 'Course name too long')
        require(len(e['topics']) == len(set(e['topics'])) == 4, 'Expected four unique modules')
        require(all(0 < len(t) <= 200 for t in e['topics']), 'Invalid module name')
        require(e['reference'].startswith('https://') and len(e['project']) > 70,
                'Missing reference or substantive project')
        require(len(guide(e)) < 200000, 'Guide too long')
    require(len(ROADMAPS) == 5, 'Expected five roadmaps')
    require(all(d in CURRICULA for domains in ROADMAPS.values() for d in domains),
            'Unknown roadmap domain')
    return entries


def single(rows, name, label):
    matches = [r for r in rows if r['name'].strip().casefold() == name.casefold()]
    require(len(matches) <= 1, 'Ambiguous ' + label + ': ' + name)
    return matches[0] if matches else None


def same(saved, body, label):
    for key, expected in body.items():
        if key in ('time', 'totalTime'):
            equal = seconds(saved[key]) == seconds(expected)
        elif key == 'contentHtml':
            equal = plain_text(saved[key]) == plain_text(expected)
        else:
            equal = saved.get(key) == expected
        require(equal, f'{label}: existing {key} differs; refusing to overwrite')


def seed(api):
    entries = validate()
    collections = ['domains', 'skills', 'courses', 'topics', 'roles',
                   'domain-skill-mappings', 'skill-course-mappings']
    rows = {path: api.call('GET', path) for path in collections}
    # Preflight names before any writes. Existing unrelated data is never altered.
    for domain in CURRICULA:
        require(single(rows['domains'], domain, 'domain') is not None,
                'Run seed_learning_domains.py first: ' + domain)
    for e in entries:
        course = single(rows['courses'], e['name'], 'course')
        if course:
            same(course, course_body(e), e['name'])
        skill = single(rows['skills'], e['skill'], 'progression skill')
        if skill:
            require(skill['level'] == e['level'], 'Existing progression skill has a different level')
    for name in ROADMAPS:
        single(rows['roles'], name, 'role')
    added = Counter()

    def ensure(path, body, name_field='name'):
        if name_field:
            saved = single(rows[path], body[name_field], path)
        else:
            matches = [r for r in rows[path] if all(r.get(k) == v for k, v in body.items())]
            require(len(matches) <= 1, 'Duplicate existing mapping: ' + path)
            saved = matches[0] if matches else None
        if saved is None:
            saved = api.call('POST', path, body)
            rows[path].append(saved)
            added[path] += 1
        return saved

    course_ids, skill_ids = {}, {}
    for e in entries:
        course = ensure('courses', course_body(e))
        cid = course['id']
        course_ids[e['name']] = cid
        skill = ensure('skills', {'name': e['skill'], 'level': e['level']})
        skill_ids[(e['domain'], e['level'])] = skill['id']
        ensure('skill-course-mappings', {'skillId': skill['id'], 'courseId': cid}, None)
        for domain_name in [e['domain']] + [a for a, d in ALIASES.items() if d == e['domain']]:
            domain = single(rows['domains'], domain_name, 'domain')
            if domain:
                ensure('domain-skill-mappings', {'domainId': domain['id'], 'skillId': skill['id']}, None)
        for order, topic in enumerate(e['topics'], 1):
            body = dict(name=topic, time='01:00:00', topicOrder=order, level=e['level'], courseId=cid)
            candidates = [t for t in rows['topics'] if t['courseId'] == cid]
            saved = single(candidates, topic, 'topic')
            if saved:
                same(saved, body, topic)
            else:
                require(not any(t['topicOrder'] == order for t in candidates), 'Occupied topic order')
                saved = api.call('POST', 'topics', body)
                rows['topics'].append(saved)
                added['topics'] += 1
        title = 'Study guide: ' + e['name']
        body = dict(title=title, summary='Prerequisites, ordered modules, official reading, practical project and completion rubric.',
                    contentHtml=guide(e), courseId=cid, noteOrder=1, readMinutes=10,
                    blocksJson='[]', isPublished=True)
        notes = api.call('GET', 'notes/admin/course/' + cid)
        matches = [n for n in notes if n['title'] == title]
        require(len(matches) <= 1, 'Ambiguous study guide')
        if matches:
            same(api.call('GET', 'notes/' + matches[0]['id']), body, title)
        else:
            api.call('POST', 'notes', body)
            added['notes'] += 1
        print('Ready: ' + e['name'], flush=True)

    role_ids = {}
    for name, domains in ROADMAPS.items():
        description = ('Suggested domain order: ' + ' → '.join(domains) +
                       '. Within each domain complete Beginner, Intermediate, Advanced and Expert practice. '
                       'Courses are guided study plans with projects, not proof of job readiness.')
        role = ensure('roles', dict(name=name, description=description))
        role_ids[name] = role['id']
        # Use precise progression skills, not domain inheritance: shared generic skills
        # could otherwise pull unrelated courses into these focused roadmaps.
        existing = {s['id'] for s in api.call('GET', 'roles/' + role['id'])['skills']}
        for domain in domains:
            for level in LEVELS:
                sid = skill_ids[(domain, level)]
                if sid not in existing:
                    api.call('POST', 'roles/skills', dict(roleId=role['id'], skillId=sid))
                    existing.add(sid)
                    added['role-skills'] += 1

    # Verify persisted courses, ordered topics, published guides, graph mappings and stages.
    saved_courses = {c['id']: c for c in api.call('GET', 'courses')}
    saved_topics = api.call('GET', 'topics')
    saved_sc = {(m['skillId'], m['courseId']) for m in api.call('GET', 'skill-course-mappings')}
    saved_ds = {(m['domainId'], m['skillId']) for m in api.call('GET', 'domain-skill-mappings')}
    for e in entries:
        cid, sid = course_ids[e['name']], skill_ids[(e['domain'], e['level'])]
        same(saved_courses[cid], course_body(e), e['name'])
        actual = sorted([t for t in saved_topics if t['courseId'] == cid], key=lambda t: t['topicOrder'])
        require([t['name'] for t in actual] == e['topics'], 'Persisted topic sequence differs')
        require(all(t['level'] == e['level'] and seconds(t['time']) == 3600 for t in actual),
                'Persisted topic metadata differs')
        require((sid, cid) in saved_sc, 'Course missing its progression skill')
        for name in [e['domain']] + [a for a, d in ALIASES.items() if d == e['domain']]:
            domain = single(rows['domains'], name, 'domain')
            if domain:
                require((domain['id'], sid) in saved_ds, 'Domain missing its progression skill')
        published = api.call('GET', 'notes/course/' + cid)
        require(any(n['title'] == 'Study guide: ' + e['name'] and n['isPublished'] for n in published),
                'Published guide missing')
    for name, rid in role_ids.items():
        roadmap = api.call('GET', 'roadmap/role/' + rid)
        require([s['level'] for s in roadmap['stages']] == list(LEVELS), 'Roadmap needs four stages')
        for stage in roadmap['stages']:
            actual = {c['courseId'] for s in stage['skills'] for c in s['courses']}
            expected = {course_ids[e['name']] for e in entries
                        if e['domain'] in ROADMAPS[name] and e['level'] == stage['level']}
            require(expected <= actual, 'Roadmap missing courses at the correct stage')
    return dict(created=dict(added), verifiedCourses=64, verifiedTopics=256,
                verifiedPublishedGuides=64, verifiedRoadmaps=5, levels=list(LEVELS))


def course_body(e):
    # A local non-URL sentinel intentionally selects the existing gradient cover.
    return dict(name=e['name'], imgUrl='catalog-gradient', totalTime='04:00:00',
                topicsCount=4, level=e['level'])


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default=os.getenv('BASE', 'http://localhost:8085'))
    parser.add_argument('--apply', action='store_true', help='Populate the local backend; otherwise validate only')
    args = parser.parse_args()
    validate()
    if not args.apply:
        print(json.dumps(dict(courses=64, topics=256, studyGuides=64, roadmaps=5, levels=list(LEVELS)), indent=2))
        return
    url = urlparse(args.base)
    require(url.scheme in ('http', 'https') and url.hostname in ('localhost', '127.0.0.1', '::1'),
            'Only a local backend is permitted')
    api = API(args.base)
    api.token = api.call('POST', 'auth/login', {
        'email': os.getenv('ADMIN_EMAIL', 'unlearnarc@gmail.com'),
        'password': os.getenv('ADMIN_PASSWORD') or os.getenv('ADMIN_PASS', 'Admin@123'),
    })['accessToken']
    print(json.dumps(seed(api), indent=2))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, KeyError, URLError) as exc:
        raise SystemExit(str(exc)) from None
