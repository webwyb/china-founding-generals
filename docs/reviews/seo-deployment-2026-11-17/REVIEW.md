# SEO与纪念卡二维码发布验收

日期：2026-11-17。发布入口：`https://shanhe.binnwu.top`。

## 提交前检查

完整 `npm run check` 退出码0，包括1614份人物完整HTML、1618条站点地图地址、3228个卡片构图及独立二维码解码。接收器4项与资源2项回归通过。此前本地页面、截图和独立解码证据保留在 [SEO验收](../seo-2026-11-17/REVIEW.md) 与 [二维码验收](../card-qr-2026-11-17/REVIEW.md)。新增文件末尾空行在暂存检查中清理，未改运行逻辑。

## 生产接收器

通过腾讯云轻量实例 `lhins-afrwanuu`（北京）执行已核对的内联源文件与测试，14:39:38完成，退出码0。服务器先运行4项回归，再原子安装接收器，保留root:root、755；旧文件备份至 `/usr/local/libexec/shanhe-receive.pre-seo-52a2a4f1aac3080c`。

安装SHA-256：`7cd6fde5eb6f9d3238d79e2ba0a6dad212c75f47ac6319ed691d294a5febb1b0`，与仓库 `scripts/deploy/receive.py` 一致。此步骤没有切换现有站点版本，也没有更改部署身份、公钥、证书或云权限。

[机器可读记录](../../../data/testing/seo-receiver-2026-11-17.json) · [执行结果截图](receiver-update.jpg)

## 部署与线上检查

接收器更新后的应用提交、CI运行和线上验收结果将在实际完成后追加。本记录当前不宣称应用已上线或搜索引擎已收录。
