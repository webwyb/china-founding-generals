"""Fill missing basic facts from CC0 Wikidata statements and place hierarchies.

Birthplace is labelled as such; it is never silently relabelled as ancestry.
Only entity IDs linked from a matched military biography are considered.
"""
from __future__ import annotations
import json
import re
from urllib.parse import urlencode,quote
from catalog_sources import OUT,ROOT,fetch
from build_catalog import SIMPLIFY,PROVINCES

ENTITIES={}


def get_entities(ids):
    unknown=sorted(set(ids)-ENTITIES.keys())
    for offset in range(0,len(unknown),50):
        batch=unknown[offset:offset+50]
        url='https://www.wikidata.org/w/api.php?'+urlencode({'action':'wbgetentities','format':'json','ids':'|'.join(batch),'props':'claims|labels','languages':'zh-hans|zh|zh-cn|en','languagefallback':1})
        try:
            data=json.loads(fetch(url))
            ENTITIES.update(data.get('entities',{}))
        except Exception as exc:
            print('Wikidata batch unavailable',offset//50+1,str(exc)[:100],flush=True)
        print('Wikidata entities',min(offset+50,len(unknown)),'/',len(unknown),flush=True)


def values(entity,key):
    statements=[s for s in entity.get('claims',{}).get(key,[]) if s.get('rank')!='deprecated']
    preferred=[s for s in statements if s.get('rank')=='preferred']
    if preferred:statements=preferred
    return [s['mainsnak']['datavalue']['value'] for s in statements if 'datavalue' in s.get('mainsnak',{})]


def label(qid):
    names=ENTITIES.get(qid,{}).get('labels',{})
    for lang in ['zh-hans','zh-cn','zh','en']:
        if lang in names:return SIMPLIFY.convert(names[lang]['value'])
    return ''


def parents(qid):
    claims=[s for s in ENTITIES.get(qid,{}).get('claims',{}).get('P131',[]) if s.get('rank')!='deprecated']
    active=[s for s in claims if 'P582' not in s.get('qualifiers',{})]
    if active:claims=active
    return [s['mainsnak']['datavalue']['value']['id'] for s in claims if s.get('mainsnak',{}).get('datavalue',{}).get('value',{}).get('id')]


PROVINCE_LABELS={}
for p in PROVINCES:
    for suffix in ['', '省', '市', '自治区']:PROVINCE_LABELS[p+suffix]=p
PROVINCE_LABELS.update({'新疆维吾尔自治区':'新疆','宁夏回族自治区':'宁夏','广西壮族自治区':'广西','香港特别行政区':'香港','澳门特别行政区':'澳门'})


def province_for(qid,depth=6,seen=None):
    if depth<0:return None
    seen=set() if seen is None else seen
    if qid in seen:return None
    seen.add(qid)
    name=label(qid)
    if name in PROVINCE_LABELS:return PROVINCE_LABELS[name]
    for parent in parents(qid):
        found=province_for(parent,depth-1,seen)
        if found:return found
    return None


def year_for(entity,key):
    result=set()
    for value in values(entity,key):
        time=value.get('time','')
        if value.get('precision',0)<9 or not time.startswith('+'):continue
        year=int(time[1:5])
        if 1850<=year<=2026:result.add(year)
    return next(iter(result)) if len(result)==1 else None


def main():
    people=json.loads((ROOT/'src/data/catalog.generated.json').read_text())
    wiki=json.loads((OUT/'wiki-matches.json').read_text())
    mapping={}
    for person in people:
        candidates=[w for w in wiki if w['name']==person['name'] and w.get('wikidata')]
        if sum(p['name']==person['name'] for p in people)>1:
            candidates=[w for w in candidates if w.get('targetGrantYear')==person['grantYear']]
        if len(candidates)==1:mapping[person['id']]=candidates[0]['wikidata']
    get_entities(mapping.values())
    places={v['id'] for qid in mapping.values() for v in values(ENTITIES.get(qid,{}),'P19') if isinstance(v,dict) and v.get('id')}
    frontier=places
    for level in range(5):
        get_entities(frontier)
        frontier={parent for qid in frontier for parent in parents(qid)}-ENTITIES.keys()
        print('Place hierarchy level',level+1,'new parents',len(frontier),flush=True)
        if not frontier:break
    result={}
    for person in people:
        qid=mapping.get(person['id'])
        if not qid:continue
        entity=ENTITIES.get(qid,{})
        record={'wikidata':qid,'birth':year_for(entity,'P569'),'death':year_for(entity,'P570'),'source':'https://www.wikidata.org/wiki/'+qid}
        birthplaces={v['id'] for v in values(entity,'P19') if isinstance(v,dict) and v.get('id')}
        if len(birthplaces)==1:
            place=next(iter(birthplaces));name=label(place)
            province=province_for(place)
            if name and re.search(r'[\u3400-\u9fff]',name):
                record['hometown']=province+' · '+name if province and name not in (province,province+'省',province+'市') else name
                record['province']=province
                record['hometownType']='出生地'
        files=values(entity,'P18')
        if files:
            record['imageFile']=files[0]
            record['imageUrl']='https://commons.wikimedia.org/wiki/Special:FilePath/'+quote(files[0])+'?width=500'
            record['imageSource']='https://commons.wikimedia.org/wiki/File:'+quote(files[0])
        result[person['id']]=record
    (OUT/'wikidata-facts.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
    print('Structured facts',len(result),'birthplaces',sum(bool(p.get('hometown')) for p in result.values()),flush=True)


if __name__=='__main__':main()
