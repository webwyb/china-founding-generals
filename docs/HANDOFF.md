# 山河有名 · 开发交接上下文

更新日期：2026-11-17。此文件供换机器、换开发者或新对话接续使用，不依赖旧聊天记录。

## 用户目标与已确定范围

用户希望制作面向公众传播与分享的开国将帅纪念作品。最初讨论过照片墙、小程序、H5、图文和视频，曾考虑用Taro同时支持H5与小程序；随后明确**先不考虑小程序，重点开发H5**。目前是兼顾手机和PC的网页应用，名称“山河有名”。

“1614位开国元帅”已更正为“1614位开国将帅”：元帅10位、大将10位、上将57位、中将177位、少将1360位。统计口径与来源见 `source-notes.md`。附图只是参考材料，不是产品文案指令；海报中的“全部离世、无一人贪腐落马”等说法没有作为应用事实。

用户的后续要求包括：全量人物资料录入；缺少真实肖像时明确占位；持续打磨UI、字体、对齐与交互；详情和纪念卡按省份配中国风特色景观；优化图片清晰度并避免裁断人物；检查功能、H5／PC兼容与事实错误；把上下文和代码保存在远程Git以便换机继续开发。

## 当前产品

- 首页：人物群像、家乡入口、精选故事。
- 将帅名录：姓名、家乡、生平关键词检索；军衔和地区组合筛选；每批24人；“我的铭记”；保存筛选和阅读位置。
- 人物档案：完整肖像、原图查看、生平、时间轴、资料差异、可展开出处、相关人物。
- 纪念卡：“家乡山河”和“素笺肖像”；预览直接显示最终1200×1800 PNG；电脑下载，手机长按保存；复制人物页链接。
- 铭记仅存在当前浏览器本地存储。没有账号、数据库或服务端；Git迁移不会自动同步某台设备的铭记记录。
- 微信原生分享文案和缩略图尚未接入网页SDK及服务端签名。当前分享能力是复制普通人物页链接。

## 实现与关键文件

技术栈：Taro4.3.2、React18.3.1、TypeScript、Vite。日常使用Node22，Python研究／数据工具推荐3.11，最低3.10。依赖以锁文件为准。

| 内容 | 入口 |
| --- | --- |
| 全量资料、精选故事合并 | `src/data/people.ts`、`catalog.generated.json`、`featured.ts` |
| 事实快照与人工勘误 | `data/catalog/evidence/`、`reviewed-facts.json` |
| 再生成与身份排除 | `scripts/build_catalog.py`、`rejected-identities.json` |
| 来源差异与字段出处 | `source-conflicts.json`、`pending-review.json`、`field-provenance.json` |
| 检索与本地阅读状态 | `src/services/catalogue.ts`、`catalogueState.ts` |
| 铭记、导航、复制 | `collection.ts`、`src/components/Shell.tsx`、`share.ts` |
| 卡片唯一绘制入口 | `src/services/cardRenderer.ts` |
| 肖像完整等比展示 | `src/components/Portrait.tsx`、`src/services/imageGeometry.ts` |
| 弹窗与无障碍行为 | `src/components/Dialog.tsx`、`Button.tsx` |
| 风格与响应式 | `src/app.scss`、`docs/DESIGN.md` |
| 景观映射、素材与原稿 | `src/data/landscapes.ts`、`public/landscapes/`、`design/landscapes/` |
| 字体与许可 | `src/assets/fonts/`、`public/fonts/OFL-NotoSerifSC.txt` |

H5采用hash路由，例如 `/#/pages/person/index?id=suyu`。公开目录肖像在 `public/portraits/`，构建复制到 `dist/h5/static/portraits/`；原有8张精选肖像由Vite从 `src/assets/portraits/` 打包。`config/index.ts` 的复制源使用配置文件位置解析，勿改回依赖调用目录的相对路径。

H5图片、字体和媒体的输出名显式使用POSIX斜杠，这是浏览器URL；不能改为平台默认 `path.join`。Taro4.3.2默认配置在Windows上会生成反斜杠并破坏JavaScript中的图片URL，远程Windows构建已暴露该问题。

## 当前资料状态与不能丢失的约束

