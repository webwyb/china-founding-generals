"""Verify incremental upload boundaries without cloud credentials or network."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import runpy
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('upload-assets.py')


class AssetTests(unittest.TestCase):
    def test_prepare_nested_html_and_absolute_seo_image_urls(self):
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            root = work / 'dist/h5'
            images = root / 'static/images'
            images.mkdir(parents=True)
            (images / 'person.jpg').write_bytes(b'portrait')
            page = root / 'people/suyu/index.html'
            page.parent.mkdir(parents=True)
            page.write_text('<link rel="canonical" href="https://shanhe.binnwu.top/people/suyu/">'
                            '<meta property="og:image" content="https://shanhe.binnwu.top/static/images/person.jpg">'
                            '<img src="/static/images/person.jpg">'
                            '<img src="https://elsewhere.example/static/images/person.jpg">')
            (root / 'app.js').write_text('const image="/static/images/person.jpg";')
            (root / 'app.css').write_text('body{background:url("../static/images/person.jpg")}')
            profile = root / 'js/person-data/fixture/suyu.json'
            profile.parent.mkdir(parents=True)
            profile.write_text(json.dumps({'portrait': '/static/images/person.jpg'}))
            with patch.dict(os.environ, {'SHANHE_ASSET_BASE_URL': 'https://assets.example/objects'}):
                subprocess.run(['node', str(Path(__file__).with_name('prepare-assets.mjs'))],
                               cwd=work, check=True, capture_output=True)
            asset = json.loads((work / 'release-assets.json').read_text())[0]['url']
            content = page.read_text()
            self.assertEqual(content.count(asset), 2)
            self.assertIn('https://shanhe.binnwu.top/people/suyu/', content)
            self.assertIn('https://elsewhere.example/static/images/person.jpg', content)
            self.assertNotIn('shanhe.binnwu.tophttps:', content)
            self.assertIn(asset, (root / 'app.js').read_text())
            self.assertIn(asset, (root / 'app.css').read_text())
            self.assertEqual(json.loads(profile.read_text())['portrait'], asset)

    def test_only_missing_objects_are_uploaded_with_immutable_cache(self):
        calls = []
        old_digest = hashlib.sha256(b'old portrait').hexdigest()
        old_key = old_digest + '/old.jpg'
        class Client:
            def list_objects(self, **kwargs):
                self.prefix = kwargs['Prefix']
                return {'Contents': [{'Key': 'shanhe/assets/' + old_key,
                                      'Size': getattr(self, 'old_size', 12)}], 'IsTruncated': 'false'}
            def put_object(self, **kwargs):
                payload = kwargs['Body'].read()
                kwargs['Body'].seek(0)
                kwargs['Payload'] = payload
                calls.append(kwargs)
                if getattr(self, 'fail', False):
                    raise ConnectionError('simulated write timeout')
        fake = types.ModuleType('qcloud_cos')
        client = Client()
        fake.CosConfig = lambda **kwargs: None
        fake.CosS3Client = lambda _: client
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            target = work / 'dist/h5/static/portraits'
            target.mkdir(parents=True)
            (target / 'new.jpg').write_bytes(b'new portrait')
            digest = hashlib.sha256(b'new portrait').hexdigest()
            assets = [
                {'key': old_key, 'path': 'portraits/old.jpg', 'sha256': old_digest, 'size': 12,
                 'url': 'https://media-1301987491.cos.ap-beijing.myqcloud.com/shanhe/assets/' + old_key},
                {'key': digest + '/new.jpg', 'path': 'portraits/new.jpg', 'sha256': digest,
                 'size': 12,
                 'url': 'https://media-1301987491.cos.ap-beijing.myqcloud.com/shanhe/assets/' + digest + '/new.jpg'},
            ]
            (work / 'release-assets.json').write_text(json.dumps(assets))
            previous = Path.cwd()
            try:
                os.chdir(work)
                with patch.dict(sys.modules, {'qcloud_cos': fake}), patch.dict(os.environ, {
                    'COS_BUCKET': 'media-1301987491', 'COS_REGION': 'ap-beijing',
                    'COS_SECRET_ID': 'test-id', 'COS_SECRET_KEY': 'test-key',
                }), contextlib.redirect_stdout(io.StringIO()):
                    runpy.run_path(str(SCRIPT), run_name='__main__')
                    self.assertEqual(client.prefix, 'shanhe/assets/')
                    self.assertEqual(len(calls), 2)
                    self.assertTrue(calls[0]['Key'].startswith('shanhe/assets/' + digest))
                    self.assertIn('immutable', calls[0]['CacheControl'])
                    self.assertTrue(calls[0]['EnableMD5'])
                    self.assertEqual(calls[0]['Payload'], b'new portrait')
                    self.assertTrue(calls[1]['Key'].startswith('shanhe/assets/_ready/'))
                    self.assertEqual(json.loads(calls[1]['Payload'])['objects'], 2)
                    # Corrupt local bytes must fail before another network upload.
                    (target / 'new.jpg').write_bytes(b'corrupt')
                    with self.assertRaises(ValueError):
                        runpy.run_path(str(SCRIPT), run_name='__main__')
                    self.assertEqual(len(calls), 2)
                    # A failed write identifies the asset and preserves its cause.
                    (target / 'new.jpg').write_bytes(b'new portrait')
                    client.fail = True
                    with self.assertRaisesRegex(RuntimeError, 'portraits/new.jpg') as failure:
                        runpy.run_path(str(SCRIPT), run_name='__main__')
                    self.assertIsInstance(failure.exception.__cause__, ConnectionError)
                    self.assertEqual(len(calls), 3)
                    self.assertFalse('/_ready/' in calls[-1]['Key'])
                    # A wrong-size immutable object must not produce a readiness marker.
                    client.old_size = 1
                    (work / 'release-assets.json').write_text(json.dumps(assets[:1]))
                    with self.assertRaisesRegex(ValueError, 'unexpected size'):
                        runpy.run_path(str(SCRIPT), run_name='__main__')
                    self.assertEqual(len(calls), 3)
            finally:
                os.chdir(previous)


if __name__ == '__main__':
    unittest.main()
