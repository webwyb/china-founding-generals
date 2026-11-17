"""Export compact, source-linked facts from ignored biography research pages."""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from biography_content import extract_article

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / '.cache/biography-research/pages'
OUT = ROOT / 'data/catalog'


def main(cache_dir=CACHE, output_file=OUT/'biography-evidence.json'):
    people = json.loads((ROOT / 'src/data/catalog.generated.json').read_text())
    previous_path=OUT/'biography-evidence.json'
    previous=json.loads(previous_path.read_text()).get('people',{}) if previous_path.exists() else {}
    cache = {}
    for path in cache_dir.glob('*.json'):
        article = json.loads(path.read_text())
        if article['status'] == 'ok':
            cache[article['url']] = article
    result, gaps = {}, []
    supplement_path = OUT / 'biography-supplement-sources.json'
    supplements = json.loads(supplement_path.read_text()) if supplement_path.exists() else {}
    memorial_path = cache_dir.parent/'memorial-supplements.json'
    memorial = json.loads(memorial_path.read_text()) if memorial_path.exists() else {}
    for person in people:
        # A fresh machine has no research cache. Keep versioned evidence and
        # replace only articles for which fresh public source text is present.
        saved=previous.get(person['id'],{})
        articles_by_url={a['sourceUrl']:a for a in saved.get('articles',[]) if saved.get('name')==person['name']}
        seen_urls=set()
        for source in person['sources'] + supplements.get(person['id'], []) + memorial.get(person['id'], []):
            article = cache.get(source['url'])
            if article and article['url'] not in seen_urls:
                if article.get('kind')=='encyclopedia':
                    identity=article.get('identity',{})
                    birth=identity.get('sourceBirth')
                    if (person.get('birth') and birth and person['birth']!=birth) or not ((birth and person.get('birth')==birth) or identity.get('foundingGrantMatch')):
                        articles_by_url.pop(article['url'],None)
                        continue
                articles_by_url[article['url']]=extract_article(article, person)
                seen_urls.add(article['url'])
        articles=list(articles_by_url.values())
        articles = [r for r in articles if any(r[key] for key in ['appointments','operations','schools','works','honours'])]
        def score(article):
            count = len(article['appointments']) + len(article['operations'])
            return (min(count, 4), {'people': 4, 'memorial-prose': 3, 'memorial': 3, 'wiki': 2, 'encyclopedia': 1}.get(article['kind'], 0), count)
        articles.sort(key=score, reverse=True)
        # Prefer attributed reference biographies; supplementary facts remain
        # individually sourced, and raw article prose is never exported.
        result[person['id']] = {'name': person['name'], 'articles': articles[:2]}
        count = sum(len(article['appointments']) + len(article['operations']) for article in articles)
        if count < 4:
            gaps.append(person['id'])
    output = json.dumps({'schemaVersion': 1, 'description': '有出处的任职、战役、院校和著述事实；原网页仅作研究缓存，不发布原文。', 'people': result}, ensure_ascii=False, indent=2) + '\n'
    output_file.parent.mkdir(parents=True,exist_ok=True)
    output_file.write_text(output)
    cache_dir.parent.mkdir(parents=True,exist_ok=True)
    (cache_dir.parent / 'gaps.json').write_text(json.dumps(gaps, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'people': len(result), 'withArticles': sum(bool(p['articles']) for p in result.values()), 'fewerThan4Facts': len(gaps), 'sha256': hashlib.sha256(output.encode()).hexdigest()}, ensure_ascii=False))


if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--cache-dir',type=Path,default=CACHE)
    parser.add_argument('--output-file',type=Path,default=OUT/'biography-evidence.json')
    args=parser.parse_args()
    main(args.cache_dir,args.output_file)
