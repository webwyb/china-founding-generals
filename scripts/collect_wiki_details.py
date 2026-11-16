"""Resolve ambiguous names and collect missing facts from public article revisions.

The original wikitext is used only as research input. Published biographies are
composed from extracted facts by build_catalog.py, not copied from the articles.
"""
from __future__ import annotations
import hashlib
import json
import re
from urllib.parse import urlencode,quote
from catalog_sources import ROOT,OUT,CACHE,fetch,clean_name
from build_catalog import parse_facts,SIMPLIFY,HOMONYM_BIRTHS,load_wiki_intros
REVISION_CACHE={}
TITLE_ALIASES={}


def load_revision_cache():
    for path in CACHE.glob('*.html'):
        with path.open() as file:
            if not file.read(100).lstrip().startswith('{'):continue
        try:data=json.loads(path.read_text()).get('query',{})
        except (ValueError,UnicodeError):continue
        pages=data.get('pages',{})
        if not any('revisions' in page for page in pages.values()):continue
        for page in pages.values():REVISION_CACHE[page['title']]=page
        for kind in ['normalized','converted','redirects']:
            for entry in data.get(kind,[]):TITLE_ALIASES[entry['from']]=entry['to']


def life_from_templates(raw,name):
    # Render the factual years of the biography's explicit life-date template.
    match=re.search(r'\{\{\s*(?:BD|生卒日期)\s*\|([^{}]+)\}\}',raw,re.I)
    if not match:return ''
    years=[int(y) for y in re.findall(r'(?<!\d)((?:18|19|20)\d{2})(?!\d)',match[1])]
    if not years:return ''
    if len(years)>1 and years[0]<years[1]<=2026:return f'{name}（{years[0]}年—{years[1]}年）。\n'
    if 1850<=years[0]<=1930:return f'{name}（{years[0]}年出生）。\n'
    return ''


def strip_wiki(raw):
    raw=re.sub(r'<ref\b[^>]*>.*?</ref\s*>','',raw,flags=re.S|re.I)
    raw=re.sub(r'<ref\b[^>]*/>','',raw,flags=re.S|re.I)
    raw=re.sub(r'<!--.*?-->','',raw,flags=re.S)
    for _ in range(15):
        reduced=re.sub(r'\{\{[^{}]*\}\}','',raw)
        if reduced==raw:break
        raw=reduced
    def link(match):
        content=match[1]
        if re.match(r'(?:File|Image|文件|档案|Category|分类):',content,re.I):return ''
        return content.split('|')[-1]
    for _ in range(3):raw=re.sub(r'\[\[([^\[\]]+)\]\]',link,raw)
    raw=re.sub(r'<[^>]+>','',raw)
    raw=re.sub(r'\[https?://\S+\s*([^\]]*)\]',r'\1',raw)
    raw=re.sub(r"'{2,}",'',raw)
    raw=re.sub(r'^=+([^=]+)=+\s*$',r'\n\1\n',raw,flags=re.M)
    raw=re.split(r'\n(?:参考文献|參考文獻|参考资料|參考資料|外部链接|外部連結|參見|参见)\s*\n',raw)[0]
    return SIMPLIFY.convert(raw).strip()


def query(titles):
    unknown=[]
    for title in titles:
        canonical=title;seen=set()
        while canonical in TITLE_ALIASES and canonical not in seen:seen.add(canonical);canonical=TITLE_ALIASES[canonical]
        if canonical not in REVISION_CACHE:unknown.append(title)
    params={'action':'query','format':'json','prop':'revisions|pageprops|pageimages','rvprop':'content','rvslots':'main','piprop':'thumbnail|name','pithumbsize':480,'pilicense':'free','redirects':1,'converttitles':1,'titles':'|'.join(titles)}
    if unknown:
        params['titles']='|'.join(unknown)
        data=json.loads(fetch('https://zh.wikipedia.org/w/api.php?'+urlencode(params))).get('query',{})
        for page in data.get('pages',{}).values():REVISION_CACHE[page['title']]=page
        for kind in ['normalized','converted','redirects']:
            for entry in data.get(kind,[]):TITLE_ALIASES[entry['from']]=entry['to']
    pages={};redirects=[]
    for title in titles:
        canonical=title;seen=set()
        while canonical in TITLE_ALIASES and canonical not in seen:seen.add(canonical);canonical=TITLE_ALIASES[canonical]
        if canonical in REVISION_CACHE:pages[canonical]=REVISION_CACHE[canonical]
        if canonical!=title:redirects.append({'from':title,'to':canonical})
    return {'pages':pages,'redirects':redirects}