名录1614人；本地真实肖像1343张；271人使用明确标注的占位图。元帅、大将、上将和177位中将均已有肖像，缺图均为少将。53张原图短边不足200像素。已比较并升级37张肖像来源，前后记录见 `data/design/portrait-upgrades.json`；不通过AI重绘人脸伪造清晰细节。

2026-11-17多渠道检索补入171张缺图：163位中将、8位少将；330个原图候选中逐人选择一张。高校校史、地方党史供图、方志政务、新华网和抗日战争纪念网等渠道的出处及身份依据保存在 `data/catalog/portrait-candidates.json` 与 `portrait-supplements.json`。170张在六张联系表中逐张查看，赛福鼎·艾则孜原图单独查看；原图全部保留，没有额外裁切或生成。此轮仅修改肖像字段，生平事实和争议状态未变，比较报告见 `data/testing/portrait-supplements.json`。

排除了王诤候选文件说明写为王秉璋的冲突照片，以及4个多人合影候选。`scripts/portrait_sources.py` 会在再生成和旧采集入口中继续过滤这些记录。新增缺图的发现、暂存、联系表和审核录入流程见 `DATA_PIPELINE.md`；已提交的审核与原图可在无下载缓存的新机器直接校验。Commons原图下载本轮遭429后停止；部分政务源403或超时，没有绕过访问限制。

206项来源差异中，204项尚待核定，涉及190人：148个出生年、34个逝世年、16个授衔年、3个籍贯和3个地域字段。**这些待核实值没有作为定值发布。** 页面、时间轴与纪念卡同步处理。于权伸、李际泰、鲍奇辰的地域信息暂不作定论，卡片使用素笺，不推测配景。

已排除9条身份不符来源，修正了周仁杰任职区间误作逝世年份、杨得志／刘先胜工作地误作籍贯、同名李平／朱光混入籍贯、史进前晋衔年等问题。修正前后值见 `data/testing/factual-corrections.json`。历史省县变动、原籍、出生地、迁居地不得混为一谈；地区入口采用档案所载记载，不是按今日行政区划统计人数。

四对同名人物李元、李道之、罗斌、张英必须分别保留独立ID。Commons的 `File:Li Zhen.jpg` 实为男性李震，不能用于女性李贞；此项特别记录在 `source-notes.md`。

## 设计上下文

使用瓷白、松青、黛墨和朱砂，配本地宋体子集；整体是克制的数字纪念馆。29个已确定的省级地区各有独立中国风景观，如北京长城、山东泰山。景观由内置image_gen生成，是地域文化意象，不能用来证明人物曾到访或作战。

肖像统一完整等比放入画框，移除灰度滤镜、悬停放大和照片上的跳转遮挡。原图查看不强制放大小图，显示实际尺寸。卡片预览和下载必须复用同一Canvas输出，避免两套排版漂移。

原PNG设计文件已纳入 `design/landscapes/`。网页使用约11.6MB的WebP素材按需加载；原稿不会一起打进网页。字体原始TTF可按固定官方版本和SHA恢复，日常开发与所有自动检查直接使用仓库内WOFF2，不要求下载TTF。设计技能与许可副本在 `docs/skills/frontend-design/`，具体设计决定见 `DESIGN.md`。

## 测试状态与剩余工作

补图后完整 `npm run check` 通过类型检查、目录校验、186种筛选组合与1614人分批遍历、9个事实解析和3个肖像来源排除回归用例、1343张人像的两种卡片及6个极端比例测试（共2692个构图）、3228个卡片文字布局检查，以及H5构建。171张新增图片全部可解码并已复制到构建目录；审核文件重复应用新增0张。逻辑测试使用明确的导航、存储、剪贴板适配器；静态卡片测试使用Skia。它们不等于真实浏览器测试。

2026-11-17本轮使用项目内 `frontend-design` skill 完成 H5 多轮打磨。在用户指定的 Chrome 中访问同一个 `http://127.0.0.1:5173` 成功，早先访问拒绝不再是本轮阻塞；没有以其他浏览器或地址绕过。完整检查通过，最终 UI 微调又通过类型检查与构建。浏览器范围及截图见 `reviews/h5-ui-2026-11-17/REVIEW.md` 与 `QA.md`，不能继续沿用“页面未打开、完全未测”的旧状态。

