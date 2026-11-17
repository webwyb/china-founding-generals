"""Source-linked biography facts and readable, reproducible catalogue copy.

Raw articles are research caches, never release inputs. The versioned snapshot
contains appointments, named operations, schools and works, not source prose.
No newly collected dates replace the separately reviewed life-date fields.
"""
from __future__ import annotations

import re
import unicodedata
from collections import defaultdict
from opencc import OpenCC

SIMPLIFY = OpenCC('t2s')
YEAR = r'(?:18|19|20)\d{2}'
ROLE_END = r'(?:司令员|司令|政治委员|政委|军长|师长|旅长|团长|营长|连长|排长|班长|总指挥|指挥员|参谋长|参谋|部长|主任|书记|委员|院长|校长|副校长|处长|局长|科长|所长|队长|军医|医生|教员|教师|编辑|干事|助理员|总经理|副官|战士|总监|大使|顾问|代表)'
ROLE = re.compile(r'(?:^|[，,；;]|[年月日起后时并转])(?:先后|历|曾)?(?:担任|兼任|出任|升任|改任|任命为|任)([^。；;，,]{2,85})')
PERIODS = [('早期军旅经历', 1936), ('抗日战争时期', 1945), ('解放战争时期', 1949), ('军队与国防建设', 2100)]
KNOWN_OPERATIONS = ['南昌起义','秋收起义','黄麻起义','平江起义','广州起义','宁都起义','黄安战役','鄂豫皖反围剿','中央苏区反围剿','长征','四渡赤水','强渡大渡河','直罗镇战役','山城堡战役','平型关战斗','阳明堡战斗','雁门关伏击战','黄土岭战斗','神头岭战斗','响堂铺战斗','百团大战','黄桥战役','皖南事变','车桥战役','苏中战役','上党战役','邯郸战役','莱芜战役','孟良崮战役','沙家店战役','宜川战役','济南战役','辽沈战役','淮海战役','平津战役','渡江战役','上海战役','衡宝战役','兰州战役','太原战役','扶眉战役','成都战役','海南岛战役','抗美援朝','上甘岭战役','金城战役']


def clean(value):
    value = SIMPLIFY.convert(unicodedata.normalize('NFKC', value)).replace('・', '·')
    return re.sub(r'\s+', '', value).strip('，,；;。:：')


def unique(items):
    seen = set()
    result = []
    for item in items:
        key = item if isinstance(item, str) else (item.get('year'), item.get('role'), item.get('name'), item.get('action'))
        if key not in seen:
            seen.add(key)
            result.append(item)
    return result


def safe_year(value, person):
    if value is None:
        return None
    year = int(value)
    if not 1890 <= year <= 2026:
        return None
    if person.get('birth') and year < person['birth'] + 10:
        return None
    if person.get('death') and year > person['death']:
        return None
    return year


def period_for(year):
    if year is None:
        return '后续任职'
    if year < 1927:
        return '早年经历'
    return next(label for label, end in PERIODS if year <= end)


def extract_memorial(text, person):
    lines = [clean(line) for line in text.splitlines()]
    sections = defaultdict(list)
    section = ''
    headings = {'院校','战时任职','战时经历','战后情况','荣誉','书作'}
    for line in lines:
        if line in headings:
            section = line
        elif section and line and line != '不详':
            sections[section].append(line)
    appointments = []
    year = None
    for line in sections['战时任职']:
        date = re.match(r'◆?\s*('+YEAR+r')[.年]', line)
        if date:
            year = safe_year(date[1], person)
            continue
        if re.search(ROLE_END+r'$', line) and len(line) <= 100:
            appointments.append({'year': year, 'role': line, 'period': '抗战前后任职', 'locator': '战时任职'})
    for line in sections['战后情况']:
        if re.search(ROLE_END+r'$', line) and len(line) <= 100:
            appointments.append({'year': None, 'role': line, 'period': '后续任职', 'locator': '战后情况'})
    operations = []
    for line in sections['战时经历']:
        if line.startswith(('率部参加','参加以下','参加的','率以下','不详')):
            continue
        name = re.sub(r'[（(].*?[)）]', '', line)
        if 3 <= len(name) <= 35 and re.search(r'战役|战斗|作战|起义|长征', name):
            operations.append({'name': name, 'year': None, 'action': '参加', 'locator': '战时经历'})
    def nouns(key, limit=80):
        return unique([line for line in sections[key] if 2 <= len(line) <= limit and not re.search(r'复制链接|责任编辑|最后更新|特别说明|上一篇|下一篇|^◆|^\d{4}[.年]', line)])
    return {'appointments': unique(appointments), 'operations': unique(operations), 'schools': nouns('院校'), 'works': [x for x in nouns('书作') if '《' in x], 'honours': nouns('荣誉')}


