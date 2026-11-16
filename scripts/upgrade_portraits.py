"""Stage larger originals for already identity-matched Commons portraits.

No image reconstruction or retouching. The apply step preserves every original
in the ignored review cache and records the before/after provenance.
"""
import concurrent.futures
import hashlib
import io
import json
import shutil
import sys
import threading
import time
from pathlib import Path
from urllib.parse import quote, unquote, urlencode
import requests
from PIL import Image
from catalog_sources import ROOT, OUT, fetch

STAGE=ROOT/'.cache/portrait-quality'
STAGE.mkdir(exist_ok=True)
HEADERS={'User-Agent':'ShanheYouming/0.1 (historical portrait source quality review)'}

def stage():
    manifest=json.loads((OUT/'portraits.json').read_text())
    jobs=json.loads((OUT/'image-jobs.json').read_text())
    mapping={}
    for job in jobs:
        current=manifest.get(job['id'])
        if not current or min(current['width'],current['height'])>=400:continue
        for candidate in job['candidates']:
            if '/wiki/File:' not in candidate['source']:continue
            name=unquote(candidate['source'].split('/wiki/File:',1)[1]).replace('_',' ')
            mapping.setdefault(name,[]).append(job)
    names=sorted(mapping);info={}
    for start in range(0,len(names),50):
        params={'action':'query','format':'json','prop':'imageinfo','iiprop':'url|size|extmetadata','titles':'|'.join('File:'+x for x in names[start:start+50])}
        try:data=json.loads(fetch('https://commons.wikimedia.org/w/api.php?'+urlencode(params)))
        except Exception as exc:print('Original metadata unavailable',str(exc)[:100],flush=True);continue
        for page in data.get('query',{}).get('pages',{}).values():
            for value in page.get('imageinfo',[]):info[page['title'].removeprefix('File:').replace('_',' ')]=value
        print('Original file metadata',min(start+50,len(names)),'/',len(names),flush=True)
    plans={}
    for name,items in mapping.items():
        entry=info.get(name)
        if not entry:continue
        width,height=entry['width'],entry['height']
        if not .45<=width/height<=1.4 or entry.get('size',0)>8_000_000:continue
        for job in items:
            current=manifest[job['id']]
            if min(width,height)<min(current['width'],current['height'])*1.3 or width*height<current['width']*current['height']*1.5:continue
            previous=plans.get(job['id'])
            if previous and previous['width']*previous['height']>=width*height:continue
            license=entry.get('extmetadata',{}).get('LicenseShortName',{}).get('value','See Commons file description')
            plans[job['id']]={'id':job['id'],'name':job['name'],'url':entry['url'],'source':'https://commons.wikimedia.org/wiki/File:'+quote(name.replace(' ','_')),'width':width,'height':height,'license':license}
    print('Larger identity-matched originals',len(plans),flush=True)
    lock=threading.Lock();next_request=0;cooldown=0
    def download(plan):
        nonlocal next_request,cooldown
        receipt=STAGE/(plan['id']+'.json')
        if receipt.exists():return json.loads(receipt.read_text())
        try:
            with lock:
                if cooldown>time.monotonic():raise ValueError('Source rate-limited; existing photo retained')
                slot=max(next_request,time.monotonic());next_request=slot+8
            time.sleep(max(0,slot-time.monotonic()))
            with lock:
                if cooldown>time.monotonic():raise ValueError('Source rate-limited; existing photo retained')
            response=requests.get(plan['url'],headers=HEADERS,timeout=(8,20))
            if response.status_code==429:
                with lock:cooldown=time.monotonic()+max(60,int(response.headers.get('Retry-After','60')))
            response.raise_for_status();content=response.content
            if len(content)>8_000_000:raise ValueError('Original exceeds size limit')
            image=Image.open(io.BytesIO(content));image.verify()
            ext={'JPEG':'jpg','MPO':'jpg','PNG':'png','WEBP':'webp'}.get(image.format)
            if not ext:raise ValueError('Unsupported original image format')
            filename=plan['id']+'.'+ext;(STAGE/filename).write_bytes(content)
            result={**plan,'file':filename,'sha256':hashlib.sha256(content).hexdigest()}
            receipt.write_text(json.dumps(result,ensure_ascii=False,indent=2))
            return result
        except Exception as exc:return {'id':plan['id'],'error':str(exc)}
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(download,plans.values()))
    (OUT/'portrait-quality-review.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    print('Originals staged',sum('file' in p for p in results),'unavailable',sum('error' in p for p in results),flush=True)

def apply():
    manifest=json.loads((OUT/'portraits.json').read_text())
    records=json.loads((OUT/'portrait-quality-review.json').read_text())
    history_file=ROOT/'data/design/portrait-upgrades.json'
    history=json.loads(history_file.read_text()) if history_file.exists() else []
    fingerprints={p['sha256']:pid for pid,p in manifest.items()}
    changed=0
    for item in records:
        if 'file' not in item or not item.get('approved'):continue
        pid=item['id'];old=manifest[pid]
        if item['sha256']==old['sha256']:continue
        if item['sha256'] in fingerprints and fingerprints[item['sha256']]!=pid:continue
        backup=STAGE/'previous';backup.mkdir(exist_ok=True)
        source=ROOT/'public/portraits'/old['file']
        if source.exists():shutil.copyfile(source,backup/old['file'])
        shutil.copyfile(STAGE/item['file'],ROOT/'public/portraits'/item['file'])
        entry={'file':item['file'],'source':item['source'],'downloadUrl':item['url'],'license':item['license'],'width':item['width'],'height':item['height'],'sha256':item['sha256']}
        manifest[pid]=entry
        (ROOT/'.cache/catalog/portrait-receipts'/f'{pid}.json').write_text(json.dumps(entry,ensure_ascii=False))
        history.append({'id':pid,'name':item['name'],'before':old,'after':entry})
        fingerprints[item['sha256']]=pid;changed+=1
    (OUT/'portraits.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    history_file.write_text(json.dumps(history,ensure_ascii=False,indent=2)+'\n')
    print('Higher-resolution originals applied',changed)

if __name__=='__main__':
    apply() if len(sys.argv)>1 and sys.argv[1]=='apply' else stage()
