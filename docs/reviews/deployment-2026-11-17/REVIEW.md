# 自动部署验收

日期：2026-11-17。运行：[Actions #8](https://github.com/webwyb/china-founding-generals/actions/runs/44012159290)，提交 `9bfc4cb`。

- `actions.jpg`：三系统检查与自动部署成功；后续每次 main 推送均使用同一流程。
- `home.jpg`：线上首页，16张实际图片均由 COS 内容地址加载。
- `card.jpg`：线上家乡山河纪念卡；素笺肖像亦生成1200×1800 PNG。

仅为桌面内置浏览器实测。点击 PNG 下载入口后未收到工具 download 事件，不宣称本轮已经确认文件落盘。此前首次打开 IP 的客户端拦截由用户手动打开同一地址后解除，未使用其他路径绕过。完整结果与剩余范围见根目录 QA.md；运维见 docs/DEPLOYMENT.md。
