# CodeMint Markdown Blog

一个适合程序员的轻量 Markdown 博客。写文章只需要在 `src/posts/` 新建 Markdown 文件，推送到 `main` 后，GitHub Actions 会自动编译并发布到 `gh-pages` 分支。

## 文件结构

```text
├─ .github/workflows/deploy.yml
├─ .eleventy.js
├─ package.json
└─ src/
   ├─ index.njk
   ├─ 404.njk
   ├─ feed.njk
   ├─ sitemap.njk
   ├─ robots.njk
   ├─ assets/
   │  ├─ css/style.css
   │  └─ js/main.js
   └─ posts/
      ├─ why-github-pages.md
      ├─ design-system-for-dev-blog.md
      └─ deploy-flow-with-github.md
```

## 写新文章

在 `src/posts/` 新建一个 `.md` 文件，并写 front matter：

```md
---
title: "我的新文章"
description: "文章摘要"
date: 2026-06-08
tags:
  - GitHub
  - Markdown
---

这里开始写正文。
```

文件名会成为文章 URL，例如 `src/posts/my-note.md` 会发布为 `/posts/my-note/`。

## 本地预览

```bash
npm install
npm run dev
```

## 自动发布

推送到 `main` 后，`.github/workflows/deploy.yml` 会自动：

1. 安装依赖
2. 编译 Eleventy
3. 将 `_site/` 发布到 `gh-pages` 分支

GitHub Pages 已配置为读取 `gh-pages` 分支根目录。
