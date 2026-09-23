# AI Infra 全栈知识图谱

可交互的静态网站：122个硬件/软件知识节点、95条故障说明、42类组网与逻辑图。硬件保留三维拆解，软件展开运行时、容器、调度、训练、推理与可观测性。鼠标悬停显示解释、类比与来源，知识点支持本地收藏和备注。

打开本目录 `index.html` 即可使用。持久收藏推荐在固定HTTP/HTTPS源下使用；直接file://打开时遵循浏览器限制。网站没有后端账户、设备接口或收藏上传。

```bash
python -m http.server 8080
```

访问 `http://localhost:8080/`。构建可离线分发的单文件：

```bash
node tests/structure.test.cjs
node tests/software.test.cjs
node tests/network.test.cjs
python scripts/validate.py
python scripts/build.py
```

输出为 `dist/index.html`。运行网站不需要Python或Node，以上工具仅用于本地服务、构建和测试。

## 主要文件

- `data/resources.js` / `faults.js`：原硬件说明与脱敏故障知识。
- `data/guide.js`：硬件详细解释与产品证据边界。
- `data/software-init.js` / `software-0.js` 至 `software-7.js`：软件结构、解释、类比、边界。
- `data/software-sources.js` / `software-link.js`：公开来源范围与硬件/软件关联。
- `src/engine.js` / `models*.js`：三维原理模型。
- `src/topology.js` / `software-diagrams.js`：硬件组网与软件逻辑、时序、泳道图。
- `data/network-review.js` / `src/network-v31.js` / `network-ui.js`：A3/A5产品级拓扑、证据与交互。
- `src/knowledge.js` / `bookmarks.js`：悬停、全文解释及版本化本地收藏。
- `tests/software.test.cjs` / `browser_smoke.py`：结构与交互回归。

[v3.1组网修订与证据](docs/V3.1.md) · [软件层与收藏](docs/V3.md) · [v2设计边界](docs/V2.md)

公开数据不含原环境的故障生成/恢复开关、规则和修改时间。模型不是原厂CAD；A5按公开代码区分950多维互联与850/850E交换式实例；拓扑级证据不替代现场端口接线表。每条参考资料的支持范围、版本和核读状态在页面内注明。
