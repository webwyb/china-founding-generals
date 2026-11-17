"""Keep reviewed identity conflicts and group photos out of portrait jobs."""
import json
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


def canonical(url):
    parts = urlsplit(url)
    path = unquote(parts.path)
    if 'wikimedia.org' in parts.netloc and '/wiki/File:' in path:
        path = path.replace('_', ' ')
    return (parts.netloc.lower(), path)


def rejected_portrait_sources():
    path = ROOT / 'data/catalog/portrait-supplements.json'
    if not path.exists():
        return []
    return [r for r in json.loads(path.read_text(encoding='utf-8'))['records'] if r.get('decision', '').startswith('rejected')]


def portrait_is_rejected(pid, candidate, rejected):
    for record in rejected:
        if record['id'] != pid:
            continue
        source = record.get('source', '')
        if '/wiki/File:' in unquote(source) and canonical(source) == canonical(candidate['source']):
            return True
        if record.get('downloadUrl') and canonical(record['downloadUrl']) == canonical(candidate['url']):
            return True
    return False
