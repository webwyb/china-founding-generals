# 筛选联动与详情优化：正式发布验收

日期：2026-11-17。正式入口：[山河有名](https://shanhe.binnwu.top)。

## 提交与发布

功能、12张本地截图及验收记录在提交 `4186f87c05a274a121f07db1d1dcab44e10034cc` 一起推送。工作区同时存在另一轮合规改动；本轮以独立Git树导出副本，排除那组未提交改动后执行完整 `npm run check`，退出码0，再仅提交本轮范围。原工作文件未覆盖，人物事实、肖像、字体及景观原件未改。复用已安装依赖，不冒称空缓存恢复；见 [隔离检查](../../../data/testing/filters-profile-isolation-2026-11-17.json) 与 [本地验收](../filters-profile-2026-11-17/REVIEW.md)。

[应用检查与部署](https://github.com/webwyb/china-founding-generals/actions/runs/44042777764) 的Linux、macOS、Windows完整检查及deploy全部成功。[素材同步](https://github.com/webwyb/china-founding-generals/actions/runs/44042777683) 成功，0项上传、1642项复用，发布只读检查同一清单就绪标记。2026-11-17 16:08:06（UTC+8）公网版本与该提交及run、attempt一致。本轮不需要更新root接收器或服务器配置。

[CI记录](../../../data/testing/filters-profile-deployment-ci-2026-11-17.json)

## 线上筛选与刷新

先在旧生产版本观察到上次“李贞”搜索自动恢复，选择元帅后家乡仍显示全库人数；保留旧筛选页面，发布后直接刷新，选项恢复全部、搜索清空、结果1614位，验证旧持久化筛选不会带入新版本。

新版本实际操作：

- 元帅对应四川4、湖南3、湖北1、山西1、广东1，共10位；湖南筛选为3位。
- 选择山西后切换大将，家乡自动恢复全部，共10位。
- 搜索李贞时家乡为湖南1位。“我的铭记”标签及搜索在刷新后恢复全部名录，收藏服务未修改。
- 山东入口先显示88位并移除入口参数，刷新后恢复全部1614位。
- 少将名录手动追加至48人、进入人物再返回，仍为少将48人并保留非零阅读位置。一次紧接进入详情的返回操作未切换；转场稳定后重复返回成功。本轮按转场结束后的正常操作验收，不把极短间隔快速连击记作通过。

## 线上详情与实际视口

Chrome实际CSS视口1920×958；Codex内置浏览器390×844、320×812、768×900。全部为正式HTTPS页面，临时视口已恢复。

朱德详情封面实测手机156px、桌面250px，肖像完整等比显示并加载为1024×1430原图。键盘Enter定位人生足迹，焦点位于目标标题，吸顶导航在0px，标题约76px；资料出处会展开且焦点同步。原图弹层Esc关闭并返回肖像按钮焦点。制作纪念卡入口到达正确人物，实际预览1200×1800；此处不计下载落盘验收。

320px查看马尔果夫·伊斯哈科夫长姓名、于权伸待核实地域及于侠缺肖像：姓名可完整换行，未核实地域不配景，缺图明确占位且原图操作禁用。768px为单列阅读、正文654px。测量页面在转场结束后无横向溢出，独立人物URL刷新仍显示正确标题及canonical。

[23项浏览器观察](../../../data/testing/filters-profile-production-browser-2026-11-17.json)

## 公网HTTP复核

正式域名9个路径返回200；朱德、马尔果夫·伊斯哈科夫、于权伸、于侠四人的完整生平、时间轴、出处与已检查副本一致，身份信息块和阅读导航存在。全部1618条站点地图网址及人物覆盖正确，不存在人物返回404。此项为不执行JavaScript的HTTP解析，与上述真实浏览器操作分别记录。

[HTTP记录](../../../data/testing/filters-profile-production-http-2026-11-17.json)

## 截图

| 场景 | 截图 |
| --- | --- |
| 发布前旧家乡人数 | [390px](before-release-filter-mobile.jpg) |
| 发布后元帅联动 | [390px](marshal-linked-mobile.jpg) · [桌面](marshal-linked-desktop.jpg) |
| 朱德详情 | [390px](profile-mobile.jpg) · [桌面](profile-desktop.jpg) |
| 阅读与导航 | [桌面正文](reading-desktop.jpg) · [768px单列](reading-tablet-768.jpg) · [时间轴](timeline-mobile.jpg) · [资料出处](sources-mobile.jpg) |
| 320px边界 | [长姓名](long-name-320.jpg) · [待核实地域](pending-320.jpg) · [缺肖像](missing-portrait-320.jpg) |

共12张本轮生产截图，含1张发布前对照。本轮没有新增手机真机、微信、原生输入法、读屏或搜索收录验收。
