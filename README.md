# FOOTBALL JOURNAL

一个免费的静态足球电子杂志阅读网站。纯 HTML、CSS 和 JavaScript，无需安装或构建；可部署到 GitHub Pages。网站当前展示你提供的 13 页《电饭煲.pdf》，球员索引根据其中的德国队球员档案整理。PDF 在浏览器本地读取，不会上传到第三方服务。翻页使用 MIT 许可的 [StPageFlip / page-flip](https://github.com/Nodlik/StPageFlip)，PDF 渲染使用 Apache-2.0 许可的 [Mozilla PDF.js](https://github.com/mozilla/pdf.js)。页面依赖 jsDelivr CDN 加载这两个开源库。

## 替换杂志

1. 如需更换杂志，用你的 PDF 替换 `magazine/magazine.pdf`。保留这个文件名。
2. 打开 `data/players.json`，把示例球员改成真实球员。每项至少填写姓名和 PDF 页码，可加别名和简短说明：

   ```json
   { "name": "Lionel Messi", "aliases": ["梅西", "Messi"], "page": 4, "note": "阿根廷 · 前锋" }
   ```

   当前索引包含 PDF 第 4–7 页的球员档案。更换 PDF 后请同步更新姓名与页码。页码从 PDF 第一页开始数，包含封面。目录使用同文件中的 `contents` 列表，字段为 `title`、`subtitle` 和 `page`。名称匹配支持大小写不敏感的部分搜索；别名可用于中文姓名或其他拼写。
3. 在 `data/players.json` 顶部修改 `issueTitle` 和 `edition`。
4. 本地预览需要通过本地 Web 服务器打开（不要直接双击 `index.html`，浏览器会限制读取本地 PDF）。可用 Python 自带服务器：在项目文件夹运行 `python3 -m http.server 8000`，然后打开 `http://localhost:8000`。

## 免费发布到 GitHub Pages

1. 登录 GitHub，创建一个新仓库。若希望网址为 `https://你的用户名.github.io/`，仓库名设为 `你的用户名.github.io`；否则可用普通仓库名，网址会包含仓库名。
2. 上传项目全部文件和文件夹，确保 `index.html` 位于仓库根目录，PDF 位于 `magazine/magazine.pdf`。也可以用 GitHub Desktop 将此文件夹发布到新仓库。
3. 在仓库的 **Settings → Pages** 中，将 **Build and deployment → Source** 设为 **Deploy from a branch**，选择 `main` 分支和 `/(root)` 文件夹，然后保存。
4. 等待 GitHub Pages 发布完成，在设置页显示的网址打开网站。

## 阅读器能力与边界

- PDF 页面会在浏览器中渲染成画布，再交给 StPageFlip 做仿真翻页；支持触摸拖动、箭头翻页、目录/搜索跳页和全屏。
- PDF 中常见的网页链接和文档内跳转会保留为透明可点击区域。复杂注释、表单、音视频和 PDF 书签不在自定义翻页阅读器里呈现；原版 PDF 仍可通过页面顶部链接单独打开。
- 球员搜索依赖 `data/players.json`，不会自动从 PDF 识别姓名；更换 PDF 后请更新索引和目录。
- 首次打开需要网络连接以从 CDN 加载 PDF.js 和 StPageFlip。GitHub Pages 本身免费；公开站点和 PDF 对所有人可见。大型或高分辨率 PDF 在手机上渲染较慢，建议控制 PDF 文件体积。