def extract_prose(text, person):
    appointments, operations, schools, works = [], [], [], []
    active_period = '后续任职'
    for paragraph_index, paragraph in enumerate(text.splitlines()):
        compact = clean(paragraph)
        headings={'早年经历':'早年经历','早期革命生涯':'红军时期','红军时期':'红军时期','土地革命战争时期':'红军时期','抗日战争时期':'抗日战争时期','解放战争时期':'解放战争时期','新中国成立后':'军队与国防建设','中华人民共和国成立后':'军队与国防建设','建国之后':'军队与国防建设','建国后':'军队与国防建设','人物生平':'后续任职'}
        if compact in headings:
            active_period=headings[compact]
            continue
        if len(compact) < 8 or any(word in compact for word in ['点击进入','参考资料','参考文献','编辑本段','维基百科，自由']):
            continue
        previous_year = None
        for key, label in [('抗日战争胜利后', '解放战争时期'), ('抗战胜利后', '解放战争时期'), ('日本投降后', '解放战争时期'), ('抗日战争时期', '抗日战争时期'), ('抗日战争爆发后', '抗日战争时期'), ('解放战争', '解放战争时期'), ('新中国成立', '军队与国防建设'), ('中华人民共和国成立', '军队与国防建设'), ('土地革命', '红军时期')]:
            if compact.startswith(key):
                active_period = label
                break
        implied_period = active_period
        for sentence_index, sentence in enumerate(re.split(r'[。！？]', compact)):
            if not sentence or '“' in sentence or '”' in sentence:
                continue
            # Neither family biographies nor publication dates become a person's
            # appointments. All life dates stay in the existing reviewed pipeline.
            if re.search(r'父亲|母亲|妻子|丈夫|儿子|女儿|其父|其子|遗孀|出生|生于|病逝|逝世|享年|授予.*军衔|晋升.*军衔', sentence):
                continue
            # A period heading can occur in the middle of a paragraph. An
            # earlier year must never leak into a later, undated appointment.
            for key, label in [('抗日战争胜利后','解放战争时期'),('抗战胜利后','解放战争时期'),('日本投降后','解放战争时期'),('第二次国共内战','解放战争时期'),('第一次国共内战','红军时期'),('抗日战争时期','抗日战争时期'),('抗日战争爆发后','抗日战争时期'),('抗日战争','抗日战争时期'),('抗战时期','抗日战争时期'),('解放战争','解放战争时期'),('新中国成立','军队与国防建设'),('中华人民共和国成立','军队与国防建设'),('建国后','军队与国防建设'),('土地革命','红军时期'),('红军时期','红军时期')]:
                if sentence.startswith(key):
                    implied_period = active_period = label
                    break
            dates = list(re.finditer('('+YEAR+r')年', sentence))
            relative_year = previous_year if sentence.startswith('同年') else safe_year(previous_year+1,person) if sentence.startswith('次年') and previous_year else None
            locator = f'段{paragraph_index+1}句{sentence_index+1}'
            for match in ROLE.finditer(sentence):
                role = re.sub(r'^(?:新组建的|新成立的|组建的|改编后的)', '', match[1])
                role = re.sub(r'(?:等职务|等职|等)$', '', role)
                if not re.search(ROLE_END+r'$', role) or len(role) > 85 or role.startswith(('该', '这个', '此部', '本校')):
                    continue
                if re.search(r'(?:军|师|旅|团|纵队|兵团|分区)\d+(?:副|政治委员|参谋长|司令员|师长|团长|旅长|军长)',role):
                    continue  # A broken unit number is not a publishable job.
                if re.fullmatch(r'(?:副|代理|代)?'+ROLE_END+r'(?:兼(?:副)?'+ROLE_END+r')?', role):
                    continue  # Do not detach a job from an unnamed unit.
                preceding = [m for m in dates if m.start() < match.start(1)]
                year = safe_year(preceding[-1][1], person) if preceding else relative_year
                if preceding:
                    between=sentence[preceding[-1].end():match.start()]
                    if not re.fullmatch(r'[\d一二三四五六七八九十零正元月日初底春夏秋冬上下中旬起至到从以后，,\-—～~]{0,30}',between):
                        year=None
                if len(preceding) >= 2 and re.search(r'至|到|[—－~-]', sentence[preceding[-2].end():preceding[-1].start()]):
                    year = safe_year(preceding[-2][1], person)
                period_year=year
                if re.search(r'(?:历任|先后任|曾任|后升任|后任)',sentence[match.start():match.start(1)]):
                    year=None
                elif '、' in role:
                    year = None  # The first date does not date every job in a list.
                period = period_for(period_year) if period_year else implied_period
                if period_year and 1927<=period_year<=1936 and implied_period=='红军时期':
                    period=implied_period
                if period_year==1945 and implied_period=='解放战争时期':
                    period=implied_period
                if period_year==1949 and implied_period=='军队与国防建设':
                    period=implied_period
                # A source paragraph sometimes lists several periods without
                # new headings. Do not put a post-1945 organisation under an
                # earlier war simply because of the preceding heading.
                if period in ('红军时期','抗日战争时期') and re.search(r'野战军|东北民主联军|公安军|防空军|军区空军|军区海军|第[一二三四1234]野',role):
                    period=period_for(period_year) if period_year and period_year>=1946 else '后续任职'
                if period=='红军时期' and re.search(r'新四军|八路军',role):
                    period='后续任职'
                appointments.append({'year': year, 'role': role, 'period': period, 'locator': locator})
            for name in KNOWN_OPERATIONS:
                if name not in sentence:
                    continue
                before = sentence.split(name, 1)[0]
                verbs = list(re.finditer(r'指挥|组织|领导|参加|参与|随|发动|率', before))
                if not verbs:
                    continue
                action = verbs[-1][0]
                subject_prefix = before[:verbs[-1].start()]
                if not re.search(r'(?:^|[，,；;]|[年月日后又曾])(?:他|并|还|先后|相继|继续|率部|与[^，]{1,25}(?:等|一起|共同))?$', subject_prefix):
                    continue
                if before[verbs[-1].end():].startswith('的'):
                    continue
                # Store participation conservatively; historical context never
                # upgrades participation into command of an entire operation.
                if action in ('随','率'):
                    action = '参加'
                year = safe_year(dates[0][1], person) if dates else relative_year
                operations.append({'name': name, 'year': year, 'action': action, 'locator': locator})
            for match in re.finditer(r'(?:考入|进入|入|毕业于)([^，,；;。]{3,35}?(?:学校|学堂|学院|大学|军校))', sentence):
                school = match[1]
                if not re.search(r'战场|主力|南京城|军队', school):
                    schools.append(school)
            work_match = re.search(r'(?:著有|著作有|译著有|编著|译有|翻译了?)([^。]{0,90})', sentence)
            if work_match and '序言' not in work_match[1]:
                works.extend(re.findall(r'《[^》]{2,40}》', work_match[1]))
            works.extend(re.findall('《'+re.escape(person['name'])+r'(?:军事文选|回忆录|自述)》', sentence))
            if dates:
                previous_year = safe_year(dates[-1][1], person)
                if previous_year:
                    implied_period=period_for(previous_year)
    return {'appointments': unique(appointments), 'operations': unique(operations), 'schools': unique(schools), 'works': unique(works), 'honours': []}


