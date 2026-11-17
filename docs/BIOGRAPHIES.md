# 人物生平内容维护

2026-11-17：1614人的列表简介改为具体任职或参战经历；详情按早年、军旅阶段、军事学习、著述等事实编排。25人另作有出处的原创编辑，14类事件／岗位背景帮助理解经历。段落、背景和新增时间轴节点均可查阅来源。

本轮有1248人达到多条具体经历标准，25人为原创编辑，341人仍以有限任职记录为主并在页面提示待补。这个分级描述内容厚度，不代表全量人工史学审校通过。`data/catalog/biography-coverage.json` 保留准确数量与待补ID。

## 可复现的输入

- `data/catalog/biography-evidence.json`：具名网页提取的任职、战役、院校、著述与荣誉事实，逐篇记录URL、正文SHA-256；维基来源另记修订ID。只保留事实条目，不发布原网页正文。
- `data/catalog/biography-supplement-sources.json`：补充来源与人物身份核对依据。对同名、军衔、生年或授衔期不符的条目不自动采用。
- `data/catalog/biography-editorial.json`：25人的原创分段生平、简介与重点节点，各段保留来源。编辑不能抹去后期历史、伤病或受挫，也不能按军衔推演性格和战功。
- `data/catalog/historical-contexts.json`：14类背景说明和独立出处。背景只解释事件和工作，不把战役集体成果写成本人指挥成果。生成目录只保存背景ID，网页复用同一份说明。
- `data/testing/biographies-2026-11-17.json`：核心字段前后哈希、来源与内容覆盖比较。

普通开发仍执行 `npm run data:build`、`npm run check`，完全不依赖 `.cache` 或联网。新增传记事实不会覆盖 `reviewed-facts.json` 管理的生卒、地域与授衔争议。仍有190人的核心资料待核实。

## 研究刷新

仅在补充来源时执行，使用项目 `.venv`：

```sh
node scripts/python.mjs scripts/collect_biography_sources.py
node scripts/python.mjs scripts/collect_wiki_biographies.py --ids .cache/biography-research/gaps.json --interval 12 --batch-size 40
node scripts/python.mjs scripts/collect_memorial_biographies.py
node scripts/python.mjs scripts/collect_supplement_biographies.py --ids .cache/biography-research/gaps.json
node scripts/python.mjs scripts/prepare_biographies.py
npm run data:build
npm run check
```

首次研究先运行 `prepare_biographies.py` 生成缺口清单，采集后再运行一次。没有研究缓存时会逐字节保留已提交事实；只替换实际取得新正文的来源条目，避免换机刷新时清空档案。公开目录和词条仅作研究；原网页保存在忽略的 `.cache/biography-research/`，拒绝或限流时停止相应来源，不通过其他通道绕过。维基API按40篇一批、至少12秒间隔；首次较快请求遇429后已经停止，之后等待解除再按低频采集。研究脚本不属于日常构建。

将可采用的新来源加入版本化来源清单，重新导出事实。对单篇的年代或事迹纠错，应复核原文，更新事实或原创编辑输入，再生成目录；不只改 `catalog.generated.json`。

## 本轮消除的误读

旧单条履历提取器可能把入党年份套给后面的无日期任职；现在不再用旧 `career` 生成时间轴。新节点只采用明确日期的任职或原创编辑节点。对“历任”“曾任”和一串岗位不自动定年；短阶段标题、起止区间、亲属、其他指挥员、纪念文集均有回归检查。来源未给出年份的职务保留为无日期经历。

页面阅读导航在跳转时同步焦点，出处入口展开原有资料区；手机长文无需逐屏滚动才能找到时间轴。搜索完整姓名时本人排在战友传记提及项之前。新增文字重新制作本地宋体子集，纪念卡仍使用同一成图预览和保存。
