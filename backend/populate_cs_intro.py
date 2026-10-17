#!/usr/bin/env python3
"""Validate or add a CS module using REST only; never deletes content."""
import argparse
from collections import Counter
import json
import os
from pathlib import Path
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parent
CONTENT = ROOT / 'content/cs-fundamentals/01-introduction-to-computers.json'
EXPECTED = Counter({'EASY': 10, 'MEDIUM': 10, 'HARD': 10})


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(content):
    questions = content['questions']
    require(Counter(q['difficulty'] for q in questions) == EXPECTED,
            'Expected exactly 10 EASY, 10 MEDIUM, and 10 HARD questions.')
    require(len({q['questionText'].strip().casefold() for q in questions}) == 30,
            'Question text must be unique.')
    for q in questions:
        require(len(q['options']) == 4 and len(set(q['options'])) == 4,
                'Each question must have four distinct options.')
        require(type(q['correct']) is int and 0 <= q['correct'] < 4,
                'Each MCQ must identify one valid correct answer.')
        require(bool(q['explanation'].strip()), 'Every question needs an explanation.')
    notes = content['notes']
    require(bool(notes) and [n['noteOrder'] for n in notes] == list(range(1, len(notes) + 1)),
            'Expected nonempty, sequential lesson/activity notes.')
    require(len({n['title'].strip().casefold() for n in notes}) == len(notes),
            'Note titles must be unique.')
    require(all(n['title'].strip() and n['contentHtml'].strip() for n in notes),
            'Every note needs a title and lesson content.')
    pool = content['pool']
    require(pool['totalQuestions'] == 6 and
            [pool[k] for k in ('easyCount', 'mediumCount', 'hardCount')] == [2, 2, 2],
            'Each test must draw exactly 2 questions per difficulty.')


def load_credentials():
    # Read only the two admin values; never print credentials or JWTs.
    values = {}
    env_file = ROOT / '.env'
    if env_file.exists():
        for raw in env_file.read_text().splitlines():
            line = raw.strip().removeprefix('export ')
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                if key.strip() in ('ADMIN_EMAIL', 'ADMIN_PASSWORD'):
                    values[key.strip()] = value.strip().strip('\"\'')
    email = os.environ.get('ADMIN_EMAIL') or values.get('ADMIN_EMAIL')
    password = os.environ.get('ADMIN_PASSWORD') or values.get('ADMIN_PASSWORD')
    require(email and password, 'Set ADMIN_EMAIL and ADMIN_PASSWORD or add them to backend/.env.')
    return {'email': email, 'password': password}


class Api:
    def __init__(self, base):
        self.base = base.rstrip('/') + '/api/v1'
        self.token = None

    def call(self, method, path, body=None):
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        request = urllib.request.Request(
            self.base + path, method=method, headers=headers,
            data=json.dumps(body).encode() if body is not None else None)
        try:
            with urllib.request.urlopen(request, timeout=45) as response:
                envelope = json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(f'{method} {path}: HTTP {error.code}: '
                               + error.read().decode()[:1000]) from None
        require(envelope.get('success') is True, f'{method} {path} failed.')
        return envelope.get('data')


def unique_match(items, field, value):
    matches = [item for item in items if item.get(field) == value]
    require(len(matches) <= 1, f'Ambiguous existing {field}: {value}; no automatic overwrite.')
    return matches[0] if matches else None


def ensure_fields(saved, expected, label):
    for key, value in expected.items():
        # Jackson may normalize HH:mm:ss to HH:mm, so compare separately below.
        if key in ('time', 'totalTime'):
            actual = saved.get(key, '')
            require(seconds(actual) == seconds(value), f'{label}: unexpected {key}.')
        else:
            require(saved.get(key) == value,
                    f'{label}: existing {key} differs; refusing to overwrite.')


def seconds(value):
    parts = [int(p) for p in value.split(':')]
    require(len(parts) in (2, 3), 'Expected HH:mm or HH:mm:ss.')
    return parts[0] * 3600 + parts[1] * 60 + (parts[2] if len(parts) == 3 else 0)


def format_time(value):
    require(0 <= value < 86400, 'Course total time exceeds LocalTime capacity.')
    return f'{value // 3600:02}:{value // 60 % 60:02}:{value % 60:02}'


def question_payload(question, pool_id):
    return {
        'poolId': pool_id, 'questionText': question['questionText'],
        'questionType': 'MCQ', 'difficulty': question['difficulty'], 'points': 1,
        'explanation': question['explanation'],
        'answers': [{'answerText': text, 'isCorrect': i == question['correct'],
                     'displayOrder': i} for i, text in enumerate(question['options'])],
    }


