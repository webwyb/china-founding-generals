# 资料来源、快照与勘误流程

本项目保存的是有出处的事实整理，不把来源优先级当作史学认证。主入口为 `scripts/build_catalog.py`。

## 无网页缓存的再生成

`data/catalog/evidence/profiles.jsonl` 保存4733条事实抽取记录及源URL、身份排除结果、影像地址和原始记录哈希，不含完整网页正文。`manifest.json` 记录版本、条数和文件SHA。日常再生成默认只使用这个已提交快照，因而不依赖原机器288MB研究缓存或源站当前可用率。

```sh
npm run data:build
npm run data:verify
npm run validate:data
```

还会使用：姓名军衔底册 `roster-crt.json`，人工核对 `reviewed-facts.json`，补充结构化事实 `wikidata-facts.json`，肖像清单 `portraits.json`，及原有精选故事 `src/data/featured.ts`。生成JSON、CSV、字段出处、争议队列和图像任务共同更新。

`data:verify` 检查9项输出能否从这些已提交输入逐字节复现。不要仅修 `catalog.generated.json` 或CSV而遗漏生成来源。

## 单项勘误

1. 查明是同一人物，区分开国时期授衔与1988年后军衔，并检查同名人物。
2. 在 `reviewed-facts.json` 的人物ID下记录 `facts` 和 `sources`。`verifiedFields` 只填写已有明确证据核定的字段，不为消除待核实标签而填写。
3. 发现不符身份来源时用 `excludeSources` 保存其URL；生成器会排除它，并写入排除清单。
4. 新发现的年份分歧可写入 `additionalEvidence`；地域等仍未核定的字段使用 `disputedFields`。参照当前杨得志、于权伸、李际泰、鲍奇辰记录。
5. 再生成、运行检查并审阅生平、时间轴、卡片与CSV。争议字段必须保持统一的待核实状态。

关键字段：`birth`、`death`、`grantYear`、`hometown`、`province`、`hometownType`、`partyYear`、`enlist`、`career`。籍贯不自动写成出生地；不由虚岁或享年反推生年；不把任职区间当成生卒；不把安源等工作地点当成籍贯。

输出说明：`source-conflicts.json` 保存已解决及未解决分歧；`pending-review.json` 只保留待核实项；`field-provenance.json` 保存字段来源；`rejected-identities.json` 保存被排除的身份不符来源；`hometown-review.json` 记录历史区划与地域写法差异。机器通过校验不代表全量人工审核完成。

## 重新采集与更新快照

只有修改解析规则或需要新来源批量抽取时才需要原网页缓存。缓存保存在 `.cache/catalog/`，不上传Git。可以按需要重新采集：

```sh
node scripts/python.mjs scripts/catalog_sources.py roster
node scripts/python.mjs scripts/catalog_sources.py discover 3156
node scripts/python.mjs scripts/catalog_sources.py discover 3157
node scripts/python.mjs scripts/catalog_sources.py collect cpc
node scripts/python.mjs scripts/catalog_sources.py collect memorial
node scripts/python.mjs scripts/collect_archived_profiles.py
node scripts/python.mjs scripts/collect_wikipedia.py
node scripts/python.mjs scripts/collect_wiki_details.py
node scripts/python.mjs scripts/collect_compendium.py
node scripts/python.mjs scripts/enrich_wikidata.py
```

这些命令会联网并更新研究输入；源站可能下线、限流或修改页面，不能承诺重新采集会得到同样结果。遵守429及Retry-After；不关闭TLS校验。采集并人工审阅后执行：

```sh
node scripts/python.mjs scripts/build_catalog.py --refresh-evidence
npm run check
```

`--refresh-evidence` 才会重新解析原缓存并写入事实快照。原始记录少于当前快照时会拒绝覆盖，防止换机后用少量缓存误删完整资料；单项勘误优先使用人工核对文件。需要同步检查变化的缺项、身份排除、图片匹配和来源分歧，不机械接受重新采集结果。

## 肖像及景观

本地原始肖像和来源清单共同入Git。`collect_portraits.py` 只收集已有身份匹配的候选，缺失、重复、无法确认或下载受限时保留占位；文件哈希不同不等于人物身份已核实。

`upgrade_portraits.py` 分阶段下载和应用较高分辨率来源，需先比较照片内容；只有在审阅记录中标为 `approved` 的候选会应用，历史升级记录保留在 `data/design/portrait-upgrades.json`。原机器的旧照片缓存不属于当前展示输入；已提交的当前照片足以继续开发。

29张景观PNG原稿在 `design/landscapes/`，WebP在 `public/landscapes/`，生成提示词和原稿／发布文件哈希在 `data/design/`。这些是现代地域意象，不能当人物经历的史料。网页素材许可见 `source-notes.md` 和各清单；不要将全部素材统一改称公共领域。
