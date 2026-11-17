"""Exercise archive isolation, atomic publication, retained chunks, and rollback."""
import importlib.util
import io
import json
from pathlib import Path
import tarfile
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('receive', Path(__file__).with_name('receive.py'))
receive = importlib.util.module_from_spec(spec)
spec.loader.exec_module(receive)


def archive(entries):
    output = io.BytesIO()
    with tarfile.open(fileobj=output, mode='w:gz') as tar:
        for name, content in entries.items():
            entry = tarfile.TarInfo(name)
            if content is None:
                entry.type = tarfile.SYMTYPE
                entry.linkname = '/tmp/outside'
                tar.addfile(entry)
            else:
                data = content.encode()
                entry.size = len(data)
                tar.addfile(entry, io.BytesIO(data))
    output.seek(0)
    return output


class DeploymentTests(unittest.TestCase):
    def test_reject_traversal_links_and_unexpected_files(self):
        for name, value in [('../escape', 'x'), ('/absolute', 'x'),
                            ('static/link', None), ('.ssh/authorized_keys', 'x'),
                            ('receive.py', 'x'), ('people/unsafe.js', 'x'),
                            ('people/suyu/run.py', 'x'), ('robots.txt/nested', 'x')]:
            with self.subTest(name=name), tempfile.TemporaryDirectory() as folder:
                with self.assertRaises(ValueError):
                    receive.extract(archive({name: value}), Path(folder))
                self.assertEqual(list(Path(folder).iterdir()), [])

    def test_accept_only_generated_seo_documents(self):
        entries = {'robots.txt': 'User-agent: *', 'sitemap.xml': '<urlset/>',
                   'people/index.html': '<h1>全部档案</h1>',
                   'people/suyu/index.html': '<h1>粟裕</h1>',
                   'generals/index.html': '<h1>名录</h1>',
                   'about/index.html': '<h1>说明</h1>',
                   'card/index.html': '<h1>纪念卡</h1>'}
        with tempfile.TemporaryDirectory() as folder:
            receive.extract(archive(entries), Path(folder))
            for path, content in entries.items():
                self.assertEqual((Path(folder) / path).read_text(), content)

    def test_reject_arbitrary_ssh_commands(self):
        with patch.dict(receive.os.environ, {'SSH_ORIGINAL_COMMAND': 'bash -c id'}):
            with self.assertRaises(ValueError):
                receive.main()

    def test_publish_preserve_chunks_and_roll_back(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'releases').mkdir()
            old = root / 'releases' / ('a' * 40 + '-1-1')
            (old / 'js').mkdir(parents=True)
            (old / 'js' / 'old.js').write_text('old chunk')
            (root / 'current').symlink_to(old)
            sha = 'b' * 40
            version = {'sha': sha, 'run': '2', 'attempt': '1'}
            entries = {'index.html': '<html>new</html>', 'version.json': json.dumps(version),
                       'js/new.js': 'new', 'css/new.css': 'new', 'static/icon.svg': '<svg/>'}

            def healthy(request, timeout):
                if request.full_url.endswith('version.json'):
                    return io.BytesIO(json.dumps(version).encode())
                return io.BytesIO(b'<html>new</html>')

            with patch.object(receive, 'ROOT', root), \
                    patch.object(receive.urllib.request, 'urlopen', side_effect=healthy):
                receive.deploy(archive(entries), sha, '2', '1')
            published = (root / 'current').resolve()
            self.assertEqual((published / 'js/old.js').read_text(), 'old chunk')
            self.assertEqual((published / 'js/new.js').read_text(), 'new')
            # A mismatched manifest never changes the active symlink.
            with patch.object(receive, 'ROOT', root):
                with self.assertRaises(ValueError):
                    receive.deploy(archive(entries), 'c' * 40, '3', '1')
            self.assertEqual((root / 'current').resolve(), published)
            # A failed post-switch HTTP check restores the previously active version.
            entries['version.json'] = json.dumps({'sha': 'c' * 40, 'run': '3', 'attempt': '1'})
            with patch.object(receive, 'ROOT', root), \
                    patch.object(receive.urllib.request, 'urlopen', side_effect=OSError('unhealthy')):
                with self.assertRaises(OSError):
                    receive.deploy(archive(entries), 'c' * 40, '3', '1')
            self.assertEqual((root / 'current').resolve(), published)


if __name__ == '__main__':
    unittest.main()
