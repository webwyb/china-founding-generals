# 腾讯云访问统计

本项目为静态 H5，使用腾讯云可观测平台的 **前端性能监控 RUM**（Aegis Web SDK），用于 PV/UV 与访问分析。没有接入服务端 APM 探针，也不改 Nginx、HTTPS 或现有部署工作流。

## 应用与入口

- 广州地域，现有业务系统 `rum-JQs6Vzf0deJNpX`（binnwu）。
- 应用：山河有名 H5，应用ID `160162`，上报ID `8lvjRHo7adEqGeEVd5`。
- 生产上报域名：`shanhe.binnwu.top`；采集端：`https://rumt-zh.com`。
- [数据总览](https://console.cloud.tencent.com/monitor/rum?region=ap-guangzhou&PID=160162&GID=rum-JQs6Vzf0deJNpX)、[页面访问](https://console.cloud.tencent.com/monitor/rum/access?region=ap-guangzhou&PID=160162&GID=rum-JQs6Vzf0deJNpX)、[应用管理](https://console.cloud.tencent.com/monitor/rum/manage?region=ap-guangzhou&currentTab=projects-manage&group-id=rum-JQs6Vzf0deJNpX)。查看时选“山河有名 H5”及正确时间范围、production 环境。

上报ID是浏览器公开配置，不提供监控数据读取权限，不是腾讯云 SecretId／SecretKey。无新增服务器凭据或 GitHub Secret。

## 统计口径

页面访问100%上报；页面性能与 Web Vitals 在腾讯云应用抽样设置中各为10%。日志、JS错误、资源异常、白屏、自定义事件、接口／静态资源测速及自定义测速关闭。当前不包含点击埋点、错误排障或会话回放。

PV由 SDK 监听 History 路由；首屏、人物切换、返回计为访问，查询参数或段落锚点变化不额外计数。`/people/人物id/` 分开统计，`/card/` 按页面汇总，不按 id 或样式查询参数拆分。URL上报只保留规范来源与路径，外站来源只保留域名；不上传搜索词、铭记清单或邮件内容。HTML显式设置 `strict-origin-when-cross-origin`，跨站请求的浏览器 Referer 只包含来源站点。重复抑制发生在每次页面导航之间，离开后返回同一路径仍计一次PV。PV“全量”指不主动抽样；JavaScript未执行或请求被浏览器拦截等情况仍可能漏计。

UV采用 SDK 保存在 localStorage 的随机 AID，表示浏览器／设备维度，清理存储或换设备可能重复计数，不等于真实人数；腾讯云大盘采用近似去重算法，详见 [UV指标说明](https://cloud.tencent.cn/document/product/248/135230)。不设置业务用户UIN，并在SDK初始化后清空其可能读取的同域UIN；发送前再次去除该字段。腾讯云会接收连接IP用于地域分析。资料说明页公开展示统计与隐私说明。

## 代码和停用

`config/analytics.json` 固定公开配置及 SDK 版本；`src/analytics/rum.ts` 负责域名、隐私偏好、PV去重和最终请求脱敏。`scripts/build_analytics.mjs` 使用项目已有 esbuild 生成独立的 `src/analytics/bootstrap.ts` 入口，并注入全部1619个预生成HTML；完整名录和资料说明页只增加此小入口，不加载业务React运行时。SDK精确锁定为 `aegis-web-sdk@1.41.17`，依赖保持 npm 官方源；许可在 `public/licenses/`。

仅正式HTTPS来源初始化，IP入口、本地预览、旧hash链接迁移中、DNT=1或全局隐私控制（GPC）启用时不启动。SDK加载失败不阻断网页和纪念卡。独立统计入口本地测量2584字节；SDK留在动态导入分块，构建时检查其不在入口静态依赖图中，避免 Taro 的 vendors 合包提前执行 SDK 副作用。SEO校验同时确保每份HTML只有一个统计入口。

停用有两种方式：将 `config/analytics.json` 的 `enabled` 改为 `false` 并正常推送 main；或在腾讯云应用设置中停止此应用上报。后者不停止业务系统及其他应用，不删除历史数据。后续新增自定义事件、错误日志或回放需明确字段与上报量，不能直接复制默认“全量接口／资源”示例。

## 费用与验收

按2026-11-17查阅的 [官方按量计费说明](https://cloud.tencent.com/document/product/248/87075)，主账号每天共享50万条免费上报（不是50万PV），广州超额0.34元／万条。已有其他应用共享额度；10%性能采样不等于硬费用上限，PV没有日费用封顶开关。用户已于本轮明确同意“接受现有按量计费并上线”。本轮不购买套餐，不新增收费回放。

`npm run test:analytics` 的7项边界回归已加入完整 `npm run check`；检查域名／隐私偏好、路由去重、来源与正文脱敏、非许可地址拒绝和异步初始化竞态。构造器替身测试不宣称测试了 SDK 内部；真实 SDK 另用本机浏览器及模拟采集端验证PV、AID、History返回和实际线格式，零外部上报。

已于2026-11-17上线提交 `f4e1012`，三系统完整CI与网页部署成功。内置浏览器实际访问首页、人物页、返回、说明页和完整名录，腾讯云页面访问确认 **5 PV、1个AID设备UV**，页面路径正确；浏览器、设备与城市级地域分布已有数据。全部为验收流量，不能当作真实用户增长。截图、发布版本与验证范围见 [接入验收记录](reviews/rum-2026-11-17/REVIEW.md)。

后续验收由浏览器打开首页、人物页并返回，在“页面访问”选择“页面浏览量（PV）”或“设备数（AID）”，核对路径及访问分布。使用AID设备维度查看本项目UV，不使用未设置的UIN用户维度。上报、查询和总览汇总可能有延迟；本轮总览指标链接的结束时间取整到小时，最新访问应在“页面访问”分钟粒度查询，并确保结束时间覆盖访问时间。10%性能采样需积累更多流量后再验收性能指标。

## 专题试点（2026-11-18）

新增的 `/topics/`、`/topics/marshals/`、`/topics/shanghai/` 沿用既有路径PV口径。没有启用自定义事件、点击或阅读明细上报；段落锚点仍不增加PV。手动已读条目ID只留在设备本地，页面自报计数不是平台用户阅读统计。反馈选择只保留在当前页面内存中，读者主动打开邮件草稿并确认发送后才形成反馈；不会自动发送邮件。阶段决策先依据自愿访谈和实际反馈，不能将本地测试或验收流量算作增长。
