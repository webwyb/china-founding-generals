#!/usr/bin/env python3
"""Root-owned forced SSH command; accepts only a bounded static H5 archive."""
import fcntl
import errno
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import sys
import tarfile
import tempfile
import time
import urllib.request

ROOT = Path('/srv/shanhe')
HEALTH_URL = 'http://127.0.0.1/version.json'
HOST = '49.233.60.125'


def extract(stream, target):
    count = total = 0
    # Auto-detect compression so previously checked gzip releases remain retryable.
    with tarfile.open(fileobj=stream, mode='r|*') as archive:
        for member in archive:
            path = PurePosixPath(member.name)
            if path == PurePosixPath('.') and member.isdir():
                continue
            if (path.is_absolute() or '..' in path.parts or not path.parts
                    or any(part.startswith('.') for part in path.parts)):
                raise ValueError('Unsafe archive path')
            if path.parts[0] not in {'index.html', 'version.json', 'js', 'css', 'static',
                                      'people', 'generals', 'about', 'card', 'robots.txt', 'sitemap.xml'}:
                raise ValueError('Unexpected build entry')
            if path.parts[0] in {'robots.txt', 'sitemap.xml'} and (len(path.parts) != 1 or not member.isfile()):
                raise ValueError('Invalid SEO manifest')
            if path.parts[0] in {'people', 'generals', 'about', 'card'}:
                allowed_directory = (len(path.parts) == 1 or
                                     (path.parts[0] == 'people' and len(path.parts) == 2
                                      and re.fullmatch(r'[a-z0-9-]+', path.parts[1])))
                allowed_file = (path.name == 'index.html' and
                                (len(path.parts) == 2 or
                                 (path.parts[0] == 'people' and len(path.parts) == 3
                                  and re.fullmatch(r'[a-z0-9-]+', path.parts[1]))))
                if not ((member.isdir() and allowed_directory) or (member.isfile() and allowed_file)):
                    raise ValueError('Unexpected SEO page path')
            if not (member.isfile() or member.isdir()):
                raise ValueError('Links and special files are forbidden')
            count += 1
            total += member.size
            if count > 20000 or total > 1024**3 or member.size > 256 * 1024**2:
                raise ValueError('Build exceeds deployment limit')
            destination = target.joinpath(*path.parts)
            if member.isdir():
                destination.mkdir(parents=True, exist_ok=True, mode=0o755)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True, mode=0o755)
                # Retained files can be hard links to the previous release.
                # Break that link before writing, including for mutable filenames.
                destination.unlink(missing_ok=True)
                with archive.extractfile(member) as source, destination.open('wb') as output:
                    shutil.copyfileobj(source, output)
                destination.chmod(0o644)
    return {'files': count, 'bytes': total}


def retain_file(source, target):
    try:
        os.link(source, target)
    except OSError as error:
        if error.errno not in {errno.EXDEV, errno.EPERM, errno.ENOTSUP}:
            raise
        shutil.copy2(source, target)


def switch(target):
    temporary = ROOT / '.current-next'
    temporary.unlink(missing_ok=True)
    temporary.symlink_to(target)
    temporary.replace(ROOT / 'current')


def deploy(stream, sha, run, attempt):
    releases = ROOT / 'releases'
    current = ROOT / 'current'
    previous = current.resolve() if current.is_symlink() else None
    if shutil.disk_usage(ROOT).free < 2 * 1024**3:
        raise ValueError('Less than 2 GiB free; deployment stopped before changing the site')
    with tempfile.TemporaryDirectory(prefix='.incoming-', dir=releases) as staging:
        stage = Path(staging)
        started = time.monotonic()
        # Preserve content-addressed chunks for clients already reading the old page.
        if previous:
            for directory in ('js', 'css', 'static'):
                if (previous / directory).is_dir():
                    shutil.copytree(previous / directory, stage / directory, copy_function=retain_file)
        print(f'Retained existing assets in {time.monotonic() - started:.2f}s', flush=True)
        started = time.monotonic()
        received = extract(stream, stage)
        print(f'Received/extracted {received["files"]} entries, {received["bytes"]} bytes in {time.monotonic() - started:.2f}s', flush=True)
        version = json.loads((stage / 'version.json').read_text())
        if version != {'sha': sha, 'run': run, 'attempt': attempt}:
            raise ValueError('Build identity mismatch')
        if not (stage / 'index.html').is_file():
            raise ValueError('Missing index.html')
        for directory in ('js', 'css', 'static'):
            if not (stage / directory).is_dir():
                raise ValueError('Missing build assets')
        release = releases / f'{sha}-{run}-{attempt}'
        if release.exists():
            raise ValueError('Release already exists; rerun the Actions job')
        stage.chmod(0o755)
        stage.rename(release)
        switch(release)
        try:
            request = urllib.request.Request(HEALTH_URL, headers={'Host': HOST})
            with urllib.request.urlopen(request, timeout=15) as response:
                if json.load(response) != version:
                    raise ValueError('Health check returned another version')
            with urllib.request.urlopen(
                    urllib.request.Request('http://127.0.0.1/', headers={'Host': HOST}),
                    timeout=15) as response:
                if response.read() != (release / 'index.html').read_bytes():
                    raise ValueError('Health check returned another page')
        except Exception:
            if previous:
                switch(previous)
            else:
                current.unlink(missing_ok=True)
            raise
        print(f'Deployed {sha}; previous release: {previous}', flush=True)
        # Only generated release directories are pruned; preserve active and previous.
        old = sorted((p for p in releases.iterdir()
                      if p.is_dir() and not p.is_symlink()
                      and re.fullmatch(r'[0-9a-f]{40}-[0-9]+-[0-9]+', p.name)),
                     key=lambda p: p.stat().st_mtime, reverse=True)
        for obsolete in old[5:]:
            if obsolete not in {release, previous}:
                shutil.rmtree(obsolete)


def main():
    match = re.fullmatch(r'deploy ([0-9a-f]{40}) ([0-9]{1,20}) ([0-9]{1,6})',
                         os.environ.get('SSH_ORIGINAL_COMMAND', ''))
    if not match:
        raise ValueError('Only the deploy command is allowed')
    os.umask(0o022)
    with (ROOT / '.deploy.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        deploy(sys.stdin.buffer, *match.groups())


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print(f'Deployment failed: {error}', file=sys.stderr)
        sys.exit(1)
