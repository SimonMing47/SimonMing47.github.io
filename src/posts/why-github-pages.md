---
layout: post.njk
title: "为什么我的博客选 GitHub Pages：可维护、稳定、成本接近 0"
description: "从一个开发者视角看静态网站托管的现实意义：CI 配置、版本管理和内容迭代。"
date: 2026-05-30
readTime: "5 min"
tags:
  - GitHub Pages
  - 建站
  - 效率
---

GitHub Pages 的最大价值不是“省钱”，而是**长期可控**。

## 1. 内容即静态文件，永远不复杂

你不需要自己维护服务器，也不需要担心数据库。每一篇文章都是 `.md` 文件，每一次提交都能带来一次可追溯的版本。

- 版本天然可回滚
- 不需要担心服务器安全更新
- 页面加载快、成本低

## 2. 与开发者工作流天然契合

你本来就在用 Git。把博客也放进同一套流程，是最顺手的选择：

```bash
git add src/posts/my-note.md
git commit -m "feat: add new post"
git push
```

## 3. 最后一句

如果你只想让内容稳定输出，轻量静态比复杂 CMS 更有优势。
