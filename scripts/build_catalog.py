"""Build the 1614-person catalogue from cached evidence, without inventing fields.

Source prose stays in .cache. Published copy is newly composed from factual
dates, locations, appointments and honours; original sources remain linked.
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
import unicodedata
from urllib.parse import quote
from collections import Counter, defaultdict
from pathlib import Path

from catalog_sources import CACHE, OUT, ROOT, clean_name
from opencc import OpenCC
SIMPLIFY = OpenCC('t2s')

RUN_DATE = '2026-11-17'
CORRECTIONS = {'陈士渠':'陈士榘','周恒':'周桓','陈仁麟':'陈仁麒','黄新延':'黄新廷','何延一':'何廷一','延懋':'廷懋','吴詠湘':'吴咏湘'}
HOMONYM_BIRTHS = {('李元',1955):1894,('李元',1964):1917,('李道之',1955):1911,('李道之',1964):1916,('罗斌',1955):1915,('罗斌',1962):1914,('张英',1961):1914,('张英',1964):1916}
PROVINCES = ['内蒙古','黑龙江','广西','新疆','西藏','宁夏','辽宁','吉林','河北','河南','山东','山西','陕西','甘肃','青海','江苏','浙江','安徽','福建','江西','湖北','湖南','广东','海南','四川','贵州','云南','北京','天津','上海','重庆','台湾','香港','澳门']
YEAR = r'(?:18|19|20)\d{2}'


def number(match, group=1):
    return int(match.group(group)) if match else None


def parse_facts(profile):
    text = SIMPLIFY.convert(unicodedata.normalize('NFKC',profile.get('body','')))
    compact = re.sub(r'\s+','',text)
    title = profile.get('title','')
    intro = compact[:900]
    # The military database prints personal life dates before the 军衔 field;
    # do not confuse its appointment date ranges with birth/death dates.
    dates_intro = compact[:450].split('军衔')[0]
    # Only a person's explicit parenthesized life dates, or the database's
    # structured date field, can form a lifespan. Appointment ranges elsewhere
    # in the introduction (e.g. 1970–1977) are never life dates.
    date_range = re.search(re.escape(SIMPLIFY.convert(profile['name']))+r'[（(][^()\d]{0,40}((?:18|19)\d{2})(?:年(?:\d{1,2}月)?(?:\d{1,2}日)?|[.．]\d{1,2}(?:[.．]\d{1,2})?)?[—–－~～-]+((?:19|20)\d{2})',intro[:350])
    if not date_range and profile.get('kind') == 'memorial' and '军衔' in compact:
        date_range = re.search(r'((?:18|19)\d{2})[.．]\d{2}[.．]\d{2}[—–－~～-]+((?:19|20)\d{2})[.．]\d{2}[.．]\d{2}',dates_intro)
    birth, death = (int(date_range[1]),int(date_range[2])) if date_range else (None,None)
    if not birth:
        birth = number(re.search(re.escape(profile['name'])+r'[（(]((?:18|19)\d{2})',intro))
    if not birth:
        birth = number(re.search(r'((?:18|19)\d{2})年(?:\d{1,2}月)?(?:\d{1,2}日)?(?:出生|生于|生在)',intro))
    if not birth and 'show-3156-' in profile['url']:
        birth = number(re.search(r'((?:18|19)\d{2})[.．]\d{2}[.．]\d{2}[—–－-]',dates_intro))
    if not death:
        # A terminal death notice, not a death mentioned in another person's story.
        death_sentences = []
        for sentence in re.split(r'[。\n]', text):
            if any(relative in sentence for relative in ['父亲','母亲','妻子','丈夫','兄长','姐姐','弟弟','儿子','女儿']): continue
            match = re.match(r'\s*(?:'+re.escape(profile['name'])+r'(?:同志)?)?(?:于)?((?:19|20)\d{2})年(?:\d{1,2}月)?(?:\d{1,2}日)?[^。\n]{0,24}?(?:病逝|逝世|去世)',sentence)
            if match: death_sentences.append(int(match[1]))
        if death_sentences: death=death_sentences[-1]
    if death and (death>2026 or (birth and (death<=birth or death-birth>115))): death=None
    if birth and not 1850<=birth<=1930: birth=None

    rank=profile['rank']
    grant=number(re.search(re.escape(rank)+r'[（(](19\d{2})[）)]',intro))
    if not grant:
        candidates=re.findall(r'(19[56]\d)年(?:\d{1,2}月)?(?:\d{1,2}日)?[，,]*(?:[^。\n\d]{0,8})?(?:授予|晋升|获授)[^。\n\d，,；;]{0,18}?'+re.escape(rank),compact)
        grant=int(candidates[0]) if candidates else None
    if '军衔' in compact and not grant:
        grant=number(re.search(r'军衔[：:]?(19[56]\d)',compact))
    if grant and not 1955<=grant<=1965: grant=None

    province_pattern='|'.join(PROVINCES+['热河','察哈尔','绥远','辽东','奉天'])
    place_match=re.search(r'((?:'+province_pattern+r')[^。；，,;、（）()\d]{0,22}?)(?:人[。，；,;]|人$)',intro[:220])
    place_type='籍贯'
    if place_match and any(word in place_match[1] for word in ['军区','军队','部队','任','战役','工作','参加','当工','工人','学徒','从事','加入','学习','打工']):place_match=None
    if not place_match:
        place_match=re.search(r'(?:生于|出生于)((?:'+province_pattern+r')[^。；，,;\d]{0,30})',intro)
        place_type='出生地'
    place=place_match[1] if place_match else None
    structured=profile.get('structuredHometown')
    if not place and structured:
        place=SIMPLIFY.convert(structured['value'])
        place=re.sub(r'\s+','',place)
        place_type=structured['type']
        region=re.search(r'(?:'+province_pattern+r').*',place)
        if region:place=region[0]
    if place:
        place=re.split(r'(?:一个|一户|的一个|的贫|农民|贫苦|家庭|普通|雇农|佃农)',place)[0].rstrip('的')
        place=re.sub(r'[（(].*','',place)
        if any(word in place for word in ['军区','军队','部队','任','战役','工作','参加']): place=None
    province=next((p for p in PROVINCES+['热河','察哈尔','绥远','辽东','奉天','西康','越南'] if place and place.startswith(p)),None)

    party=number(re.search(r'(19\d{2})年(?:\d{1,2}月)?(?:\d{1,2}日)?(?:加入|参加)中国共产党',compact))
    enlist_match=re.search(r'(19\d{2})年(?:\d{1,2}月)?(?:\d{1,2}日)?参加(中国工农红军|工农红军|中国人民解放军|红军|八路军|新四军|革命)',compact)
    enlist= {'year':int(enlist_match[1]),'text':'参加'+enlist_match[2]+'。'} if enlist_match else None
    career=None
    for sentence in re.split(r'[。\n]',text):
        sentence=re.sub(r'\s+','',sentence)
        m=re.match(r'(19(?:[234]\d|5[0-4]))年(?:\d{1,2}月)?(?:起)?(?:[，,])?(?:出任|任|担任)([^。；;]{3,100})',sentence)
        if m:
            job=re.split(r'[，；,;]',m[2])[0]
            if len(job)<=65 and not any(w in job for w in ['被捕','处决','牺牲']):
                career={'year':int(m[1]),'text':'任'+job+'。'}
                if 1937<=career['year']<=1949: break
    if not career and '战时任职' in text:
        m=re.search(r'◆\s*(19\d{2})[.．]\d{2}[.．]\d{2}[^\n]*\n([^\n◆]{3,90})',text)
        if m and '不详' not in m[2]: career={'year':int(m[1]),'text':'任'+m[2].strip()+'。'}
    return {'birth':birth,'death':death,'province':province,'hometown':place,'hometownType':place_type if place else None,'grantYear':grant,'partyYear':party,'enlist':enlist,'career':career,'knownRole':profile.get('documentedRole')}


def identity_rejection(profile, known_births=()):
    """Reject later-era namesakes instead of trusting the collector's rank tag."""
    if 'identityRejection' in profile:return profile['identityRejection']
    if profile.get('kind') != 'wiki': return None
    # A founding general may have received another rank in 1988. A matching
    # birth year in an independent roster/bio prevents treating that promotion
    # as a different person merely because the article lists the later rank.
    birth=profile.get('facts',{}).get('birth')
    if birth and birth in known_births: return None
    text = re.sub(r'\s+', '', SIMPLIFY.convert(profile.get('body','')))
    title = SIMPLIFY.convert(profile.get('wikiTitle',profile.get('title','')))
    title_birth=re.search(r'[（(]((?:19|20)\d{2})年[）)]',title)
    if title_birth and int(title_birth[1])>1930:return 'Article title identifies a later-born namesake'
    title_rank = re.search(r'[（(](少将|中将|上将|大将|元帅)[）)]', title)
    if title_rank and title_rank[1] != profile['rank']: return 'Article title identifies a different military rank'
    grants = [int(m[1]) for m in re.finditer(r'((?:19|20)\d{2})年(?:\d{1,2}月)?(?:\d{1,2}日)?[^。\d]{0,18}(?:授予|晋升)[^。\d]{0,18}(?:少将|中将|上将|大将|元帅)', text)]
    own_intro=re.split(r'。|其父|父亲|其母|母亲',text[:160])[0]
    if grants and min(grants) > 1965 and '开国' not in own_intro: return 'Only post-1965 military appointments documented'
    own_rank = re.search(r'中国人民解放军(?:开国)?(?:[\u4e00-\u9fff]{0,4}军)?(少将|中将|上将|大将|元帅)',text[:300])
    if own_rank and own_rank[1] != profile['rank'] and profile['rank'] not in text and '开国' not in text:
        return 'Biography identifies a different military rank'
    return None


