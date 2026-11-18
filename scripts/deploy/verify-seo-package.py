"""Check a production-style COS rewrite/archive entirely offline in a copy."""
import importlib.util
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import tarfile
import tempfile

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('receive', Path(__file__).with_name('receive.py'))
receive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receive)
origin = json.loads((ROOT / 'config/site.json').read_text())['origin']
asset_base = 'https://media-1301987491.cos.ap-beijing.myqcloud.com/shanhe/assets'
people = json.loads((ROOT / 'src/data/catalog.generated.json').read_text())

with tempfile.TemporaryDirectory(prefix='shanhe-seo-release-') as folder:
    work = Path(folder)
    build = work / 'dist/h5'
    shutil.copytree(ROOT / 'dist/h5', build)
    subprocess.run(['node', str(Path(__file__).with_name('prepare-assets.mjs'))], cwd=work,
                   env={**os.environ, 'SHANHE_ASSET_BASE_URL': asset_base}, check=True)
    assets = json.loads((work / 'release-assets.json').read_text())
    asset_urls = {asset['url'] for asset in assets}
    runtime = list((build / 'js/person-data').iterdir())
    assert len(runtime) == 1
    runtime = runtime[0]
    assert len(list(runtime.glob('*.json'))) == 1615
    photos = fallback_images = 0
    brand_icon = next(asset['url'] for asset in assets if asset['path'] == 'brand/icon.png')
    for person in people:
        html = (build / 'people' / person['id'] / 'index.html').read_text()
        assert f'rel="canonical" href="{origin}/people/{person["id"]}/"' in html
        image = re.search(r'property="og:image" content="([^"]+)"', html)
        assert image and image[1].split('?')[0] in asset_urls
        graph = json.loads(re.search(r'<script id="page-structured-data" type="application/ld\+json">(.*?)</script>', html)[1])['@graph']
        entity = graph[1]['mainEntity']
        payload = json.loads((runtime / (person['id'] + '.json')).read_text())
        inline = json.loads(re.search(r'<script id="page-person-data" type="application/json">(.*?)</script>', html)[1])
        assert payload == inline
        if payload['portraitMissing']:
            assert payload['portrait'].startswith('data:image/svg+xml;base64,')
            assert image[1] == brand_icon and 'image' not in entity
            fallback_images += 1
        else:
            assert payload['portrait'].split('?')[0] in asset_urls, person['id']
            assert image[1] == payload['portrait'] == entity['image']
            photos += 1
        assert not entity.get('image') or entity['image'].split('?')[0] in asset_urls
        assert origin + 'https:' not in html
    assert photos == 1609 and fallback_images == 5
    archive = work / 'code.tar.xz'
    with tarfile.open(archive, 'w:xz', preset=6) as output:
        for entry in build.iterdir():
            output.add(entry, arcname=entry.name, recursive=entry.name != 'static')
    extracted = work / 'accepted'
    extracted.mkdir()
    with archive.open('rb') as stream:
        receive.extract(stream, extracted)
    for person in people:
        path = Path('people') / person['id'] / 'index.html'
        assert (extracted / path).read_bytes() == (build / path).read_bytes()
    assert (extracted / 'robots.txt').is_file() and (extracted / 'sitemap.xml').is_file()
    for path in ('topics/index.html', 'topics/marshals/index.html', 'topics/shanghai/index.html'):
        assert (extracted / path).read_bytes() == (build / path).read_bytes()
    for resource in runtime.glob('*.json'):
        assert (extracted / resource.relative_to(build)).read_bytes() == resource.read_bytes()
    report = {'status': 'passed', 'profileHtmlAccepted': len(people), 'socialImagesOnCos': photos,
              'brandFallbackImages': fallback_images, 'topicHtmlAccepted': 3,
              'archiveBytes': archive.stat().st_size, 'archiveFormat': 'xz', 'assets': len(assets), 'runtimeJsonAccepted': 1615,
              'method': 'Production-style URL rewrite and code archive in temporary copied build; extracted by repository receive.py. No cloud upload, server mutation, installed-receiver update or production deployment.'}
(ROOT / 'data/testing/seo-release-2026-11-17.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'离线部署包通过：{len(people)}份人物HTML、{photos}个COS分享图地址，代码包{report["archiveBytes"]}字节。')
