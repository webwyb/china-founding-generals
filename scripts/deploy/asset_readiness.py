"""Content-addressed confirmation of a complete, immutable COS asset set."""
import hashlib
import json
from pathlib import PurePosixPath
import re

BASE = 'https://media-1301987491.cos.ap-beijing.myqcloud.com/shanhe/assets/'


def validate(assets):
    unique = {}
    for asset in assets:
        if (not re.fullmatch(r'[0-9a-f]{64}/[A-Za-z0-9_.-]+', asset['key'])
                or asset['sha256'] != asset['key'].split('/')[0]
                or PurePosixPath(asset['path']).name != asset['key'].split('/')[1]
                or asset['url'] != BASE + asset['key']
                or type(asset['size']) is not int or asset['size'] < 0):
            raise ValueError('Unexpected asset manifest entry')
        if asset['key'] in unique and unique[asset['key']]['size'] != asset['size']:
            raise ValueError('Inconsistent duplicate asset size')
        unique[asset['key']] = asset
    return list(unique.values())


def marker(assets):
    objects = sorted((asset['key'], asset['size']) for asset in validate(assets))
    digest = hashlib.sha256(json.dumps(objects, separators=(',', ':')).encode()).hexdigest()
    body = (json.dumps({'version': 1, 'sha256': digest, 'objects': len(objects)},
                       sort_keys=True, separators=(',', ':')) + '\n').encode()
    return f'_ready/{digest}.json', body