def load_curated():
    text=(ROOT/'src/data/featured.ts').read_text()
    result={}
    for block in re.split(r'\n  \{\n    id:',text)[1:]:
        block='id:'+block
        def val(field):
            m=re.search(r'\b'+field+r": '([^']*)'",block)
            return m[1] if m else None
        name=val('name')
        result[name]={'id':val('id'),'province':val('province'),'hometown':val('hometown'),'birth':number(re.search(r'birth: (\d{4})',block)),'death':number(re.search(r'death: (\d{4})',block)),'story':val('story'),'tagline':val('tagline'),'imageSource':val('imageSource'),'sourceUrls':re.findall(r"url: '([^']+)'",block)}
    return result


def load_wiki_intros():
    intros={}
    for path in CACHE.glob('*.html'):
        with path.open() as file:
            if not file.read(100).lstrip().startswith('{'):continue
        try:data=json.loads(path.read_text())
        except (ValueError,UnicodeError):continue
        for page in data.get('query',{}).get('pages',{}).values():
            if page.get('extract'):
                title=page.get('title','')
                value=page['extract']
                if len(value)>len(intros.get(title,'')):intros[title]=value
    return intros


def load_source_records(refresh=False):
    """Use the committed factual snapshot; raw web caches are optional research."""
    evidence_dir=OUT/'evidence'
    snapshot=evidence_dir/'profiles.jsonl'
    manifest_file=evidence_dir/'manifest.json'
    if snapshot.exists() and not refresh:
        manifest=json.loads(manifest_file.read_text())
        data=snapshot.read_bytes()
        if manifest['schemaVersion']!=1 or hashlib.sha256(data).hexdigest()!=manifest['sha256']:
            raise ValueError('事实快照版本或哈希不符，请恢复完整的data/catalog/evidence目录。')
        records=[json.loads(line) for line in data.decode('utf-8').splitlines() if line.strip()]
        if len(records)!=manifest['records']:raise ValueError('事实快照记录数不符。')
        return records
    wiki_intros=load_wiki_intros()
    raw=[]
    for file in (CACHE/'profiles').glob('*.json'):
        item=json.loads(file.read_text())
        if item.get('ok'):
            if item.get('kind')=='wiki':
                intro=wiki_intros.get(item.get('wikiTitle',''),'')
                if intro and not item.get('body','').startswith(intro):item['body']=intro+'\n\n'+item.get('body','')
                early=SIMPLIFY.convert(item.get('body',''))[:150]
                born=re.search(r'[（(]((?:18|19|20)\d{2})',early)
                if born and int(born[1])>1930: continue
            item['facts']=parse_facts(item)
            raw.append(item)
    search_file=OUT/'search-evidence.json'
    if search_file.exists():
        for item in json.loads(search_file.read_text()):
            item['facts']=parse_facts(item)
            raw.append(item)
    table_file=OUT/'compendium-facts.json'
    if table_file.exists():
        for item in json.loads(table_file.read_text()):
            item['facts']=parse_facts(item)
            raw.append(item)
    if not raw:raise ValueError('缺少已提交的事实快照与原始研究缓存；请恢复data/catalog/evidence目录。')
    if refresh:
        if manifest_file.exists() and len(raw)<json.loads(manifest_file.read_text())['records']:
            raise ValueError('原始研究记录少于已提交快照，拒绝用不完整缓存覆盖。单项勘误请编辑reviewed-facts.json。')
        by_name=index_sources(raw)
        exported=[]
        fields=['name','rank','kind','url','title','wikiTitle','targetGrantYear','wikidata','images','imageFile','facts']
        for item in raw:
            record={key:item[key] for key in fields if key in item}
            name=re.split(r'[（(]',clean_name(item['name']))[0]
            known={other['facts']['birth'] for other in by_name[name] if other['kind']!='wiki' and other['rank']==item['rank'] and other['facts'].get('birth')}
            record['identityRejection']=identity_rejection(item,known)
            record['sourceBodySha256']=hashlib.sha256(item.get('body','').encode()).hexdigest()
            exported.append(record)
        evidence_dir.mkdir(exist_ok=True)
        data=('\n'.join(json.dumps(item,ensure_ascii=False,separators=(',',':')) for item in exported)+'\n').encode()
        snapshot.write_bytes(data)
        manifest={'schemaVersion':1,'date':RUN_DATE,'records':len(exported),'file':'profiles.jsonl','sha256':hashlib.sha256(data).hexdigest(),'description':'机器抽取的事实、影像地址及字段出处快照；不含完整网页正文，不代表全量人工史料审校。','refreshCommand':'python scripts/build_catalog.py --refresh-evidence'}
        manifest_file.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    return raw


