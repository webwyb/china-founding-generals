"""Parse built HTTP documents without JavaScript; audit complete content and links."""
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import sys
from urllib.parse import urlsplit, unquote
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'dist/h5'
ORIGIN = 'https://shanhe.binnwu.top'


class Document(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.meta, self.canonical, self.links, self.assets = {}, [], [], []
        self.text, self.titles, self.h1s, self.json_ld = [], [], [], []
        self.active = None
        self.buffer = []
        self.feed(path.read_text(encoding='utf-8'))

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'meta':
            key = attrs.get('name', attrs.get('property'))
            if key:
                assert key not in self.meta, f'Duplicate meta: {key}'
                self.meta[key] = attrs.get('content', '')
        if tag == 'link' and attrs.get('rel') == 'canonical':
            self.canonical.append(attrs.get('href'))
        if tag == 'a':
            assert attrs.get('href'), 'Every anchor must have a destination'
            self.links.append(attrs['href'])
        if tag == 'img':
            assert 'alt' in attrs, 'Images need alternative text'
            self.assets.append(attrs['src'])
        if tag == 'script' and attrs.get('src'):
            self.assets.append(attrs['src'])
        if tag == 'link' and attrs.get('rel') in ('stylesheet', 'modulepreload', 'icon'):
            self.assets.append(attrs['href'])
        if tag in ('title', 'h1') or (tag == 'script' and attrs.get('type') == 'application/ld+json'):
            self.active, self.buffer = tag, []

    def handle_data(self, data):
        if self.active:
            self.buffer.append(data)
        if self.active not in ('title', 'script'):
            self.text.append(data)

    def handle_endtag(self, tag):
        if self.active != tag:
            return
        value = ''.join(self.buffer)
        if tag == 'title':
            self.titles.append(value)
        elif tag == 'h1':
            self.h1s.append(value)
        else:
            self.json_ld.append(json.loads(value))
        self.active, self.buffer = None, []


def compact(text):
    return re.sub(r'\s+', '', text)


def audit(path, canonical, indexed=True):
    doc = Document(path)
    assert len(doc.titles) == 1 and doc.titles[0]
    assert len(doc.h1s) == 1 and doc.h1s[0]
    assert doc.meta['description'] and len(doc.meta['description']) <= 200
    assert doc.canonical == ([canonical] if canonical else [])
    assert ('noindex' not in doc.meta['robots']) == indexed
    assert doc.meta['og:title'] == doc.titles[0]
    assert doc.meta['og:description'] == doc.meta['description']
    assert doc.meta.get('og:url') == canonical
    assert len(doc.json_ld) == 1
    assert doc.json_ld[0]['@context'] == 'https://schema.org'
    for asset in doc.assets:
        if asset.startswith(('https://', 'data:')):
            continue
        assert asset.startswith('/'), f'Nested page has relative asset: {asset}'
        assert (OUTPUT / unquote(urlsplit(asset).path).lstrip('/')).is_file(), asset
    return doc


people = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
assert len(people) == 1614
expected_urls = {ORIGIN + path for path in ('/', '/generals/', '/people/', '/about/')}
titles = set()
for person in people:
    url = ORIGIN + '/people/' + person['id'] + '/'
    path = OUTPUT / 'people' / person['id'] / 'index.html'
    doc = audit(path, url)
    expected_urls.add(url)
    assert doc.h1s == [person['name']], person['id']
    assert person['name'] in doc.titles[0] and person['rank'] in doc.titles[0]
    assert doc.titles[0] not in titles, f'Indistinguishable title: {person["id"]}'
    titles.add(doc.titles[0])
    body = compact(''.join(doc.text))
    for section in person.get('biographySections', []):
        assert compact(section['text']) in body, f'Missing biography: {person["id"]}'
        assert set(section['sourceUrls']).issubset(doc.links)
    for item in person['timeline']:
        assert compact(item['text']) in body, f'Missing timeline: {person["id"]}'
    for context in person.get('historicalContexts', []):
        assert compact(context['text']) in body
    assert {source['url'] for source in person['sources']}.issubset(doc.links)
    if person.get('pendingFields'):
        assert '资料待核实' in body
    graph = doc.json_ld[0]['@graph']
    entity = graph[1]['mainEntity']
    assert entity['@type'] == 'Person' and entity['identifier'] == person['id']
    assert entity['name'] == person['name'] and entity['url'] == url
    # Partial year fields must not acquire invented month/day values in schema.
    assert 'birthDate' not in entity and 'deathDate' not in entity
    assert ('image' in entity) == (not person.get('portraitMissing', False))
    assert '/people/' in doc.links and '/generals/' in doc.links

for path in ('/', '/generals/', '/people/', '/about/'):
    doc = audit(OUTPUT / path.lstrip('/') / 'index.html', ORIGIN + path)
    if path == '/people/':
        assert {f'/people/{person["id"]}/' for person in people}.issubset(doc.links)
audit(OUTPUT / 'card/index.html', None, indexed=False)
tree = ET.parse(OUTPUT / 'sitemap.xml')
locations = [element.text for element in tree.findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
assert len(locations) == len(set(locations)) == 1618
assert set(locations) == expected_urls
assert all('#' not in url and '?' not in url for url in locations)
assert 'Sitemap: ' + ORIGIN + '/sitemap.xml' in (OUTPUT / 'robots.txt').read_text()
assert 'Disallow: /' not in (OUTPUT / 'robots.txt').read_text()
report = {'status': 'passed', 'people': len(people), 'uniquePersonTitles': len(titles),
          'staticHtmlPages': len(people) + 5, 'sitemapUrls': len(locations),
          'checks': ['HTML parsed without JavaScript', 'Complete biographies, timelines, context and citation links',
                     'Single canonical, description, Open Graph and JSON-LD', 'Distinct homonym titles',
                     'Missing photos and pending fields retained', 'Absolute local assets exist',
                     'Full directory links to all 1614 profiles', 'Card is noindex and excluded from sitemap',
                     'Legacy hash migration function', 'Sitemap matches canonical files'],
          'method': 'Python HTMLParser and XML parser on production build; explicit Node assertions for legacy routes. No browser or search-engine indexing implied.'}
(ROOT / 'data/testing/seo.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'SEO校验通过：{len(people)}份完整人物HTML、{len(titles)}个独立标题、{len(locations)}条规范站点地图地址。')