def extract_article(article, person):
    result = extract_memorial(article['body'], person) if article.get('kind') == 'memorial' else extract_prose(article['body'], person)
    result.update(sourceUrl=article['url'], sourceTitle=article.get('title', ''), bodySha256=article['sha256'], kind=article['kind'])
    if article.get('revisionId'):
        result['revisionId'] = article['revisionId']
    return result


def pick_spread(items, count):
    if len(items) <= count:
        return items
    indexes = {round(i * (len(items) - 1) / (count - 1)) for i in range(count)}
    return [items[i] for i in sorted(indexes)]


def short_role(role):
    role=re.sub(r'原(?=(?:副|代理)?'+ROLE_END+r')','',role)
    return role.replace('中国人民解放军', '').replace('中国人民志愿军', '志愿军').replace('中国工农红军', '红军').replace('（第18集团军）', '').replace('(第18集团军)', '')


def enrich_person(person, facts, field_sources, entry, contexts, curated_story=None):
    """Compose from noun/role facts, keeping disputed core fields untouched."""
    entry = entry or {'articles': []}
    articles = entry.get('articles', [])
    sections = []
    beginnings=[]
    beginning_sources=[]
    if facts.get('birth'):
        place=facts.get('hometown') if facts.get('hometownType')=='出生地' else None
        beginnings.append(str(facts['birth'])+'年，出生'+('于'+place if place else '')+'。')
        source=field_sources.get('birth')
        beginning_sources.extend(source if isinstance(source,list) else [source] if source else [])
    if facts.get('enlist'):
        beginnings.append(str(facts['enlist']['year'])+'年，'+facts['enlist']['text'].rstrip('。')+'。')
        source=field_sources.get('enlist')
        beginning_sources.extend(source if isinstance(source,list) else [source] if source else [])
    if facts.get('partyYear'):
        beginnings.append(str(facts['partyYear'])+'年，加入中国共产党。')
        source=field_sources.get('partyYear')
        beginning_sources.extend(source if isinstance(source,list) else [source] if source else [])
    if beginnings and beginning_sources:
        sections.append({'title':'早年与革命道路','text':''.join(beginnings),'sourceUrls':list(dict.fromkeys(beginning_sources))})
    appointments, operations, schools, works, honours = [], [], [], [], []
    for article in articles:
        url = article['sourceUrl']
        for key, dest in [('appointments', appointments), ('operations', operations)]:
            dest.extend([{**item, 'sourceUrl': url} for item in article[key]])
        for key, dest in [('schools', schools), ('works', works), ('honours', honours)]:
            dest.extend([(value, url) for value in article[key]])
    # Prefer the first attributed statement of a role. Repeated source entries
    # do not become repeated life stages or a manufactured longer biography.
    by_role={}
    for item in appointments:
        key=short_role(item['role'])
        if key not in by_role or (not by_role[key]['year'] and item['year']):
            by_role[key]=item
    appointments=list(by_role.values())
    operations = unique(operations)
    if not appointments and facts.get('knownRole'):
        url = field_sources.get('knownRole')
        if isinstance(url, list):
            url = url[0] if url else ''
        appointments = [{'year': None, 'role': facts['knownRole'], 'period': '任职经历', 'sourceUrl': url, 'locator': '原有任职事实'}]
    groups = defaultdict(list)
    for item in appointments:
        groups[item['period']].append(item)
    for label in ['早年经历', '早期军旅经历', '红军时期', '抗战前后任职', '抗日战争时期', '解放战争时期', '军队与国防建设', '后续任职', '任职经历']:
        items = sorted(groups[label],key=lambda item:(item['year'] is None,item['year'] or 2100))
        if not items:
            continue
        parts = []
        undated = []
        for item in pick_spread(items, 5):
            role = short_role(item['role'])
            if item['year']:
                parts.append(f'{item["year"]}年，任{role}。')
            else:
                undated.append(role)
        if undated:
            parts.append('任职经历包括'+ '；'.join(undated)+'。')
        sections.append({'title': label, 'text': ''.join(parts), 'sourceUrls': list(dict.fromkeys(item['sourceUrl'] for item in items if item['sourceUrl']))})
    if operations:
        names = list(dict.fromkeys(item['name'] for item in operations))
        sections.append({'title': '战役与行动', 'text': '其参战经历包括' + '、'.join(names[:12]) + '。', 'sourceUrls': list(dict.fromkeys(item['sourceUrl'] for item in operations))})
    for title, values, prefix in [('军事学习', schools, '学习经历涉及'), ('著述与记录', works, '留下的著述包括'), ('荣誉记录', honours, '所获荣誉包括')]:
        values = list(dict.fromkeys(values))
        if values:
            sections.append({'title': title, 'text': prefix + '、'.join(value for value, _ in values[:5]) + '。', 'sourceUrls': list(dict.fromkeys(url for _, url in values))})
    if curated_story:
        source_urls=[s['url'] for s in person['sources'] if 'people.com.cn' in s['url'] or '12371.cn' in s['url']]
        sections.insert(0, {'title': '一生中的一页', 'text': curated_story, 'sourceUrls': source_urls[:3]})
    # Highlight concrete roles and operations; never synthesize a personality,
    # a military victory or an outcome from a person's rank or hometown.
    if facts.get('knownRole'):
        concise = short_role(facts['knownRole'])
        tagline = ('参加'+operations[0]['name']+'，' if operations and len(concise)+len(operations[0]['name'])<=35 else '')+'曾任'+concise
    elif appointments:
        last = short_role(appointments[-1]['role'])
        concise = next((short_role(item['role']) for item in reversed(appointments) if len(short_role(item['role'])) <= 29), last)
        if operations and len(operations[0]['name']) + len(concise) <= 35:
            tagline = '参加' + operations[0]['name'] + '，曾任' + concise
        elif len(concise) <= 42:
            tagline = '曾任' + concise
        else:
            tagline = '任职经历涉及' + short_role(appointments[0]['role'])
    elif operations:
        tagline = '参加' + '、'.join(item['name'] for item in operations[:3])
    elif facts.get('enlist'):
        tagline = str(facts['enlist']['year']) + '年' + facts['enlist']['text'].rstrip('。')
    else:
        tagline = f'{person["rank"]}人物档案 · 具体军旅经历待补'
    original_tagline = person['tagline']
    if curated_story:
        tagline = original_tagline
    timeline = list(person['timeline'])
    dated = sorted([item for item in appointments if item['year']], key=lambda x: x['year'])
    for item in pick_spread(dated, 8):
        event = {'year': item['year'], 'text': '任' + short_role(item['role']) + '。', 'sourceUrl': item['sourceUrl']}
        if not any(e['year'] == event['year'] and e['text'] == event['text'] for e in timeline):
            timeline.append(event)
    timeline.sort(key=lambda item: item['year'])
    own_terms = '|'.join([item['name'] for item in operations] + [item['role'] for item in appointments])
    context_notes = [context for context in contexts if any(term in own_terms for term in context['keywords'])][:3]
    # A general context note explains the operation, not an unverified claim
    # about this person's command role or individual contribution.
    if sections:
        person['biographySections'] = sections
        person['story'] = '\n\n'.join(section['text'] for section in sections)
    person['tagline'] = tagline
    person['timeline'] = timeline
    if context_notes:
        person['historicalContexts'] = context_notes
    person['biographyStatus'] = 'expanded' if len(appointments) + len(operations) >= 4 or curated_story else 'partial'
    if person['biographyStatus']=='partial':
        closing=[]
        closing_sources=[]
        for field,text in [('grantYear',f'获授{person["rank"]}军衔'),('death','逝世')]:
            if not person.get(field):
                continue
            source=field_sources.get(field)
            if not source:
                continue
            closing.append(str(person[field])+'年，'+text+'。')
            closing_sources.extend(source if isinstance(source,list) else [source])
        if closing:
            sections.append({'title':'授衔与后续记载','text':''.join(closing),'sourceUrls':list(dict.fromkeys(closing_sources))})
            person['biographySections']=sections
            person['story']='\n\n'.join(section['text'] for section in sections)
    return person
