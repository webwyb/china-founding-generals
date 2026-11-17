"""Exercise code-only packaging, independent readiness, and deploy-only retries."""
import contextlib
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest
from unittest.mock import patch
import urllib.error


def module(name):
    spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


package = module('package-release')
readiness = module('check-assets')
superseded = module('check-superseded')
receive = module('receive')


class ReleaseTests(unittest.TestCase):
    def test_publish_from_artifact_without_checkout_and_retry_only_deploy(self):
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            root = work / 'dist/h5'
            for name in ('js', 'css', 'static'):
                (root / name).mkdir(parents=True)
            (root / 'index.html').write_text('<html>home</html>')
            (work / 'release-assets.json').write_text('[]\n')
            previous = Path.cwd()
            try:
                os.chdir(work)
                package.build(root, work / 'release', 'a' * 40, '123')
            finally:
                os.chdir(previous)
            checked = (work / 'release/code.tar.xz').read_bytes()
            commands = work / 'bin'
            commands.mkdir()
            fakes = {
                'gh': """import json, os, sys
if 'compare/' in sys.argv[2]:
    print(json.dumps({'status':'ahead', 'total_commits':1, 'files':[{'filename':os.environ['CHANGED_FILE']}]}))
else:
    print('b'*40)
""",
                'ssh': """import io, json, os, sys, tarfile
with tarfile.open(fileobj=io.BytesIO(sys.stdin.buffer.read()), mode='r:*') as archive:
    version=json.load(archive.extractfile('version.json'))
assert sys.argv[-1] == 'deploy ' + version['sha'] + ' ' + version['run'] + ' ' + version['attempt']
assert version['attempt'] == os.environ['GITHUB_RUN_ATTEMPT']
open('published.json','w').write(json.dumps(version))
""",
                'curl': "print(open('published.json').read())\n",
            }
            for name, body in fakes.items():
                command = commands / name
                command.write_text('#!' + sys.executable + '\n' + body)
                command.chmod(0o755)
            env = {**os.environ, 'PATH': str(commands) + os.pathsep + os.environ['PATH'],
                   'GITHUB_SHA': 'a' * 40, 'GITHUB_RUN_ID': '123', 'GITHUB_REPOSITORY': 'owner/repo',
                   'DEPLOY_SSH_KEY': 'unit-test-key', 'GITHUB_STEP_SUMMARY': str(work / 'summary'),
                   'CHANGED_FILE': 'docs/DEPLOYMENT.md'}
            # No repository scripts, node_modules, SDK or media exist in the downloaded bundle.
            for attempt in ('1', '2'):
                (work / 'release/code.tar.xz').write_bytes(checked)
                result = subprocess.run(['bash', 'release/publish.sh'], cwd=work,
                                        env={**env, 'GITHUB_RUN_ATTEMPT': attempt},
                                        check=True, capture_output=True, text=True)
                self.assertIn('Published https://shanhe.binnwu.top', result.stdout)
                self.assertEqual(json.loads((work / 'published.json').read_text())['attempt'], attempt)
            (work / 'published.json').unlink()
            result = subprocess.run(['bash', 'release/publish.sh'], cwd=work,
                                    env={**env, 'GITHUB_RUN_ATTEMPT': '3', 'CHANGED_FILE': 'src/app.tsx'},
                                    check=True, capture_output=True, text=True)
            self.assertIn('Skipping superseded commit', result.stdout)
            self.assertFalse((work / 'published.json').exists())

    def test_small_archive_and_retry_identity_are_accepted_by_receiver(self):
        with tempfile.TemporaryDirectory() as folder:
            work = Path(folder)
            root = work / 'dist/h5'
            for name in ('js', 'css', 'static', 'people/suyu'):
                (root / name).mkdir(parents=True)
            (root / 'index.html').write_text('<html>home</html>')
            (root / 'js/app.js').write_text('const ok=true')
            (root / 'css/app.css').write_text('body{}')
            (root / 'people/suyu/index.html').write_text('<h1>粟裕</h1>')
            (root / 'static/large.jpg').write_bytes(os.urandom(1024 * 1024))
            (work / 'release-assets.json').write_text('[]\n')
            previous = Path.cwd()
            try:
                os.chdir(work)
                package.build(root, work / 'release', 'a' * 40, '123')
                archive = work / 'release/code.tar.xz'
                checked = archive.read_bytes()
                self.assertLess(len(checked), 4096)
                with tarfile.open(archive) as tar:
                    self.assertNotIn('static/large.jpg', tar.getnames())
                    self.assertTrue(tar.getmember('static').isdir())
                # Same checked artifact, new deploy attempt; no rebuild or media transfer.
                for attempt in ('1', '2'):
                    archive.write_bytes(checked)
                    package.stamp(work / 'release', 'a' * 40, '123', attempt)
                    accepted = work / ('accepted-' + attempt)
                    accepted.mkdir()
                    with archive.open('rb') as stream:
                        receive.extract(stream, accepted)
                    self.assertEqual(json.loads((accepted / 'version.json').read_text()),
                                     {'sha': 'a' * 40, 'run': '123', 'attempt': attempt})
                    self.assertEqual((accepted / 'people/suyu/index.html').read_text(), '<h1>粟裕</h1>')
                    self.assertEqual(list((accepted / 'static').iterdir()), [])
                archive.write_bytes(checked)
                with self.assertRaises(ValueError):
                    package.stamp(work / 'release', 'b' * 40, '123', '3')
                archive.write_bytes(checked + b'tampered')
                with self.assertRaises(ValueError):
                    package.stamp(work / 'release', 'a' * 40, '123', '3')
                archive.write_bytes(checked)
                (work / 'release/release-assets.json').write_text('[{}]')
                with self.assertRaises(ValueError):
                    package.stamp(work / 'release', 'a' * 40, '123', '3')
            finally:
                os.chdir(previous)

    def test_one_public_marker_confirms_manifest_without_credentials_or_media_scan(self):
        digest = hashlib.sha256(b'portrait').hexdigest()
        key = digest + '/portrait.jpg'
        asset = {'key': key, 'sha256': digest, 'path': 'images/portrait.jpg',
                 'url': readiness.BASE + key, 'size': 8}
        marker_key, marker_body = readiness.marker([asset])
        self.assertEqual(readiness.marker([asset, asset]), (marker_key, marker_body))
        self.assertNotEqual(readiness.marker([{**asset, 'size': 9}])[0], marker_key)
        response = io.BytesIO(marker_body)
        response.status = 200
        with patch.object(readiness.urllib.request, 'urlopen', return_value=response) as request:
            readiness.wait_for_assets([asset, asset], 0)
            self.assertEqual(request.call_count, 1)
            self.assertEqual(request.call_args.args[0].get_method(), 'GET')
            self.assertEqual(request.call_args.args[0].full_url, readiness.BASE + marker_key)
        for content in (b'', b'wrong marker', marker_body + b'tampered'):
            response = io.BytesIO(content)
            response.status = 200
            with patch.object(readiness.urllib.request, 'urlopen', return_value=response):
                with self.assertRaisesRegex(RuntimeError, 'Sync COS assets'):
                    readiness.wait_for_assets([asset], 0)
        with patch.object(readiness.urllib.request, 'urlopen',
                          side_effect=urllib.error.HTTPError(asset['url'], 404, 'missing', {}, None)):
            with self.assertRaises(RuntimeError):
                readiness.wait_for_assets([asset], 0)
        with patch.object(readiness, 'check', side_effect=['missing', None]) as check, \
                patch.object(readiness.time, 'sleep'):
            readiness.wait_for_assets([asset], 30)
            self.assertEqual(check.call_count, 2)
        with patch.object(readiness.urllib.request, 'urlopen') as request:
            with self.assertRaises(ValueError):
                readiness.wait_for_assets([{**asset, 'url': 'https://other.example/file'}], 0)
            request.assert_not_called()

    def test_legacy_checked_gzip_artifacts_remain_retryable(self):
        with tempfile.TemporaryDirectory() as folder:
            release = Path(folder)
            archive = release / 'code.tar.gz'
            with tarfile.open(archive, 'w:gz') as tar:
                item = tarfile.TarInfo('index.html')
                item.size = 4
                tar.addfile(item, io.BytesIO(b'home'))
            (release / 'release-assets.json').write_text('[]')
            (release / 'build.json').write_text(json.dumps({'sha': 'a' * 40, 'run': '123',
                'archive_sha256': package.digest(archive), 'assets_sha256': package.digest(release / 'release-assets.json')}))
            package.stamp(release, 'a' * 40, '123', '2')
            with tarfile.open(archive) as tar:
                self.assertEqual(json.load(tar.extractfile('version.json'))['attempt'], '2')

    def test_docs_after_build_do_not_suppress_application_deployment(self):
        compare = {'status': 'ahead', 'total_commits': 1,
                   'files': [{'filename': 'README.md'}, {'filename': 'docs/reviews/proof.jpg'},
                             {'filename': 'data/testing/report.json'}]}
        self.assertTrue(superseded.documentation_only(compare))
        for changed in ('src/app.tsx', 'public/portraits/person.jpg', '.github/workflows/ci.yml'):
            self.assertFalse(superseded.documentation_only({**compare, 'files': [{'filename': changed}]}))
        self.assertFalse(superseded.documentation_only({**compare, 'status': 'diverged'}))
        self.assertFalse(superseded.documentation_only({**compare, 'total_commits': 251}))
        self.assertFalse(superseded.documentation_only({**compare, 'files': [{'filename': 'README.md'}] * 300}))
        self.assertFalse(superseded.documentation_only({**compare, 'files': [
            {'filename': 'docs/old.tsx', 'previous_filename': 'src/app.tsx'}]}))


if __name__ == '__main__':
    with contextlib.redirect_stdout(io.StringIO()):
        unittest.main()
