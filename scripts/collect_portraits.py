"""Download identified article portraits, with provenance and a missing-image fallback.

Images are preserved as downloaded. Pillow is used only to verify file formats
and dimensions; this script does not reconstruct, regenerate or edit faces.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import io
import json
import threading
import time
from pathlib import Path
from urllib.parse import urlparse
import requests
from PIL import Image
from catalog_sources import ROOT, OUT

DEST=ROOT/'public/portraits'
DEST.mkdir(parents=True,exist_ok=True)
LOCK=threading.Lock()
NEXT_REQUEST={}
COOLDOWN={}
RECEIPTS=OUT.parent.parent/'.cache/catalog/portrait-receipts'
RECEIPTS.mkdir(parents=True,exist_ok=True)


def main():
    path=OUT/'portraits.json'
    manifest=json.loads(path.read_text()) if path.exists() else {}
    for file in RECEIPTS.glob('*.json'):
        entry=json.loads(file.read_text())
        if (DEST/entry['file']).exists(): manifest[file.stem]=entry
    seen={entry['sha256']:pid for pid,entry in manifest.items()}
    jobs=json.loads((OUT/'image-jobs.json').read_text())
    jobs=[job for job in jobs if job['id'] not in manifest or not (DEST/manifest[job['id']]['file']).exists()]
    jobs.sort(key=lambda job:all('wikimedia.org' in candidate['url'] for candidate in job['candidates']))
    errors=[]
    def download(job):
        messages=[]
        candidates=sorted(job['candidates'],key=lambda candidate:'wikimedia.org' in candidate['url'])
        for candidate in candidates[:4]:
            try:
                host=urlparse(candidate['url']).hostname
                group='wikimedia' if host.endswith('wikimedia.org') else host
                with LOCK:
                    if COOLDOWN.get(group,0)>time.monotonic(): raise ValueError('source temporarily rate-limited; portrait remains pending')
                    slot=max(NEXT_REQUEST.get(group,0),time.monotonic())
                    NEXT_REQUEST[group]=slot+(3.0 if group=='wikimedia' else .25)
                delay=max(0,slot-time.monotonic())
                if delay: time.sleep(delay)
                with LOCK:
                    if COOLDOWN.get(group,0)>time.monotonic(): raise ValueError('source temporarily rate-limited; portrait remains pending')
                response=requests.get(candidate['url'],timeout=(8,15),headers={'User-Agent':'ShanheYouming/0.1 (public historical catalogue research; local educational prototype)'})
                if response.status_code==429:
                    cooldown=response.headers.get('Retry-After','60')
                    with LOCK:COOLDOWN[group]=time.monotonic()+min(120,max(30,int(cooldown) if cooldown.isdigit() else 60))
                response.raise_for_status()
                data=response.content
                if len(data)>8_000_000: raise ValueError('image exceeds 8 MB')
                image=Image.open(io.BytesIO(data));width,height=image.size;image.verify()
                # Some source JPEGs carry an MPF thumbnail and Pillow identifies
                # them as MPO. Their primary JPEG is browser-readable unchanged.
                ext={'JPEG':'jpg','MPO':'jpg','PNG':'png','WEBP':'webp'}.get(image.format)
                if not ext or min(width,height)<70 or not .45<=width/height<=1.4: raise ValueError('not a usable individual portrait')
                digest=hashlib.sha256(data).hexdigest()
                with LOCK:
                    if digest in seen and seen[digest]!=job['id']: raise ValueError('same image already assigned to another person')
                    seen[digest]=job['id']
                filename=job['id']+'.'+ext
                (DEST/filename).write_bytes(data)
                entry={'file':filename,'source':candidate['source'],'downloadUrl':candidate['url'],'license':candidate['license'],'width':width,'height':height,'sha256':digest}
                (RECEIPTS/(job['id']+'.json')).write_text(json.dumps(entry,ensure_ascii=False))
                return job['id'],entry,None
            except Exception as exc:messages.append(str(exc))
        return job['id'],None,messages
    print('Portraits already collected',len(manifest),'; new candidates',len(jobs),flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        futures=[pool.submit(download,job) for job in jobs]
        for index,future in enumerate(concurrent.futures.as_completed(futures)):
            pid,entry,error=future.result()
            if entry:manifest[pid]=entry
            if error:errors.append({'id':pid,'errors':error})
            if (index+1)%25==0 or index+1==len(jobs):
                path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
                (OUT/'portrait-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
                print('Portraits',index+1,'/',len(jobs),'stored',len(manifest),'unavailable',len(errors),flush=True)
    print('Portrait collection complete:',len(manifest),flush=True)


if __name__=='__main__':main()
