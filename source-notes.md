# 全量人物档案与肖像来源

整理日期：2026-11-17。已收录 **1614 位开国将帅**，保留原有8篇精选故事，并按相同页面结构补入其他人物的基本档案、生平简述、人生节点与来源链接。共有 **1609位人物的本地历史肖像、5个明确标注的肖像占位**。

## 全量整理方法

姓名与军衔底册采用[中红网开国将帅名录](https://crt.com.cn/news2007/news/yxbd20220324/2023/4/234313943F1GBCKK4E066CJJD0FB.html)及其第二页，逐项保留1614个档案，不按姓名去重。四对同名人物（李元、李道之、罗斌、张英）依据出生年与授衔年分开匹配，路由ID独立。

个体生平优先采用中国共产党新闻网人物资料，补充[抗日战争纪念网少将资料](https://www.krzzjn.com/list-3156-1.html)、[晋衔少将资料](https://www.krzzjn.com/list-3157-1.html)及其人物传记。已下线的人民网资料在可访问时查阅公开历史存档。维基百科与维基数据用于补充缺项，维基数据只关联已经确认身份的百科条目，不通过同名直接套用。

少量缺失的籍贯和年份由[太行英雄网按籍贯排序的名录](https://taihangsummit.com/47460-2/)第1至5页补充。这是二次编录，优先级低于个体生平；采集时同时识别有“籍”和无“籍”的地区标题。缺项另以新华社、地方政府和档案机构资料核对，结果及出处存于 `data/catalog/reviewed-facts.json`。

原名录的“陈士渠、周恒、陈仁麟、黄新延、何延一、延懋”按人民网人物资料及官方目录核为“陈士榘、周桓、陈仁麒、黄新廷、何廷一、廷懋”。“吴詠湘”按岳阳市政府资料统一为“吴咏湘”。原写法仍作为检索别名，不另外占人数。其他无法仅凭写法确认的姓名不自动替换。

前台文字由日期、地点、任职、入伍及入党等事实重新组织，不复制发布完整传记。生卒只记录年份，不由享年或虚岁反推出生年。地点区分“籍贯”与“出生地”，保存来源所载历史地名；不统一臆改为现行政区。人生节点只写有年份依据的事实，籍贯不会被自动写成出生地。

本轮核查记录206项来源差异，其中204项未核定，涉及190人。未核定的出生年、逝世年、授衔年及3人的地域信息，不再作为定值发布；详情、名录、时间轴和纪念卡统一处理。贾乾瑞出生年的1915/1916分歧亦改为“待核实”，不再暂取其中一年。差异及出处见 `data/catalog/source-conflicts.json` 与 `pending-review.json`，字段级出处见 `field-provenance.json`。完成全量基本档案录入不等于所有内容均已完成史学人工审定。

已修正的典型问题包括：周仁杰资料中的1970—1977为任职区间，逝世年应据[人物原文](https://cpc.people.com.cn/GB/64162/126778/130393/7587642.html)记为2001年；杨得志、刘先胜在安源煤矿的工作经历不能作为江西籍贯；开国少将李平、朱光不能混入同名后期将领的籍贯；史进前晋衔年依据[人民网人物资料](https://politics.people.com.cn/n/2015/0203/c1001-26500875-24.html)校正为1961年。9条身份不符的来源排除记录在 `rejected-identities.json`。解析回归用例见 `scripts/test_catalog_parser.py`，修正及暂缓发布前后值见 `data/testing/factual-corrections.json`。

地域交叉核查见 `hometown-review.json`。历史省县变动、原籍、出生地及迁居地应分别辨识，不以省名不同直接判定某一来源错误。页面地区按所采用来源的历史记载归类，不能当作按今日行政区划计算的将帅人数统计。

新增照片来自已匹配身份的人物资料页和 Wikimedia 免费影像条目，保存原始文件，未进行AI修复、替换或重绘。部分JPEG含MPF附加帧，文件原样保留，以浏览器可读取的主JPEG展示。每张照片的来源、原下载地址、尺寸、SHA-256和许可说明在 `data/catalog/portraits.json`。来源页未标明开放许可的照片按原型研究素材记录，不统一宣称公共领域。

占位图 `src/assets/portrait-placeholder.svg` 是统一剪影，明确写有“历史肖像待补”。占位包括未取得可用照片、身份不能确认、重复图像和来源临时限流或下载失败等情况，不代表历史上没有照片。采集遵守限流提示，不关闭TLS校验，不以他人的肖像补缺。

## 2026-11-17多渠道补缺

在原有1172张的基础上新增171张真实肖像，缺图由442人降至271人。新增163位中将和8位少将；10位元帅、10位大将、57位上将和177位中将目前均已有肖像。该轮结束时271位少将保留占位，不能用后期同名将领、合影或绘画替代；后续260张补缺见下节。

| 渠道 | 本轮采用 | 代表来源 |
| --- | --- | --- |
| 高校官方校史 | 1 | [西安电子科技大学：王诤](https://news.xidian.edu.cn/info/1028/286166.htm)，并与[历任领导资料](https://www.xidian.edu.cn/info/1068/2930.htm)核对 |
| 地方报纸与党史机构供图 | 1 | [梅州日报：邓逸凡](https://mzrb.meizhou.cn/html/2026-10/19/content_415065.htm)，图片说明为中共兴宁市委党史研究室提供 |
| 方志机构政务发布 | 1 | [方志河北：马卫华](https://www.thepaper.cn/newsDetail_forward_2671708) |
| 新华网刊军队媒体稿 | 1 | [中国军网供稿：方子翼](https://www.xinhuanet.com/mil/2015-03/24/c_127612736.htm) |
| 抗日战争纪念网人物资料栏目 | 167 | 中将人物、开国中将与抗战、少将等栏目；如[赛福鼎·艾则孜](https://www.krzzjn.com/show-2871-134864.html)，正文全名与1955年中将记载共同用于身份匹配 |

本轮暂存330个原图候选，再核对来源姓名、开国时期军衔及身份说明，逐张查看选定的171张原图。优先选用较清晰的单人历史照，新增照片短边均不低于200像素；图中文字、水印和原有画面保留。URL后缀不能作为格式或人物判断依据，例如赛福鼎照片地址以`.gif`结尾，实际下载内容为JPEG，按真实格式保存。

候选元数据保存在 `data/catalog/portrait-candidates.json`；采用与排除依据见 `portrait-supplements.json`。其中5个候选被排除：Commons的 `File:Wang_Zheng.jpg` 说明写为王秉璋，未核定前不用于王诤；另4个文件是多人合影。生成任务和旧下载入口也过滤这些来源。公开影像内容无重复哈希；此检查只能发现同文件复用，不能替代身份核对。

Commons原图请求本轮遇429后停止，部分地方政务站403或超时未采用；19个已匹配的少将资料页仅有源站`noPic`占位，没有把它们当作照片。许可仍逐张记录，不将转载或未注明许可的照片统一认定为公共领域。此次只改肖像字段，没有改动生平事实、待核实字段或4733条事实快照；全量前后比较见 `data/testing/portrait-supplements.json`。

## 2026-11-17继续补缺260张

按用户要求，先录入已确认的方槐、孙干卿、刘善本、杨斯德、张实杰、张耀祠6张头像，再对原缺图271人逐人扩展检索。本轮共补260位少将，已有1603张，剩11张占位。具名来源包括新华社讣告、人民日报、烟台市档案馆、抗日战争纪念网、心正教育人物资料、百度百科具体人物词条、民族魂及凤凰历史单图。逐图出处、下载地址、尺寸、哈希、许可说明与审核理由均在 `portrait-supplements.json`；本轮结果及剩余名单见 `docs/PORTRAIT_AUDIT.md`。

百度词条通过公开少将总名录的具体ID消除同名歧义，并与既有独立名录的军衔、籍贯或任职核对。吴树声的同名作家资料、与吴忠完全同文件的徐介藩候选均被排除，另用正确人物页照片补齐。合影、雕像、纪念塔、展板和疑似重绘版本也不采用。祖农·太也夫另取凤凰历史具名单图的黑白老照片。来源对魏镇、桑颇·才旺仁增、何家产、林真的生年有异文，本轮没有据此修改人物事实。

原文件完整保留，不新增裁切、不去文字水印、不作AI补脸或重绘。新增13张短边不足200像素，全库共66张。未标开放许可的转载照片继续逐张标注，不统一宣称公共领域。此前限流的Commons未重试，本轮PICRYL返回403后停止，没有绕过。260张原图与构建副本全部解码及哈希核对通过；全量人物比较确认仅肖像字段改变，生平和待核实状态未变，审核重复应用新增0张。完整检查通过，本头像批次没有新增浏览器／真机验收。机器记录在 `data/testing/portrait-expansion-2026-11-17.json`。

## 2026-11-17剩余11位再查

本轮经360百科具名词条、壹读转载红潮网专题及具名俄文历史照片帖，新增马尔果夫·伊斯哈科夫、买买提伊敏·伊敏诺夫、曹德连、凯墨·索南旺堆、吕炳安、段士楷6张单人老照片。来源说明、原图及水印均保留；人物生平、事实来源和待核实状态未改。马尔果夫帖中的历史评价未作为事实写入。现有1609张，仍缺于侠、王万金、李镜如、国林之、曹孟朴5位。

于侠另找到具名海军纪念图文，但原图完整水印地址返回403后停止；国林之在新回忆文章中为前左合影，未裁人；曹孟朴新纪念页通过正常浏览器确认只有文字及通用题图。没有重试此前限流／拒绝的图片库。6张原图和构建副本哈希及解码通过，完整检查通过，审核重复应用新增0张；具体出处、采用理由及未解决缺口见 `docs/PORTRAIT_AUDIT.md` 与 `data/testing/portrait-final11-2026-11-17.json`。

## 2026-11-17剩余5位再次检索

本轮新增0张。于侠的新政府家风专题只有文字，家属活动图文中的相关照片为其子李新等人；将帅林配图实际为绘画肖像牌及环境，不从中裁头像。于侠与王万金的具名瓷板作品已逐图查看为绘画，两条来源记入排除清单。另查地方人物页、出版社序言、公开历史人物图像索引及《辛集市志》公开目录，仍未取得这5位可录入的单人历史原照。403、过期TLS证书和收费正文均未绕过；此前被限流或拒绝的来源未重试。现有肖像、人物事实及应用代码未变，目录一致性、数据校验及12项回归通过；逐源结果见 `docs/PORTRAIT_AUDIT.md` 和 `data/testing/portrait-final5-2026-11-17.json`。

## 2026-11-17书籍、地方志与报刊专项

本轮仍新增0张，五人继续占位。实际取得《将帅名录》第二、三集学校电子图书版，逐页渲染查看于侠（PDF第13页）、王万金（44页）、李镜如（492页）、国林之（第三集205页）、曹孟朴（第三集483页），均为纯文字重新排版，没有原照，不能据此判断原纸书不配照片。《洪湖县志》《武邑县志》《辛集市志》仅核公开书目、目录，未取得对应人物图版；湖北数字方志馆需读者登录，河北地方志旧入口403后停止。报社公开《老年生活报》2022年7月22日第5版已整页查看，于侠相关图为夫妻照、全家照，另一张军装单人照图注为李新，均未作于侠头像。没有修改人物事实、候选审核清单或现有原图；具体来源、访问范围、页码及哈希见 `data/testing/portrait-scans-2026-11-17.json`。

## 地域景观配图

本轮新增29幅省级地区代表景观，使用内置image_gen逐张生成，统一为淡青绿水墨设色。它们是装饰性的当代地域文化意象，不作为人物到访、居住或作战地点的史料。人物历史肖像与景观在版面上分别呈现，没有对人物进行AI生成、替换或重绘。

省份对应关系在 `src/data/landscapes.ts`，完整提示词在 `data/design/landscape-prompts.json`，WebP发布文件、原稿哈希及大小在 `data/design/landscape-assets.json`。PNG原稿在 `design/landscapes/` 中随Git保留。字体采用Google Fonts官方仓库的Noto Serif SC，经子集化后以Shanhe Serif为内部名称，保留SIL Open Font License 1.1全文；可选TTF源的固定官方版本和SHA见 `font-upstream.json`。

## 更新与复核

核心文件为 `src/data/catalog.generated.json`、`data/catalog/people.csv`、`quality-report.json`、`missing-fields.json`、`source-conflicts.json`、`portraits.json`。CSV包括生平简述、资料差异和逐人来源，适合人工校订；原始网络正文只在忽略的 `.cache/catalog/` 中。为换机继续开发，4733条机器抽取事实及出处已保存为 `data/catalog/evidence/` 的版本化快照。默认生成使用该快照，显式 `--refresh-evidence` 才重新解析原文缓存；详见 `docs/DATA_PIPELINE.md`。

安装 `scripts/requirements-catalog.txt` 后可按需要运行以下命令。已下载页面会复用缓存；联网采集的可用率随源站变化。

```sh
python3 scripts/catalog_sources.py roster
python3 scripts/catalog_sources.py discover 3156
python3 scripts/catalog_sources.py discover 3157
python3 scripts/catalog_sources.py discover 2872
python3 scripts/catalog_sources.py collect cpc
python3 scripts/catalog_sources.py collect memorial
python3 scripts/collect_wikipedia.py
python3 scripts/collect_compendium.py
python3 scripts/build_catalog.py
python3 scripts/collect_wiki_details.py
python3 scripts/enrich_wikidata.py
python3 scripts/collect_archived_profiles.py
python3 scripts/build_catalog.py
python3 scripts/collect_portraits.py
python3 scripts/build_catalog.py
npm run validate:data
```

`reviewed-facts.json` 是带出处的人工核对覆盖层，优先于自动提取字段；数据脚本按身份匹配合并，保留原有精选人物ID。校验覆盖1614人及军衔人数、重名、基本字段、年份范围、人生节点顺序、地区标题解析、本地图片与重复照片、报告统计一致性。

## 数据口径

- 人物故事是依据下列资料撰写的简短介绍，并非史料逐字摘录。人物详情保留直接资料链接，便于读者进一步阅读。
- `birth` / `death` 只记录公历年份，避免虚岁、周岁以及具体日期的不同记法混入前台。
- `rank` 记录开国授衔时期的军衔。张震在 1955 年获中将，1988 年获上将，因此本版筛选项归为“中将”；洪学智的两次上将授衔在故事与年表中分别记录。
- 原有8位精选人物采用已核对的常用地域归属。例如洪学智出生地当时属河南商城，今属安徽金寨；徐海东出生地旧属黄陂，今属湖北大悟。其他人物保留各自来源记载。
- 没有根据网络海报采用对全部将帅的绝对化评价。

## 生平与故事依据

| 人物 | 本版选取的故事线索 | 主要资料 |
| --- | --- | --- |
| 朱德 | 1928 年冬井冈山挑粮，与战士共同劳动 | [中国共产党新闻网 · 朱德人物资料](https://cpc.people.com.cn/GB/64162/126778/126780/7489937.html) |
| 徐向前 | 乡村教员、黄埔军校、红四方面军总指挥 | [中国共产党新闻网 · 徐向前人物资料](https://cpc.people.com.cn/GB/64162/126778/126780/7490461.html) |
| 粟裕 | 1946 年苏中战役七战七捷 | [中国共产党新闻网 · 粟裕人物资料](https://cpc.people.com.cn/GB/64162/126778/127855/7536807.html) |
| 徐海东 | 红二十五军长征与 1935 年陕北会师 | [中国共产党新闻网 · 徐海东人物资料](https://cpc.people.com.cn/GB/64162/126778/127855/7536984.html) |
| 洪学智 | 志愿军后勤保障，以及 1955 / 1988 年两次上将授衔 | [中国共产党新闻网 · 洪学智人物资料](https://cpc.people.com.cn/GB/64162/126778/127857/7538760.html)、[人民网 · 洪学智与志愿军后勤保障](https://dangshi.people.com.cn/n/2013/0131/c85037-20388182.html)、[浙江日报刊新华社逝世消息](https://zjrb.zjol.com.cn/html/2006-11/22/content_20108.htm) |
| 陈奇涵 | 免费办学与抗大第三分校的军事教育 | [中国共产党新闻网 · 陈奇涵人物资料](https://cpc.people.com.cn/GB/64162/126778/127857/7538650.html) |
| 张震 | 参谋工作、1954 年进入南京军事学院学习及 1985 年 12 月任国防大学校长 | [中国共产党新闻网 · 张震人物资料](https://cpc.people.com.cn/GB/64162/126778/130393/7587418.html)、[新华社 · 张震同志生平](https://www.xinhuanet.com/politics/2015-09/09/c_1116514056.htm) |
| 李贞 | 浏阳女性走上革命道路，1955 年成为人民解放军第一位女将军 | [中国共产党新闻网 · 新中国第一位女将军李贞](https://cpc.people.com.cn/n1/2022/1226/c443712-32593553.html)、[湖南省档案局 · 李贞](https://sdaj.hunan.gov.cn/sdaj/wszt/xxsl/xxrw/200810/t20081017_1977961.html) |

## 肖像素材清单

所有肖像均为真实人物历史照片，无 AI 生成或人物替换。以本地文件打包，页面不依赖远程图片服务器。

前 7 张图片的 Wikimedia Commons `imageinfo.extmetadata.LicenseShortName` 在本次查询中均标为 `Public domain`；这里保留文件说明页，不能把这一记录理解为对任何后续新素材的统一许可。

| 本地文件 | 人物 | 文件说明页 / 来源 |
| --- | --- | --- |
| `src/assets/portraits/zhude.jpg` | 朱德 | [Wikimedia Commons · Zhu De.jpg](https://commons.wikimedia.org/wiki/File:Zhu_De.jpg) |
| `src/assets/portraits/xuxiangqian.jpg` | 徐向前 | [Wikimedia Commons · Xu Xiangqian.jpg](https://commons.wikimedia.org/wiki/File:Xu_Xiangqian.jpg) |
| `src/assets/portraits/suyu.jpg` | 粟裕 | [Wikimedia Commons · Su Yu 1955 formal.jpg](https://commons.wikimedia.org/wiki/File:Su_Yu_1955_formal.jpg) |
| `src/assets/portraits/xuhaidong.jpg` | 徐海东 | [Wikimedia Commons · Xu Haidong.jpg](https://commons.wikimedia.org/wiki/File:Xu_Haidong.jpg) |
| `src/assets/portraits/hongxuezhi.jpg` | 洪学智 | [Wikimedia Commons · Hong Xuezhi.jpg](https://commons.wikimedia.org/wiki/File:Hong_Xuezhi.jpg) |
| `src/assets/portraits/chenqihan.jpg` | 陈奇涵 | [Wikimedia Commons · Chenqihan.jpg](https://commons.wikimedia.org/wiki/File:Chenqihan.jpg) |
| `src/assets/portraits/zhangzhen.jpg` | 张震 | [Wikimedia Commons · Zhang Zhen 1955.jpg](https://commons.wikimedia.org/wiki/File:Zhang_Zhen_1955.jpg) |
| `src/assets/portraits/lizhen.jpg` | 李贞 | [湖南省档案局 · 李贞](https://sdaj.hunan.gov.cn/sdaj/wszt/xxsl/xxrw/200810/t20081017_1977961.html) |

李贞图片来自湖南省档案局人物生平页的真实历史肖像（原图 123 × 150），来源页未给出明确开放许可，具体使用依据仍待核实。其他7张保留Commons文件页供复核，来源或既有公共领域标记不等于本轮已复核授权。网站已公开运行，不能继续将其描述为仅限原型展示；当前图片授权待核实范围见 [合规维护说明](docs/COMPLIANCE.md) 及 [逐图清单](data/compliance/image-rights-review.html)。

李贞原图地址：`https://sdaj.hunan.gov.cn/sdaj/wszt/xxsl/xxrw/200810/10453081/images/3532511761f04aa191f37526dc4b8f3b.jpg`。下载后未进行 AI 修复或重绘，前台使用同一套图片样式处理。

2026-11-17图片展示优化：所有H5肖像与纪念卡均按完整源图等比放入画框，不使用人像滤镜或额外裁切。37张公开目录肖像换为经比较后更清晰的原始来源文件，记录见 `data/design/portrait-upgrades.json`；较大但模糊、遮挡或拍摄展板的候选不替换。原照片备份留在 `.cache/portrait-quality/previous/`，未进行AI补脸、重绘或生成细节。分辨率不足的历史资料仍保留原图，详情页显示实际像素并允许查看完整原文件。

特别核对：Commons 的 `File:Li Zhen.jpg` 描述实际指向男性 **李震（1914—1973）**，与女性 **李贞（1908—1990）** 不是同一人。本版没有使用该同名文件。

## 完整名录范围参考

[《学习时报》 / 中国共产党新闻网：将军从这里走出打天下……](https://cpc.people.com.cn/n1/2023/0424/c443712-32671924.html)采用“1614 名开国将帅”的口径，与当前实际档案数量一致。


## 2026-11-17 全名录生平补充

列表简介改用具体任职或参战事实；人物详情按来源可支持的阶段编排。25人的原创叙述包括战争、院校、通信、后勤、国防建设及有出处的人生转折；不推演人物心理，不把集体战绩自动归为本人指挥。其余内容采用具名网页中的任职、战役、学校和著述事实，事实条目及出处在 `data/catalog/biography-evidence.json`，原创编辑在 `biography-editorial.json`。

选用2321篇来源：人民网251篇、维基百科1006篇、百科具体词条702篇、纪念网完整传记202篇及结构化军人数据库160篇。每篇保留URL与正文SHA-256，维基另记修订ID。百科和转载不等于独立权威证据，已有生卒和地域冲突没有因此被消除；不将抓取成功或机器校验写成全量人工审定。原网页正文仅在忽略缓存，不随应用发布。

南昌起义、长征、百团大战、淮海、渡江、抗美援朝、上甘岭及通信、后勤、军事教育、空军、海军、工程、政治工作共14类背景各有独立出处，见 `data/catalog/historical-contexts.json`。背景说明不能作为某个人参加或指挥该事件的新证据。内容厚度与仍待补充的341人见 `biography-coverage.json`；生卒、地域、授衔及190人的待核实状态保持原样。

## 2026-11-18 将帅人物专题

军校、给养、军兵种、公职、会师与参军前经历六篇专题共18节，其中同一人物可在不同专题中出现。正文与年表采用中国共产党新闻网人物生平、新华社《张震同志生平》及共产党员网李贞资料。各段和年代节点的原文链接保存在对应的专题文件中，资料页标题与核对日期见 [专题来源登记](data/topics/sources.json)。例如陈赓一节比较哈尔滨和南京的办学方向，该段同时列出陈赓、刘伯承两份生平。
