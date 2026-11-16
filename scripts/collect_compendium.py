"""Supplement absent factual fields from the openly published regional roster.

Only names, dates and place names are extracted. This secondary compilation
never takes precedence over an available individual biography.
"""
import json
import re
import unicodedata
from catalog_sources import ROOT, OUT, fetch, BeautifulSoup
from build_catalog import PROVINCES, SIMPLIFY


def main():
    results=[]
    region_pattern='|'.join(PROVINCES)
    for page in range(1,6):
        url='https://taihangsummit.com/47460-2/'+(f'{page}/' if page>1 else '')
        doc=BeautifulSoup(fetch(url),'html.parser')
        body=doc.select_one('.entry-content')
        if body is None:raise ValueError('Unrecognized compendium structure')
        text=SIMPLIFY.convert(unicodedata.normalize('NFKC',body.get_text('\n',strip=True))).replace('贾干瑞','贾乾瑞').replace('高体干','高体乾')
        matches=list(re.finditer(r'([\u3400-\u9fff·\u00b7]{2,16})\s*\(\s*((?:18|19)\d{2})[^)\n]*\)',text))
        for index,match in enumerate(matches):
            previous=text[:match.start()]
            ranks=re.findall(r'开国(元帅|大将|上将|中将|少将)',previous)
            if not ranks:continue
            rank=ranks[-1]
            places=re.findall(r'(?:^|\n)('+region_pattern+r')(?:籍)?\s*\(\s*\d+人',previous)
            region=places[-1] if places else ''
            end=matches[index+1].start() if index+1<len(matches) else len(text)
            tail=text[match.end():end].strip()
            location=re.match(r'([\u3400-\u9fff·]{2,18})\s*[,，、]',tail)
            if not location:continue
            place=location[1]
            role=tail[location.end():].split('\n')[0].strip()
            role=re.sub(r'\([^)]*\)','',role).strip()
            if not 2<=len(role)<=90:role=None
            if role:role=role.replace('副政委','副政治委员').replace('政委','政治委员')
            explicit=next((p for p in PROVINCES if place.startswith(p)),None)
            if not explicit:
                # A heading listing multiple provinces does not identify which
                # province belongs to a person; require an explicit prefix then.
                if region not in PROVINCES:continue
                place=region+place
            name=match[1]
            birth=int(match[2])
            rest=match[0]
            dates=re.search(r'[-—–]\s*((?:19|20)\d{2})',rest)
            death=int(dates[1]) if dates else None
            if death and not birth<death<=2026:death=None
            life=str(birth)+'年'+('—'+str(death)+'年' if death else '出生')
            results.append({'name':name,'rank':rank,'kind':'compendium','url':url,'title':'太行英雄网 · 按籍贯排序的开国将帅名录','body':f'{name}({life})，{place}人。','images':[],'ok':True,'documentedRole':role,'structuredHometown':{'value':place,'type':'籍贯'}})
        print('Compendium page',page,'facts',len(results),flush=True)
    (OUT/'compendium-facts.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))


if __name__=='__main__':main()
