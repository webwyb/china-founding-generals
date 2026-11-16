"""Cached, bounded collection of public historical sources. No generated biographies.

Run with: PYTHONPATH=.cache/python python3 scripts/catalog_sources.py probe
"""
from __future__ import annotations

import concurrent.futures
import hashlib
import json
import re
import sys
import time
import threading
from pathlib import Path
from urllib.parse import urljoin, urlparse
from collections import Counter

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.cache/python'))
import requests
from bs4 import BeautifulSoup

CACHE = ROOT / '.cache/catalog'
CACHE.mkdir(parents=True, exist_ok=True)
OUT = ROOT / 'data/catalog'
OUT.mkdir(parents=True, exist_ok=True)
RATE_LOCK = threading.Lock()
WIKI_NEXT = 0.0


def fetch(url: str, refresh: bool = False) -> str:
    global WIKI_NEXT
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    dest = CACHE / f'{key}.html'
    if dest.exists() and not refresh:
        return dest.read_text()
    error = None
    for attempt in range(2):
        try:
            if urlparse(url).hostname in ('zh.wikipedia.org','commons.wikimedia.org','www.wikidata.org'):
                with RATE_LOCK:
                    delay=max(0,WIKI_NEXT-time.monotonic())
                    if delay: time.sleep(delay)
                    WIKI_NEXT=time.monotonic()+4.0
            response = requests.get(url, timeout=(10, 25), headers={'User-Agent':'ShanheYouming/0.1 (public historical catalogue research; local educational prototype)'})
            if response.status_code==429:
                retry=response.headers.get('Retry-After','60')
                cooldown=min(180,max(30,int(retry) if retry.isdigit() else 60))
                with RATE_LOCK: WIKI_NEXT=max(WIKI_NEXT,time.monotonic()+cooldown)
                print('Source requests throttled; respecting cooldown',cooldown,'seconds',flush=True)
            response.raise_for_status()
            content = response.content
            encoding = re.search(br'charset\s*=\s*[\"\']?([a-zA-Z0-9_-]+)', content[:10000])
            codec = encoding.group(1).decode() if encoding else response.apparent_encoding or 'utf-8'
            text = content.decode('gb18030' if codec.lower() in ('gb2312', 'gbk') else codec, errors='replace')
            dest.write_text(text)
            (CACHE / f'{key}.url').write_text(url)
            return text
        except Exception as exc:
            error = exc
            if isinstance(exc, requests.HTTPError) and exc.response.status_code in (401, 403, 404):
                break
            time.sleep(.5)
    raise RuntimeError(f'{url}: {error}')


def soup(url: str) -> BeautifulSoup:
    return BeautifulSoup(fetch(url), 'html.parser')


def probe():
    urls = [
        'https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&titles=毛和发&format=json',
        'https://www.wikidata.org/w/api.php?action=wbgetentities&sites=zhwiki&titles=毛和发&props=claims&format=json',
    ]
    def job(url):
        try:
            doc = soup(url)
            links = [{'name': a.get_text(' ', strip=True), 'url': urljoin(url, a['href'])} for a in doc.select('a[href]')]
            result = {'url': url, 'title': doc.title.get_text() if doc.title else '', 'chars': len(doc.get_text()), 'links': links, 'images': [urljoin(url, img.get('src', '')) for img in doc.select('img[src]')]}
            path = OUT / (hashlib.sha256(url.encode()).hexdigest()[:12] + '.json')
            path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
            print(json.dumps({'url':url,'chars':result['chars'],'links':len(links),'file':str(path)}, ensure_ascii=False), flush=True)
        except Exception as exc:
            print(str(exc), flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(job, urls))


