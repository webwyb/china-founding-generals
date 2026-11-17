# 山河有名

面向公众分享的开国将帅数字纪念馆原型。使用 **Taro + React + TypeScript**，当前开发与验证以 **H5** 为主，支持桌面和手机浏览器。微信小程序开发暂缓，既有基础配置与命令保留。

换机器或新对话接续开发，先读 [完整交接上下文](docs/HANDOFF.md)、[环境恢复与开发](docs/DEVELOPMENT.md)、[资料再生成与勘误](docs/DATA_PIPELINE.md) 和 [测试状态](QA.md)。根目录 `AGENTS.md` 提供协作约定。

```sh
git clone https://github.com/webwyb/china-founding-generals.git
cd china-founding-generals
npm ci
npm run setup:python
npm run check
npm run dev:h5
```

推荐Node22、Python3.11（最低3.10）。事实快照、历史肖像、网页字体、29幅景观PNG原稿和发布WebP均已纳入Git；日常开发、再生成及自动检查不需要原机器的 `.cache`。

## 产品体验

- **纪念馆首页**：历史肖像群像、纪念文案、家乡入口与故事选辑。
- **将帅名录**：按姓名、家乡、故事关键词检索，按军衔与省份组合筛选，包含无匹配结果处理。
- **人物故事**：肖像、生卒年、家乡、具体人生片段、人生节点与可查阅的文字及照片出处。
- **人物纪念卡**：预览、导出带人物档案二维码的 PNG，以及人物故事链接分享。
- **记住这个名字**：仅保存在当前设备的轻量铭记记录，无账号或服务器。

当前已收录 **1614 个独立人物档案**：10位元帅、10位大将、57位上将、177位中将、1360位少将。已整理姓名、开国时期军衔、授衔年、生卒年、籍贯或出生地、基本生平、人生节点与来源链接，并保留原有8篇精选故事。有争议且未核定的字段不作为定值发布。

截至2026-11-17，**1609位人物使用本地历史肖像，5位使用明确标注的占位图**。元帅、大将、上将和177位中将均已有肖像，剩余缺图为少将。占位表示尚未取得可用且身份匹配的照片，也包含来源暂时无法下载的情况。没有使用AI生成的人脸。名录按24人分批显示，照片懒加载；姓名检索包含已核对的原名录异体写法。

本轮勘误发现并修正了任职区间误读为生卒年、工作地点误作籍贯，以及授衔时期不同的同名人物混入等问题。9条不符身份的资料来源已排除。206项来源差异中，204项尚待核实，涉及190人：这些字段在档案、列表、时间轴和纪念卡中统一显示“待核实”或暂不列入，不再单方面选值。3人的地域未核定，暂不推测配景。详见 `data/catalog/pending-review.json`、`field-provenance.json` 和 `rejected-identities.json`。

这是全量基本档案整理，不代表1614篇生平已经全部完成逐句人工审定。地区入口保留所采用来源的历史籍贯或出生地记载，不等同于按今日行政区划计算的人数。元帅为10位，不将1614位统称为元帅。测试覆盖与尚未实测的兼容项目见 [QA.md](QA.md)。

## 山河景观与交互

本轮按已安装的 `frontend-design` skill 打磨了H5。以瓷白、松青、黛墨和朱砂为主色，使用本地思源宋体子集（约540KB，保留400–600字重），覆盖1614位人物姓名的全部字符。标题、正文、日期和控件采用统一字号与对齐关系，手机页面保留可见的保存/铭记操作。

29个实际收录的省级地区分别配有一幅独立生成的中国风景观。人物详情、按省份筛选的名录与“家乡山河”纪念卡共用 `src/data/landscapes.ts` 的对应关系，如北京长城、山东泰山、湖南张家界、安徽黄山。景观是当代地域文化意象，历史肖像保持原有身份和影像内容。

- 名录增加“我的铭记”，支持多关键词组合；进入人物页前保存筛选、已加载数量和当前Taro页面的阅读位置。
- 详情页使用山河封面与独立历史肖像，资料来源可展开阅读；手机底部提供铭记与制作纪念卡入口。
- 纪念卡提供“家乡山河”和“素笺肖像”两种样式，右下角二维码直达正式网站的对应人物档案。预览直接显示用于保存的1200×1800 PNG，避免预览与下载排版不同；生成失败可重试，手机支持长按保存。
- 弹窗支持Esc关闭、键盘焦点约束和回到触发控件，锁定实际页面滚动；按钮保留可见焦点，减少动态效果的偏好得到尊重。

肖像统一使用完整等比展示，照片墙、人物详情与两种纪念卡均保留源图全部画面。去掉人像滤镜、悬停放大与覆盖照片的跳转图标，避免帽子、肩章和勋章被二次裁切或遮挡。详情可点击肖像或“查看原图”，完整原图等比显示且不强制放大，也可打开原文件查看细节。原始资料中已有的裁切和模糊无法由排版恢复。