def main():
    load_revision_cache()
    people=json.loads((ROOT/'src/data/catalog.generated.json').read_text())
    matched=json.loads((OUT/'wiki-matches.json').read_text())
    by_url={item['url']:item for item in matched}
    by_name={}
    for item in matched:by_name.setdefault(item['name'],[]).append(item)
    requests={}
    intros=load_wiki_intros()
    for person in people:
        if not any(k in person['missingFields'] for k in ['hometown','birth','death','biography']):continue
        options=by_name.get(person['name'],[])
        if sum(p['name']==person['name'] for p in people)>1:
            options=[item for item in options if item.get('targetGrantYear')==person['grantYear']]
        title=options[0]['wikiTitle'] if len(options)==1 else person['name']
        requests.setdefault(title,[]).append(person)
    queue=list(requests)
    seen=set();accepted=0;errors=[]
    while queue:
        titles=queue[:32];queue=queue[32:]
        try:data=query(titles)
        except Exception as exc:
            errors.append(str(exc));print('Revision batch unavailable',str(exc)[:100],flush=True);continue
        translations={x['from']:x['to'] for k in ['normalized','converted','redirects'] for x in data.get(k,[])}
        pages={page['title']:page for page in data.get('pages',{}).values()}
        for requested in titles:
            seen.add(requested)
            title=requested;chain=set()
            while title in translations and title not in chain:chain.add(title);title=translations[title]
            page=pages.get(title,{})
            revisions=page.get('revisions',[])
            raw=revisions[0].get('slots',{}).get('main',{}).get('*','') if revisions else ''
            if not raw:continue
            text=strip_wiki(raw)
            if intros.get(title):text=intros[title]+'\n\n'+text
            for person in requests[requested]:
                name=person['name']
                personal_text=life_from_templates(raw,name)+text
                # A disambiguation list supplies explicit candidate article titles.
                # Other people's biographies are not accepted as this person's record.
                if 'disambiguation' in page.get('pageprops',{}) or not re.search(r'(?:中国人民解放军|开国).{0,25}(?:少将|中将|上将|大将|元帅|将领)',text):
                    for line in raw.splitlines():
                        if not re.search(r'少[将將]|中[将將]|上[将將]|解放[军軍]|[军軍]事人物|開國|开国',line):continue
                        for dest in re.findall(r'\[\[([^|\]#]+)',line):
                            normalized=SIMPLIFY.convert(dest.replace('_',' '))
                            if clean_name(re.split(r'[（(]',normalized)[0])!=name:continue
                            if dest in seen:continue
                            requests.setdefault(dest,[])
                            if person not in requests[dest]:requests[dest].append(person)
                            if dest not in queue:queue.append(dest)
                    continue
                url='https://zh.wikipedia.org/wiki/'+quote(title.replace(' ','_'))
                record={'name':name,'rank':person['rank'],'kind':'wiki','url':url,'title':title+' · 维基百科','wikiTitle':title,'targetGrantYear':person['grantYear'],'wikidata':page.get('pageprops',{}).get('wikibase_item'),'body':personal_text,'images':[],'ok':True,'detail':True}
                facts=parse_facts(record)
                expected=HOMONYM_BIRTHS.get((name,person['grantYear']))
                if expected and facts['birth']!=expected:continue
                early_birth=re.search(r'[（(]((?:18|19|20)\d{2})',text[:150])
                if early_birth and int(early_birth[1])>1930:continue
                for field,kind in [('籍贯','籍贯'),('native_place','籍贯'),('出生地','出生地'),('出生地点','出生地'),('birth_place','出生地')]:
                    m=re.search(r'^\|\s*'+field+r'\s*=\s*([^\n]+)',raw,re.M|re.I)
                    if m:
                        value=strip_wiki(m[1]).strip()
                        if value and re.search(r'[\u3400-\u9fff]',value):record['structuredHometown']={'value':value,'type':kind};break
                if page.get('thumbnail'):
                    record['images']=[page['thumbnail']['source']];record['imageFile']=page.get('pageimage','')
                key=hashlib.sha256(url.encode()).hexdigest()[:24]
                (CACHE/'profiles'/f'{key}.json').write_text(json.dumps(record,ensure_ascii=False))
                by_url[url]={k:v for k,v in record.items() if k!='body'}
                accepted+=1
        print('Detailed biographies',accepted,'remaining article titles',len(queue),flush=True)
    (OUT/'wiki-matches.json').write_text(json.dumps(list(by_url.values()),ensure_ascii=False,indent=2))
    (OUT/'wiki-detail-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))
    print('Detailed collection complete',accepted,'errors',len(errors),flush=True)


if __name__=='__main__':main()
