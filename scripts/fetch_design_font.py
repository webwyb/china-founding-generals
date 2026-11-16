"""Download the optional upstream font from a pinned official revision."""
import hashlib
import json
import sys
from pathlib import Path
from urllib.request import Request, urlopen

ROOT=Path(__file__).resolve().parents[1]
metadata=json.loads((ROOT/'data/design/font-upstream.json').read_text())
target=ROOT/'.cache/NotoSerifSC.ttf'
target.parent.mkdir(exist_ok=True)
if target.exists() and hashlib.sha256(target.read_bytes()).hexdigest()==metadata['sha256']:
    print('已存在经过哈希校验的官方字体源文件。')
    sys.exit(0)
request=Request(metadata['downloadUrl'],headers={'User-Agent':'ShanheYouming font source restoration'})
with urlopen(request,timeout=60) as response:data=response.read(40_000_000)
if hashlib.sha256(data).hexdigest()!=metadata['sha256']:
    raise ValueError('字体源文件哈希不符，保留当前网页字体；请核对固定版本来源。')
target.write_bytes(data)
print('已恢复字体源文件：',target.name,len(data),'bytes')
