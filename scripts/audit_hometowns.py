"""Report differing regional wording without equating old and current borders."""
import json
from collections import defaultdict
from build_catalog import ROOT, OUT, load_source_records

people=json.loads((ROOT/'src/data/catalog.generated.json').read_text())
rejected={item['url'] for item in json.loads((OUT/'rejected-identities.json').read_text())}
records=[profile for profile in load_source_records() if profile['url'] not in rejected]
report=[]
for person in people:
    if person['name'] in ['李元','李道之','罗斌','张英']:continue
    versions=defaultdict(list)
    for profile in records:
        facts=profile['facts']
        if profile['name']!=person['name'] or profile['rank']!=person['rank'] or facts['hometownType']!=person['hometownType']:continue
        if not facts['province']:continue
        if facts['birth'] and person['birth'] and abs(facts['birth']-person['birth'])>2:continue
        versions[facts['province']].append({'place':facts['hometown'],'url':profile['url']})
    if len(versions)>1:
        report.append({'id':person['id'],'name':person['name'],'currentPlace':person['hometown'],'currentRegion':person['province'],'placeKind':person['hometownType'],'status':'withheld' if 'province' in person.get('pendingFields',[]) else 'source-wording-retained','versions':dict(versions),'note':'历史行政区划、原籍、出生地及迁居地须分别辨识；本报告不以省名不同直接认定某一来源错误。'})
(OUT/'hometown-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print('地域记载复查',len(report),'项；已暂缓发布',sum(row['status']=='withheld' for row in report),'项地域定值。')
