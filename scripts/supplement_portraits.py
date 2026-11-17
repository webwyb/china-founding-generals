"""Stage and review sourced historical portraits before adding missing images.

stage PLAN.json downloads candidates to an ignored review cache.
sheet creates contact sheets from staged originals, without editing public files.
apply REVIEW.json accepts only explicitly approved, hash-matched missing portraits.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import io
import json
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

import requests
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
STAGE = ROOT / '.cache/portrait-supplements'
MANIFEST = ROOT / 'data/catalog/portraits.json'
HEADERS = {'User-Agent': 'ShanheYouming/0.1 (historical portrait identity and source review)'}


def read(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def write(path, value):
    Path(path).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n')


def stage(plan_path):
    STAGE.mkdir(parents=True, exist_ok=True)
    plan = read(plan_path)
    people = {p['id']: p for p in read(ROOT / 'src/data/catalog.generated.json')}
    manifest = read(MANIFEST)
    fingerprints = {p['sha256']: pid for pid, p in manifest.items()}
    lock = threading.Lock()
    next_request = {}
    stopped = set()

    def download(candidate):
        pid = candidate['id']
        if pid not in people or candidate['name'] != people[pid]['name']:
            raise ValueError('Candidate ID and catalogue name do not match')
        if pid in manifest:
            return {'id': pid, 'status': 'already-present'}
        if not candidate.get('identityEvidence') or not candidate.get('source') or not candidate.get('license'):
            raise ValueError('Every candidate needs identity evidence, source and license notes')
        key = pid + '-' + hashlib.sha256(candidate['downloadUrl'].encode()).hexdigest()[:12]
        receipt = STAGE / (key + '.json')
        if receipt.exists():
            previous = read(receipt)
            file = STAGE / previous.get('stagedFile', '-')
            if file.is_file() and hashlib.sha256(file.read_bytes()).hexdigest() == previous.get('sha256'):
                return previous
        group = urlparse(candidate['downloadUrl']).hostname or ''
        if group.endswith('wikimedia.org'):
            group = 'wikimedia'
        result = {**candidate, 'key': key}
        try:
            with lock:
                if group in stopped:
                    raise ValueError('Source stopped after access denial or rate limit; not retried')
                slot = max(time.monotonic(), next_request.get(group, 0))
                next_request[group] = slot + (4 if group == 'wikimedia' else .65)
            time.sleep(max(0, slot - time.monotonic()))
            with lock:
                if group in stopped:
                    raise ValueError('Source stopped after access denial or rate limit; not retried')
            response = requests.get(candidate['downloadUrl'], headers=HEADERS, timeout=(8, 20))
            if response.status_code in (401, 403, 429):
                with lock:
                    stopped.add(group)
                result['retryAfter'] = response.headers.get('Retry-After')
            response.raise_for_status()
            content = response.content
            if len(content) > 8_000_000:
                raise ValueError('Image exceeds 8 MB')
            image = Image.open(io.BytesIO(content))
            width, height = image.size
            image.verify()
            extension = {'JPEG': 'jpg', 'MPO': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}.get(image.format)
            if not extension or min(width, height) < 70 or not .45 <= width / height <= 1.4:
                raise ValueError('Not a usable individual portrait; retain placeholder pending review')
            digest = hashlib.sha256(content).hexdigest()
            with lock:
                owner = fingerprints.get(digest)
                if owner and owner != pid:
                    raise ValueError('Same original is assigned to another person: ' + owner)
                fingerprints[digest] = pid
            filename = key + '.' + extension
            (STAGE / filename).write_bytes(content)
            result.update(status='staged', stagedFile=filename, width=width, height=height, sha256=digest)
        except (requests.RequestException, OSError, ValueError) as error:
            result.update(status='unavailable', error=str(error))
        write(receipt, result)
        return result

    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        for index, result in enumerate(pool.map(download, plan['candidates'])):
            results.append(result)
            if (index + 1) % 10 == 0 or index + 1 == len(plan['candidates']):
                print('Portrait candidates', index + 1, '/', len(plan['candidates']), 'staged', sum(x.get('status') == 'staged' for x in results), flush=True)
    write(STAGE / 'stage-report.json', results)


def sheet(selection_path=None):
    from fontTools.ttLib import TTFont

    STAGE.mkdir(parents=True, exist_ok=True)
    font_path = STAGE / 'review-font.ttf'
    font = TTFont(ROOT / 'src/assets/fonts/shanhe-serif.woff2')
    font.flavor = None
    font.save(font_path)
    label = ImageFont.truetype(str(font_path), 17)
    records = [read(p) for p in sorted(STAGE.glob('p*.json'))]
    records = [r for r in records if r.get('status') == 'staged']
    if selection_path:
        selected = {r['key'] for r in read(selection_path)['records']}
        records = [r for r in records if r['key'] in selected]
    prefix = 'selected-review' if selection_path else 'review'
    for start in range(0, len(records), 30):
        items = records[start:start + 30]
        canvas = Image.new('RGB', (1200, 1500), '#ece8de')
        draw = ImageDraw.Draw(canvas)
        for index, item in enumerate(items):
            x, y = (index % 6) * 200, (index // 6) * 300
            image = Image.open(STAGE / item['stagedFile']).convert('RGB')
            image.thumbnail((188, 244))
            canvas.paste(image, (x + (200 - image.width) // 2, y + (246 - image.height) // 2))
            draw.text((x + 6, y + 247), item['id'] + ' ' + item['name'], font=label, fill='#152e2d')
            draw.text((x + 6, y + 272), f"{item['width']}×{item['height']}", font=label, fill='#152e2d')
        path = STAGE / f'{prefix}-{start // 30 + 1:02d}.jpg'
        canvas.save(path, quality=94)
        print(path.relative_to(ROOT))
    write(STAGE / (prefix + '-index.json'), [dict(index=i + 1, key=r['key'], id=r['id'], name=r['name']) for i, r in enumerate(records)])


def apply(review_path):
    review = read(review_path)
    manifest = read(MANIFEST)
    people = {p['id']: p for p in read(ROOT / 'src/data/catalog.generated.json')}
    fingerprints = {p['sha256']: pid for pid, p in manifest.items()}
    additions = []
    for item in review['records']:
        if item.get('decision') != 'approved':
            continue
        pid = item['id']
        if pid in manifest:
            existing = manifest[pid]
            if existing['sha256'] != item['sha256']:
                raise ValueError('This workflow only adds missing portraits: ' + pid)
            original = ROOT / 'public/portraits' / existing['file']
            if not original.exists() or hashlib.sha256(original.read_bytes()).hexdigest() != item['sha256']:
                raise ValueError('Existing original does not match its approved hash: ' + pid)
            continue
        receipt = read(STAGE / (item['key'] + '.json'))
        if item['name'] != people[pid]['name'] or receipt['id'] != pid or receipt['status'] != 'staged':
            raise ValueError('Review does not match the catalogue and staged receipt')
        for field in ('source', 'downloadUrl', 'sha256'):
            if item[field] != receipt[field]:
                raise ValueError('Review source or image hash changed: ' + pid)
        source = STAGE / receipt['stagedFile']
        content = source.read_bytes()
        if hashlib.sha256(content).hexdigest() != item['sha256']:
            raise ValueError('Staged image changed after review: ' + pid)
        if item['sha256'] in fingerprints and fingerprints[item['sha256']] != pid:
            raise ValueError('Portrait is shared by different people: ' + pid)
        filename = pid + source.suffix
        destination = ROOT / 'public/portraits' / filename
        if destination.exists() and destination.read_bytes() != content:
            raise ValueError('Refusing to overwrite an existing original: ' + filename)
        entry = {field: receipt[field] for field in ('source', 'downloadUrl', 'license', 'width', 'height', 'sha256')}
        entry['file'] = filename
        manifest[pid] = entry
        fingerprints[item['sha256']] = pid
        additions.append((destination, content))
    for destination, content in additions:
        destination.write_bytes(content)
    write(MANIFEST, manifest)
    print('Reviewed missing portraits added:', len(additions))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('command', choices=['stage', 'sheet', 'apply'])
    parser.add_argument('input', nargs='?')
    args = parser.parse_args()
    if args.command == 'sheet':
        sheet(args.input)
    elif not args.input:
        parser.error('stage and apply require a JSON input file')
    elif args.command == 'stage':
        stage(args.input)
    else:
        apply(args.input)
