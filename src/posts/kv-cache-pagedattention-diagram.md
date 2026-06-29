---
layout: post.njk
title: "KV Cache 与 PagedAttention 关系图（小白可懂）"
description: "把 KV Cache 的"缓存链"和 PagedAttention 的"内存块化"放在同一张图上理解。"
date: 2026-06-29
readTime: "8 min"
tags:
  - AI Infra
  - KV Cache
  - PagedAttention
  - vLLM
  - 推理优化
---

上篇讲了 KV Cache 的核心思想：

- 一次一次把“历史算过的 K/V”缓存起来
- 下次 decode 复用，不重复算

这篇把它和 **PagedAttention** 放在同一张关系图里讲透：

- `KV Cache` 是“要缓存什么”
- `PagedAttention` 是“怎么把缓存存放得更不浪费”

## 先用两句话区分

- KV Cache：
  - 关注的是“注意力计算中可复用的中间结果”
  - 作用：减少重复计算，提高 decode 速度
- PagedAttention：
  - 关注的是“这些可复用结果怎么放到显存”
  - 作用：降低显存碎片、提升并发时的稳定性

一句话：**KV Cache 是逻辑，PagedAttention 是内存实现策略。**

## 关系图（文本版）

```text
用户请求到达
     |
     v
[Request Queue / Scheduler]
     |
     v
[Input tokens 预处理]
     |
     v
[模型 Engine]
  (每层 Attention)
   |            |
   |            v
   |      [这一步需要历史 K/V]
   |            |
   +----------> [KV Cache 层]
               |
      命中历史? ----是----> 直接复用历史 K/V
               |
               +----否----> 计算新 K/V
                             |
                             v
                    [写入 KV Cache]

KV Cache 内部：
 [KV Cache 表]
   | 
   +-- 每层每头的 K block
   +-- 每层每头的 V block
   +-- 长度增长按 token 累积

PagedAttention：
 [显存块池]
   |-- block 作为固定单元
   |-- 给不同请求分配/回收 block
   |-- 通过映射表管理“请求里第几块 token”在哪里

效果：
- Token 数不同时，仍可复用统一 block 管理
- 空间利用率更高
- 并发高时回收更容易
- 长序列场景不容易把显存“打散”
```

## 为什么很多人会把两者分开记错

错误理解有两种：

1. 只要有 KV Cache，就默认不用 PagedAttention
2. 只要有 PagedAttention，就默认不用关心 KV Cache 命中

真实情况是：

- 没有 KV Cache，PagedAttention 没有核心数据可管
- 没有合理块管理，KV Cache 在高并发场景会很快被“显存碎片”拖垮

## 4 个你能直接观察到的区别

- **是否会复算历史**
  - KV Cache：减少复算
  - PagedAttention：不直接决定是否复算，决定如何组织内存

- **优化维度**
  - KV Cache：算力/延迟优化
  - PagedAttention：显存/并发稳定性优化

- **失败症状**
  - KV Cache 弱：decode 后半段慢得离谱（重复计算严重）
  - PagedAttention 差：并发上来后出现明显抖动、OOM 邻近、吞吐不稳

- **可观测指标**
  - KV Cache：token 级耗时是否随轮次下降
  - PagedAttention：显存利用率和长时稳定性是否改善

## 一张工程化结论表

```text
场景             先看哪个指标               先优化哪一层
---------------------------------------------------------
单请求推理       TTFT/TBPT                   KV Cache
高并发长序列     吞吐抖动 / OOM 率            PagedAttention + 调度
显存吃紧         显存占用 + block 复用率        KV Block 划分与回收策略
线上灰度         多模型共存 / 延迟抖动          两者联合（先有命中再有稳态）
```

## 实操建议（按顺序）

1. 先确保你的服务链路支持持续 decode 下的 KV 复用（最基础）
2. 再上连续 batch / 连续调度策略，观察不同长度下 decode 稳定性
3. 再上 block 划分策略，优先解决显存浪费和回收问题
4. 最后再做更细的 benchmark：
   - 固定 batch 与序列长度，观察多轮 decode 耗时斜率
   - 观察显存占用、GPU 利用率、P99 延迟

## 小结

你现在可以把它记成一个模型：

- KV Cache 负责“数学问题不重复算”
- PagedAttention 负责“内存问题不重复搬”

两者都在，推理会更快也更稳；少了任意一个，都会在真实业务里露出瓶颈。

下一篇我可以直接给你一份“新手可跑的 vLLM/kv-cache 参数对照表”（含常见 `max-num-batched-tokens`、`max-model-len` 的经验范围）。