def verify_question(saved, expected):
    ensure_fields(saved, {k: expected[k] for k in
                          ('questionText', 'questionType', 'difficulty', 'points', 'explanation')},
                  'Question')
    require(saved.get('isActive') is True, 'Existing question is inactive; refusing to toggle it.')
    actual_answers = sorted(saved['answers'], key=lambda a: a['displayOrder'])
    require([{k: answer[k] for k in ('answerText', 'isCorrect', 'displayOrder')}
             for answer in actual_answers] == expected['answers'],
            'Existing answers differ; refusing to overwrite.')


def apply(content, api):
    api.token = api.call('POST', '/auth/login', load_credentials())['accessToken']
    course = unique_match(api.call('GET', '/courses'), 'name', content['course']['name'])
    if course is None:
        course = api.call('POST', '/courses', content['course'])
        print('Created course:', course['id'], flush=True)
    course_id = course['id']
    topics = api.call('GET', '/topics/course/' + course_id)
    topic = unique_match(topics, 'name', content['topic']['name'])
    topic_body = {**content['topic'], 'courseId': course_id}
    if topic is None:
        require(not any(t['topicOrder'] == topic_body['topicOrder'] for t in topics),
                f"Topic order {topic_body['topicOrder']} is occupied; refusing to move existing topics.")
        topic = api.call('POST', '/topics', topic_body)
        print('Created topic:', topic['id'], flush=True)
    else:
        ensure_fields(topic, topic_body, 'Topic')
    topic_id = topic['id']

    note_ids = []
    existing_notes = api.call('GET', '/notes/admin/topic/' + topic_id)
    for lesson in content['notes']:
        body = {**lesson, 'topicId': topic_id, 'blocksJson': '[]', 'isPublished': True}
        note = unique_match(existing_notes, 'title', lesson['title'])
        if note is None:
            note = api.call('POST', '/notes', body)
            print('Created published note:', note['id'], lesson['title'], flush=True)
        else:
            note = api.call('GET', '/notes/' + note['id'])
            ensure_fields(note, {k: v for k, v in body.items() if k != 'contentHtml'}, 'Note')
            # Compare rendered text, allowing the server's HTML sanitizer to normalize markup.
            require(plain_text(note['contentHtml']) == plain_text(body['contentHtml']),
                    'Existing note text differs; refusing to overwrite.')
        note_ids.append(note['id'])

    pool = unique_match(api.call('GET', '/question-pools'), 'name', content['pool']['name'])
    if pool is None:
        pool = api.call('POST', '/question-pools', content['pool'])
        print('Created question pool:', pool['id'], flush=True)
    else:
        ensure_fields(pool, content['pool'], 'Pool')
    require(pool['isActive'] is True, 'Existing pool is inactive; refusing to toggle it.')
    pool_id = pool['id']
    existing_questions = api.call('GET', '/questions/pool/' + pool_id)
    wanted = {q['questionText'] for q in content['questions']}
    require(all(q['questionText'] in wanted for q in existing_questions),
            'Pool contains unrelated questions; refusing to modify it.')
    missing = []
    for question in content['questions']:
        body = question_payload(question, pool_id)
        saved = unique_match(existing_questions, 'questionText', question['questionText'])
        if saved is None:
            missing.append(body)
        else:
            verify_question(saved, body)
    if missing:
        api.call('POST', '/questions/bulk', missing)
        print('Created questions:', len(missing), flush=True)

    mapped = api.call('GET', '/question-pools/by-topic/' + topic_id)
    require(all(p['id'] == pool_id for p in mapped),
            'Topic has another pool; refusing to change its test selection.')
    if not any(p['id'] == pool_id for p in mapped):
        api.call('POST', '/question-pools/map', {'poolId': pool_id, 'topicId': topic_id})

    # Keep catalog counters in sync with actual topics, preserving other course fields.
    topics = api.call('GET', '/topics/course/' + course_id)
    total_time = format_time(sum(seconds(t['time']) for t in topics))
    if course['topicsCount'] != len(topics) or seconds(course['totalTime']) != seconds(total_time):
        body = {k: course[k] for k in ('name', 'imgUrl', 'level')}
        if course.get('qusPool') is not None:
            body['qusPool'] = course['qusPool']
        body.update(topicsCount=len(topics), totalTime=total_time)
        api.call('PUT', '/courses/' + course_id, body)

    # Read back the persisted content rather than trusting create responses.
    saved_questions = api.call('GET', '/questions/pool/' + pool_id)
    require(Counter(q['difficulty'] for q in saved_questions if q['isActive']) == EXPECTED,
            'Persisted difficulty distribution is incorrect.')
    require(len(saved_questions) == 30, 'Expected exactly 30 persisted questions.')
    for question in content['questions']:
        saved = unique_match(saved_questions, 'questionText', question['questionText'])
        require(saved is not None, 'Question missing after save.')
        verify_question(saved, question_payload(question, pool_id))
    published = api.call('GET', '/notes/topic/' + topic_id)
    require(set(note_ids).issubset({n['id'] for n in published}), 'Published notes missing.')
    for lesson, note_id in zip(content['notes'], note_ids):
        saved = api.call('GET', '/notes/' + note_id)
        require(plain_text(saved['contentHtml']) == plain_text(lesson['contentHtml']),
                'Saved note text does not match the authored lesson.')
    ensure_fields(api.call('GET', '/question-pools/' + pool_id), content['pool'], 'Saved pool')
    generated = []
    for _ in range(5):
        # Resolve by topic, exactly as learners do (not an explicit pool override).
        session = api.call('POST', '/tests/generate', {'scopeType': 'TOPIC', 'entityId': topic_id})
        require(session['poolId'] == pool_id, 'Topic resolved to the wrong pool.')
        require(len(session['questions']) == session['totalQuestions'] == 6,
                'Generated test must have six questions.')
        require(Counter(q['difficulty'] for q in session['questions']) ==
                Counter({'EASY': 2, 'MEDIUM': 2, 'HARD': 2}), 'Generated test split is incorrect.')
        require(len({q['id'] for q in session['questions']}) == 6,
                'Generated test contains duplicate questions.')
        require(all('isCorrect' not in a for q in session['questions'] for a in q['answers']),
                'Test generation exposed correct-answer flags.')
        generated.append([q['id'] for q in session['questions']])
    saved_course = api.call('GET', '/courses/' + course_id)
    require(saved_course['topicsCount'] == len(topics), 'Course topic count is inconsistent.')
    require(seconds(saved_course['totalTime']) == seconds(total_time), 'Course duration is inconsistent.')
    return {'baseUrl': api.base, 'courseId': course_id, 'courseName': saved_course['name'],
            'topicId': topic_id, 'topicName': topic['name'], 'noteIds': note_ids,
            'poolId': pool_id, 'questionCount': 30, 'questionsPerDifficulty': dict(EXPECTED),
            'questionsPerTest': 6, 'testDistribution': {'EASY': 2, 'MEDIUM': 2, 'HARD': 2},
            'verifiedGeneratedTests': len(generated),
            'distinctVerifiedTestSets': len({tuple(sorted(ids)) for ids in generated})}


