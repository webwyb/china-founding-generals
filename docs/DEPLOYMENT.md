# GitHub Actions 与腾讯云发布

目标实例：腾讯云轻量服务器 `lhins-afrwanuu`（北京），Ubuntu 24.04，公网 `49.233.60.125`。当前按用户选择使用 `http://49.233.60.125`；域名及 HTTPS 另行接入。

## 自动发布

推送到 `main` 后，`.github/workflows/ci.yml` 在 Ubuntu、macOS、Windows 上恢复依赖并执行完整 `npm run check`。Ubuntu 构建打包为 `h5-production` artifact（保留7天）。三系统全部成功后，独立 deploy job 下载同一次运行的产物，通过 SSH 上传，最后核对公网 `version.json` 的提交 SHA、运行 ID 与重试编号。其他分支与 PR 只检查，不部署。Actions 页面可手动 Run workflow，选择 `main`。

`production` Environment 只允许 `main` 部署，不设置人工审核，使 push 后自动完成。唯一私密配置是该环境的 `DEPLOY_SSH_KEY`；构建 job 无法读取它。官方 Actions 均固定完整 commit SHA。服务器 SSH ED25519 主机公钥由腾讯云控制台内读取，保存在 `scripts/deploy/known_hosts`，不在工作流中临时信任扫描结果。

部署并发组为 `shanhe-production`，不会中途取消上传。发布前检查 main 头提交，跳过已经落后的运行。

## 服务器边界

- Nginx 站点：`/etc/nginx/sites-available/shanhe`，只匹配 IP 的 Host，独立访问日志沿用 Nginx 全局设置；其他应用与默认拒绝规则保留。
- 网站目录：`/srv/shanhe/releases/<sha>-<run>-<attempt>`，`/srv/shanhe/current` 原子链接当前发布。
- 发布用户：`shanhe-deploy`，没有 sudo 权限。SSH 公钥由 root 管理，使用 `restrict,command="/usr/local/libexec/shanhe-receive"` 强制接收器，不能执行交互 shell、SFTP、端口转发或任意远程命令。
- 接收器源文件：`scripts/deploy/receive.py`，服务器安装位置由 root 持有。只接受静态构建目录、普通文件和目录，拒绝越界路径、链接、特殊文件与超限包；不执行包内程序。
- 发布先完整接收和校验，再切换符号链接。切换后通过本机 Nginx 检查版本和 HTML，失败自动还原。保留前一版的静态资源，减少已打开页面请求旧哈希 JS/CSS 时出现404。
- 保留最近5个生成版本，并始终保留当前和前一版本；更早的构建可通过对应 Git 提交重新构建。磁盘空闲低于2 GiB时拒绝新发布，避免影响其他应用。

## 运维

查看 Actions 的 `deploy` 日志及 `http://49.233.60.125/version.json` 定位当前版本。发布失败先检查三系统检查结果、SSH 可达性、Environment 分支与 secret、磁盘空间、`nginx -t`。不关闭主机指纹或 TLS 校验来重试。

需要回滚时，在服务器控制台确认目标目录确实来自 `releases/`，以 root 执行：

```sh
ln -s /srv/shanhe/releases/已核对的版本目录 /srv/shanhe/.rollback
mv -Tf /srv/shanhe/.rollback /srv/shanhe/current
curl -fsS -H 'Host: 49.233.60.125' http://127.0.0.1/version.json
```

需要撤销自动部署时，删除 `production` 环境中的 `DEPLOY_SSH_KEY` 并移除服务器 `/home/shanhe-deploy/.ssh/authorized_keys` 中对应公钥。重新配置时生成新的专用密钥，不复用管理员私钥。不要把私钥、云 API 凭据或服务器应用配置提交仓库。

修改 Nginx 或接收器源文件后，需要通过已授权的服务器管理通道单独更新 root 持有的副本，普通推送仅更新网页。

## 验证范围

部署配置验收结果记录在 `QA.md`。自动构建和 HTTP 健康检查不代表史料全量审校或移动设备验收。
