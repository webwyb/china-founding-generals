"""Build a code-only bundle; stamp the actual deployment attempt after download."""
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile

OPS = Path(__file__).resolve().parent
ARCHIVE_NAME = 'code.tar.xz'


def archive_path(release, metadata):
    name = metadata.get('archive_name', 'code.tar.gz')
    if name not in {'code.tar.gz', ARCHIVE_NAME}:
        raise ValueError('Unexpected archive format')
    return release / name


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def identity(sha, run, attempt=None):
    if not re.fullmatch(r'[0-9a-f]{40}', sha) or not re.fullmatch(r'[0-9]{1,20}', run):
        raise ValueError('Invalid build identity')
    result = {'sha': sha, 'run': run}
    if attempt is not None:
        if not re.fullmatch(r'[0-9]{1,6}', attempt):
            raise ValueError('Invalid deployment attempt')
        result['attempt'] = attempt
    return result


def build(root, release, sha, run):
    metadata = identity(sha, run)
    for name in ('index.html', 'js', 'css', 'static'):
        if not (root / name).exists():
            raise ValueError('Missing checked build entry: ' + name)
    release.mkdir(parents=True, exist_ok=True)
    with tarfile.open(release / ARCHIVE_NAME, 'w:xz', preset=6) as output:
        for entry in sorted(root.iterdir()):
            if entry.name != 'version.json':
                output.add(entry, arcname=entry.name, recursive=entry.name != 'static')
    shutil.copyfile('release-assets.json', release / 'release-assets.json')
    metadata['archive_name'] = ARCHIVE_NAME
    metadata['archive_sha256'] = digest(release / ARCHIVE_NAME)
    metadata['assets_sha256'] = digest(release / 'release-assets.json')
    (release / 'build.json').write_text(json.dumps(metadata) + '\n')
    for name in ('publish.sh', 'known_hosts', 'check-assets.py', 'asset_readiness.py', 'package-release.py', 'check-superseded.py'):
        shutil.copyfile(OPS / name, release / name)
    print(f'Code-only archive: {(release / ARCHIVE_NAME).stat().st_size} bytes (xz); no static file payloads.')


def stamp(release, sha, run, attempt):
    version = identity(sha, run, attempt)
    metadata = json.loads((release / 'build.json').read_text())
    archive = archive_path(release, metadata)
    if (metadata.get('sha') != sha or metadata.get('run') != run
            or metadata.get('archive_sha256') != digest(archive)
            or metadata.get('assets_sha256') != digest(release / 'release-assets.json')):
        raise ValueError('Checked artifact identity or digest mismatch')
    temporary = release / ('stamped-' + archive.name)
    try:
        mode = 'w:xz' if archive.suffix == '.xz' else 'w:gz'
        options = {'preset': 6} if mode == 'w:xz' else {}
        with tarfile.open(archive, 'r:*') as source, tarfile.open(temporary, mode, **options) as output:
            seen = set()
            for member in source:
                path = PurePosixPath(member.name)
                if (path.is_absolute() or any(part.startswith('.') for part in path.parts)
                        or member.name in seen or not (member.isfile() or member.isdir())
                        or (path.parts[0] == 'static' and path != PurePosixPath('static'))):
                    raise ValueError('Unexpected code archive entry')
                seen.add(member.name)
                if member.name != 'version.json':
                    output.addfile(member, source.extractfile(member) if member.isfile() else None)
            data = (json.dumps(version) + '\n').encode()
            member = tarfile.TarInfo('version.json')
            member.mode = 0o644
            member.size = len(data)
            output.addfile(member, io.BytesIO(data))
        temporary.replace(archive)
    finally:
        temporary.unlink(missing_ok=True)
    print(f'Stamped deployment {sha} / {run} / attempt {attempt}.')


if __name__ == '__main__':
    if sys.argv[1:] == ['build']:
        build(Path('dist/h5'), Path('release'), os.environ['GITHUB_SHA'], os.environ['GITHUB_RUN_ID'])
    elif sys.argv[1:] == ['stamp']:
        stamp(Path('release'), os.environ['GITHUB_SHA'], os.environ['GITHUB_RUN_ID'], os.environ['GITHUB_RUN_ATTEMPT'])
    else:
        raise SystemExit('Use build or stamp')
