"""Discover named missing portraits in bounded historical source catalogues.

Writes research HTML and candidate metadata only to .cache. Review photos and
prepare data/catalog/portrait-candidates.json before using supplement_portraits.py.
Pagination caps were checked against the source on 2026-11-17. No biographies
or reviewed facts are changed by this discovery step. TLS verification stays on.
"""
import concurrent.futures,hashlib,json,re,threading,time
from collections import Counter
from pathlib import Path
from urllib.parse import urljoin
import requests
from bs4 import BeautifulSoup
from opencc import OpenCC

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'.cache/portrait-source-discovery';OUT.mkdir(parents=True,exist_ok=True);SIMPLE=OpenCC('t2s')
def clean(s):return re.sub(r'\s+','',SIMPLE.convert(s)).replace('萧','肖')
people=json.loads((ROOT/'src/data/catalog.generated.json').read_text())
missing=[p for p in people if 'portrait' in p['missingFields']]
name_counts=Counter(clean(p['name']) for p in people)
names={clean(p['name']):p for p in missing if name_counts[clean(p['name'])]==1}
lock=threading.Lock();next_time=0;blocked=False
def fetch(url):
 global next_time,blocked
 path=OUT/(hashlib.sha256(url.encode()).hexdigest()[:20]+'.html')
 if path.exists():return path.read_text()
 with lock:
  if blocked:raise RuntimeError('Source blocked or rate-limited; stopped for this run')
  slot=max(time.monotonic(),next_time);next_time=slot+.65
 time.sleep(max(0,slot-time.monotonic()))
 with lock:
  if blocked:raise RuntimeError('Source stopped after access denial or rate limit')
 r=requests.get(url,timeout=(6,15),headers={'User-Agent':'ShanheYouming/0.1 (historical portrait provenance review)'})
 if r.status_code in (401,403,429):
  with lock:blocked=True
 r.raise_for_status();text=r.content.decode('utf-8',errors='replace');path.write_text(text,encoding='utf-8');return text
categories=[(3149,9,'中将'),(2871,10,'中将'),(3156,38,'少将'),(3157,18,'少将')]
links={}
for category,pages,rank in categories:
 if blocked:break
 for page in range(1,pages+1):
  url=f'https://www.krzzjn.com/list-{category}-{page}.html'
  try:s=BeautifulSoup(fetch(url),'html.parser')
  except Exception as e:
   print('Index unavailable',url,type(e).__name__,flush=True)
   if blocked:break
   continue
  for a in s.select(f'a[href*="show-{category}-"]'):
   title=a.get('title') or a.get_text(' ',strip=True)
   name=clean(re.split(r'[：:丨|（(]',title)[0])
   p=names.get(name)
   if p and p['rank']==rank:
    source=urljoin(url,a['href']);links.setdefault((p['id'],source),{'id':p['id'],'name':p['name'],'source':source,'sourceTitle':title,'channel':'抗日战争纪念网 · '+('中将人物名录' if category==3149 else '开国将帅资料'),'rank':rank,'index':url,'priority':0 if category==3149 else 1})
 print('Index category',category,'candidate articles',len(links),flush=True)
def extract(plan):
 try:
  text=fetch(plan['source']);s=BeautifulSoup(text,'html.parser')
  h=s.find('h1');title=h.get_text(' ',strip=True) if h else ''
  content=s.select_one('.show_l') or s.select_one('#content') or s.select_one('.content')
  if not content:return {**plan,'error':'no article content'}
  body=content.get_text(' ',strip=True)
  if clean(plan['name']) not in clean(title) or plan['rank'] not in body:return {**plan,'error':'identity or rank not explicit in article'}
  images=[]
  for image in content.select('img'):
   src=image.get('data-src') or image.get('data-url') or image.get('src','')
   if '/uploadfile/' not in src:continue
   url=urljoin(plan['source'],src)
   if url not in images:images.append(url)
  return {**plan,'sourceTitle':title,'images':images,'identityEvidence':{'title':title,'rank':plan['rank'],'pageNamesPerson':True,'sourceBodySha256':hashlib.sha256(body.encode()).hexdigest()},'license':'来源页未标明开放许可；保留原始出处，未作公共领域声明'}
 except Exception as e:return {**plan,'error':type(e).__name__}
best={}
for p in sorted(links.values(),key=lambda p:(p['priority'],p['id'])):best.setdefault(p['id'],p)
previous={p['id']:p for p in json.loads((OUT/'krzz-articles.json').read_text())} if (OUT/'krzz-articles.json').exists() else {}
for pid,p in list(best.items()):
 if pid in previous and not previous[pid].get('images'):
  alternative=next((x for x in links.values() if x['id']==pid and x['source']!=p['source']),None)
  if alternative:best[pid]=alternative
plans=list(best.values())
results=[]
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 for index,p in enumerate(pool.map(extract,plans)):
  results.append(p)
  if (index+1)%20==0:print('Article metadata',index+1,'/',len(plans),flush=True)
  (OUT/'krzz-articles.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print('Articles',len(results),'with images',sum(bool(x.get('images')) for x in results),'errors',sum('error' in x for x in results),flush=True)
