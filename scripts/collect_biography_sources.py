"""Bounded research collection for richer biographies; raw pages stay in .cache.

Only URLs already attributed to a catalogue identity are queued. A denial or
rate-limit stops that host for this run. This command never changes life facts.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/biography-research/pages'
LOCK = threading.Lock()
NEXT: dict[str, float] = {}
BLOCKED: set[str] = set()


def get_article(source: dict) -> dict:
    url = source['url']
    host = urlparse(url).hostname or ''
    target = CACHE / (hashlib.sha256(url.encode()).hexdigest()[:24] + '.json')
    if target.exists():
        return json.loads(target.read_text())
    with LOCK:
        if host in BLOCKED:
            return {'url': url, 'status': 'host-stopped'}
        delay = max(0, NEXT.get(host, 0) - time.monotonic())
        NEXT[host] = time.monotonic() + delay + (4 if 'wikipedia' in host else .4)
    if delay:
        time.sleep(delay)
    with LOCK:
        if host in BLOCKED:
            return {'url': url, 'status': 'host-stopped'}
    result = {'url': url, 'fetchedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}
    try:
        response = requests.get(url, timeout=(8, 25), headers={
            'User-Agent': 'ShanheYouming/0.1 (public historical biography research; educational prototype)',
        })
        result['httpStatus'] = response.status_code
        if response.status_code in (401, 403, 429):
            with LOCK:
                BLOCKED.add(host)
            result.update(status='source-stopped', retryAfter=response.headers.get('Retry-After'))
        else:
            response.raise_for_status()
            charset = re.search(br'charset\s*=\s*[\"\']?([\w-]+)', response.content[:10000])
            encoding = charset[1].decode() if charset else response.apparent_encoding or 'utf-8'
            html = response.content.decode('gb18030' if encoding.lower() in ('gb2312', 'gbk') else encoding, errors='replace')
            doc = BeautifulSoup(html, 'html.parser')
            body = doc.select_one('#zoom') if source['kind'] == 'people' else doc.select_one('.show_l') if source['kind'] == 'memorial' else doc.select_one('.mw-parser-output')
            if not body:
                raise ValueError('Unrecognized article structure')
            for node in body.select('script,style,.weizhi,.share,.bianji,.mianze,.next,.mood,table,.reflist,.navbox,.mw-editsection,sup'):
                node.decompose()
            text = ('\n'.join(node.get_text('', strip=True) for node in body.select('p,li')) if source['kind'] == 'wiki' else body.get_text('\n', strip=True)).split('责任编辑：')[0]
            if len(text) < 30:
                raise ValueError('Article too short')
            result.update(status='ok', title=doc.title.get_text(' ', strip=True) if doc.title else '', body=text,
                          sha256=hashlib.sha256(text.encode()).hexdigest(), kind=source['kind'])
    except Exception as error:
        result.update(status='error', error=str(error)[:250])
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


def collect(limit=0, wiki=False, ids_path=None):
    CACHE.mkdir(parents=True, exist_ok=True)
    people = json.loads((ROOT / 'src/data/catalog.generated.json').read_text())
    records = [json.loads(line) for line in (ROOT / 'data/catalog/evidence/profiles.jsonl').read_text().splitlines()]
    known = {(r['name'], r['url']): r for r in records if not r.get('identityRejection')}
    queue = {}
    selected_ids = set(json.loads(Path(ids_path).read_text())) if ids_path else None
    for person in people:
        if selected_ids is not None and person['id'] not in selected_ids:
            continue
        candidates = []
        for source in person['sources']:
            record = known.get((person['name'], source['url']))
            if not record or record['kind'] not in ('people', 'memorial', 'wiki'):
                continue
            if (record['kind'] == 'wiki') != wiki:
                continue
            if record['url'].startswith('https://web.archive.org/'):
                continue
            candidates.append(record)
        candidates.sort(key=lambda r: {'people': 0, 'memorial': 1, 'wiki': 2}[r['kind']])
        for record in candidates[:1]:
            queue[record['url']] = record
    values = list(queue.values())[:limit or None]
    counts: dict[str, int] = {}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for index, result in enumerate(pool.map(get_article, values), 1):
            status = result['status']
            counts[status] = counts.get(status, 0) + 1
            if index % 50 == 0 or index == len(values):
                print(json.dumps({'completed': index, 'total': len(values), 'counts': counts, 'stoppedHosts': sorted(BLOCKED)}, ensure_ascii=False), flush=True)
    (CACHE.parent / 'collection-status.json').write_text(json.dumps({'sources': len(values), 'counts': counts, 'stoppedHosts': sorted(BLOCKED)}, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--wiki', action='store_true')
    parser.add_argument('--ids', help='JSON list of catalogue IDs; useful for supplementing gaps')
    args = parser.parse_args()
    collect(args.limit, args.wiki, args.ids)
