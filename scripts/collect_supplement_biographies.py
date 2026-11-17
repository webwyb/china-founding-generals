"""Supplement short biographies from explicitly identified public entries.

Namesakes require name/rank and an independent birth-year or founding-period
grant match. Disambiguation and challenge pages are never traversed. Previously
collected public HTML may be reused; ordinary builds use only exported facts.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import threading
import time
from collections import Counter
from pathlib import Path
from urllib.parse import quote, urlparse

import requests
from bs4 import BeautifulSoup
from biography_content import clean

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/biography-research'
PREVIOUS = ROOT / '.cache/portrait-expansion-20261117/html'
LOCK = threading.Lock()
NEXT = 0.0
STOPPED = False
CANONICAL = {}


def text_values(value):
    if isinstance(value, list):
        return ''.join(text_values(x) for x in value)
    if not isinstance(value, dict):
        return ''
    if isinstance(value.get('text'), str):
        return value['text']
    return ''.join(text_values(v) for k, v in value.items() if k in ('text', 'content'))


def get_entry(person):
    global NEXT, STOPPED
    url = CANONICAL.get(person['id']) or 'https://bkso.baidu.com/item/' + quote(person['name'])
    raw = CACHE / 'encyclopedia-html' / (hashlib.sha256(url.encode()).hexdigest()[:20]+'.html')
    previous = PREVIOUS / raw.name
    try:
        if raw.exists() or previous.exists():
            html = (raw if raw.exists() else previous).read_text()
        else:
            with LOCK:
                if STOPPED:
                    return person['id'], {'status': 'host-stopped'}
                slot = max(time.monotonic(), NEXT)
                NEXT = slot + 1.0
            time.sleep(max(0, slot-time.monotonic()))
            with LOCK:
                if STOPPED:
                    return person['id'], {'status': 'host-stopped'}
            response = requests.get(url, timeout=(7, 20), headers={'User-Agent': 'ShanheYouming/0.1 (public historical biography source research)'})
            if response.status_code in (401, 403, 429):
                with LOCK:
                    STOPPED = True
                return person['id'], {'status': 'source-stopped', 'httpStatus': response.status_code}
            response.raise_for_status()
            html = response.content.decode('utf-8', errors='replace')
            raw.write_text(html)
        if 'window.PAGE_DATA=' not in html:
            return person['id'], {'status': 'no-public-entry'}
        data, _ = json.JSONDecoder().raw_decode(html.split('window.PAGE_DATA=', 1)[1].lstrip())
        title = clean(data.get('lemmaTitle', ''))
        if title not in {clean(person['name']), *[clean(x) for x in person.get('aliases', [])]}:
            return person['id'], {'status': 'identity-rejected', 'reason': 'different title or disambiguation'}
        abstract = text_values(data.get('abstract', []))
        description = data.get('lemmaDesc', '')
        card = data.get('card') or {}
        birth = None
        for side in ('left', 'right'):
            for field in card.get(side) or []:
                if not isinstance(field,dict):
                    continue
                if field.get('key') == 'dateOfBirth':
                    for value in field.get('data') or []:
                        if not isinstance(value,dict):
                            continue
                        year = (value.get('value') or {}).get('year')
                        if str(year).isdigit():
                            birth = int(year)
        founding = re.search(r'(195[5-9]|196[0-5])年[^。]{0,30}'+person['rank'], abstract)
        if person['rank'] not in description+abstract or (person.get('birth') and birth and person['birth'] != birth):
            return person['id'], {'status': 'identity-rejected', 'reason': 'rank or independent birth mismatch'}
        if not ((birth and birth == person.get('birth')) or (founding and (not person.get('grantYear') or int(founding[1]) == person['grantYear']))):
            return person['id'], {'status': 'identity-unconfirmed'}
        doc = BeautifulSoup(html, 'html.parser')
        paragraphs = []
        for node in doc.select('[class*="para_"]'):
            if node.find_parent(class_=re.compile('para_')):
                continue
            for noise in node.select('sup,[class*="album"],[class*="photo"],[class*="pic"]'):
                noise.decompose()
            text = re.sub(r'\[\d+(?:[-,]\d+)*\]', '', node.get_text('', strip=True))
            if text and text not in paragraphs:
                paragraphs.append(text)
        body = '\n'.join(paragraphs)
        if len(body) < 50:
            return person['id'], {'status': 'short-entry'}
        source = 'https://bkso.baidu.com/item/' + quote(person['name']) + '/' + str(data['lemmaId'])
        result = {'url': source, 'status': 'ok', 'kind': 'encyclopedia', 'title': person['name']+' · 百度百科', 'body': body, 'sha256': hashlib.sha256(body.encode()).hexdigest(), 'identity': {'name': person['name'], 'rank': person['rank'], 'sourceBirth': birth, 'catalogueBirth': person.get('birth'), 'foundingGrantMatch': bool(founding), 'lemmaId': data['lemmaId']}}
        target = CACHE / 'pages' / (hashlib.sha256(source.encode()).hexdigest()[:24]+'.json')
        target.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
        return person['id'], {'status': 'ok', 'url': source, 'title': result['title'], 'identity': result['identity']}
    except Exception as error:
        return person['id'], {'status': 'error', 'error': str(error)[:200]}


def main(ids_path=None, canonical_path=None):
    global CANONICAL
    (CACHE / 'encyclopedia-html').mkdir(exist_ok=True)
    people = json.loads((ROOT / 'src/data/catalog.generated.json').read_text())
    if canonical_path:
        CANONICAL={row['id']:row['source'] for row in json.loads(Path(canonical_path).read_text()) if row.get('identityEvidence',{}).get('titleNamesPerson') and row['source'].startswith('https://bkso.baidu.com/item/')}
    ids = set(json.loads(Path(ids_path).read_text())) if ids_path else set(json.loads((CACHE / 'gaps.json').read_text()))
    path = ROOT / 'data/catalog/biography-supplement-sources.json'
    sources = json.loads(path.read_text()) if path.exists() else {}
    plans = [p for p in people if p['id'] in ids]
    rows, counts = {}, Counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for index, (pid, result) in enumerate(pool.map(get_entry, plans), 1):
            rows[pid] = result
            counts[result['status']] += 1
            if result['status'] == 'ok':
                entry = {'url': result['url'], 'title': result['title'], 'identity': result['identity']}
                sources[pid] = [s for s in sources.get(pid, []) if s['url'] != entry['url']] + [entry]
            if index % 40 == 0 or index == len(plans):
                path.write_text(json.dumps(sources, ensure_ascii=False, indent=2)+'\n')
                (CACHE / 'supplement-status.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2)+'\n')
                print(json.dumps({'completed': index, 'total': len(plans), 'counts': dict(counts)}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--ids')
    parser.add_argument('--canonical',help='Previously identified entry URLs; each entry is rechecked before acceptance')
    args=parser.parse_args()
    main(args.ids,args.canonical)
