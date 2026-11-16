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
- **人物纪念卡**：预览、导出 PNG，以及人物故事链接分享。
- **记住这个名字**：仅保存在当前设备的轻量铭记记录，无账号或服务器。

当前已收录 **1614 个独立人物档案**：10位元帅、10位大将、57位上将、177位中将、1360位少将。已整理姓名、开国时期军衔、授衔年、生卒年、籍贯或出生地、基本生平、人生节点与来源链接，并保留原有8篇精选故事。有争议且未核定的字段不作为定值发布。

截至2026-11-17，**1172位人物使用本地历史肖像，442位使用明确标注的占位图**。占位表示尚未取得可用且身份匹配的照片，也包含来源暂时无法下载的情况。没有使用AI生成的人脸。名录按24人分批显示，照片懒加载；姓名检索包含已核对的原名录异体写法。

本轮勘误发现并修正了任职区间误读为生卒年、工作地点误作籍贯，以及授衔时期不同的同名人物混入等问题。9条不符身份的资料来源已排除。206项来源差异中，204项尚待核实，涉及190人：这些字段在档案、列表、时间轴和纪念卡中统一显示“待核实”或暂不列入，不再单方面选值。3人的地域未核定，暂不推测配景。详见 `data/catalog/pending-review.json`、`field-provenance.json` 和 `rejected-identities.json`。

这是全量基本档案整理，不代表1614篇生平已经全部完成逐句人工审定。地区入口保留所采用来源的历史籍贯或出生地记载，不等同于按今日行政区划计算的人数。元帅为10位，不将1614位统称为元帅。测试覆盖与尚未实测的兼容项目见 [QA.md](QA.md)。

## 山河景观与交互

本轮按已安装的 `frontend-design` skill 打磨了H5。以瓷白、松青、黛墨和朱砂为主色，使用本地思源宋体子集（约540KB，保留400–600字重），覆盖1614位人物姓名的全部字符。标题、正文、日期和控件采用统一字号与对齐关系，手机页面保留可见的保存/铭记操作。

29个实际收录的省级地区分别配有一幅独立生成的中国风景观。人物详情、按省份筛选的名录与“家乡山河”纪念卡共用 `src/data/landscapes.ts` 的对应关系，如北京长城、山东泰山、湖南张家界、安徽黄山。景观是当代地域文化意象，历史肖像保持原有身份和影像内容。

- 名录增加“我的铭记”，支持多关键词组合；进入人物页前保存筛选、已加载数量和当前Taro页面的阅读位置。
- 详情页使用山河封面与独立历史肖像，资料来源可展开阅读；手机底部提供铭记与制作纪念卡入口。
- 纪念卡提供“家乡山河”和“素笺肖像”两种样式。预览直接显示用于保存的1200×1800 PNG，避免预览与下载排版不同；生成失败可重试，手机支持长按保存。
- 弹窗支持Esc关闭、键盘焦点约束和回到触发控件，锁定实际页面滚动；按钮保留可见焦点，减少动态效果的偏好得到尊重。

肖像统一使用完整等比展示，照片墙、人物详情与两种纪念卡均保留源图全部画面。去掉人像滤镜、悬停放大与覆盖照片的跳转图标，避免帽子、肩章和勋章被二次裁切或遮挡。详情可点击肖像或“查看原图”，完整原图等比显示且不强制放大，也可打开原文件查看细节。原始资料中已有的裁切和模糊无法由排版恢复。

本轮已比较原始来源并替换37张更高分辨率且适合展示的肖像，替换前后尺寸、下载地址、许可说明和哈希记录在 `data/design/portrait-upgrades.json`。不采用AI重绘人脸。公开目录肖像URL带内容版本号，避免照片更新后继续显示旧缓存。

生成提示词见 `data/design/landscape-prompts.json`，发布素材及哈希见 `landscape-assets.json`，字体来源与许可见 `font.json` 和 `public/fonts/OFL-NotoSerifSC.txt`。29张1536×1024景观经WebP编码后合计约11.6MB，只按当前页面需要加载；PNG原稿在 `design/landscapes/` 中保留并提交Git。使用内置image_gen生成素材，没有调用API密钥或外部图像模型。

```sh
npm run validate:design
npm run validate:portraits
npm run validate:functions
npm run test:catalog
```

设计检查覆盖地区配图完整性、素材哈希与体积、名录状态存取和异常恢复。肖像检查读取全部1172张实际图片，验证两种纪念卡的绘制区域、比例，并通过极端横竖图的四角像素检查裁切和遮挡；报告在 `data/design/portrait-layout-report.json`，同时列出短边不足200像素的来源，便于后续补换。`scripts/render_design_cards.mjs` 使用生产绘图函数做静态卡片验证，检查1614人×2样式的3228个构图，并输出8位代表人物的两种样式到 `.cache/design-review/`。功能检查使用生产逻辑与明确的存储、导航及剪贴板适配器，覆盖186种筛选组合、全量分批浏览及异常恢复；这不等于浏览器交互实测。

静态卡片验证使用锁定的开发依赖 `@napi-rs/canvas@1.1.1` 和仓库内WOFF2，`npm ci` 后即可运行；它不是H5运行依赖。字体源的固定版本及SHA见 `data/design/font-upstream.json`，增加未收录汉字时可恢复TTF并重建子集。景观重新编码需要可选工具 `cwebp`，普通构建和校验不需要安装它。

## 本地运行

需要 Node.js 20 或更新版本。

```sh
npm ci
npm run dev:h5
```

打开终端打印的本地地址（默认端口5173）。浏览器使用 hash 路由，人物页支持 `/#/pages/person/index?id=人物id` 直接访问。

```sh
npm run typecheck
npm run validate:data
npm run build
npm run preview
```

- `npm run build` 与 `npm run build:h5` 均只构建 H5，输出到 `dist/h5/`。
- `npm run preview` 需要 Python 3.10+，以静态 HTTP 服务预览已有构建，打开 `http://127.0.0.1:5173`。预览前先完成构建；同时只启动一个使用5173端口的服务。
- 浏览器使用 hash 路由，静态托管无需配置路由回退。

H5 样式保留 CSS 像素以支持桌面及手机响应式布局，页面使用 Taro 组件。

## 分享与保存

- H5 桌面：生成并下载1200×1800 PNG。
- H5 手机/微信浏览器：打开生成的图片，供用户长按保存。
- H5 人物故事：复制人物页链接。本地预览地址只对能访问该主机的设备有效，公网分享需要先部署。
- 原型没有绑定真实小程序码，不展示虚构二维码；图片或画布超时会返回明确提示。

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

H5 正式发布前仍需：逐项复核资料差异、补充缺失肖像、完成影像使用核验、配置生产域名，并在手机与微信浏览器中验证阅读、分享和图片保存。H5 的微信原生分享文案/缩略图定制需要另行接入微信网页 SDK 与对应服务端签名；当前使用可复制的普通人物链接。

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
