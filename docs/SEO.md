# 搜索引擎维护

正式入口读取 `config/site.json`，目前为 `https://shanhe.binnwu.top`。此文件只含公开域名，不存站长平台令牌或凭据。修改域名时同步复核独立测试中的预期地址，并为已分享的旧域名与人物链接保留跳转。

## 可发现和可读取的内容

人物使用 `/people/人物id/` 普通地址，每个ID有独立静态HTML。同名人物仍保留不同ID，标题使用姓名、军衔、家乡与已确定的出生年区分。正文直接复用实际React人物页及 `people.ts`，包含分段生平、人生节点、背景资料、待核实说明和出处；不用另一份精简或隐藏的爬虫正文。首页与名录也预生成；`/people/` 是按军衔排列的完整HTML索引，`/about/` 解释统计口径和来源，两者不依赖应用脚本阅读。

初始HTML提供独立title、description、canonical、Open Graph、Twitter摘要及JSON-LD。应用内导航同步更新同一组元信息，返回首页时清理上一个人物的图片等字段。JSON-LD使用WebPage／Person及BreadcrumbList表达实际人物资料，不把历史人物当成网站创作者ProfilePage，不填虚构评价、发布日期或完整生卒日期；缺肖像不把占位图当人物图。

根目录 `robots.txt` 允许公开抓取并指向 `sitemap.xml`，站点地图包含1618个绝对HTTPS规范网址：1614人、首页、名录、完整索引、说明。排除卡片工具、筛选参数和旧hash。未维护准确的逐页修改日期时不虚填lastmod，也不填无依据的更新频率。

普通导航使用真实的 `<a href>`，仍复用Button的样式和应用导航；修饰键保留原生打开行为。旧 `/#/pages/person/index?id=...` 和卡片hash分享链接在启用JavaScript的浏览器中迁移到新地址；URL片段不会送到服务器，不能把这一兼容写成HTTP301。未知人物地址由静态服务器返回404，不回退成首页。

## 构建与检查

```sh
npm run check
```

构建链路为Taro → 共享React页面静态生成 → 全量HTML／XML校验。`esbuild` 仅在构建时把Taro原语映射为原生HTML，人物内容、布局与来源复用实际页面。构建中间文件可删除后自动重建，不要求旧缓存、浏览器、云服务或源站访问。H5运行时不会加载 `react-dom/server`。

已有构建时单独运行：

```sh
npm run validate:seo
npm run validate:seo:release
```

前者解析全部人物HTML，校验完整段落、时间轴、背景、链接、单一元信息、同名标题、待核实状态、图片路径、索引覆盖和站点地图。后者在临时构建副本中模拟COS地址重写、代码包生成与接收器安全解包，不执行云上传或生产部署。

先在一个终端运行 `npm run preview`，再用另一个终端运行 `npm run validate:seo:http`，检查9个本地HTTP入口是否与构建原文逐字节一致，普通／爬虫User-Agent标签是否收到同一内容，以及未知人物404。此项只测试本地静态服务，不代表Googlebot已经访问。

构建报告为 `data/testing/seo.json`。本轮HTTP、离线部署包、实际浏览器与卡片链接证据见 [验收记录](reviews/seo-2026-11-17/REVIEW.md)。

## 发布与收录

首次发布前按 [部署要求](DEPLOYMENT.md#seo静态页面的首次发布) 更新服务器接收器，然后再使用原有CI流程发布。H5采用域名根目录路径，不直接搬到子目录。保留现有Nginx的目录索引和真实404规则，无需服务器端渲染进程。

发布后先核对公开HTTPS入口、原始HTML正文、robots、sitemap与实际版本。网站所有者可在搜索引擎站长平台验证域名并提交 `https://shanhe.binnwu.top/sitemap.xml`；Google Search Console再用URL检查抽查首页、普通人物、同名人物和待核实档案。验证文件或DNS记录需使用所有者取得的实际值，不能在代码中伪造平台验证成功。本轮未登录站长平台、提交站点地图或确认搜索收录。

站点地图是发现提示，不保证抓取、收录、排序或富媒体展示。持续维护真实来源、修正争议资料、减少失效引用，并根据平台实际抓取报告处理问题。

实现依据：[Google JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)、[可抓取链接](https://developers.google.com/search/docs/crawling-indexing/links-crawlable)、[站点地图](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)。ProfilePage创作者适用范围见 [官方说明](https://developers.google.com/search/docs/appearance/structured-data/profile-page)。
