"""Read one small public readiness marker; never scan or upload media here."""
import argparse
import json
from pathlib import Path
import time
import urllib.error
import urllib.request
from asset_readiness import BASE, marker, validate


def check(key, body, deadline):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        return 'readiness deadline reached'
    request = urllib.request.Request(BASE + key)
    try:
        with urllib.request.urlopen(request, timeout=min(10, remaining)) as response:
            if response.status != 200 or response.read(len(body) + 1) != body:
                return 'unexpected readiness marker'
    except (urllib.error.URLError, OSError) as error:
        return str(error)
    return None


def wait_for_assets(assets, wait_seconds):
    count = len(validate(assets))
    if not count:
        print('No external assets required.', flush=True)
        return
    key, body = marker(assets)
    deadline = time.monotonic() + max(15, wait_seconds)
    while True:
        error = check(key, body, deadline)
        if not error:
            break
        print(f'COS readiness marker pending: {error}', flush=True)
        if wait_seconds <= 0 or time.monotonic() >= deadline:
            raise RuntimeError('Assets are not ready. Check or rerun the independent "Sync COS assets" workflow, '
                               'then rerun this deploy job. The current site has not been changed.')
        time.sleep(min(10, max(0, deadline - time.monotonic())))
    print(f'COS readiness passed: {count} immutable objects confirmed by one small public marker; no media scan or uploads.', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--manifest', required=True, type=Path)
    parser.add_argument('--wait-seconds', type=int, default=180)
    args = parser.parse_args()
    if args.wait_seconds < 0:
        parser.error('--wait-seconds must be non-negative')
    wait_for_assets(json.loads(args.manifest.read_text()), args.wait_seconds)
