---
layout: post.njk
title: "从本地写作到上线：一个博客发布流水线"
description: "不借助复杂框架，用最少文件结构搭好发布链路，专注文字与知识沉淀。"
date: 2026-06-05
readTime: "4 min"
tags:
  - GitHub
  - 流程
  - 自动化
---

# 从本地写作到上线：一个博客发布流水线

你可以把博客当作一个普通前端项目，发布过程如下：

1. 本地新增 Markdown 文件
2. 推送到 GitHub 仓库
3. GitHub Actions 自动编译 Eleventy
4. 编译结果发布到 `gh-pages` 分支

## 3 分钟上线示例

```bash
git add src/posts/my-note.md
git commit -m "chore: add new article"
git push
```

页面更新即发布。

## 什么时候要升级？

当你需要分类系统、评论、全文检索时，再考虑更复杂的系统。当前这套结构的目标是先上线再演进。
