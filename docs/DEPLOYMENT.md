# GitHub Actions 与腾讯云发布

目标实例：腾讯云轻量服务器 `lhins-afrwanuu`（北京），Ubuntu 24.04，公网 `49.233.60.125`。正式入口为 [https://shanhe.binnwu.top](https://shanhe.binnwu.top)。域名 HTTP 请求自动跳转 HTTPS；原 IP 入口保留供已有链接及发布接收器的本机健康检查使用。

## 自动发布

推送到 `main` 后，`.github/workflows/ci.yml` 在 Ubuntu、macOS、Windows 上恢复依赖并执行完整 `npm run check`。Ubuntu 构建打包为 `h5-production` artifact（保留7天）。三系统全部成功后，独立 deploy job 下载同一次运行的产物，先增量上传 COS 素材，再通过 SSH 上传仅含 HTML、JS、CSS 和版本信息的小包，最后核对公网 `version.json` 的提交 SHA、运行 ID 与重试编号。其他分支与 PR 只检查，不部署。Actions 页面可手动 Run workflow，选择 `main`。

`production` Environment 只允许 `main` 部署，不设置人工审核，使 push 后自动完成。私密配置为 `DEPLOY_SSH_KEY`、`COS_SECRET_ID`、`COS_SECRET_KEY`；构建 job 无法读取它们。官方 Actions 均固定完整 commit SHA，COS Python SDK 及其依赖固定在 `scripts/requirements-deploy.lock`。服务器 SSH ED25519 主机公钥由腾讯云控制台内读取，保存在 `scripts/deploy/known_hosts`，不在工作流中临时信任扫描结果。

部署并发组为 `shanhe-production`，不会中途取消上传。发布前检查 main 头提交，跳过已经落后的运行；日志出现 `Skipping superseded commit` 表示该次运行未更新网站，当前实际版本以公网 `version.json` 为准。

日常发布只需提交并推送 `main`，在 [工作流页面](https://github.com/webwyb/china-founding-generals/actions/workflows/ci.yml) 查看三系统 `check` 和 `deploy` 结果。需要重新发布或重试失败的发布时，在该页面选择 **Run workflow → main**，启动新一轮完整运行，使制品中的 `run`／`attempt` 与发布参数一致。单独重跑 deploy 会复用旧制品；若重试编号变化，接收器会拒绝编号不一致的包。普通应用更新无需登录服务器执行构建、上传图片或更换证书。发布后 `deploy` 摘要会链接到正式域名；`version.json` 的 `sha`、`run`、`attempt` 分别对应提交、Actions 运行与重试次数。

## COS 素材

复用北京地域 `media-1301987491`，网站素材范围为 `shanhe/assets/`。肖像、景观、字体、图标都使用 `https://media-1301987491.cos.ap-beijing.myqcloud.com/shanhe/assets/<sha256>/<文件名>`，同一内容地址保持不变，更新资源产生新地址。部署只列举该前缀，并上传尚不存在的对象，保留旧资源供旧页面与回滚使用。该目录的存储与流量使用现有 COS 计费及资源包规则。

CAM 专用身份关联 `ShanheAssetsPublish`，策略原稿为 `scripts/deploy/cos-policy.json`：只有该目录的 `PutObject` 和限定 prefix 的 `GetBucket`。存储桶原有公共读取模式沿用；CORS 允许 `https://shanhe.binnwu.top` 与原 `http://49.233.60.125` 的 GET/HEAD，支持跨域字体与 Canvas 图片导出。

素材上传使用300秒请求超时、最多4个文件并发，并保留 SDK 的网络重试。通过 SDK 支持的可回退文件流传递已校验的原图字节，让 HTTP 按块读取请求体，重试时从头发送；仍使用单次 PutObject、MD5与原有目录权限。接口用法见 [官方 Python SDK](https://cloud.tencent.com/document/product/436/12269)。日志在请求前记录文件路径及大小；失败时保留具体文件和原始错误，便于定位首次上传的大图。暂时网络错误排除后，通过 **Run workflow → main** 重发；已经成功上传的内容按哈希复用。

首次大量素材上传若持续出现 COS `UserNetworkTooSlow`，仅增加请求超时无法保证完成。可一次性从对应已检查构建的 `dist/h5/static/` 与 `release-assets.json` 中挑出未存在的对象，按清单 `key` 组织本地 `assets/<sha256>/<文件名>` 目录，再通过 COS 控制台上传到 `media-1301987491/shanhe/`。选择的是本地 **assets 文件夹**，最终对象键须为 `shanhe/assets/<sha256>/<文件名>`；保持标准存储、继承桶权限，并统一设置 `Cache-Control: public,max-age=31536000,immutable`，Content-Type 按原文件类型保留。补齐后核对对象长度、SHA-256、缓存及 HTTPS CORS，再重新运行完整 main 工作流。原始文件和内容地址保持一致，后续 CI 继续增量同步。本次140项存量初始化及校验见 [验收记录](reviews/domain-https-2026-11-17/REVIEW.md#后续素材初始化与上传排障)。

本地普通 `npm run build` 仍生成完整自包含资源。仅生产工作流设置 `SHANHE_ASSET_BASE_URL`，构建时生成公开素材地址表，`prepare-assets.mjs` 再处理 Vite 输出的图片、字体和图标引用；原始文件继续随 Git 保留。代码包通过 tar 排除 `static/*`，首版独立快照的包体约477 KiB，COS 素材约218.9 MiB。

## 服务器边界

- Nginx 站点：`/etc/nginx/sites-available/shanhe`，匹配原 IP 的 Host；域名站点为 `/etc/nginx/sites-available/shanhe-domain`。两者使用同一发布目录，独立访问日志沿用 Nginx 全局设置；其他应用与默认拒绝规则保留。
- 网站目录：`/srv/shanhe/releases/<sha>-<run>-<attempt>`，`/srv/shanhe/current` 原子链接当前发布。
- 发布用户：`shanhe-deploy`，没有 sudo 权限。SSH 公钥由 root 管理，使用 `restrict,command="/usr/local/libexec/shanhe-receive"` 强制接收器，不能执行交互 shell、SFTP、端口转发或任意远程命令。
- 接收器源文件：`scripts/deploy/receive.py`，服务器安装位置由 root 持有。只接受静态构建目录、普通文件和目录，拒绝越界路径、链接、特殊文件与超限包；不执行包内程序。
- 发布先完整接收和校验，再切换符号链接。切换后通过本机 Nginx 检查版本和 HTML，失败自动还原。保留前一版的静态资源，减少已打开页面请求旧哈希 JS/CSS 时出现404。
- 保留最近5个生成版本，并始终保留当前和前一版本；更早的构建可通过对应 Git 提交重新构建。磁盘空闲低于2 GiB时拒绝新发布，避免影响其他应用。

## 运维

查看 Actions 的 `deploy` 日志及 `https://shanhe.binnwu.top/version.json` 定位当前版本。发布失败先检查三系统检查结果、SSH 可达性、Environment 分支与 secret、磁盘空间、`nginx -t`。不关闭主机指纹或 TLS 校验来重试。

从任意可访问公网的维护机器检查入口与版本：

```sh
curl -sSI http://shanhe.binnwu.top/
curl -fsSI https://shanhe.binnwu.top/
curl -fsS https://shanhe.binnwu.top/version.json
```

首条应返回308及同路径的 HTTPS `Location`，后两条应通过正常 TLS 校验。接收器在切换后执行本机 HTML 和版本检查，失败会自动还原；公网版本校验失败时 Actions 报错，应先排查 DNS、证书与公网连通性，再判断是否需要回滚。

需要回滚时，在服务器控制台确认目标目录确实来自 `releases/`，以 root 执行：

```sh
ln -s /srv/shanhe/releases/已核对的版本目录 /srv/shanhe/.rollback
mv -Tf /srv/shanhe/.rollback /srv/shanhe/current
curl -fsS -H 'Host: 49.233.60.125' http://127.0.0.1/version.json
curl -fsS https://shanhe.binnwu.top/version.json
```

回滚仅切换网页版本；再次推送 main 或手动运行 main 工作流会恢复对应提交的自动发布。回滚过程中保持 COS 旧内容地址可读，不手工清空 `shanhe/assets/`。

需要撤销自动部署时，删除 `production` 环境中的 `DEPLOY_SSH_KEY` 并移除服务器 `/home/shanhe-deploy/.ssh/authorized_keys` 中对应公钥。重新配置时生成新的专用密钥，不复用管理员私钥。不要把私钥、云 API 凭据或服务器应用配置提交仓库。

修改 Nginx 或接收器源文件后，需要通过已授权的服务器管理通道单独更新 root 持有的副本，普通推送仅更新网页。

## SEO静态页面的首次发布

SEO构建新增根目录 `robots.txt`、`sitemap.xml`，以及 `people/`、`generals/`、`about/`、`card/` 下的HTML。**首次发布此版本前，需先通过服务器管理通道更新root持有的接收器**；旧副本只接受原来的目录，会以 `Unexpected build entry` 拒绝新包，网站不会被切换到不完整版本。仓库的 `scripts/deploy/receive.py` 已加入限定的静态HTML路径，继续拒绝任意程序、越界路径、链接和超限包；普通部署身份的权限不变。

在服务器上一份已核对的本轮源码目录中，以root执行：

```sh
python3 scripts/deploy/test_receive.py
install -o root -g root -m 755 scripts/deploy/receive.py /usr/local/libexec/shanhe-receive
```

不重复运行首次安装脚本，不改部署公钥或证书。完成后再推送／发布应用，并核对 `version.json`、`/robots.txt`、`/sitemap.xml`、`/people/suyu/` 的原始响应，以及不存在人物的404。2026-11-17已通过腾讯云实例命令更新生产接收器，远端4项测试通过，root:root、755及文件SHA-256与仓库源文件一致，旧文件按哈希备份；证据见 [本轮发布记录](reviews/seo-deployment-2026-11-17/REVIEW.md)。

现有Nginx的 `index index.html` 和 `try_files $uri $uri/ =404` 已适配生成目录，不需要全站SPA回退。代码包仍排除 `static/*`，但保留所有人物HTML与站点地图。`prepare-assets.mjs` 会同时将嵌套HTML、Open Graph及JSON-LD中的本域图片地址转换到COS，保留规范网页网址；离线验证入口为 `npm run validate:seo:release`。完整档案HTML合计约38MiB，代码包大小以该命令报告为准，首版477KiB仅是历史部署快照。

上线后再按 [SEO维护](SEO.md) 提交站点地图、检查搜索引擎实际抓取结果；本地通过和HTTP200均不代表已经收录。

## 域名与免费 HTTPS

- DNSPod 的 `binnwu.top` 域名新增 `shanhe` 的 A 记录，值 `49.233.60.125`，默认线路、TTL 600；未配置 AAAA。
- Nginx 域名站点源文件为 `scripts/deploy/nginx-domain.conf`，只处理 `shanhe.binnwu.top`。80端口保留 `/.well-known/acme-challenge/` 验证目录，其余请求以308跳转同路径的 HTTPS。
- 免费证书通过 Ubuntu 软件源的 Certbot 与 Let's Encrypt HTTP-01 签发；接入时客户端为 Certbot 2.9.0。证书链为 `/etc/letsencrypt/live/shanhe.binnwu.top/fullchain.pem`，私钥为同目录 `privkey.pem`；私钥仅保留在服务器，不保存到 GitHub 或 COS。2026-11-17签发的首张证书到期日为2027-02-15；这是签发快照，以后以实际自动续期结果为准。
- `certbot.timer` 定时检查续期。`scripts/deploy/certbot-reload.sh` 安装为 root 持有的 `/etc/letsencrypt/renewal-hooks/deploy/shanhe-nginx`（755），只有本域名成功续期后，先检查 Nginx 配置，再重载证书。
- GitHub production 的入口与发布后的公网版本校验均使用 HTTPS 域名，继续严格验证 TLS；SSH连接仍使用固定服务器 IP 和已核对的主机公钥。

以下服务器命令通过腾讯云实例控制台的“执行命令”或管理员管理通道运行，使用 root 身份。日常应用发布仍使用受限的 `shanhe-deploy`，其权限保持不变。

日常检查证书有效期、自动续期任务和近期日志：

```sh
openssl x509 -in /etc/letsencrypt/live/shanhe.binnwu.top/fullchain.pem -noout -subject -issuer -dates
systemctl is-enabled certbot.timer
systemctl list-timers certbot.timer --no-pager
journalctl -u certbot.service --since '7 days ago' --no-pager
```

定时器应为 `enabled` 并显示下一次运行时间。维护 DNS、80端口或 Nginx 后，用以下命令演练验证与成功续期后的重载钩子：

```sh
certbot renew --cert-name shanhe.binnwu.top --dry-run --run-deploy-hooks --no-random-sleep-on-renew
```

接入时该演练已成功，且 Nginx 检查与重载通过；演练使用测试签发流程，保留当前生产证书。Certbot 会将 Nginx 的成功诊断信息显示为钩子的 stderr 输出，应结合命令退出状态及最终续期结果判断。

迁移新服务器或首次恢复证书时，先确认 DNS 指向目标机器及80/443端口可达，安装发行版 Certbot 并建立独立验证目录：

```sh
apt-get update
apt-get install -y --no-install-recommends certbot
install -d -o root -g root -m 755 /var/www/letsencrypt/.well-known/acme-challenge
```

备份已有站点配置并保留 IP 站点。证书尚未到位时，先在 `/etc/nginx/sites-available/shanhe-domain` 使用以下 HTTP 配置：

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name shanhe.binnwu.top;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }
    location / { return 404; }
}
```

启用该站点并验证 HTTP 路径：

```sh
ln -sfn /etc/nginx/sites-available/shanhe-domain /etc/nginx/sites-enabled/shanhe-domain
nginx -t
systemctl reload nginx
printf 'shanhe-acme-probe\n' > /var/www/letsencrypt/.well-known/acme-challenge/shanhe-probe
curl -fsS http://shanhe.binnwu.top/.well-known/acme-challenge/shanhe-probe
```

确认公网返回探测内容后，运行交互式申请并审阅、同意签发机构当前订户协议：

```sh
certbot certonly --webroot -w /var/www/letsencrypt --preferred-challenges http \
  -d shanhe.binnwu.top --cert-name shanhe.binnwu.top --key-type ecdsa
```

最终 HTTPS 配置引用证书文件，等证书到位后再安装。以下路径相对于已核对的项目源码根目录：

```sh
install -o root -g root -m 644 scripts/deploy/nginx-domain.conf /etc/nginx/sites-available/shanhe-domain
ln -sfn /etc/nginx/sites-available/shanhe-domain /etc/nginx/sites-enabled/shanhe-domain
install -d -o root -g root -m 755 /etc/letsencrypt/renewal-hooks/deploy
install -o root -g root -m 755 scripts/deploy/certbot-reload.sh /etc/letsencrypt/renewal-hooks/deploy/shanhe-nginx
nginx -t
systemctl reload nginx
systemctl enable --now certbot.timer
certbot renew --cert-name shanhe.binnwu.top --dry-run --run-deploy-hooks --no-random-sleep-on-renew
```

续期失败时查看 `journalctl -u certbot.service` 与 `/var/log/letsencrypt/letsencrypt.log`，检查DNS、80端口、验证目录及443端口。不要删除HTTP验证目录、替换为自签名证书或关闭校验。应用推送不会覆盖证书和Nginx配置。

| 现象 | 首先检查 |
| --- | --- |
| 新域名暂不能解析 | DNSPod A 记录、递归 DNS 缓存；保留既有 `www` 等记录，等待正常传播 |
| 浏览器证书过期或续期验证失败 | 上述证书日期、定时器、服务日志；确认域名仍指向本机且 HTTP 验证路径可达 |
| 网页能读但字体或卡片生成失败 | COS CORS 包含 `https://shanhe.binnwu.top` 的 GET/HEAD，响应 `Access-Control-Allow-Origin` 与来源一致 |
| COS 首次上传出现写入超时／UserNetworkTooSlow | 查看具体文件、大小及运行机到 COS 的链路；必要时按上文补齐存量素材，再通过 Run workflow → main 重发 |
| Actions 检查成功但发布失败 | `deploy` 日志、production Secrets、SSH 连通性、磁盘及公网版本；服务器配置由管理员单独维护 |

## 验证范围

部署配置验收结果记录在 `QA.md`。域名接入的 [Actions #11](https://github.com/webwyb/china-founding-generals/actions/runs/44020443262) 已通过三系统完整检查、自动部署和 HTTPS 公网版本校验；DNS、证书续期、首页与两种卡片的实际证据见 [域名验收记录](reviews/domain-https-2026-11-17/REVIEW.md)。自动构建和 HTTP 健康检查不代表史料全量审校或移动设备验收。
