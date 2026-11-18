"""Read the local preview over HTTP; never execute page JavaScript."""
import hashlib
import json
from pathlib import Path
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = 'http://127.0.0.1:5173'
paths = ['/', '/generals/', '/people/', '/about/', '/people/suyu/',
         '/people/p0262/', '/card/?id=lizhen', '/topics/', *(f'/topics/{file.stem}/' for file in sorted((ROOT / 'data/topics').glob('*.json')) if file.name != 'sources.json'), '/robots.txt', '/sitemap.xml']
results = []
for path in paths:
    responses = []
    for user_agent in ['ShanheLocalQA/1.0', 'Googlebot']:
        request = urllib.request.Request(BASE + path, headers={'User-Agent': user_agent})
        with urllib.request.urlopen(request, timeout=15) as response:
            assert response.status == 200
            body = response.read()
            responses.append(body)
            content_type = response.headers.get_content_type()
    assert responses[0] == responses[1], 'Do not serve different content to a crawler'
    file_path = path.split('?')[0].lstrip('/')
    if path.split('?')[0].endswith('/'):
        file_path += 'index.html'
    assert responses[0] == (ROOT / 'dist/h5' / file_path).read_bytes()
    results.append({'path': path, 'status': 200, 'contentType': content_type,
                    'bytes': len(responses[0]), 'sha256': hashlib.sha256(responses[0]).hexdigest(),
                    'userAndCrawlerResponsesEqual': True, 'matchesBuiltFile': True})
try:
    urllib.request.urlopen(BASE + '/people/not-a-person/', timeout=15)
    raise AssertionError('Unknown profiles must return 404')
except urllib.error.HTTPError as error:
    assert error.code == 404
report = {'status': 'passed', 'base': BASE, 'pages': results, 'unknownProfileStatus': 404,
          'method': 'Raw HTTP against local static preview, no JavaScript or browser. User-agent label comparison is not a real Googlebot crawl. No production request or search-engine submission.'}
(ROOT / 'data/testing/seo-http-2026-11-17.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'本地HTTP通过：{len(paths)}个入口返回构建原文，普通与爬虫标识响应一致，未知人物404。')
