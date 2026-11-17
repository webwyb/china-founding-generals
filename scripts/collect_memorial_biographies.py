"""Read the memorial's older full-biography index, with identity checks.

Raw pages stay ignored. Ambiguous names require an independently matching
birth year. Public access denials stop collection rather than being bypassed.
"""
import concurrent.futures
import hashlib
import json
import re
import time
from collections import Counter
from pathlib import Path

import requests
from bs4 import BeautifulSoup
from biography_content import clean
from collect_biography_sources import CACHE, get_article, BLOCKED

ROOT = Path(__file__).resolve().parents[1]


def main():
    people = json.loads((ROOT/'src/data/catalog.generated.json').read_text())
    names = {}
    for p in people:
        names.setdefault(clean(p['name']), []).append(p)
    index_cache = CACHE.parent/'memorial-index'
    index_cache.mkdir(exist_ok=True)
    links = {}
    for page in range(1, 15):
        path = index_cache/f'2872-{page}.html'
        if not path.exists():
            response = requests.get(f'https://www.krzzjn.com/list-2872-{page}.html', timeout=25)
            if response.status_code in (401,403,429):
                print(json.dumps({'status':'stopped','httpStatus':response.status_code}), flush=True)
                return
            response.raise_for_status()
            path.write_bytes(response.content)
            time.sleep(.6)
        doc = BeautifulSoup(path.read_bytes(), 'html.parser')
        for node in doc.select('a[href]'):
            href = node['href']
            if not re.fullmatch(r'/show-2872-\d+\.html', href):
                continue
            title = clean(node.get_text('',strip=True))
            match = re.search(r'开国少将[：:\-—－]*([\u4e00-\u9fff·]{2,5})$',title)
            if match and match[1] in names:
                links['https://www.krzzjn.com'+href] = match[1]
    output, counts = {}, Counter()
    sources = [{'url':url,'kind':'memorial-prose'} for url in links]
    # The same article container is used by both generations of this site.
    def fetch(source):
        return get_article({**source,'kind':'memorial'})
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for index, article in enumerate(pool.map(fetch, sources),1):
            if article['status'] != 'ok':
                counts[article['status']] += 1
                continue
            name = links[article['url']]
            candidates = names[name]
            body = clean(article['body'])
            matches = [p for p in candidates if p['rank']=='少将' and (len(candidates)==1 or (p.get('birth') and re.search(str(p['birth'])+r'年.{0,18}(?:出生|生于)|(?:出生|生于).{0,8}'+str(p['birth']),body)))]
            if len(matches)!=1 or not re.search(re.escape(name)+r'.{0,80}(?:少将|出生|生于)',body):
                counts['identity-unconfirmed'] += 1
                continue
            person = matches[0]
            article['kind'] = 'memorial-prose'
            target = CACHE/(hashlib.sha256(article['url'].encode()).hexdigest()[:24]+'.json')
            target.write_text(json.dumps(article,ensure_ascii=False,indent=2)+'\n')
            output.setdefault(person['id'],[]).append({'url':article['url'],'title':article['title'],'identity':{'name':name,'rank':'少将','uniqueCatalogueName':len(candidates)==1,'catalogueBirth':person.get('birth'),'indexCategory':2872}})
            counts['ok'] += 1
            if index%50==0:
                print(json.dumps({'completed':index,'total':len(sources),'counts':dict(counts)},ensure_ascii=False),flush=True)
    (CACHE.parent/'memorial-supplements.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'total':len(sources),'counts':dict(counts),'stoppedHosts':sorted(BLOCKED)},ensure_ascii=False),flush=True)


if __name__=='__main__':
    main()
