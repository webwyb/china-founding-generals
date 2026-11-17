# 新机器恢复与日常开发

## 克隆与安装

仓库：`https://github.com/webwyb/china-founding-generals.git`。默认开发成果在 `main`。代码、1609张肖像、29张WebP、29张PNG原稿、网页字体、完整事实快照和校验脚本均随Git保留。仓库包含较多历史图片和设计原稿，首次克隆需下载数百MB素材；不使用Git LFS。

需要Git、Node22与npm、Python3.10+（推荐3.11）。`.nvmrc` 记录Node主版本。原开发机使用Node22.9.0、npm10.8.3；以 `npm ci` 安装锁定依赖，不要用不同依赖随意覆盖锁文件。

macOS／Linux：

```sh
git clone https://github.com/webwyb/china-founding-generals.git
cd china-founding-generals
npm ci
npm run setup:python
npm run check
npm run dev:h5
```

Windows PowerShell同样执行上述Git和npm命令，Python需加入PATH。npm中的Python入口优先选择 `.venv/Scripts/python.exe`；macOS／Linux选择 `.venv/bin/python`。没有虚拟环境时会检测版本，并跳过旧系统Python，尝试已安装的Python3.10—3.13及Windows的 `py -3`。解释器不在常规PATH时，可通过 `SHANHE_PYTHON` 指定可执行文件路径。无需全局安装Taro或手工激活虚拟环境。

`setup:python` 仅在项目内建立 `.venv`，安装 `scripts/requirements-dev.lock` 中的工具。不要把虚拟环境复制到另一台机器，应重新创建。Node原生扩展也必须在目标机器运行 `npm ci` 安装，不能复制旧 `node_modules`。

`.npmrc` 的 `legacy-peer-deps=true` 用于Taro并列声明的替代框架／编译器peer依赖，实际安装React和Vite链路。若安装失败，先确认Node主版本和网络，不要关闭TLS校验或加入来历不明的镜像配置。

## 启动与构建

`npm run dev:h5` 监听构建并提供开发服务，打开终端打印的地址。它会持续运行，需要手动结束。

预览生产构建：

```sh
npm run build
npm run preview
```

预览地址为 `http://127.0.0.1:5173`，只绑定本机。一次只保留一个5173端口服务。更换端口可直接使用Python HTTP服务命令；静态根目录必须是 `dist/h5`。微信或其他手机不能直接访问另一台电脑的127.0.0.1；外部分享需要可访问的域名或同网段开发地址。

构建输出 `dist/h5/`，不提交生成目录。H5采用普通路径和构建时静态生成：`/people/人物id/`、`/generals/`、`/people/`、`/about/`、`/card/?id=人物id`。文件布局自带各路径的 `index.html`，普通静态服务器可直接读取，不把未知路径回退为首页；资源使用域名根目录路径，当前不支持直接搬到子目录。旧hash链接由浏览器迁移。正式域名在 `config/site.json` 统一维护。推送 `main` 后由 GitHub Actions 完成三系统检查，并将 Ubuntu 构建自动部署到腾讯云独立站点；SEO首次上线需先更新服务器接收器，入口及要求见 [DEPLOYMENT.md](DEPLOYMENT.md)。

