"""Read publicly archived People biographies for fields absent in live sources."""
import concurrent.futures
import hashlib
import json
import threading
import time
from urllib.parse import urljoin
from catalog_sources import ROOT, OUT, CACHE, fetch, BeautifulSoup

LOCK = threading.Lock()
NEXT = 0.0


def main():
    people = json.loads((ROOT/'src/data/catalog.generated.json').read_text())
    names = {p['name'] for p in people if any(f in p['missingFields'] for f in ['hometown','birth','death','biography'])}
    links = json.loads((OUT/'profile-links.json').read_text())
    snapshots = {}
    for path in CACHE.glob('*.url'):
        if 'cdx/search/cdx' not in path.read_text() or '167909' not in path.read_text(): continue
        rows = json.loads(path.with_suffix('.html').read_text())
        for row in rows[1:]: snapshots[row[2].split('/')[-1]] = row
    if not snapshots:
        index='https://web.archive.org/cdx/search/cdx?url=dangshi.people.com.cn/GB/165617/165618/166491/167909/*&output=json&filter=statuscode:200&collapse=urlkey'
        for row in json.loads(fetch(index))[1:]:snapshots[row[2].split('/')[-1]]=row
    wanted = [p for p in links if 'dangshi.people.com.cn' in p['url'] and p['name'] in names and p['url'].split('/')[-1] in snapshots]

    def collect(entry):
        global NEXT
        row = snapshots[entry['url'].split('/')[-1]]
        url = 'https://web.archive.org/web/'+row[1]+'id_/'+row[2]
        key = hashlib.sha256(url.encode()).hexdigest()[:24]
        dest = CACHE/'profiles'/f'{key}.json'
        if dest.exists(): return json.loads(dest.read_text())
        try:
            with LOCK:
                delay = max(0, NEXT-time.monotonic())
                if delay: time.sleep(delay)
                NEXT = time.monotonic()+.6
            doc = BeautifulSoup(fetch(url), 'html.parser')
            if not doc.title or entry['name'] not in doc.title.get_text(): raise ValueError('Archived title does not match identity')
            body = doc.select_one('.wb_9') or doc.select_one('#zoom')
            if not body: raise ValueError('Archived article structure unavailable')
            text = body.get_text('\n', strip=True)
            if len(text)<30: raise ValueError('Archived body too short')
            images = []
            for img in body.select('img[src]'):
                if not img.get('alt') or entry['name'] in img.get('alt',''):
                    images.append(urljoin(row[2], img['src']))
            result = {**entry, 'url':url, 'originalSource':row[2], 'body':text, 'images':images, 'ok':True, 'archive':True}
        except Exception as exc:
            result = {**entry, 'url':url, 'ok':False, 'error':str(exc)}
        dest.write_text(json.dumps(result, ensure_ascii=False))
        return result

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for result in pool.map(collect,wanted):
            results.append(result)
            if len(results)%25==0: print('Archived biographies',len(results),'/',len(wanted),'available',sum(p['ok'] for p in results),flush=True)
    (OUT/'collection-archive.json').write_text(json.dumps([{k:v for k,v in p.items() if k!='body'} for p in results],ensure_ascii=False,indent=2))
    print('Archive complete',len(results),'available',sum(p['ok'] for p in results),flush=True)


if __name__=='__main__': main()
