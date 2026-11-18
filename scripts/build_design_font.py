"""Subset the OFL-licensed Noto Serif SC for the actual memorial text."""
import json
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'.cache/python'))
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

source=ROOT/'.cache/NotoSerifSC.ttf'
if not source.exists():raise SystemExit('缺少可选字体源文件。请先运行 python scripts/fetch_design_font.py；普通开发与校验无需重建字体。')
characters=set()
for path in (ROOT/'src').rglob('*'):
    if path.suffix in ('.tsx','.ts','.json','.scss'):
        characters.update(path.read_text())
characters.update(chr(code) for code in range(32,127))
characters.update((ROOT/'data/catalog/historical-contexts.json').read_text())
for path in (ROOT/'data/topics').glob('*.json'):
    characters.update(path.read_text())
font=TTFont(source)
options=subset.Options()
options.name_IDs=[0,1,2,3,4,5,6,13,14,16,17]
options.name_legacy=True
options.name_languages=['*']
subsetter=subset.Subsetter(options=options)
subsetter.populate(text=''.join(sorted(characters)))
subsetter.subset(font)
instantiateVariableFont(font,{'wght':(400,600)},inplace=True)
for entry in font['name'].names:
    value={1:'Shanhe Serif',4:'Shanhe Serif',6:'ShanheSerif',16:'Shanhe Serif'}.get(entry.nameID)
    if value:entry.string=value.encode(entry.getEncoding(),errors='replace')
font.flavor='woff2'
dest=ROOT/'src/assets/fonts/shanhe-serif.woff2'
dest.parent.mkdir(exist_ok=True)
font.save(dest)
(ROOT/'data/design/font.json').write_text(json.dumps({'family':'Shanhe Serif','upstream':'Noto Serif SC','source':'https://github.com/google/fonts/tree/main/ofl/notoserifsc','license':'SIL Open Font License 1.1','characters':len(characters),'bytes':dest.stat().st_size,'weights':[400,600]},ensure_ascii=False,indent=2)+'\n')
print('Font characters',len(characters),'bytes',dest.stat().st_size)