def plain_text(markup):
    from html.parser import HTMLParser

    class Text(HTMLParser):
        def __init__(self):
            super().__init__(convert_charrefs=True)
            self.parts = []

        def handle_data(self, data):
            self.parts.append(data)

    parser = Text()
    parser.feed(markup)
    return ' '.join(' '.join(parser.parts).split())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--content', type=Path, default=CONTENT,
                        help='Module JSON path; defaults to Introduction to Computers.')
    parser.add_argument('--apply', action='store_true', help='Write content through the running API.')
    parser.add_argument('--base', default='http://localhost:8085', help='Backend origin, without /api/v1.')
    parser.add_argument('--report', type=Path, help='Optional output path for verified IDs (no credentials).')
    args = parser.parse_args()
    content = json.loads(args.content.read_text())
    validate(content)
    print(f"Content validated: 1 topic, {len(content['notes'])} notes, "
          '30 questions (10/10/10), tests 6 (2/2/2).')
    if not args.apply:
        print('Dry run only: no API calls or database changes. Use --apply to populate.')
        return
    require(args.base.startswith(('http://localhost:', 'http://127.0.0.1:', 'https://')),
            'Use local HTTP or HTTPS; never transmit admin credentials over remote plain HTTP.')
    report = apply(content, Api(args.base))
    if args.report:
        args.report.write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    try:
        main()
    except (ValueError, RuntimeError, OSError, KeyError) as error:
        print(f'Stopped: {error}\nNo automatic deletion or rollback was attempted. '
              'Rerun to reconcile matching records after resolving the error.', file=sys.stderr)
        sys.exit(1)
