"""Read-only public COS readiness check. Never upload media from web deployment."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path, PurePosixPath
import re
import time
import urllib.error
import urllib.request

BASE = 'https://media-1301987491.cos.ap-beijing.myqcloud.com/shanhe/assets/'


def validate(assets):
    for asset in assets:
        if (not re.fullmatch(r'[0-9a-f]{64}/[A-Za-z0-9_.-]+', asset['key'])
                or asset['sha256'] != asset['key'].split('/')[0]
                or PurePosixPath(asset['path']).name != asset['key'].split('/')[1]
                or asset['url'] != BASE + asset['key']
                or not isinstance(asset['size'], int) or asset['size'] < 0):
            raise ValueError('Unexpected asset manifest entry')
    return list({asset['key']: asset for asset in assets}.values())


def check(asset, deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return 'readiness deadline reached'
    request = urllib.request.Request(asset['url'], method='HEAD')
    try:
        with urllib.request.urlopen(request, timeout=min(10, remaining)) as response:
            if response.status != 200 or response.headers.get('Content-Length') != str(asset['size']):
                return 'unexpected status or object size'
    except (urllib.error.URLError, OSError) as error:
        return str(error)
    return None


def wait_for_assets(assets, wait_seconds):
    pending = validate(assets)
    count = len(pending)
    deadline = time.monotonic() + max(15, wait_seconds)
    while pending:
        with ThreadPoolExecutor(max_workers=16) as pool:
            results = list(pool.map(lambda asset: check(asset, deadline), pending))
        errors = [(asset, error) for asset, error in zip(pending, results) if error]
        if not errors:
            break
        print(f'COS readiness: {len(errors)}/{count} assets pending; '
              + '; '.join(f'{asset["path"]}: {error}' for asset, error in errors[:3]), flush=True)
        if wait_seconds <= 0 or time.monotonic() >= deadline:
            raise RuntimeError('Assets are not ready. Check or rerun the independent "Sync COS assets" workflow, '
                               'then rerun this deploy job. The current site has not been changed.')
        pending = [asset for asset, _ in errors]
        time.sleep(min(10, max(0, deadline - time.monotonic())))
    print(f'COS readiness passed: {count} objects checked by public HEAD; no uploads.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--wait-seconds', type=int, default=180)
    args = parser.parse_args()
    if args.wait_seconds < 0:
        parser.error('--wait-seconds must be non-negative')
    wait_for_assets(json.loads(args.manifest.read_text()), args.wait_seconds)