本轮已比较原始来源并替换37张更高分辨率且适合展示的肖像，替换前后尺寸、下载地址、许可说明和哈希记录在 `data/design/portrait-upgrades.json`。不采用AI重绘人脸。公开目录肖像URL带内容版本号，避免照片更新后继续显示旧缓存。

后续多渠道检索另补入171张缺失肖像（163位中将、8位少将），来源包括高校校史、地方党史供图、方志政务、新华网及抗日战争纪念网人物栏目。候选、逐图核对依据和5个排除项保存在 `data/catalog/portrait-candidates.json` 与 `portrait-supplements.json`；逐张保留原文件、出处、像素和许可说明，未改动生平事实。

生成提示词见 `data/design/landscape-prompts.json`，发布素材及哈希见 `landscape-assets.json`，字体来源与许可见 `font.json` 和 `public/fonts/OFL-NotoSerifSC.txt`。29张1536×1024景观经WebP编码后合计约11.6MB，只按当前页面需要加载；PNG原稿在 `design/landscapes/` 中保留并提交Git。使用内置image_gen生成素材，没有调用API密钥或外部图像模型。

```sh
npm run validate:design
npm run validate:portraits
npm run validate:functions
npm run test:catalog
```

设计检查覆盖地区配图完整性、素材哈希与体积、名录状态存取和异常恢复。肖像检查读取全部1609张实际图片，验证两种纪念卡的绘制区域、比例，并通过极端横竖图的四角像素检查裁切和遮挡；报告在 `data/design/portrait-layout-report.json`，同时列出短边不足200像素的来源，便于后续补换。`scripts/render_design_cards.mjs` 使用生产绘图函数做静态卡片验证，检查1614人×2样式的3228个构图，并输出9位代表人物的两种样式到 `.cache/design-review/`；独立解码器校验全部人物的二维码，以及18张完整PNG和18张缩小压缩JPEG，报告见 `data/design/card-qr-report.json`。功能检查使用生产逻辑与明确的存储、导航及剪贴板适配器，覆盖186种筛选组合、全量分批浏览及异常恢复；这不等于浏览器交互实测。

静态卡片验证使用锁定的开发依赖 `@napi-rs/canvas@1.1.1` 和仓库内WOFF2，`npm ci` 后即可运行；它不是H5运行依赖。字体源的固定版本及SHA见 `data/design/font-upstream.json`，增加未收录汉字时可恢复TTF并重建子集。景观重新编码需要可选工具 `cwebp`，普通构建和校验不需要安装它。

## 本地运行

需要 Node.js 20 或更新版本。

```sh
npm ci
npm run dev:h5
```

打开终端打印的本地地址（默认端口5173）。H5使用普通路径：人物页 `/people/人物id/`、名录 `/generals/`，旧的 `/#/pages/person/index?id=人物id` 分享链接会由浏览器迁移到对应新地址。

```sh
npm run typecheck
npm run validate:data
npm run build
npm run preview
```

- `npm run build` 与 `npm run build:h5` 均只构建 H5，输出到 `dist/h5/`。
- `npm run preview` 需要 Python 3.10+，以静态 HTTP 服务预览已有构建，打开 `http://127.0.0.1:5173`。预览前先完成构建；同时只启动一个使用5173端口的服务。
- 生产构建同时生成1614份完整人物HTML及首页、名录、完整档案索引、资料说明；普通静态服务器即可直接访问与刷新，无需把未知人物回退成首页。当前资源按域名根目录寻址。

H5 样式保留 CSS 像素以支持桌面及手机响应式布局，页面使用 Taro 组件。

## 分享与保存

- H5 桌面：生成并下载1200×1800 PNG。
- H5 手机/微信浏览器：打开生成的图片，供用户长按保存。
- H5 人物故事：复制人物页链接。本地预览地址只对能访问该主机的设备有效，公网分享需要先部署。
- H5 两种卡片都绘入真实二维码，固定指向 `https://shanhe.binnwu.top/people/人物id/`，本地生成的卡片也使用正式地址。正式域名统一维护于 `config/site.json`，路径维护于 `src/services/personLinks.ts`；更换域名后需保留已分享图片所用旧地址的跳转。
- 网页二维码使用 `qrcode-generator`，MIT许可保留在 `public/licenses/qrcode-generator-MIT.txt`。小程序码暂未接入；图片或画布超时会返回明确提示。二维码截图及实际验收范围见 [本轮记录](docs/reviews/card-qr-2026-11-17/REVIEW.md)。

## 搜索引擎入口

`npm run build` 会复用实际React页面生成1619个HTML（含不索引的纪念卡制作入口），人物生平、人生足迹、背景与出处在原始HTML中可读。每人独立标题、摘要、规范网址及Person／WebPage结构化数据；首页与人物导航使用真实链接，`/people/` 提供全部档案入口。根目录 `robots.txt` 和 `sitemap.xml` 包含1618条可索引规范网址，排除纪念卡、筛选参数和旧hash地址。