生产入口为 [https://shanhe.binnwu.top](https://shanhe.binnwu.top)。普通本地构建包含完整静态资源；生产 CI 通过 `SHANHE_ASSET_BASE_URL` 使用 COS 内容地址。素材由独立 **Sync COS assets** 工作流增量同步；网页工作流只传输代码制品并只读确认素材就绪，可单独重跑 deploy。纯 Markdown、`docs/` 与 `data/testing/` 变更跳过两类构建部署。HTTPS 证书由服务器独立自动续期，应用构建和推送不会替换证书、Nginx 配置或 root 持有的发布接收器。维护这些服务器文件、检查续期和迁移新机时，按 [部署说明](DEPLOYMENT.md) 操作；换机开发不需要下载生产私钥或云 API 凭据。

## 完整检查

```sh
npm run check
```

依次执行类型检查、事实快照逐字节再生成检查、全量目录、功能逻辑、景观与字体、事实解析、人像完整性、全部卡片构图及H5构建；构建末尾生成并校验1614份完整人物HTML、1618条站点地图地址、元信息和真实链接。不会启动浏览器、调用图像生成、访问历史人物源站或申请相册权限。

单项入口：`npm run typecheck`、`npm run data:verify`、`npm run validate:data`、`npm run validate:functions`、`npm run validate:compliance`、`npm run validate:design`、`npm run test:catalog`、`npm run validate:portraits`、`npm run validate:cards`、`npm run build`。

公示及公开邮箱统一配置在 `config/compliance.json`；修改素材来源后运行 `npm run audit:images` 重建图片授权待核实清单。真实备案信息、反馈入口、AI显式标识及仍待核实事项见 [COMPLIANCE.md](COMPLIANCE.md)。

SEO单项：已有构建后执行 `npm run validate:seo`；先启动本地 `npm run preview`，另一个终端运行 `npm run validate:seo:http` 验证原始HTTP与404；`npm run validate:seo:release` 在临时副本中模拟COS资源重写和接收器解包，全程离线，不上传或修改服务器。细节见 [SEO.md](SEO.md)。

生产 H5 使用 `src/data/catalogue-lite.generated.json` 作为浏览名录，随 `npm run data:build` 从完整目录生成并纳入一致性检查；不要单独修改轻量文件。构建时输出 `/js/person-data/<版本>/<id>.json` 和按需读取的 `search.json`，直达人物 HTML 同时内联完整当前人物。版本包含资料、肖像版本、转换代码及素材基址；JSON与代码一起发布、旧版本随既有js目录保留，不能只上传HTML／JS文件。COS重写同时覆盖JSON。`dev:h5`不运行静态生成，使用完整资料保证监听开发可用；发布性能以 `npm run build` 后的静态预览为准。

静态成图在 `.cache/design-review/`，测试中间文件在 `.cache/`，可删除后重跑。`data/design/` 与 `data/testing/` 中已提交的报告描述实际覆盖范围，不能代替 `QA.md` 中尚未完成的浏览器与真机验收。

`.github/workflows/ci.yml` 使用相同安装和检查命令，在Ubuntu24.04、macOS15、Windows2022上验证恢复流程。运行镜像随GitHub支持周期维护，可用标签见[官方镜像列表](https://github.com/actions/runner-images#available-images)。CI的结果是构建与自动校验结果，不代表浏览器兼容或事实全量审校通过。

## 修改资料、字体和景观

- 资料：编辑 `data/catalog/reviewed-facts.json` 并保留可核对出处；`npm run data:build` 后检查差异。详情见 `DATA_PIPELINE.md`。
- 页面文字：已有字体子集覆盖当前人物和UI。增加未收录汉字时先恢复固定字体源，再生成子集：

```sh
node scripts/python.mjs scripts/fetch_design_font.py
node scripts/python.mjs scripts/build_design_font.py
```

- 字体源下载版本和SHA在 `data/design/font-upstream.json`；普通构建和静态检查只使用仓库内WOFF2。
- 景观：PNG原稿在 `design/landscapes/`；修改后可用安装了 `cwebp` 的机器运行 `node scripts/python.mjs scripts/prepare_landscapes.py`，仅编码已变化的原稿，再运行设计校验。保持PNG、WebP、提示词和清单一起更新。
- 生成新景观需要图像工具，本项目没有内置任何API密钥。相同提示词不保证得到逐像素相同图像，应保存新的原稿与哈希。

## 环境与故障排查

没有必需的环境变量或 `.env`。Git提交身份、远程仓库认证、浏览器存储和个人编辑器设置由目标机器自行配置，不应写进代码。

若GitHub HTTPS连接超时，可按[GitHub官方SSH 443端口指引](https://docs.github.com/en/authentication/troubleshooting-ssh/using-ssh-over-the-https-port)使用 `ssh.github.com` 与目标机器自己的GitHub认证。首次连接应核对官方主机指纹。本次远程提交已使用该连接成功上传，仓库保存的默认远程地址仍为HTTPS。

若提示无法加载原生模块，确认使用目标机器的Node与全新安装的依赖；若Python导入失败，重跑 `npm run setup:python`。若资料快照哈希不符，从Git恢复 `data/catalog/evidence/`，不要通过删除校验来继续生成。

原机器曾遇到macOS受限环境中的系统配置／本地服务权限问题；这是执行环境限制，不要为绕过权限而修改应用逻辑。真实浏览器访问需遵守用户与工具的当前授权。


人物传记内容维护见 [BIOGRAPHIES.md](BIOGRAPHIES.md)。正常 `npm run check` 已包含 `npm run test:biographies` 的15项回归，不需要下载原网页；研究刷新和字体重制是可选维护步骤，不是换机运行的前置条件。


2026-11-17完整素材交付包含此前另266张已审核肖像，累计1609张照片。原件、逐图来源／许可说明、采用及排除记录、研究和验收报告一起保留；另5人仍有明确占位。`21f9df7` 的1343张记录为上一轮独立提交边界，恢复本轮后的main即可取得全部现有代码与素材。最新Git副本恢复验证见 `../data/testing/portrait-completion-2026-11-17.json`。
