"""Encode versioned PNG design sources for web delivery.

No retouching, resizing or scene changes are applied. The WebP encoder only
reduces transfer size; original generated files and prompts remain available.
"""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'public/landscapes'
ORIGINALS=ROOT/'design/landscapes'
manifest_path=ROOT/'data/design/landscape-assets.json'
manifest=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
for source in sorted(ORIGINALS.glob('*.png')):
    dest=DEST/(source.stem+'.webp')
    original_hash=hashlib.sha256(source.read_bytes()).hexdigest()
    existing=manifest.get(source.stem,{})
    if existing.get('originalSha256')==original_hash and dest.exists() and hashlib.sha256(dest.read_bytes()).hexdigest()==existing.get('sha256'):continue
    result=subprocess.run(['cwebp','-quiet','-q','88','-m','6',str(source),'-o',str(dest)],capture_output=True,text=True)
    if result.returncode:raise RuntimeError(result.stderr)
    manifest[source.stem]={'file':dest.name,'generator':'built-in image_gen','encoding':'WebP q88; original dimensions retained','bytes':dest.stat().st_size,'originalBytes':source.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'originalSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
manifest_path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Web landscapes',len(manifest),'total MB',round(sum(x['bytes'] for x in manifest.values())/1_000_000,2))
