"""Read full revisions for already-matched biographies in bounded API batches.

The API supports multiple named pages in one read. No search-by-name identity
matching occurs here. Raw revisions remain research caches, not release data.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
from pathlib import Path
from urllib.parse import unquote

import requests

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/biography-research'


def plain_wikitext(value):
    value = re.sub(r'<!--.*?-->|<ref\b[^>]*>.*?</ref>|<ref\b[^>]*/>', '', value, flags=re.S | re.I)
    value = re.sub(r'\{\|.*?\|\}', '', value, flags=re.S)
    while re.search(r'\{\{[^{}]*\}\}', value):
        value = re.sub(r'\{\{[^{}]*\}\}', '', value)
    value = re.sub(r'\[\[(?:File|Image|文件|檔案|图像|圖像|Category|分类|分類):[^\n]*', '', value, flags=re.I)
    value = re.sub(r'\[\[([^\[\]]+)\]\]', lambda m: m[1].split('|')[-1], value)
    value = re.sub(r'\[https?://[^\s\]]+(?:\s+([^\]]+))?\]', lambda m: m[1] or '', value)
    value = re.sub(r"'{2,5}", '', value)
    value = re.split(r'\n={2,}\s*(?:参考|參考|外部|相关|相關|家庭|家属|家屬|亲属|親屬|子女)', value)[0]
    return re.sub(r'<[^>]+>', '', value).strip()


def collect(ids_path=None, interval=12, batch_size=40):
    (CACHE / 'pages').mkdir(parents=True, exist_ok=True)
    (CACHE / 'wiki-batches').mkdir(exist_ok=True)
    people = json.loads((ROOT / 'src/data/catalog.generated.json').read_text())
    selected = set(json.loads(Path(ids_path).read_text())) if ids_path else None
    queue = {}
    for person in people:
        if selected is not None and person['id'] not in selected:
            continue
        for source in person['sources']:
            url = source['url']
            if url.startswith('https://zh.wikipedia.org/wiki/'):
                existing = CACHE / 'pages' / (hashlib.sha256(url.encode()).hexdigest()[:24]+'.json')
                if existing.exists() and json.loads(existing.read_text()).get('kind') == 'wiki':
                    break
                title = unquote(url.split('/wiki/', 1)[1]).replace('_', ' ')
                queue[title] = url
                break
    entries = list(queue.items())
    completed = 0
    pause_file = CACHE / 'wiki-pause.json'
    if pause_file.exists():
        pause = json.loads(pause_file.read_text())
        remaining = max(0, pause['resumeAfter'] - time.time())
        if remaining:
            print(json.dumps({'respectingRetryAfterSeconds': round(remaining)}), flush=True)
            time.sleep(remaining)
    for start in range(0, len(entries), batch_size):
        batch = entries[start:start+batch_size]
        titles = '|'.join(title for title, _ in batch)
        path = CACHE / 'wiki-batches' / (hashlib.sha256(titles.encode()).hexdigest()[:24] + '.json')
        if path.exists():
            data = json.loads(path.read_text())
        else:
            response = requests.get('https://zh.wikipedia.org/w/api.php', params={
                'action': 'query', 'prop': 'revisions', 'rvprop': 'content|ids', 'rvslots': 'main',
                'titles': titles, 'redirects': 1, 'converttitles': 1, 'format': 'json', 'formatversion': 2,
            }, timeout=(8, 30), headers={'User-Agent': 'ShanheYouming/0.1 (public historical biography research; educational prototype)'})
            if response.status_code in (401, 403, 429):
                retry = response.headers.get('Retry-After', '60')
                pause_file.write_text(json.dumps({'status': response.status_code, 'resumeAfter': time.time()+max(60, int(retry) if retry.isdigit() else 60), 'retryAfter': retry}))
                print(json.dumps({'stopped': response.status_code, 'retryAfter': response.headers.get('Retry-After'), 'completed': completed}), flush=True)
                break
            response.raise_for_status()
            data = response.json()
            if data.get('error'):
                raise ValueError(data['error'])
            path.write_text(json.dumps(data, ensure_ascii=False))
            time.sleep(interval)
        query = data.get('query', {})
        mappings = {item['from']: item['to'] for kind in ('normalized', 'converted', 'redirects') for item in query.get(kind, [])}
        pages = {page['title']: page for page in query.get('pages', [])}
        for title, url in batch:
            resolved = title
            for _ in range(5):
                if resolved not in mappings:
                    break
                resolved = mappings[resolved]
            page = pages.get(resolved)
            if not page or page.get('missing'):
                continue
            revision = page.get('revisions', [{}])[0]
            text = revision.get('slots', {}).get('main', {}).get('content', '')
            if len(text) < 20:
                continue
            body = plain_wikitext(text)
            result = {'url': url, 'status': 'ok', 'kind': 'wiki', 'title': page['title']+' · 维基百科', 'revisionId': revision.get('revid'), 'body': body, 'sha256': hashlib.sha256(body.encode()).hexdigest()}
            target = CACHE / 'pages' / (hashlib.sha256(url.encode()).hexdigest()[:24]+'.json')
            target.write_text(json.dumps(result, ensure_ascii=False, indent=2)+'\n')
            completed += 1
        print(json.dumps({'requested': min(start+batch_size, len(entries)), 'total': len(entries), 'available': completed}, ensure_ascii=False), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--ids')
    parser.add_argument('--interval', type=float, default=12)
    parser.add_argument('--batch-size', type=int, default=40, choices=range(1, 51))
    args = parser.parse_args()
    collect(args.ids, args.interval, args.batch_size)
