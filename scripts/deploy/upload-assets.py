"""Upload only missing content-addressed objects; never delete or overwrite assets."""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import json
import mimetypes
import os
from pathlib import Path
from qcloud_cos import CosConfig, CosS3Client
from asset_readiness import marker as readiness_marker, validate

bucket = os.environ['COS_BUCKET']
region = os.environ['COS_REGION']
prefix = 'shanhe/assets/'
client = CosS3Client(CosConfig(Region=region, SecretId=os.environ['COS_SECRET_ID'],
    SecretKey=os.environ['COS_SECRET_KEY'], Scheme='https', Timeout=300))
assets = validate(json.loads(Path('release-assets.json').read_text()))
existing = {}
marker = ''
while True:
    result = client.list_objects(Bucket=bucket, Prefix=prefix, Marker=marker, MaxKeys=1000)
    existing.update((item['Key'], int(item['Size'])) for item in result.get('Contents', []))
    if str(result.get('IsTruncated', 'false')).lower() != 'true':
        break
    marker = result['NextMarker']


def upload(asset):
    key = prefix + asset['key']
    if key in existing:
        if existing[key] != asset['size']:
            raise ValueError('Existing immutable asset has an unexpected size: ' + asset['path'])
        return 0
    path = Path('dist/h5/static') / asset['path']
    data = path.read_bytes()
    if len(data) != asset['size'] or hashlib.sha256(data).hexdigest() != asset['sha256']:
        raise ValueError('Asset digest mismatch: ' + asset['path'])
    expected = f'https://{bucket}.cos.{region}.myqcloud.com/{key}'
    if asset['url'] != expected:
        raise ValueError('Unexpected COS destination')
    content_type = mimetypes.guess_type(path.name)[0] or 'application/octet-stream'
    print(f"Uploading {asset['path']} ({len(data)} bytes)", flush=True)
    try:
        # A seekable stream lets HTTP write bounded blocks and SDK retries rewind.
        with io.BytesIO(data) as body:
            client.put_object(Bucket=bucket, Key=key, Body=body, ContentType=content_type,
                              CacheControl='public,max-age=31536000,immutable', EnableMD5=True)
    except Exception as error:
        raise RuntimeError('COS upload failed for ' + asset['path']) from error
    print('Uploaded ' + asset['path'], flush=True)
    return 1


with ThreadPoolExecutor(max_workers=4) as pool:
    uploaded = sum(pool.map(upload, assets))
print(f'COS assets ready: {uploaded} uploaded; {len(assets) - uploaded} reused.')
# Publish only after every object is present with its expected size or PUT succeeded.
# The marker is immutable and stays within the existing, approved COS prefix.
marker_key, marker_body = readiness_marker(assets)
key = prefix + marker_key
if key not in existing:
    with io.BytesIO(marker_body) as body:
        client.put_object(Bucket=bucket, Key=key, Body=body, ContentType='application/json',
                          CacheControl='public,max-age=31536000,immutable', EnableMD5=True)
elif existing[key] != len(marker_body):
    raise ValueError('Unexpected existing readiness marker size')
print('COS readiness marker ready: ' + marker_key, flush=True)