def index_sources(raw):
    by_name=defaultdict(list)
    for item in raw:
        name=re.split(r'[（(]',clean_name(item['name']))[0]
        by_name[name].append(item)
        # 肖 and 萧 are both used for these historical surnames in source catalogues.
        if name.startswith(('肖','萧')): by_name[('肖' if name[0]=='萧' else '萧')+name[1:]].append(item)
    return by_name


def build(refresh_evidence=False):
    roster=json.loads((OUT/'roster-crt.json').read_text())
    curated=load_curated()
    raw=load_source_records(refresh_evidence)
    by_name=index_sources(raw)
    rejected_sources=[]
    photo_file=OUT/'portraits.json'
    photo_map=json.loads(photo_file.read_text()) if photo_file.exists() else {}
    reviewed_file=OUT/'reviewed-facts.json'
    reviewed=json.loads(reviewed_file.read_text()) if reviewed_file.exists() else {}
    wd_file=OUT/'wikidata-facts.json'
    wd_facts=json.loads(wd_file.read_text()) if wd_file.exists() else {}
    result=[]
    unresolved=[]
    image_jobs=[]
    source_differences=[]
    field_provenance=[]
    for index,row in enumerate(roster):
        original=row['name']; name=CORRECTIONS.get(original,original)
        person_id=curated[name]['id'] if name in curated else f'p{index+1:04d}'
        grant=row.get('grantYear')
        candidates=[]
        known_births={item['facts']['birth'] for item in by_name.get(name,[]) if item['kind']!='wiki' and item['rank']==row['rank'] and item['facts'].get('birth')}
        for item in by_name.get(name,[]):
            if item['rank']!=row['rank']: continue
            if item['url'] in reviewed.get(person_id,{}).get('excludeSources',[]):
                rejected_sources.append({'name':name,'url':item['url'],'reason':'Excluded by source-attributed catalogue review'})
                continue
            reason=identity_rejection(item,known_births)
            if reason:
                rejected_sources.append({'name':name,'url':item['url'],'reason':reason})
                continue
            facts=item['facts']
            if (name,grant) in HOMONYM_BIRTHS:
                expected=HOMONYM_BIRTHS[(name,grant)]
                if facts['birth']!=expected and facts['grantYear']!=grant: continue
                if facts['birth'] and facts['birth']!=expected: continue
                if facts['grantYear'] and facts['grantYear']!=grant: continue
            candidates.append(item)
        def score(item):
            f=item['facts']
            authority={'people':4,'memorial':3,'wiki':2,'compendium':0,'search':5}.get(item['kind'],1)
            return (authority,sum(bool(f.get(k)) for k in ['birth','death','hometown','career','enlist','partyYear']))
        candidates.sort(key=score,reverse=True)
        facts={k:None for k in ['birth','death','province','hometown','hometownType','grantYear','partyYear','enlist','career','knownRole']}
        fact_sources={}
        sources=[{'title':'中红网 · 开国将帅名录（姓名与军衔）','url':row['rosterSource']}]
        for item in candidates:
            for key,value in item['facts'].items():
                if key in ['province','hometown','hometownType']:continue
                if value is not None and facts[key] is None:
                    facts[key]=value
                    fact_sources[key]=item['url']
            if not facts['hometown'] and item['facts'].get('hometown'):
                for key in ['province','hometown','hometownType']:
                    facts[key]=item['facts'][key]
                    fact_sources[key]=item['url']
            publisher={'people':'人民网 · 人物资料','memorial':'抗日战争纪念网 · 人物资料','wiki':'维基百科 · 生平资料'}.get(item['kind'],'公开资料')
            if item['kind']=='compendium': publisher='太行英雄网 · 籍贯名录（补充资料）'
            if item.get('kind')=='search': publisher='公开资料 · 检索摘记'
            if item['url'] not in [s['url'] for s in sources]: sources.append({'title':publisher+' · '+name,'url':item['url']})
        facts['grantYear']=facts['grantYear'] or grant
        if facts['grantYear'] and 'grantYear' not in fact_sources:fact_sources['grantYear']=row['rosterSource']
        wd=wd_facts.get(person_id,{})
        for field in ['birth','death']:
            if facts[field] is None and wd.get(field):
                facts[field]=wd[field]
                fact_sources[field]=wd['source']
        if facts['hometown'] is None and wd.get('hometown'):
            for field in ['hometown','province','hometownType']:
                facts[field]=wd.get(field)
                fact_sources[field]=wd['source']
        if wd: sources.append({'title':'维基数据 · 基本资料（CC0）','url':wd['source']})
        review=reviewed.get(person_id,{})
        facts.update(review.get('facts',{}))
        for field in review.get('facts',{}):fact_sources[field]=[source['url'] for source in review.get('sources',[])]
        for source in review.get('sources',[]):
            if source['url'] not in [s['url'] for s in sources]:sources.append(source)
        if name in curated:
            for field,value in curated[name].items():
                if field in facts:
                    facts[field]=value
                    fact_sources[field]=curated[name]['sourceUrls']
        pending=[]
        disputes=[]
        for field,label in [('birth','出生年份'),('death','逝世年份'),('grantYear','授衔年份')]:
            versions=defaultdict(list)
            for item in candidates:
                value=item['facts'].get(field)
                if value and item['url'] not in versions[value]:versions[value].append(item['url'])
            for evidence in review.get('additionalEvidence',{}).get(field,[]):
                if evidence['url'] not in versions[evidence['value']]:versions[evidence['value']].append(evidence['url'])
            if field=='grantYear' and row.get('grantYear'):
                versions[row['grantYear']].append(row['rosterSource'])
            if len(versions)>1:
                selected=facts[field]
                resolved=field in review.get('verifiedFields',[])
                dispute={'id':person_id,'name':name,'field':field,'selected':selected if resolved else None,'alternatives':dict(versions),'status':'resolved' if resolved else 'pending'}
                source_differences.append(dispute)
                disputes.append(dispute)
                if not resolved:
                    pending.append(field)
                    facts[field]=None
        for field,entries in review.get('disputedFields',{}).items():
            versions=defaultdict(list)
            for entry in entries:versions[entry['value']].extend(entry['urls'])
            dispute={'id':person_id,'name':name,'field':field,'selected':None,'alternatives':dict(versions),'status':'pending'}
            source_differences.append(dispute)
            disputes.append(dispute)
            pending.append(field)
            facts[field]=None
        field_provenance.append({'id':person_id,'name':name,'sources':fact_sources,'pendingFields':pending})
        grant=facts['grantYear']
        timeline=[]
        if facts['birth']: timeline.append({'year':facts['birth'],'text':f'出生于{facts["hometown"]}。' if facts['hometown'] and facts['hometownType']=='出生地' else '出生。'})
        if facts['enlist']: timeline.append(facts['enlist'])
        if facts['partyYear']: timeline.append({'year':facts['partyYear'],'text':'加入中国共产党。'})
        if facts['career']: timeline.append(facts['career'])
        if grant: timeline.append({'year':grant,'text':f'获授{row["rank"]}军衔。'})
        if facts['death']: timeline.append({'year':facts['death'],'text':'逝世。'})
        timeline=sorted({(x['year'],x['text']):x for x in timeline}.values(),key=lambda x:x['year'])
        sentences=[f'{name}，开国{row["rank"]}。']
        if facts['hometown']: sentences.append((facts['hometownType'] or '籍贯')+'记载为'+facts['hometown']+'。')
        if facts['birth']: sentences.append(str(facts['birth'])+'年出生。')
        if facts['enlist']: sentences.append(str(facts['enlist']['year'])+'年'+facts['enlist']['text'])
        if facts['partyYear']: sentences.append(str(facts['partyYear'])+'年加入中国共产党。')
        if facts['career']: sentences.append(str(facts['career']['year'])+'年'+facts['career']['text'])
        elif facts['knownRole']: sentences.append('资料所载任职包括'+facts['knownRole']+'。')
        if grant: sentences.append(f'{grant}年获授{row["rank"]}军衔。')
        if facts['death']: sentences.append(str(facts['death'])+'年逝世。')
        has_profile=bool(candidates or review or name in curated)
        if not has_profile: sentences.append('已核对姓名及军衔，详细生平资料待补录。')
        missing=[key for key in ['birth','death','hometown'] if not facts[key] and key not in pending]
        if facts['hometown'] and not facts['province']: missing.append('province')
        if not has_profile: missing.append('biography')
        photo=photo_map.get(person_id,{})
        if not photo and name not in curated: missing.append('portrait')
        if facts['hometown']: tagline='从'+facts['hometown'].replace('省','').replace('县','')+'走出的开国'+row['rank']
        elif grant: tagline=f'{grant}年获授{row["rank"]}军衔'
        else: tagline='开国'+row['rank']+' · 人物档案'
        person={'id':person_id,'name':name,'rank':row['rank'],'province':facts['province'] or ('地域待核实' if 'province' in pending else '待补'),'hometown':facts['hometown'] or ('籍贯待核实' if 'hometown' in pending else '籍贯待补'),'hometownType':facts['hometownType'] or '籍贯','birth':facts['birth'],'death':facts['death'],'grantYear':grant,'aliases':[original] if original!=name else [],'tagline':tagline,'story':'\n\n'.join([''.join(sentences[:3]),''.join(sentences[3:])]).strip(),'timeline':timeline,'sources':sources,'imageSource':photo.get('source',''),'portraitFile':photo.get('file'),'portraitVersion':photo.get('sha256','')[:12],'missingFields':missing,'dataStatus':'profile' if has_profile else 'roster'}
        if pending:person['pendingFields']=pending
        difference_notes=[]
        labels={'birth':'出生年份','death':'逝世年份','grantYear':'授衔年份','hometown':'籍贯或出生地','province':'地域归属'}
        for dispute in disputes:
            if dispute['status']=='pending':difference_notes.append(labels[dispute['field']]+'记载有异（'+'、'.join(str(value)+('年' if dispute['field'] in ['birth','death','grantYear'] else '') for value in sorted(dispute['alternatives']))+'），暂不列定值，待进一步核实')
        notes=([review['note']] if review.get('note') else [])+(['资料差异：'+'；'.join(difference_notes)+'。可查阅下列来源。'] if difference_notes else [])
        if notes:person['fieldNote']=''.join(notes)
        if name in curated:
            for field in ['tagline','imageSource']:person[field]=curated[name][field]
            if not pending:person['story']=curated[name]['story']
        result.append(person)
        image_candidates=[]
        for item in candidates:
            for image in item.get('images',[]):
                filename=item.get('imageFile','')
                if filename and re.search(r'flag|emblem|insignia|shoulder|rank|军衔|肩章|国徽|党徽|旗|logo|map|arms',filename,re.I): continue
                source='https://commons.wikimedia.org/wiki/File:'+quote(filename) if filename else item['url']
                image_candidates.append({'url':image,'source':source,'priority':0 if item['kind']=='wiki' else 1 if item['kind']=='people' else 2,'license':'Wikimedia PageImages free image' if item['kind']=='wiki' else '来源页未标明开放许可'})
        image_candidates.sort(key=lambda image:image['priority'])
        if wd.get('imageUrl') and not re.search(r'flag|emblem|insignia|shoulder|rank|军衔|肩章|国徽|党徽|旗|logo|map|arms',wd.get('imageFile',''),re.I):
            image_candidates.append({'url':wd['imageUrl'],'source':wd['imageSource'],'priority':0,'license':'Wikimedia Commons free content; see file description'})
        if image_candidates and name not in curated: image_jobs.append({'id':person_id,'name':name,'candidates':image_candidates})
        if missing: unresolved.append({'id':person_id,'name':name,'rank':row['rank'],'grantYear':grant,'missing':missing})
    assert len(result)==1614
    assert Counter(p['rank'] for p in result)=={'元帅':10,'大将':10,'上将':57,'中将':177,'少将':1360}
    (ROOT/'src/data/catalog.generated.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    (OUT/'image-jobs.json').write_text(json.dumps(image_jobs,ensure_ascii=False,indent=2),encoding='utf-8',newline='\n')
    (OUT/'missing-fields.json').write_text(json.dumps(unresolved,ensure_ascii=False,indent=2),encoding='utf-8',newline='\n')
    (OUT/'source-conflicts.json').write_text(json.dumps(source_differences,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    (OUT/'rejected-identities.json').write_text(json.dumps(rejected_sources,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    (OUT/'field-provenance.json').write_text(json.dumps(field_provenance,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    (OUT/'pending-review.json').write_text(json.dumps([d for d in source_differences if d['status']=='pending'],ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    missing_counts=Counter(key for person in unresolved for key in person['missing'])
    report={'updatedAt':RUN_DATE,'total':len(result),'byRank':dict(Counter(p['rank'] for p in result)),'profiles':sum(p['dataStatus']=='profile' for p in result),'portraits':sum(bool(p['portraitFile']) or p['name'] in curated for p in result),'missing':dict(missing_counts),'sourcePages':len({item['url'] for item in raw}),'sourceRecords':len(raw),'sourceDifferences':len(source_differences),'homonyms':{name:[{'id':p['id'],'birth':p['birth'],'grantYear':p['grantYear']} for p in result if p['name']==name] for name in sorted({n for n,y in HOMONYM_BIRTHS})},'rosterCorrections':CORRECTIONS}
    report['pendingFields']=dict(Counter(d['field'] for d in source_differences if d['status']=='pending'))
    report['pendingPeople']=len({d['id'] for d in source_differences if d['status']=='pending'})
    report['rejectedIdentitySources']=len(rejected_sources)
    (OUT/'quality-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8',newline='\n')
    with (OUT/'people.csv').open('w',encoding='utf-8-sig',newline='') as file:
        writer=csv.writer(file,lineterminator='\n'); writer.writerow(['id','姓名','军衔','授衔年','地点类别','籍贯或出生地','省份','出生年','逝世年','生平简述','资料说明','肖像文件','肖像来源','缺项','待核实字段','资料来源'])
        for person in result: writer.writerow([person['id'],person['name'],person['rank'],person['grantYear'],person['hometownType'],person['hometown'],person['province'],person['birth'],person['death'],person['story'],person.get('fieldNote',''),person['portraitFile'],person['imageSource'],';'.join(person['missingFields']),';'.join(person.get('pendingFields',[])),';'.join(s['url'] for s in person['sources'])])
    print(json.dumps(report,ensure_ascii=False,indent=2))


if __name__=='__main__': build(refresh_evidence='--refresh-evidence' in sys.argv)
