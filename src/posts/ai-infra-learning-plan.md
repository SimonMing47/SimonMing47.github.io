---
layout: post.njk
title: "我的 AI Infra 学习计划：从推理服务到 RL 训练推理加速"
description: "一条偏工程、偏系统的 AI Infra 学习路线：以推理服务为入口，逐步进入 vLLM、Ray、RLHF/GRPO 和集群部署。"
date: 2026-06-11
readTime: "12 min"
tags:
  - AI Infra
  - 推理服务
  - vLLM
  - Ray
  - 云原生
---

这份计划不是为了把自己包装成算法研究员。我的切入点更实际一点：用已有的网络、分布式系统和 Kubernetes 经验，去理解并掌握 AI Infra 里最工程化的一段，也就是推理服务、GPU 集群部署，以及 RL 训练过程里的推理加速。

我更关心的问题是：一个模型从请求进来到 token 出来，中间到底经过了哪些组件？延迟和吞吐卡在哪里？KV Cache 怎么管理？vLLM 为什么能提升吞吐？当训练框架进入 RLHF/GRPO 阶段，为什么 generate 会变成核心瓶颈？这些问题背后，其实都很像系统工程问题。

## 目标定位

目标岗位可以概括成两类：

1. AI Platform Engineer
2. Inference Serving Engineer

我不打算走纯算法路线，也不会把时间主要花在手写 CUDA kernel、算子融合、编译优化、NCCL 拓扑设计或者 Megatron/DeepSpeed 这类大训练框架上。它们很重要，但不是我当前最合适的切入口。

我更适合的组合是：

- Kubernetes 和 GPU 集群管理
- 分布式系统和服务治理
- 推理服务部署与性能优化
- Agent Infra 和多服务编排经验
- RL 训练中推理阶段的系统瓶颈分析

这条路线的关键词是：先把推理链路吃透，再把推理服务放进训练系统里看。

## 阶段路线

整个计划分成五个阶段。原始计划覆盖 110 个学习日，我会按照自己的时间压缩推进，但每个阶段都要留下可复盘的产物。

### Phase 1：推理基础

第一阶段先补齐推理系统的基本盘。

重点不是背术语，而是把一条请求拆开：prefill、decode、KV Cache、batching、scheduler、worker、GPU memory、模型格式、监控指标，每个环节都要知道它解决什么问题，又会制造什么新问题。

这个阶段要重点理解：

- Transformer 推理过程
- Prefill 与 decode 的差异
- GPU memory hierarchy
- KV Cache 显存占用和管理方式
- PagedAttention 的核心思想
- Static batching、dynamic batching、continuous batching
- Prefix caching、speculative decoding、long context
- TTFT、TPS、E2E latency、GPU utilization 等指标

这一阶段的输出物是一张完整的推理服务架构图：从 API gateway 到 scheduler，再到 worker 和 model execution，把每个可能优化的位置标出来。

## Phase 2：vLLM、量化与部署

第二阶段进入主战场：vLLM。

vLLM 是当前最值得深入掌握的推理服务框架之一。这里不能只会启动服务，还要理解它为什么快，尤其是 PagedAttention、BlockManager、Scheduler、continuous batching、chunked prefill 这些核心设计。

这一阶段会做几件事：

- 走读 vLLM 的核心调用链
- 理解 LLMEngine、Scheduler、BlockManager、Worker
- 对比 vLLM、SGLang、TensorRT-LLM 的适用场景
- 实操 GPTQ、AWQ、FP8 等量化方案
- 在 Kubernetes 上部署 vLLM 推理服务
- 接入 Prometheus/Grafana 观察关键指标
- 做不同 batch size、sequence length、quantization 配置下的 benchmark

这一阶段的目标不是“跑起来”，而是能解释清楚为什么某个参数会影响吞吐、显存和延迟。

## Phase 3：Ray 与 RL 训练中的推理

第三阶段开始把推理服务放进 RLHF/GRPO 的训练流程里。

