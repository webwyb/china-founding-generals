# SEO与纪念卡二维码发布验收

日期：2026-11-17。发布入口：`https://shanhe.binnwu.top`。

## 提交前检查

完整 `npm run check` 退出码0，包括1614份人物完整HTML、1618条站点地图地址、3228个卡片构图及独立二维码解码。接收器4项与资源2项回归通过。此前本地页面、截图和独立解码证据保留在 [SEO验收](../seo-2026-11-17/REVIEW.md) 与 [二维码验收](../card-qr-2026-11-17/REVIEW.md)。新增文件末尾空行在暂存检查中清理，未改运行逻辑。

## 生产接收器

通过腾讯云轻量实例 `lhins-afrwanuu`（北京）执行已核对的内联源文件与测试，14:39:38完成，退出码0。服务器先运行4项回归，再原子安装接收器，保留root:root、755；旧文件备份至 `/usr/local/libexec/shanhe-receive.pre-seo-52a2a4f1aac3080c`。

安装SHA-256：`7cd6fde5eb6f9d3238d79e2ba0a6dad212c75f47ac6319ed691d294a5febb1b0`，与仓库 `scripts/deploy/receive.py` 一致。此步骤没有切换现有站点版本，也没有更改部署身份、公钥、证书或云权限。

[机器可读记录](../../../data/testing/seo-receiver-2026-11-17.json) · [执行结果截图](receiver-update.jpg)

## 部署与线上检查

功能提交 `30d842c` 与依赖源修复 `e4a9bda` 已推送main。已保留远端并行的COS上传修复与两次维护文档提交。2026-11-17 15:01:29（UTC+8），[Actions #19](https://github.com/webwyb/china-founding-generals/actions/runs/44034510725) 的Linux、macOS、Windows完整检查及生产部署全部成功。公网 `version.json` 的sha、run、attempt与本次发布一致；此前成功版本保留供回滚。见 [CI记录](../../../data/testing/seo-deployment-ci-2026-11-17.json)。

本次COS增量同步上传1个二维码许可文件，复用1641个既有内容地址对象；正式站使用新静态人物路径和带二维码的纪念卡。

## CI恢复与素材核对

功能提交 `30d842c` 的首轮CI在安装依赖时发现两个新增依赖带入了开发网络镜像地址。已改为npm官方源，版本和完整性哈希不变；项目配置及完整检查增加来源约束。独立临时目录、空缓存重新安装812个包成功，完整 `npm run check` 再次通过；记录见 [依赖恢复](../../../data/testing/seo-dependency-restore-2026-11-17.json)。

上一轮发布曾因大图上传过慢失败。此次只读核对COS现有 `p1296.jpg`，5106876字节、SHA-256与仓库原图一致，正式域名CORS和immutable缓存正确；没有重复上传或修改对象，记录见 [大图核对](../../../data/testing/seo-large-asset-2026-11-17.json)。

## 公网HTTP验收

从正式HTTPS入口读取12个路径：首页、筛选名录、完整索引、说明页、粟裕／于权伸／李贞／徐向前／于敬山档案、纪念卡、robots及sitemap，均返回200。五份人物正文的全部生平段落、时间轴和来源链接与仓库资料一致；待核实状态保留。完整索引包含全部1614人，索引和说明页初始响应无需应用脚本；1618条站点地图网址与规范集合完全一致，纪念卡排除且noindex，不存在人物返回真实404。人物分享图的HTTPS、正式域名CORS及immutable缓存通过。

普通标识与Googlebot标识取得的正文逐字节一致，此项是HTTP标识比较，不是Google实际抓取。见 [公网HTTP记录](../../../data/testing/seo-production-2026-11-17.json)。

## 正式站浏览器操作

桌面Chrome实际1440×900：首页16张图片加载；点击徐向前档案、独立URL刷新；人物与纪念卡元信息同步、单一JSON-LD；两种纪念卡生成1200×1800 PNG，保存弹层、关闭／Escape、复制链接反馈通过。卡片有noindex，并以人物档案为canonical；静态通用卡片壳无canonical。预览、保存图及下载href逐字节复用同一data URL。旧粟裕hash链接自动迁移到 `/people/suyu/`。

Chrome视口工具请求320px后实际仍为1440px，没有将其记作手机布局；对应截图已按桌面命名。随后在Codex内置浏览器完成实际320×812检查：于权伸待核实地域、完整1614人索引、说明页、姓名搜索李贞仅返回本人、旧卡片hash迁移、地域不明时禁用山河样式、返回档案后恢复index。转场结束后上述页面无横向溢出。所有临时视口已恢复。

浏览器下载事件等待20秒未返回，无法确认文件落盘；内部下载页被浏览器URL策略拒绝，未通过其他路径绕过。两张PNG来自已观察的正式站成图DOM导出，不冒称浏览器下载文件。没有手机相机、微信、真机或搜索引擎收录验收。详细读数见 [浏览器记录](../../../data/testing/seo-production-browser-2026-11-17.json)。

## 正式站二维码独立识别

徐向前两种实际成图原PNG、各自800×1200质量75的JPEG共4次独立jsQR解码，均精确得到 `https://shanhe.binnwu.top/people/xuxiangqian/`；对应正式页已通过HTTP与浏览器打开／刷新。图片哈希与识别结果见 [解码记录](../../../data/testing/seo-production-qr-2026-11-17.json)。软件压缩验收不代表微信分享链路或手机相机实扫。

## 截图与原图

| 场景 | 桌面Chrome1440×900 | 内置浏览器320×812 |
| --- | --- | --- |
| 首页 | [首页](production-home-desktop.jpg) | — |
| 徐向前档案 | [详情](production-profile-desktop.jpg) | — |
| 于权伸待核实资料 | [详情](production-pending-desktop.jpg) | [详情](production-pending-mobile.jpg) |
| 全部人物索引 | [索引](production-directory-desktop.jpg) | [索引](production-directory-mobile.jpg) |
| 名录说明 | [说明](production-about-desktop.jpg) | [说明](production-about-mobile.jpg) |
| 纪念卡 | [家乡山河](production-card-landscape.jpg) · [素笺肖像](production-card-portrait.jpg) · [保存弹层](production-card-save.jpg) | [于权伸卡片](production-card-mobile.jpg) |
| 李贞姓名搜索 | — | [搜索结果](production-search-mobile.jpg) |

实际成图：[徐向前家乡山河PNG](production-xuxiangqian-landscape.png) · [徐向前素笺肖像PNG](production-xuxiangqian-portrait.png)。

## 后续恢复

代码、锁定依赖、人物资料、1609张肖像原件、字体、景观、许可证、上述截图与记录均随Git保留。按 `docs/DEVELOPMENT.md` 恢复，依赖统一从npm官方公共源安装，无需原机器的缓存或生成目录。未来发布仍以三系统检查及公网版本为准；搜索收录时间、真机和下载落盘未测范围继续保留。
