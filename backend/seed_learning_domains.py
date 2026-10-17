#!/usr/bin/env python3
"""Additive, repeatable learner domain/skill catalog; standard library only."""
import argparse
import json
import os
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

# Shared skills have one recommended entry level, not a learner proficiency score.
SKILL_GROUPS = {
    'BEGINNER': '''Computer Basics|Internet Safety|Command Line|Git|GitHub|Problem Solving|Python|Java|HTML|CSS|SQL|Linux|Networking|Statistics|Data Visualization|Software Testing|Technical Communication|Debugging''',
    'INTERMEDIATE': '''JavaScript|TypeScript|Data Structures|Algorithms|Object-Oriented Programming|Time and Space Complexity|Unit Testing|HTTP|REST APIs|Web Accessibility|Responsive Design|Browser Developer Tools|React|Node.js|Express.js|PostgreSQL|Database Design|Transactions|Query Optimization|Integration Testing|API Testing|Playwright|CI/CD|Docker|AWS|Azure|Cloud Networking|Cloud IAM|Application Security|OWASP Top 10|Authentication and Authorization|Pandas|NumPy|Data Cleaning|Exploratory Data Analysis|Data Modeling|ETL Pipelines|Android|Kotlin|Flutter|Dart|Mobile App Testing|Agile Development|Code Review|Design Patterns|Observability|API Design''',
    'ADVANCED': '''Spring Boot|Microservices|System Design|Distributed Systems|Caching|Message Queues|Kubernetes|Terraform|Cloud Security|Site Reliability Engineering|Performance Testing|Threat Modeling|Secure Coding|Machine Learning|Model Evaluation|Feature Engineering|Deep Learning|LLM Fundamentals|Retrieval-Augmented Generation|AI Evaluation|Responsible AI|Spark|Data Orchestration|Data Quality|Mobile App Architecture''',
}
DOMAIN_SPECS = [
    ('Computer & Programming Foundations', 'Computer Basics|Internet Safety|Command Line|Git|GitHub|Problem Solving|Python|Debugging|Technical Communication|Unit Testing'),
    ('Data Structures & Algorithms', 'Problem Solving|Python|Java|Data Structures|Algorithms|Time and Space Complexity|Object-Oriented Programming|Debugging|Unit Testing'),
    ('Frontend Development', 'HTML|CSS|JavaScript|TypeScript|Responsive Design|Web Accessibility|HTTP|Browser Developer Tools|React|Unit Testing|Playwright|Git'),
    ('Backend Development', 'Java|Python|Node.js|Express.js|Object-Oriented Programming|HTTP|REST APIs|SQL|Spring Boot|Authentication and Authorization|Unit Testing|Microservices'),
    ('Full Stack Development', 'HTML|CSS|JavaScript|TypeScript|React|Node.js|REST APIs|PostgreSQL|Authentication and Authorization|Integration Testing|Docker|Git'),
    ('Databases & SQL', 'SQL|PostgreSQL|Database Design|Data Modeling|Transactions|Query Optimization|Python|ETL Pipelines|Caching|Data Quality'),
    ('Software Testing & QA', 'Software Testing|Debugging|Unit Testing|Integration Testing|API Testing|Playwright|CI/CD|Performance Testing|Git|Technical Communication'),
    ('DevOps', 'Linux|Command Line|Git|Networking|Docker|CI/CD|Kubernetes|Terraform|Observability|Site Reliability Engineering|Python'),
    ('Cloud Computing', 'Linux|Networking|AWS|Azure|Cloud Networking|Cloud IAM|Docker|Terraform|Kubernetes|Cloud Security|Observability'),
    ('Cybersecurity', 'Internet Safety|Linux|Networking|HTTP|Application Security|OWASP Top 10|Authentication and Authorization|Threat Modeling|Secure Coding|Cloud Security|Python'),
    ('Data Analytics', 'SQL|Python|Statistics|Data Cleaning|Pandas|Exploratory Data Analysis|Data Visualization|Data Modeling|Technical Communication|Data Quality'),
    ('Data Science', 'Python|SQL|Statistics|NumPy|Pandas|Data Cleaning|Exploratory Data Analysis|Data Visualization|Feature Engineering|Machine Learning|Model Evaluation|Responsible AI'),
    ('AI & Machine Learning', 'Python|Statistics|NumPy|Pandas|Machine Learning|Model Evaluation|Deep Learning|LLM Fundamentals|Retrieval-Augmented Generation|AI Evaluation|Responsible AI|REST APIs'),
    ('Data Engineering', 'Python|SQL|Linux|PostgreSQL|Data Modeling|ETL Pipelines|Spark|Data Orchestration|Data Quality|Docker|AWS|Observability'),
    ('Mobile Development', 'Git|HTTP|REST APIs|Kotlin|Android|Dart|Flutter|Authentication and Authorization|Mobile App Testing|Mobile App Architecture|Web Accessibility'),
    ('Software Architecture & System Design', 'Object-Oriented Programming|Database Design|API Design|Design Patterns|System Design|Distributed Systems|Caching|Message Queues|Microservices|Observability|Application Security|Technical Communication'),
]