`npm run check` 包含全量SEO构建校验，`npm run validate:seo` 可单独复查已构建页面。上线与站长平台提交说明见 [SEO维护](docs/SEO.md)，实际页面与验收截图见 [本轮记录](docs/reviews/seo-2026-11-17/REVIEW.md)。首次发布前需更新服务器root持有的接收器，普通应用推送不会更新该文件；详见 [部署要求](docs/DEPLOYMENT.md#seo静态页面的首次发布)。本地校验不表示已经上线或获得搜索收录。

## 微信小程序状态

此前已完成微信小程序基础构建验证，尚未运行微信开发者工具或真机验证。当前暂缓小程序适配与检查，后续 H5 改动不保证已在小程序验证。

`npm run build:weapp`、`npm run dev:weapp` 与 `project.config.json` 保留，默认构建不会执行这些命令。若未来恢复小程序开发，需重新构建 `dist/weapp/`，配置真实 AppID，并验证布局、原生转发、Canvas 导出及相册授权。

## 内容与后续工作

应用数据入口为 `src/data/people.ts`，全量档案为 `src/data/catalog.generated.json`，原有精选故事为 `src/data/featured.ts`。新增肖像在 `public/portraits/`，构建后位于 `dist/h5/static/portraits/`；精选肖像仍在 `src/assets/portraits/`。出处与整理方法见 `source-notes.md`。

`data/catalog/people.csv` 可用于表格审阅，包含1614条记录、资料说明及出处。`quality-report.json` 提供人数、军衔与缺项统计，`missing-fields.json` 列出占位档案，`portraits.json` 保存照片下载地址、尺寸、哈希及来源的许可说明。网络原文只保存在被忽略的 `.cache/`，前台简述按事实重新组织。

采集与生成脚本使用Python3.10+，工具安装到当前项目虚拟环境：

```sh
npm run setup:python
npm run data:build
npm run data:verify
npm run validate:data
```

以上生成命令默认使用已提交的 `data/catalog/evidence/` 事实快照，并校验条数和SHA，不依赖网页原文缓存。只有显式 `--refresh-evidence` 才重新解析研究缓存；完整重新采集需要网络及人工审阅。单项勘误维护 `reviewed-facts.json`。详见 `docs/DATA_PIPELINE.md` 和 `source-notes.md`。

H5 正式发布前仍需：逐项复核资料差异、补充缺失肖像、完成影像使用核验，并在手机与微信浏览器中验证阅读、分享和图片保存。生产域名及 HTTPS 已接入，维护方式见下文。H5 的微信原生分享文案/缩略图定制需要另行接入微信网页 SDK 与对应服务端签名；当前使用可复制的普通人物链接。

## 目录

```text
config/                 H5 构建配置及保留的小程序配置
src/components/         共用布局与人物缩略卡
src/data/people.ts       全量档案与精选故事的合并入口
src/data/catalog.generated.json  1614个人物基本档案
src/data/featured.ts     原有8篇精选故事
data/catalog/           CSV、来源、图片清单、资料差异及缺项报告
public/portraits/       新增的本地历史肖像
scripts/                公开资料采集、数据生成与完整性校验
src/pages/index/        纪念馆首页
src/pages/explore/      检索与家乡浏览
src/pages/person/       人物档案与故事
src/pages/card/         人物纪念卡
src/services/          本机记录、分享与图片导出
src/app.scss            共用视觉与响应式样式
```


## 自动发布

线上入口：[山河有名](https://shanhe.binnwu.top)。应用推送 `main` 后，GitHub Actions 完成三系统检查并发布网页代码小包；肖像、景观、字体由独立素材工作流增量同步到腾讯云 COS。网页发布只读确认素材就绪，可独立重试；纯文档修改跳过构建部署。权限边界、版本与回滚见 [部署说明](docs/DEPLOYMENT.md)，实际验收范围见 [QA.md](QA.md)。

访问统计使用腾讯云RUM，页面访问不抽样，基础性能采样10%，仅正式HTTPS域名启用。统计口径、费用、隐私说明和停用方法见 [访问统计维护](docs/ANALYTICS.md)。

`shanhe.binnwu.top` 由 DNSPod 的 A 记录指向 `49.233.60.125`，域名 HTTP 请求自动跳转 HTTPS。免费证书由 Let's Encrypt 签发，服务器 `certbot.timer` 自动续期，成功后通过部署钩子检查并重载 Nginx；日常推送无需手工上传证书。续期检查、迁移恢复和排障命令见 [域名与免费 HTTPS](docs/DEPLOYMENT.md#域名与免费-https)，接入时的实测记录见 [域名验收](docs/reviews/domain-https-2026-11-17/REVIEW.md)。
