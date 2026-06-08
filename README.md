# CodeMint 简洁博客模板（GitHub Pages）

一个适合程序员的轻量静态博客，目标是“好看、易用、低复杂度”。

## 文件结构

```text
.github/
  （可选）你的工作流设置
├─ index.html
├─ post.html
├─ data/posts.json
├─ assets/
│  ├─ css/style.css
│  └─ js/main.js
└─ posts/
   ├─ why-github-pages.md
   ├─ design-system-for-dev-blog.md
   └─ deploy-flow-with-github.md
```

## 部署到 GitHub Pages

1. 创建 GitHub 仓库并上传本目录内容。
2. 在仓库 Settings → Pages，Source 选择 `Deploy from a branch`。
3. 选择 `main` 分支和 `/ (root)`。
4. 保存后几分钟即可访问 `https://<用户名>.github.io/<仓库名>/`。

## 发布新文章

- 在 `data/posts.json` 添加一条元信息（`slug` 唯一）。
- 在 `posts/` 新建同名 `slug.md` 文件。
- 提交并推送。

slug 示例：`my-new-note`

- 索引文件中 `slug`：`my-new-note`
- 文章正文文件：`posts/my-new-note.md`

## 修改风格

`assets/css/style.css` 提供一套苹果风的 token 与组件样式：

- `--accent` 主色（默认蓝）
- 字体栈
- 圆角、线条、阴影
- 响应式布局

你可以直接改 CSS 变量来快速套新主题。
