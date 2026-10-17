#!/usr/bin/env python3
"""Generate deterministic, local previews from the REAL admin inventory.

Default is preview-only. --apply PATCHes only missing thumbnail references;
never POSTs scenes, regenerates traces, or overwrites authored media references.
Credentials: ADMIN_TOKEN or ADMIN_EMAIL + ADMIN_PASS in the environment.
"""
import argparse
from html import escape
import json
import os
from pathlib import Path
import re
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / 'student/public/images/animations'


def text(x, y, value, size=13):
    return f'<text x="{x}" y="{y}" font-size="{size}" text-anchor="middle">{escape(str(value))}</text>'


def box(x, y, label, w=100, active=False, h=34):
    return f'<rect class="{"active" if active else "box"}" x="{x}" y="{y}" width="{w}" height="{h}" rx="6"/>' + text(x + w / 2, y + h / 2 + 4, label)


def line(x, y, x2, y2, active=False):
    return f'<path class="{"path-active" if active else "edge"}" d="M{x} {y} L{x2} {y2}"/>'


def table(x, y, heading, rows, w=138, selected=0):
    return box(x, y, heading, w, True) + ''.join(box(x, y + 35 + i * 29, row, w, i == selected, 28) for i, row in enumerate(rows))


def diagram(scene):
    """Specific diagrams for the existing lessons; future records use trace geometry."""
    slug = scene['slug']
    if slug in ('sql-inner-join', 'sql-join-query-walkthrough'):
        walk = slug.endswith('walkthrough')
        s = table(24, 26, 'users', ['1 · Ana', '2 · Ben', '3 · Cy'])
        s += table(318, 26, 'orders', ['1 · Book', '2 · Pen', '5 · Lamp'])
        s += line(164, 75, 316, 75, True) + line(164, 104, 316, 104, True)
        s += box(178, 154, '1 · Ana · Book', 124, True, 26)
        s += box(178, 182, '2 · Ben · Pen', 124, True, 26)
        if walk:
            s += ''.join(box(40 + i * 112, 231, label, 100, i == 2, 24) for i, label in enumerate(['SELECT', 'FROM', 'JOIN', 'WHERE']))
        else:
            s += line(240, 108, 240, 150, True)
        return s
    if slug.startswith('atomic-cas-'):
        count = 5 if '5-threads' in slug else 3
        xs = [48 + i * (384 / (count - 1)) for i in range(count)]
        return ''.join(line(x, 185, 240, 78, i == 1) for i, x in enumerate(xs)) + box(175, 38, 'counter: 1 → 2', 130, True, 40) + ''.join(box(x - 28, 185, f'T{i + 1}', 56, i == 1) for i, x in enumerate(xs)) + text(240, 147, 'CAS(1, 2)')
    if slug == 'graph-bfs-traversal':
        points = [(65, 65), (230, 45), (415, 70), (150, 165), (340, 165), (245, 230)]
        edges = [(0, 1), (0, 3), (1, 2), (1, 4), (3, 4), (4, 5), (2, 4)]
        s = ''.join(line(*points[a], *points[b], i < 3) for i, (a, b) in enumerate(edges))
        return s + ''.join(f'<circle class="{"active" if i < 4 else "box"}" cx="{x}" cy="{y}" r="19"/>' + text(x, y + 4, chr(65 + i)) for i, (x, y) in enumerate(points))
    if slug == 'leetcode-two-sum':
        return ''.join(box(65 + i * 90, 88, v, 72, i < 2, 48) for i, v in enumerate([2, 7, 11, 15])) + '<path class="path-active" d="M101 145 v35 h90 v-35"/>' + text(146, 210, '2 + 7 = 9') + text(281, 62, 'seen[2] = 0')
    if slug == 'request-routing-load-balancer':
        return line(114, 134, 184, 134, True) + line(296, 134, 368, 65) + line(296, 134, 368, 200, True) + box(20, 115, 'Client', 94, False, 38) + box(184, 115, 'Balancer', 112, True, 38) + box(368, 46, 'Primary', 94, False, 38) + box(368, 181, 'Replica', 94, True, 38)
    if slug == 'matrix-multiply-dot-products':
        def matrix(x, values, selected):
            return ''.join(box(x + c * 38, 88 + r * 38, values[r][c], 34, (r, c) in selected, 34) for r in range(2) for c in range(2))
        return matrix(35, [[1, 2], [3, 4]], [(0, 0), (0, 1)]) + text(155, 130, '×', 22) + matrix(192, [[5, 6], [7, 8]], [(0, 0), (1, 0)]) + text(310, 130, '=', 22) + matrix(350, [[19, 22], [43, 50]], [(0, 0)]) + text(240, 209, '1 × 5 + 2 × 7 = 19')
    if slug == 'authored-hello-pulse':
        return '<path class="edge" stroke-dasharray="6 6" d="M75 135 H405"/>' + ''.join(f'<circle class="{"active" if i == 1 else "box"}" cx="{x}" cy="135" r="{18 + i * 5}"/>' + text(x, 139, 'A') for i, x in enumerate([75, 240, 405]))
    # New lessons still get a faithful static preview from their stored trace,
    # not an unrelated category image. No playback engine is run.
    trace = scene.get('trace') or {}
    frames = trace.get('keyframes') or []
    if not frames:
        raise ValueError(f"No trace available for {slug}; author a thumbnail in admin")
    frame = frames[len(frames) // 2]
    vp = trace.get('viewport') or {'width': 640, 'height': 360}
    entities = frame.get('entities') or {}
    s = ''
    for conn in (frame.get('connections') or {}).values():
        a, b = entities.get(conn.get('from')), entities.get(conn.get('to'))
        if a and b:
            s += line(a['x'], a['y'], b['x'], b['y'])
    for e in entities.values():
        x, y = e.get('x', 0), e.get('y', 0)
        meta = e.get('meta') or {}
        if e.get('shape') == 'table':
            s += table(x, y, meta.get('title', ''), [' · '.join(map(str, row)) for row in meta.get('rows', [])[:4]], e.get('width', 138))
        elif e.get('radius'):
            s += f'<circle class="active" cx="{x}" cy="{y}" r="{e["radius"]}"/>' + text(x, y + 4, e.get('label', ''))
        else:
            s += box(x, y, e.get('label', ''), e.get('width', 80), e.get('status') == 'ACTIVE', e.get('height', 34))
    return f'<svg x="16" y="9" width="448" height="252" viewBox="0 0 {vp["width"]} {vp["height"]}">{s}</svg>'


def svg(scene):
    return '''<svg xmlns="http://www.w3.org/2000/svg" width="480" height="270" viewBox="0 0 480 270">
<style>
:root { color-scheme:light dark; --bg:#f8faff; --surface:#fff; --soft:#eff6ff; --ink:#1e293b; --border:#94a3b8; --blue:#2563eb; }
@media(prefers-color-scheme:dark) { :root { --bg:#111827; --surface:#1e293b; --soft:#172554; --ink:#e2e8f0; --border:#64748b; --blue:#60a5fa; } }
text { fill:var(--ink); font-family:system-ui,sans-serif; stroke:none; }
.box { fill:var(--surface); stroke:var(--border); }
.active { fill:var(--soft); stroke:var(--blue); }
.edge { fill:none; stroke:var(--border); }
.path-active { fill:none; stroke:var(--blue); }
rect,circle,path { stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; }
</style>
<rect width="480" height="270" fill="var(--bg)"/>
''' + diagram(scene) + '\n</svg>\n'


def api(base, token, path, method='GET', payload=None):
    req = Request(base.rstrip('/') + '/api/v1' + path, method=method,
                  data=None if payload is None else json.dumps(payload).encode(),
                  headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    with urlopen(req, timeout=30) as res:
        return json.load(res)['data']


def populate(base, token, apply=False):
    inventory = api(base, token, '/animation-scenes')  # Includes unpublished records.
    manifest_path = ASSETS / 'manifest.json'
    previous = json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    manifest = dict(previous)
    ASSETS.mkdir(parents=True, exist_ok=True)
    changed = 0
    for summary in sorted(inventory, key=lambda scene: scene['slug']):
        slug = summary['slug']
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', slug):
            raise ValueError('Unsafe scene slug')
        scene = api(base, token, '/animation-scenes/' + summary['id'])
        url = f'/images/animations/{slug}.svg'
        target = ASSETS / f'{slug}.svg'
        content = svg(scene)
        if target.exists() and target.read_text() != content and previous.get(slug, {}).get('thumbnailUrl') != url:
            raise ValueError(f'Refusing to overwrite unowned asset: {target.name}')
        if not target.exists() or target.read_text() != content:
            target.write_text(content)
        manifest[slug] = {'thumbnailUrl': url}
        if not scene.get('thumbnailUrl'):
            changed += 1
            if apply:
                api(base, token, '/animation-scenes/' + scene['id'] + '/thumbnail', 'PATCH', {'thumbnailUrl': url})
        print(f"{slug}: {scene.get('thumbnailUrl') or url}")
    serialized = json.dumps(manifest, indent=2, sort_keys=True) + '\n'
    if not manifest_path.exists() or manifest_path.read_text() != serialized:
        manifest_path.write_text(serialized)
    print(f'{len(inventory)} records inspected; {changed} missing references {"populated" if apply else "would be populated (use --apply)"}.')
    return changed


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--base', default=os.getenv('BASE', 'http://127.0.0.1:8085'))
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    token = os.getenv('ADMIN_TOKEN')
    if not token:
        email, password = os.environ.get('ADMIN_EMAIL'), os.environ.get('ADMIN_PASS')
        if not email or not password:
            parser.error('Set ADMIN_TOKEN or ADMIN_EMAIL and ADMIN_PASS')
        req = Request(args.base.rstrip('/') + '/api/v1/auth/login', data=json.dumps({'email': email, 'password': password}).encode(), headers={'Content-Type': 'application/json'})
        with urlopen(req, timeout=30) as res:
            token = json.load(res)['data']['accessToken']
    populate(args.base, token, args.apply)


if __name__ == '__main__':
    main()