def roster():
    base = 'https://crt.com.cn/news2007/news/yxbd20220324/2023/4/234313943F1GBCKK4E066CJJD0FB.html'
    headings = {'十位元帅': '元帅', '十位大将': '大将', '五十七位上将': '上将', '一百七十七位中将': '中将', '一千三百六十位少将': '少将'}
    rows = []
    rank, year = '', None
    for url in [base, base.replace('.html', '_2.html')]:
        text = soup(url).select_one('#ContentList').get_text(' ', strip=True).split('|<<')[0]
        if url == base:
            text = text[text.index('十位元帅'):]
        text = text.replace('高 锐', '高锐').replace('郭 强', '郭强')
        for part in re.split(r'(十位元帅|十位大将|五十七位上将|一百七十七位中将|一千三百六十位少将|19\d{2}年(?:授予|晋升)少将军衔)', text):
            if part in headings:
                rank = headings[part]
                year = 1955 if rank in ('元帅', '大将') else None
            elif re.fullmatch(r'19\d{2}年(?:授予|晋升)少将军衔', part):
                rank, year = '少将', int(part[:4])
            else:
                for name in part.split():
                    if not re.fullmatch(r'[\u3400-\u9fff·]{2,18}', name):
                        print('REVIEW TOKEN:', repr(name))
                        continue
                    rows.append({'name':name,'rank':rank,'grantYear':year,'rosterSource':url})
    (OUT / 'roster-crt.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    from collections import Counter
    print(json.dumps({'count':len(rows),'ranks':dict(Counter(p['rank'] for p in rows)), 'sameNames':{n:c for n,c in Counter(p['name'] for p in rows).items() if c>1}}, ensure_ascii=False), flush=True)


def clean_name(text):
    return re.sub(r'\s+', '', text).replace('‧', '·').replace('・', '·')


def discover():
    category = sys.argv[2] if len(sys.argv)>2 else '3156'
    existing = OUT / 'profile-links.json'
    profiles = {p['url']:p for p in json.loads(existing.read_text())} if existing.exists() else {}
    rank_paths = {'126780':'元帅','127855':'大将','127857':'上将','130393':'中将','167909':'少将'}
    for file in ['440edc313a95.json', '544189f3fc4e.json']:
        data = json.loads((OUT / file).read_text())
        for link in data['links']:
            url, name = link['url'], clean_name(link['name'])
            if re.search(r'people\.com\.cn/GB/.*/\d+\.html$',url) and re.fullmatch(r'[\u3400-\u9fff·]{2,18}',name):
                rank = next((rank_paths[part] for part in url.split('/') if part in rank_paths), None)
                if not rank: continue
                if 'cpc.people.com.cn' in url: url = url.replace('http:', 'https:')
                profiles[url] = {'name':name,'rank':rank,'url':url,'kind':'people'}
    print('People profile links:', len(profiles), flush=True)
    queue = {f'https://www.krzzjn.com/list-{category}-1.html'}
    visited = set()
    errors = []
    def get_list(url):
        try:
            doc = soup(url)
            entries, pages = [], set()
            for a in doc.select('a[href]'):
                dest = urljoin(url, a['href'])
                if re.fullmatch(r'https://www\.krzzjn\.com/list-'+category+r'-\d+\.html',dest): pages.add(dest)
                if re.fullmatch(r'https://www\.krzzjn\.com/show-'+category+r'-\d+\.html',dest):
                    name = clean_name(a.get_text(' ',strip=True))
                    if '——' in name: name = name.split('——')[-1]
                    if re.fullmatch(r'[\u3400-\u9fff·（）()]{2,24}',name):
                        entries.append({'name':name,'rank':'少将','url':dest,'kind':'memorial','category':category})
            return url, entries, pages, None
        except Exception as exc: return url, [], set(), str(exc)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        while queue:
            batch = sorted(queue)[:8]
            queue -= set(batch)
            for url, entries, pages, error in pool.map(get_list, batch):
                visited.add(url)
                if error: errors.append(error)
                for entry in entries: profiles[entry['url']] = entry
                queue |= pages - visited
            print('Index progress:',len(visited),'pages;',len(profiles),'profile links;',len(queue),'queued',flush=True)
            (OUT / 'profile-links.json').write_text(json.dumps(list(profiles.values()),ensure_ascii=False,indent=2))
    (OUT / 'discovery-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
    print('DISCOVERED',dict(Counter(p['kind'] for p in profiles.values())), 'errors',len(errors),flush=True)


def extract_profile(entry):
    url = entry['url']
    key = hashlib.sha256(url.encode()).hexdigest()[:24]
    target = CACHE / 'profiles' / f'{key}.json'
    target.parent.mkdir(exist_ok=True)
    if target.exists(): return json.loads(target.read_text())
    try:
        doc = soup(url)
        title = doc.title.get_text(' ',strip=True) if doc.title else ''
        if '404' in title or '页面不存在' in doc.get_text(): raise ValueError('source page unavailable')
        body = doc.select_one('#zoom') if entry['kind']=='people' else doc.select_one('.show_l')
        if not body: raise ValueError('unrecognized article structure')
        images = []
        if entry['kind']=='people':
            for image in doc.select('img[alt]'):
                if clean_name(image.get('alt','')) == clean_name(entry['name']):
                    images.append(urljoin(url,image.get('src','')))
        else:
            for image in body.select('img[src]'):
                src=urljoin(url,image['src'])
                if '/uploadfile/' in src: images.append(src)
        for tag in body.select('h1,script,style,.fenxiang,.bdsharebuttonbox'):
            tag.decompose()
        text = body.get_text('\n',strip=True).split('责任编辑：')[0]
        if len(text)<30: raise ValueError('article body too short')
        result = {**entry,'title':title,'body':text,'images':images,'ok':True}
    except Exception as exc:
        result = {**entry,'ok':False,'error':str(exc)}
    target.write_text(json.dumps(result,ensure_ascii=False))
    return result


def collect():
    selection = sys.argv[2] if len(sys.argv)>2 else 'memorial'
    entries = json.loads((OUT/'profile-links.json').read_text())
    if selection=='cpc': entries=[p for p in entries if 'cpc.people.com.cn' in p['url']]
    else: entries=[p for p in entries if p['kind']==selection]
    results=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        for i,result in enumerate(pool.map(extract_profile,entries)):
            results.append(result)
            if (i+1)%50==0 or i+1==len(entries):
                print('Profiles',selection,i+1,'/',len(entries),'available',sum(p['ok'] for p in results),flush=True)
    # Raw text is kept only in the ignored research cache. Tracked outputs contain
    # provenance and extracted facts, never a republished source database.
    (OUT/f'collection-{selection}.json').write_text(json.dumps([{k:v for k,v in p.items() if k!='body'} for p in results],ensure_ascii=False,indent=2))


if __name__ == '__main__':
    command = sys.argv[1] if len(sys.argv)>1 else 'probe'
    {'roster':roster,'discover':discover,'collect':collect,'probe':probe}[command]()
