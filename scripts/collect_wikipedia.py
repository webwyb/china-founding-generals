"""Batch-read public, freely licensed encyclopaedia facts and free page images.

Only a matching military biography is accepted. Ambiguous names are not joined
to a random person, and the four historical homonym pairs use distinct titles.
"""
from __future__ import annotations
import concurrent.futures
import hashlib
import json
import re
from urllib.parse import urlencode, quote
from catalog_sources import ROOT, OUT, CACHE, fetch
from build_catalog import CORRECTIONS, HOMONYM_BIRTHS, parse_facts, SIMPLIFY


def query(titles):
    url='https://zh.wikipedia.org/w/api.php?'+urlencode({'action':'query','format':'json','prop':'extracts|pageimages|pageprops','exintro':1,'explaintext':1,'exchars':1200,'exlimit':20,'piprop':'thumbnail|name','pithumbsize':480,'pilicense':'free','redirects':1,'converttitles':1,'variant':'zh-cn','titles':'|'.join(titles)})
    return json.loads(fetch(url))


def collect():
    roster=json.loads((OUT/'roster-crt.json').read_text())
    targets=[]
    for row in roster:
        name=CORRECTIONS.get(row['name'],row['name'])
        birth=HOMONYM_BIRTHS.get((name,row['grantYear']))
        title=f'{name} ({birth}年)' if birth else name
        targets.append({**row,'name':name,'title':title})
    batches=[targets[i:i+20] for i in range(0,len(targets),20)]
    accepted=[];missing=[];errors=[]
    def job(batch):
        try:
            data=query([row['title'] for row in batch]).get('query',{})
            translations={}
            for key in ['normalized','converted','redirects']:
                for item in data.get(key,[]): translations[item['from']]=item['to']
            pages={page['title']:page for page in data.get('pages',{}).values()}
            result=[]; absent=[]
            for row in batch:
                title=row['title']
                seen=set()
                while title in translations and title not in seen:
                    seen.add(title);title=translations[title]
                page=pages.get(title,{})
                text=page.get('extract','')
                record={'name':row['name'],'rank':row['rank'],'kind':'wiki','url':'https://zh.wikipedia.org/wiki/'+quote(title.replace(' ','_')),'title':title+' · 维基百科','body':text,'images':[],'ok':True,'wikiTitle':title,'targetGrantYear':row['grantYear'],'wikidata':page.get('pageprops',{}).get('wikibase_item')}
                facts=parse_facts(record)
                early_birth=re.search(r'[（(]((?:18|19|20)\d{2})',SIMPLIFY.convert(text[:150]))
                military=any(word in text[:500] for word in ['中国人民解放军','中國人民解放軍','开国少将','開國少將','开国上将','開國上將','中华人民共和国元帅','中華人民共和國元帥'])
                if not text or 'disambiguation' in page.get('pageprops',{}) or not military or (early_birth and int(early_birth[1])>1930):
                    absent.append(row);continue
                expected=HOMONYM_BIRTHS.get((row['name'],row['grantYear']))
                if expected and facts['birth']!=expected:
                    absent.append(row);continue
                if page.get('thumbnail'):
                    record['images']=[page['thumbnail']['source']]
                    record['imageFile']=page.get('pageimage','')
                key=hashlib.sha256(record['url'].encode()).hexdigest()[:24]
                (CACHE/'profiles'/f'{key}.json').write_text(json.dumps(record,ensure_ascii=False))
                result.append({k:v for k,v in record.items() if k!='body'})
            return result,absent,None
        except Exception as exc: return [],batch,str(exc)
    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
        for index,(result,absent,error) in enumerate(pool.map(job,batches)):
            accepted.extend(result);missing.extend(absent)
            if error:errors.append(error)
            print('Encyclopaedia',min((index+1)*20,len(targets)),'/',len(targets),'matched',len(accepted),'unresolved',len(missing),flush=True)
            (OUT/'wiki-matches.json').write_text(json.dumps(accepted,ensure_ascii=False,indent=2))
            (OUT/'wiki-unresolved.json').write_text(json.dumps(missing,ensure_ascii=False,indent=2))
    (OUT/'wiki-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
    print('Wiki completed:',len(accepted),'matched;',len(missing),'unresolved; errors',len(errors),flush=True)


if __name__=='__main__':collect()
