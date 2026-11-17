"""Verify incremental upload boundaries without cloud credentials or network."""
import contextlib
import hashlib
import io
import json
import os
from pathlib import Path
import runpy
import sys
import tempfile
import types
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('upload-assets.py')


class AssetTests(unittest.TestCase):
    def test_only_missing_objects_are_uploaded_with_immutable_cache(self):
        calls = []
        class Client:
            def list_objects(self, **kwargs):
                self.prefix = kwargs['Prefix']
                return {'Contents': [{'Key': 'shanhe/assets/existing/old.jpg'}], 'IsTruncated': 'false'}
            def put_object(self, **kwargs):
                calls.append(kwargs)
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
                {'key': 'existing/old.jpg', 'path': 'portraits/old.jpg'},
                {'key': digest + '/new.jpg', 'path': 'portraits/new.jpg', 'sha256': digest,
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
                    self.assertEqual(len(calls), 1)
                    self.assertTrue(calls[0]['Key'].startswith('shanhe/assets/' + digest))
                    self.assertIn('immutable', calls[0]['CacheControl'])
                    self.assertTrue(calls[0]['EnableMD5'])
                    # Corrupt local bytes must fail before another network upload.
                    (target / 'new.jpg').write_bytes(b'corrupt')
                    with self.assertRaises(ValueError):
                        runpy.run_path(str(SCRIPT), run_name='__main__')
                    self.assertEqual(len(calls), 1)
            finally:
                os.chdir(previous)


if __name__ == '__main__':
    unittest.main()