普通在线推理更关心用户请求的延迟，而 RL 训练里的推理更关心批量生成吞吐。一次 RLHF 或 GRPO 迭代里，actor 要 generate，reward model 要打分，reference model 要参与 KL 约束，很多时间其实都花在推理阶段。

这部分的关键问题是：

- actor、reward、reference、critic 如何共享 GPU 资源
- generate 阶段为什么容易成为训练瓶颈
- Ray placement group 如何影响资源调度
- veRL 和 OpenRLHF 如何集成 vLLM
- 参数更新后，推理服务如何切换或同步
- 多模型、多 GPU、多节点下如何做 placement 和容错

这一阶段我会重点看：

- Ray actor、task、placement group
- RLHF 从 SFT、Reward Model 到 PPO 的流程
- GRPO 的训练流程
- veRL 的 HybridFlow 架构
- OpenRLHF 的 Ray + vLLM 方案
- RL 训练里的推理吞吐优化

这一阶段的输出物是一张 RL 训练推理系统架构图，重点标出 generate 阶段、资源调度和模型协同关系。

## Phase 4：毕业项目

只看文档不够，最终要做一个能讲得清、跑得起来、测得出来的项目。

毕业项目目标是：设计并部署一个 RL 训练推理服务集群。

计划技术栈：

- Kubernetes
- Ray
- vLLM
- veRL 或 OpenRLHF
- Prometheus/Grafana
- Helm chart 或 Kubernetes manifests

项目交付物包括：

- 系统架构设计文档
- 可运行的部署方案
- 性能 benchmark 报告
- 不同配置下的吞吐、延迟、GPU 利用率对比
- 一篇完整技术复盘

我希望这个项目最后不是一个 demo，而是一份能拿来讨论系统设计取舍的工程材料。

## Phase 5：面试与表达

最后一个阶段不是刷题意义上的冲刺，而是把前面的学习变成清晰表达。

需要准备三类内容：

- 推理服务工程问题：batching、KV Cache、scheduler、quantization、benchmark
- RL 训练推理问题：generate 瓶颈、多模型资源调度、Ray placement、vLLM 集成
- 系统设计问题：多租户推理服务、GPU 资源隔离、服务容错、灰度发布、监控告警

面试表达上，我不会假装自己是算法专家。更准确的定位是：有分布式系统和 Kubernetes 背景的工程师，正在把系统能力迁移到 AI Infra，重点做推理服务和训练推理加速。

## 推荐资料

这条路线里，我会优先跟这些资料：

- vLLM 文档与源码
- PagedAttention 论文
- SGLang 相关博客与文档
- TensorRT-LLM 和 NVIDIA Developer Blog
- Ray 文档，尤其是 actor、placement group、Ray Serve
- veRL 文档与 HybridFlow 论文
- OpenRLHF 文档
- Lilian Weng 的长文综述
- Sebastian Raschka 的 LLM 工程文章
- Chip Huyen 的 ML Systems 与 LLM 工程化文章

资料很多，但不应该变成收藏夹式学习。每一类资料都要对应一个问题：它解释了哪个系统瓶颈？它能指导哪个实验？它能变成哪一段项目经验？

## 每周节奏

我会按“学习、实验、记录”三个动作推进。

每周至少完成：

- 1 个主题的系统化笔记
- 1 次可复现实验或源码走读
- 1 段 benchmark 或架构分析
- 1 条可以沉淀到博客或 Obsidian 的总结

时间不追求平均分配。推理基础和 vLLM 会多花时间，因为这是后面 RL 训练推理加速的地基。

## 最终输出物

这条路线最后要留下这些东西：

- 一套 AI Infra Obsidian 知识库
- 一组推理服务 benchmark 记录
- 一个 RL 训练推理集群毕业项目
- 一篇项目技术报告
- 一套推理服务与 RL 训练推理面试题
- 一份能讲清楚技术取舍的简历项目描述

如果最后只剩“我看过很多资料”，那这条路线就失败了。真正有价值的是：我能把一个推理系统拆开，知道瓶颈在哪里，能部署，能测量，能优化，也能把这些取舍讲清楚。