def catalog():
    levels = {}
    for level, names in SKILL_GROUPS.items():
        for name in names.split('|'):
            if name.casefold() in levels:
                raise ValueError('Duplicate skill definition: ' + name)
            levels[name.casefold()] = level
    result = []
    for name, names in DOMAIN_SPECS:
        skills = [{'name': skill, 'level': levels[skill.casefold()]}
                  for skill in names.split('|')]
        if len({s['name'].casefold() for s in skills}) != len(skills):
            raise ValueError('Duplicate domain skill: ' + name)
        result.append({'name': name, 'skills': skills})
    return result


class API:
    def __init__(self, base):
        self.base = base.rstrip('/') + '/api/v1/'
        self.token = None

    def call(self, method, path, payload=None):
        headers = {'Content-Type': 'application/json'}
        if self.token:
            headers['Authorization'] = 'Bearer ' + self.token
        request = Request(self.base + path,
                          data=None if payload is None else json.dumps(payload).encode(),
                          headers=headers, method=method)
        for attempt in range(4):
            try:
                with urlopen(request, timeout=30) as response:
                    body = json.load(response)
                break
            except HTTPError as exc:
                if exc.code == 429 and attempt < 3:
                    retry = exc.headers.get('Retry-After', '60')
                    delay = int(retry) if retry.isdigit() else 60
                    print(f'API rate limit: waiting {delay}s before retry.', flush=True)
                    time.sleep(max(1, delay))
                    continue
                # Do not log response bodies from authentication endpoints.
                raise RuntimeError(f'{method} {path} failed (HTTP {exc.code})') from None
        if body.get('success') is not True:
            raise RuntimeError(f'{method} {path} returned an unsuccessful response')
        # Mapping endpoints legitimately return a successful void envelope.
        return body.get('data')


def index_names(rows):
    index = {}
    for row in rows:
        index.setdefault(row['name'].strip().casefold(), []).append(row)
    return index


def seed(api):
    domains = index_names(api.call('GET', 'domains'))
    skills = index_names(api.call('GET', 'skills'))
    mappings = {(m['domainId'], m['skillId'])
                for m in api.call('GET', 'domain-skill-mappings')}
    added = {'domains': 0, 'skills': 0, 'mappings': 0}
    expected = set()
    for domain in catalog():
        key = domain['name'].casefold()
        candidates = domains.get(key, [])
        if len(candidates) > 1:
            raise ValueError('Ambiguous existing domain: ' + domain['name'])
        if not candidates:
            candidates = [api.call('POST', 'domains', {'name': domain['name']})]
            domains[key] = candidates
            added['domains'] += 1
        domain_id = candidates[0]['id']
        for skill in domain['skills']:
            key = skill['name'].casefold()
            candidates = skills.get(key, [])
            if not candidates:
                candidates = [api.call('POST', 'skills', skill)]
                skills[key] = candidates
                added['skills'] += 1
            # Reuse existing levels without changing content used by courses.
            # Prefer the recommended level, otherwise choose deterministically.
            chosen = sorted(candidates, key=lambda s: (s['level'] != skill['level'], s['id']))[0]
            pair = (domain_id, chosen['id'])
            if pair not in mappings:
                api.call('POST', 'domain-skill-mappings',
                         {'domainId': pair[0], 'skillId': pair[1]})
                mappings.add(pair)
                added['mappings'] += 1
            expected.add(pair)
    saved = {(m['domainId'], m['skillId'])
             for m in api.call('GET', 'domain-skill-mappings')}
    if not expected <= saved:
        raise RuntimeError('Verification failed: expected domain/skill mappings are missing')
    return {'created': added, 'verifiedMappings': len(expected), 'catalogDomains': len(catalog())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default=os.getenv('BASE', 'http://localhost:8085'))
    parser.add_argument('--check', action='store_true', help='Validate catalog without network or DB writes')
    args = parser.parse_args()
    entries = catalog()
    if args.check:
        print(json.dumps({'domains': len(entries),
                          'skills': len({s['name'] for d in entries for s in d['skills']}),
                          'mappings': sum(len(d['skills']) for d in entries)}, indent=2))
        return
    target = urlparse(args.base)
    if target.scheme not in ('http', 'https') or not target.hostname:
        parser.error('Use an HTTP(S) backend URL')
    if target.hostname not in ('localhost', '127.0.0.1', '::1'):
        parser.error('This seed is restricted to the local backend')
    api = API(args.base)
    login = api.call('POST', 'auth/login', {
        'email': os.getenv('ADMIN_EMAIL', 'unlearnarc@gmail.com'),
        'password': os.getenv('ADMIN_PASS', 'Admin@123'),
    })
    api.token = login['accessToken']
    print(json.dumps(seed(api), indent=2))


if __name__ == '__main__':
    try:
        main()
    except (RuntimeError, ValueError, KeyError, URLError) as exc:
        raise SystemExit(str(exc)) from None