四个页面检查了320、360、390、430、768、1024、1440px CSS视口，另测640×360弹窗；名录自动／手动加载、72人返回及刷新、组合筛选、空态、铭记同步、长姓名、待核实地域卡片、弹层焦点及PC PNG下载均有实际页面证据。仍未执行iOS／Android／微信真机、其他桌面引擎、系统输入法和读屏测试。

实现注意：Taro H5会改写CSS中的button标签选择器，因此共用Button新增 `.ui-button`，控件样式必须使用组件类名。Icon统一由 `--icon-size` 同时确定宽高；人物按钮显式顶部布局，避免原生按钮内容垂直居中。名录IntersectionObserver提前480px追加24人，保留手动按钮和新增项键盘焦点；存储写入合并，记录实际Taro页面滚动。手机卡片样式选择在预览上方，保存仍复用同一PNG。资料文件与肖像另有并行更新，本轮UI不调整人物事实。

后续优先事项：完成 `QA.md` 剩余跨浏览器与真机验收；逐项核定204个争议字段；补缺肖像和更清晰原图；正式发布前核实影像使用范围、生产域名和微信分享接入。当前不是已经完成全量人工史学审校的成品。

安装时npm报告的依赖审计基线为34项（11中、17高、6严重），尚未逐项区分构建依赖与运行依赖。没有执行可能改变Taro工具链的强制升级；后续应按具体依赖影响单独处理，不能宣称已完成安全审计。

## 换机接续

本轮UI优化、六张最终截图和验收记录一起归档在 `reviews/h5-ui-2026-11-17/`。提交前已从 `29685fe` 基线导出独立副本，只加入本轮19个文件后通过完整 `npm run check`；不依赖本工作区尚未提交的另一轮补图。迁移后从 `QA.md` 和上述复核记录了解已测范围，再继续剩余真机与跨浏览器验收。

按 `DEVELOPMENT.md` 克隆、`npm ci`、`npm run setup:python`、`npm run check`。无需复制原机器 `.cache`、`node_modules`、`.venv` 或 `dist`，无需图像生成或API密钥即可运行已有应用和自动检查。

2026-11-17已在独立目录完成无旧缓存的恢复演练：全新安装Node与Python依赖，使用Node22.9.0、Python3.13.3执行完整检查及H5构建，退出码均为0。此项是同一台macOS机器的独立目录验证，不代表另一台物理设备或其他系统实测；记录见 `data/testing/migration.json`。Linux、macOS、Windows远程自动检查由仓库工作流另行执行，以实际CI记录为准。

修改事实优先维护带出处的 `reviewed-facts.json`，再运行 `npm run data:build` 与校验；不要直接修改生成目录。若需修改原网页解析或重新采集，阅读 `DATA_PIPELINE.md`。不要用少量新网页覆盖完整事实快照。


## 自动发布与线上环境（2026-11-17）

已接入 [GitHub Actions](https://github.com/webwyb/china-founding-generals/actions/workflows/ci.yml)：推送 main 后三系统完整检查通过，自动增量上传 COS 素材并向腾讯云轻量实例 `lhins-afrwanuu` 发布网页。入口为 `http://49.233.60.125`，尚未配置域名和 HTTPS。

图片、景观、字体与图标使用北京 `media-1301987491/shanhe/assets/<sha256>/<文件名>`，版本化素材保留供旧页面和回滚引用；服务器只接收约477 KiB的网页代码包。发布目录 `/srv/shanhe/releases/`，原子入口 `/srv/shanhe/current`，专用受限 SSH 用户 `shanhe-deploy`。GitHub production 环境仅允许 main，保存三个发布 Secrets；凭据不在仓库中。COS API 身份仅拥有该素材目录的上传和列举权限。

`9bfc4cb` 已通过 [Actions #8](https://github.com/webwyb/china-founding-generals/actions/runs/44012159290)，线上首页图片加载与两种纪念卡成图已在内置浏览器验证，下载落盘事件未由工具确认。部署配置、CORS、主机公钥、依赖锁定和回滚见 `DEPLOYMENT.md`；准确测试范围见 `QA.md`。本地构建默认保留完整静态资源，仅生产 CI 设置 COS 地址；不要把生产密钥或生成目录提交Git。
