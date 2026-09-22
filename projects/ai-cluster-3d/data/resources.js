// Canonical, editable data. No build step required.
const RESOURCES = [
  {
    "id": "cluster",
    "title": "集群资源全景",
    "en": "Compute Infrastructure",
    "group": 0,
    "parent": null,
    "model": "campus",
    "lead": "计算节点、网络、存储和机房设施共同构成算力集群。它们按物理连接与资源依赖协作，不是一条所有数据都要顺次经过的串行流水线。",
    "paras": [
      "设施供电并带走热量；服务器提供CPU、主机内存和加速器；近距离互联组织高带宽协作域；以太网或其他集群网络连接更大的规模；共享存储提供持久数据。",
      "电力流、热量流、控制流、业务数据流分别使用不同的路径。看见某台服务器失联时，首先要判断断的是哪条流。带外管理失联不必然停止加速器计算。"
    ],
    "protocol": [
      "电力/冷却：物理输送，不承载RoCE",
      "管理：设备接口、认证与遥测",
      "数据：内存互联、以太网、RDMA与存储协议"
    ],
    "compare": "华为Atlas与NVIDIA系统都需要这几类资源。差异主要在加速器内部、紧耦合互联与系统组织，不应只按芯片数量比较。",
    "sources": [
      "a2",
      "a3",
      "nv72"
    ],
    "terms": [
      "AI · Artificial Intelligence · 人工智能",
      "NPU · Neural Network Processing Unit · 神经网络处理单元",
      "GPU · Graphics Processing Unit · 图形处理单元，也用于通用并行计算"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "power",
    "title": "从机房到芯片的供电",
    "en": "Power Delivery",
    "group": 1,
    "parent": "cluster",
    "model": "power",
    "lead": "供电先经过机房与机柜分配，再由设备电源和板级稳压电路转换为不同部件需要的电压。",
    "paras": [
      "交流输入、备用电源和直流配电存在多种方案，图中呈现的是典型职责路径，而不是强制的唯一接线方式。",
      "冗余设计不仅是多装一个模块，还要确认剩余容量、上游供电独立性和保护配合。两个插头接在同一支路上并不能消除共因故障。"
    ],
    "protocol": [
      "功率路径：电压、电流、保护与转换",
      "管理路径：电源遥测；具体协议按设备支持"
    ],
    "compare": "A3公开配置与GB200机架都需要高密度供电。具体输入电制、母排和PSU数量必须按交付设计，不能从机柜外观反推。",
    "sources": [
      "power",
      "a3",
      "nv72"
    ],
    "terms": [
      "AC · Alternating Current · 交流电",
      "DC · Direct Current · 直流电"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "ups",
    "title": "不间断电源与后备电池",
    "en": "UPS",
    "group": 1,
    "parent": "power",
    "model": "ups",
    "lead": "不间断电源在市电波动或供电切换期间维持负载，后备时长取决于电池、负载和设计。",
    "paras": [
      "它不是长期无限供电的设备。电池容量、输出功率与负载峰值是不同约束。",
      "同一UPS可能支撑多个机柜，其维护或切换影响的是上游供电域，不应误画为每台NPU内部的一块电池。"
    ],
    "protocol": [
      "电力转换与储能",
      "监控接口依具体设备，可与机房监控系统联动"
    ],
    "compare": "属于双方共用的数据中心设施范畴，不是NPU或GPU独有技术。",
    "sources": [
      "power"
    ],
    "terms": [
      "UPS · Uninterruptible Power Supply · 不间断电源"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "pdu",
    "title": "机柜配电与母排",
    "en": "Rack Distribution",
    "group": 1,
    "parent": "power",
    "model": "pdu",
    "lead": "配电单元把上游电力分到具体设备或电源模块，母排则以导体排承担集中配电。",
    "paras": [
      "需要关注总容量、各支路与各相负载，以及保护器件的分断和冗余路径。",
      "机柜高度单位U与开放机架的OU不是同一标尺；这里不按一套刻度混画不同产品。"
    ],
    "protocol": [
      "电力分配；不转发以太网业务",
      "遥测可能报告支路电流、功率与告警"
    ],
    "compare": "Atlas950公开页使用44OU，A3使用47U；不能把OU直接当成U。NVIDIA整柜也应以供应商机架方案为准。",
    "sources": [
      "power",
      "a3",
      "a950"
    ],
    "terms": [
      "PDU · Power Distribution Unit · 电源分配单元"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "psu",
    "title": "设备电源模块",
    "en": "PSU",
    "group": 1,
    "parent": "power",
    "model": "psu",
    "lead": "电源模块把输入电源转换成设备内部需要的供电，并与冗余、热插拔和功率管理配合。",
    "paras": [
      "多个模块可以分担功率或提供冗余。一个模块退出后，设备是否继续工作由剩余容量和冗余模式决定。",
      "输入缺失、输出异常、温度保护和模块通信故障是不同问题。管理平台的“电源异常”需要回到子状态。"
    ],
    "protocol": [
      "电力转换",
      "模块状态与功率遥测；控制接口视型号"
    ],
    "compare": "华为服务器、以太交换机、总线设备和NVIDIA机架均有电源系统，但外形与供电层次不同。",
    "sources": [
      "power"
    ],
    "terms": [
      "PSU · Power Supply Unit · 电源模块"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "vrm",
    "title": "板级稳压与供电相",
    "en": "VRM",
    "group": 1,
    "parent": "power",
    "model": "vrm",
    "lead": "稳压电路位于主板或加速板上，把输入电压变成芯片需要的低电压、大电流电源。",
    "paras": [
      "稳压电路包含开关器件、电感、电容及控制器。多相设计分担电流并改善动态响应。",
      "它不是一条“协议层”。运算负载改变时功率需求变化，电压稳定性与瞬态响应影响芯片能否持续工作。"
    ],
    "protocol": [
      "电压转换与闭环控制",
      "可选的板级电源遥测"
    ],
    "compare": "CPU、NPU与GPU都需要稳压。图中的电感数量与相数为结构示意，不代表任意芯片实际设计。",
    "sources": [
      "power"
    ],
    "terms": [
      "VRM · Voltage Regulator Module · 电压调节模块"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "cooling",
    "title": "风冷与液冷回路",
    "en": "Thermal Management",
    "group": 1,
    "parent": "cluster",
    "model": "cooling",
    "lead": "冷却系统把芯片热量传到机房冷源。风冷通过空气，冷板液冷通过封闭液路；一套集群可以同时使用两者。",
    "paras": [
      "液冷并非把自来水直接通入芯片。冷板、歧管、管路与冷却液分配设备组成受控回路，并与设施侧换热。",
      "A3产品页列明计算柜液冷、总线设备柜风冷；Atlas950当前公开页则列明两类机柜均液冷。不能跨代照搬。"
    ],
    "protocol": [
      "热传导、对流与换热，不承载业务报文",
      "泵、阀、传感器由独立监控控制"
    ],
    "compare": "GB200 NVL72为液冷机架；并不因此与A3或Atlas950使用相同流量、冷却液或接口。",
    "sources": [
      "cool",
      "a3",
      "a950",
      "nv72"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "cdu",
    "title": "冷却液分配与换热",
    "en": "CDU",
    "group": 1,
    "parent": "cooling",
    "model": "cdu",
    "lead": "冷却液分配单元连接设施侧冷源和设备侧液路，控制换热、循环与相关监测。",
    "paras": [
      "泵提供循环动力，换热器把热传向另一回路，传感器用于观测温度、压力或流量。设备实现不同，不能把所有泵和阀都假定放在同一箱体。",
      "流量不足会降低换热能力；泄漏传感器告警与高温告警是不同观测。"
    ],
    "protocol": [
      "温度/流量/压差监测",
      "设施管理接口按型号，不是RDMA链路"
    ],
    "compare": "两家高密度系统均可采用设施侧CDU；以实际液冷设计为准。",
    "sources": [
      "cool"
    ],
    "terms": [
      "CDU · Coolant Distribution Unit · 冷却液分配单元"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "coldplate",
    "title": "冷板、快接与歧管",
    "en": "Cold Plate",
    "group": 1,
    "parent": "cooling",
    "model": "coldplate",
    "lead": "冷板与处理器封装通过导热界面接触，内部流道把热量带给冷却液。",
    "paras": [
      "快接头承担可维护连接；歧管把液体分到各设备。供液和回液构成回路，不能只画一条进液线而没有回路。",
      "冷板底面接触、流量、入口温度和污染堵塞都会影响温度。HBM与计算芯片如何覆盖由实际散热组件设计决定。"
    ],
    "protocol": [
      "热量从封装到冷板再到液体",
      "不是芯片访存通路，也不是电力路径"
    ],
    "compare": "NPU与GPU都可由冷板冷却。图中蓝/橙两管代表供液/回液，不代表固定温度数值。",
    "sources": [
      "cool",
      "a3",
      "nv72"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "fan",
    "title": "风扇与风道",
    "en": "Fan / Airflow",
    "group": 1,
    "parent": "cooling",
    "model": "fan",
    "lead": "风扇建立压差推动空气穿过散热器和机框，风道设计防止热空气回流。",
    "paras": [
      "风扇转速高不保证有效风量；堵塞、进出风方向相反或旁路漏风可能导致局部热点。",
      "风扇状态、芯片温度和冷/热通道应分别观测，再按时间关联。"
    ],
    "protocol": [
      "机械风量与散热",
      "转速反馈、控制信号和设备遥测"
    ],
    "compare": "A3总线设备柜公开形态为风冷；液冷计算柜内也可能存在需要风冷的部件，不能画成完全没有风扇。",
    "sources": [
      "cool",
      "a3"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "copper",
    "title": "双绞线与直连铜缆",
    "en": "Twisted Pair / DAC",
    "group": 2,
    "parent": "cluster",
    "model": "copper",
    "lead": "网线首先是一种物理介质。常见双绞线与高速直连铜缆外形、接口、编码和距离条件并不相同。",
    "paras": [
      "双绞线通过成对导体抑制干扰，常见管理网络使用8触点模块化连接器；高速DAC通常以专用线缆连接可插拔高速端口。",
      "介质本身不决定上层一定是RoCE。须逐项匹配端口速率、编码、线缆等级和协议支持。"
    ],
    "protocol": [
      "电信号与物理层编码",
      "以太网MAC之上才可能承载IP/TCP/UDP/RoCE"
    ],
    "compare": "两家集群都可能在管理网或短距互联使用铜介质；不能把DAC等同于普通RJ45网线。",
    "sources": [
      "rdma"
    ],
    "terms": [
      "DAC · Direct Attach Cable · 直连铜缆",
      "PHY · Physical Layer · 物理层功能"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "fiber",
    "title": "光纤、端面与双向光路",
    "en": "Optical Fiber",
    "group": 2,
    "parent": "cluster",
    "model": "fiber",
    "lead": "光纤把调制后的光信号从发送端传到接收端。端面、连接器、弯曲和距离共同影响链路预算。",
    "paras": [
      "典型双纤链路用一根发送、一根接收；也有单纤双向或多通道方案。图示双纤不应被理解为所有产品都只有两根纤。",
      "光纤不解析MAC、IP或HCCL。它负责承载物理信号；相同介质可以服务不同协议，前提是两端设备与光学规格匹配。"
    ],
    "protocol": [
      "介质→光电收发→PHY/编码/FEC→上层协议",
      "FEC与CRC属于不同层次的校验/纠错机制"
    ],
    "compare": "华为以太网、灵衢与NVIDIA以太/InfiniBand均可能用光纤；光纤相似不意味着协议互通。",
    "sources": [
      "a3",
      "a950",
      "rdma"
    ],
    "terms": [
      "TX · Transmit · 发送",
      "RX · Receive · 接收",
      "FEC · Forward Error Correction · 前向纠错",
      "CRC · Cyclic Redundancy Check · 循环冗余校验"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "optic",
    "title": "光模块与电光转换",
    "en": "Optical Transceiver",
    "group": 2,
    "parent": "fiber",
    "model": "optic",
    "lead": "光模块将主机侧高速电信号转换为光信号，接收方向再进行反向转换。它包括光发射、接收和必要的控制电路。",
    "paras": [
      "QSFP和OSFP主要描述模块封装/接口形态，而不是一种上层网络协议。形状相同仍可能在速率、波长、距离、通道和FEC要求上不兼容。",
      "数字诊断可以给出温度、电压、发射与接收功率，但“光功率低”还需要排除跳线、端面和远端发送器。"
    ],
    "protocol": [
      "电气lane与光学通道之间转换",
      "管理诊断接口；不等于RoCE协议终点"
    ],
    "compare": "端点控制器决定使用以太网、InfiniBand或总线协议。并非插上同一光模块就能互通。",
    "sources": [
      "rdma",
      "a950"
    ],
    "terms": [
      "QSFP · Quad Small Form-factor Pluggable · 四通道小型可插拔形态",
      "OSFP · Octal Small Form-factor Pluggable · 八通道小型可插拔形态",
      "AOC · Active Optical Cable · 收发端与光纤集成的有源光缆"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "rack",
    "title": "机柜与计算抽屉",
    "en": "Rack / Compute Tray",
    "group": 3,
    "parent": "cluster",
    "model": "rack",
    "lead": "机柜提供安装、供电、散热和布线边界。抽屉或服务器是可维护的计算模块，而超节点可以跨多个机柜。",
    "paras": [
      "机柜、计算节点、NPU和逻辑通信成员是不同数量口径。不能看到4个抽屉就认定只有4颗NPU。",
      "本模型显示框架、抽屉、配电、供回液和线缆路径；抽屉数量与内部插槽布局是解释性排布，不是产品物料清单。"
    ],
    "protocol": [
      "承载下属硬件；机柜本身不是通信协议",
      "柜内分别有供电、液路、控制和数据连接"
    ],
    "compare": "A3公开形态12计算柜＋4总线设备柜；GB200 NVL72采用72 GPU机架级NVLink域。组织边界不同。",
    "sources": [
      "a3",
      "nv72"
    ],
    "terms": [
      "U · Rack Unit · 机架高度单位；1U为44.45毫米",
      "OU · Open Rack Unit · 开放机架高度单位，不与U混用"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "server",
    "title": "AI服务器与主板",
    "en": "Host / Compute Node",
    "group": 3,
    "parent": "rack",
    "model": "server",
    "lead": "一台服务器把通用控制计算、主机内存、加速器、网络、本地存储及管理控制器连接起来。",
    "paras": [
      "CPU执行操作系统与数据准备，DRAM保存主机数据，NPU/GPU承担并行运算，设备间通过受支持的互联搬运数据。",
      "图中是职责清晰的主板布局：CPU旁是内存槽，前部是磁盘，后部是端口，板上有加速模块与电源。它不冒充A2/A3/A5任一型号的精确拆机尺寸。"
    ],
    "protocol": [
      "CPU↔DRAM：内存总线",
      "CPU↔设备：PCIe或产品支持的互联",
      "节点↔外部：管理、存储与计算网络"
    ],
    "compare": "Atlas800T A2公开定位是服务器，不自动等于灵衢超节点。NVIDIA服务器与GB200计算托盘也不可一概而论。",
    "sources": [
      "a2",
      "a3",
      "nv72"
    ],
    "terms": [
      "CPU · Central Processing Unit · 中央处理器",
      "Host · 主机侧计算环境",
      "DIMM · Dual In-line Memory Module · 双列直插内存模块"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "cpu",
    "title": "CPU核心、缓存与控制",
    "en": "Central Processing Unit",
    "group": 3,
    "parent": "server",
    "model": "cpu",
    "lead": "CPU承担操作系统、进程调度、数据加载与通用逻辑；它通过内存控制器和I/O接口协调其他资源。",
    "paras": [
      "一个CPU插槽内可有多个核心，每个核心还有寄存器与缓存。软件线程不是物理核心；操作系统把核心下线也不必然表示硬件损坏。",
      "多路服务器中，某颗CPU直连的内存和设备通常更近。跨插槽访问可能增加时延和互联流量，这就是NUMA需要被关注的原因。"
    ],
    "protocol": [
      "指令集与内存一致性",
      "内存控制器连接DRAM",
      "I/O根端连接设备"
    ],
    "compare": "华为公开A3规格使用鲲鹏920；GB200使用Grace CPU。它们的内存形态、互联与错误上报实现不相同。",
    "sources": [
      "a3",
      "nv72",
      "aer"
    ],
    "terms": [
      "NUMA · Non-Uniform Memory Access · 非统一内存访问",
      "I/O · Input/Output · 输入/输出"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "cache",
    "title": "CPU片内缓存与存储",
    "en": "On-die Cache / SRAM",
    "group": 3,
    "parent": "cpu",
    "model": "cache",
    "lead": "片内缓存保存频繁访问的数据或指令，降低访问主存的开销。它属于处理器芯片内部，不是外接内存条。",
    "paras": [
      "L1/L2/L3通常是不同层级缓存的命名，不保证所有CPU具有相同层级、容量或共享方式。",
      "保护码检测到错误后，能否恢复取决于缓存状态、错误范围和体系结构；不可纠正事件需要定位实际bank或部件。"
    ],
    "protocol": [
      "缓存一致性与保护机制",
      "不是DDR DIMM，也不是NPU HBM"
    ],
    "compare": "NVIDIA GPU的缓存、华为AI Core本地缓冲和CPU缓存不能因为都叫L1就认为行为完全相同。",
    "sources": [
      "aer",
      "ecc"
    ],
    "terms": [
      "SRAM · Static Random-Access Memory · 静态随机存取内存"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "dram",
    "title": "主机内存条与通道",
    "en": "Host DRAM / DIMM",
    "group": 3,
    "parent": "server",
    "model": "dram",
    "lead": "主机内存存放操作系统、进程、文件缓存与准备送入加速器的数据，由CPU侧内存控制器访问。",
    "paras": [
      "容量、通道数、传输速率和延迟共同影响性能。内存条数量不等于有效通道带宽，插法需要遵守服务器规则。",
      "NPU的HBM与主机DRAM分属不同资源域。数据通常需要经过设备支持的搬运通路，不能只画一个共享内存盒子。"
    ],
    "protocol": [
      "DDR内存接口及内存控制器",
      "保护与管理机制依DIMM和平台实现"
    ],
    "compare": "Atlas A3公开页列DDR5系统内存；GB200 Grace采用LPDDR5X。不能简单把后者画成可随意插拔的同类DIMM。",
    "sources": [
      "a3",
      "nv72"
    ],
    "terms": [
      "DRAM · Dynamic Random-Access Memory · 动态随机存取内存",
      "DDR · Double Data Rate · 双倍数据速率"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "board",
    "title": "加速板、基板与供电",
    "en": "Accelerator Board",
    "group": 3,
    "parent": "server",
    "model": "board",
    "lead": "板卡是承载芯片、供电、管理与连接器的电路板；芯片封装是板上的部件，两者不是同一个计数单位。",
    "paras": [
      "一张板可能承载一颗或多颗处理器，软件Device的映射也依产品而定。不能把“卡”“芯片”“Device”无条件按一比一替换。",
      "板上的连接器通向主机、其他加速器或网络；稳压、信号完整性与冷却都是板卡能持续工作的基础。"
    ],
    "protocol": [
      "板内走线与电气lane",
      "PCIe/设备专用互联按产品选择"
    ],
    "compare": "Atlas加速模块与NVIDIA PCIe卡、SXM模块、整机托盘属于不同机械形态。只比较职责，不强行复制插槽外观。",
    "sources": [
      "a2",
      "a3",
      "nv72"
    ],
    "terms": [
      "PCB · Printed Circuit Board · 印制电路板",
      "Device · 驱动/运行时可见的逻辑设备，不必等于一张板卡"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "npu",
    "title": "处理器封装与计算芯片",
    "en": "NPU / GPU Package",
    "group": 3,
    "parent": "board",
    "model": "package",
    "lead": "封装把计算芯片、连接结构与设备内存接口组织成可装配部件。HBM可与计算芯片近距离集成，但不是AI Core内部缓存。",
    "paras": [
      "NPU中存在计算单元、片上数据通路、设备内存控制器与互联接口。模型参数和大多数中间数据驻留设备主存，按需搬到本地工作区。",
      "本模型把封装基板、计算区域、HBM堆叠和冷却面拆开。die数量、HBM堆叠数和位置是概念示意，不能据此推定某代昇腾的物理设计。"
    ],
    "protocol": [
      "计算指令与搬运任务",
      "HBM访问接口",
      "主机/设备间互联；不把HCCL画成芯片硬件"
    ],
    "compare": "昇腾以AI Core等单元执行AI算子；NVIDIA以SM等结构组织执行。矩阵算力、核数和内存带宽不能直接按名称换算。",
    "sources": [
      "core",
      "ecc",
      "nv72"
    ],
    "terms": [
      "Die · 裸片",
      "Package · 封装",
      "SM · Streaming Multiprocessor · NVIDIA流式多处理器"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "hbm",
    "title": "HBM堆叠与内存通道",
    "en": "High Bandwidth Memory",
    "group": 3,
    "parent": "npu",
    "model": "hbm",
    "lead": "HBM以高并行接口为加速器供给数据，保存模型、激活、梯度或推理缓存。容量回答能装多少，带宽回答每秒能供多少。",
    "paras": [
      "堆叠内存通过密集互联形成大带宽。加速器上的内存控制器把请求映射到通道、bank和地址。模型中的叠层仅解释结构，不标注未经核实的真实层数。",
      "设备内存用尽与ECC错误是两类问题：前者是分配/容量，后者是数据保护检测。可纠正、不可纠正和是否可隔离还需查看厂商状态。"
    ],
    "protocol": [
      "HBM内存访问与控制器调度",
      "ECC数据保护；不是以太网协议"
    ],
    "compare": "两家系统均可能使用HBM，但容量、代际、通道和恢复能力不能跨产品照搬。NVIDIA页面下线/行重映射不等于华为同名恢复策略。",
    "sources": [
      "a3",
      "ecc",
      "nv72"
    ],
    "terms": [
      "HBM · High Bandwidth Memory · 高带宽内存",
      "ECC · Error-Correcting Code · 纠错码",
      "Bank · 内存内部独立操作区域之一"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "core",
    "title": "计算核心与矩阵/向量单元",
    "en": "AI Core / Compute Units",
    "group": 3,
    "parent": "npu",
    "model": "core",
    "lead": "算子的计算和搬运需要不同执行单元配合。矩阵单元处理规整矩阵运算，向量单元处理按元素或向量操作，标量控制逻辑协调地址和执行。",
    "paras": [
      "昇腾不同架构存在Cube/Vector耦合或分离的组织方式，不能把一个通用框图当成所有A2/A3/A5芯片。",
      "性能取决于数据形状、局部数据复用与并行调度。计算单元再快，如果数据搬运跟不上仍会等待。"
    ],
    "protocol": [
      "矩阵/向量/标量指令及同步",
      "核内搬运和本地缓冲，不是HCCL协议"
    ],
    "compare": "NVIDIA的Tensor Core、CUDA执行单元和warp调度并非Cube/Vector的一一复制；这里只对照计算职责。",
    "sources": [
      "core",
      "nv72"
    ],
    "terms": [
      "Cube · 昇腾矩阵计算单元名称",
      "Vector · 向量计算单元",
      "Scalar · 标量运算及控制",
      "Kernel · 在目标硬件上执行的一段算子实现"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "buffers",
    "title": "片内工作区与数据复用",
    "en": "Local Buffers",
    "group": 3,
    "parent": "core",
    "model": "buffers",
    "lead": "靠近计算单元的工作区容量较小，用于暂存输入分块和中间结果，从而减少反复访问HBM。",
    "paras": [
      "典型公开抽象中，矩阵路径涉及L1以及L0A/L0B/L0C；向量路径涉及Unified Buffer。具体可用通路和容量依目标架构。",
      "本地缓冲不是按“HBM→L1→UB→L0”固定串接的一根管道。不同执行单元有各自的数据路径。"
    ],
    "protocol": [
      "显式搬运、本地地址和同步",
      "不同架构的Buffer路径以Ascend C文档为准"
    ],
    "compare": "NVIDIA shared memory、寄存器与缓存承担部分相似职责，但编程和硬件语义不同，不按同名直接等价。",
    "sources": [
      "core"
    ],
    "terms": [
      "UB（本页）· Unified Buffer · 统一缓冲区；不是灵衢UnifiedBus",
      "L0A/L0B · 矩阵输入工作区命名",
      "L0C · 矩阵累加/结果工作区命名"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "dma",
    "title": "数据搬运与任务完成",
    "en": "DMA / MTE",
    "group": 3,
    "parent": "core",
    "model": "dma",
    "lead": "搬运引擎把数据移到计算单元能高效访问的位置，减轻CPU逐字节拷贝的负担。它不消除链路带宽和内存访问成本。",
    "paras": [
      "主机到设备的搬运与核内部的存储搬运属于不同范围。图中分别显示源缓冲、传输路径、目的缓冲及完成状态。",
      "完成通知不是数据本体。提前读取尚未完成的目的数据会造成同步错误；对所有步骤都强制同步又会丧失重叠。"
    ],
    "protocol": [
      "DMA：授权的直接内存访问",
      "MTE：核内/设备内数据搬运；具体架构实现不同"
    ],
    "compare": "双方都有数据搬运引擎与同步机制，但接口、队列和完成格式不同。",
    "sources": [
      "core",
      "rdma"
    ],
    "terms": [
      "DMA · Direct Memory Access · 直接内存访问",
      "MTE · Memory Transfer Engine · 存储搬运引擎"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "pcie",
    "title": "PCIe根端、交换与端点",
    "en": "PCI Express",
    "group": 4,
    "parent": "server",
    "model": "pcie",
    "lead": "PCIe连接主机根端与NPU、网卡、存储等设备。交换芯片扩展连接拓扑，但不会创造无限带宽。",
    "paras": [
      "一个link由多条lane组成。链路代际决定每lane速率，宽度决定lane数量；有效吞吐还受编码、事务和共享上游影响。",
      "设备枚举、内存映射、事务完成和错误报告是不同工作。AER报告可纠正、不可纠正非致命或致命错误，不是所有报告都需要更换板卡。"
    ],
    "protocol": [
      "事务层→数据链路层→物理层",
      "DMA、配置访问、中断及AER依平台协同"
    ],
    "compare": "PCIe是双方通用互联之一；NVIDIA NVLink和华为HCCS/灵衢不是PCIe的别名。",
    "sources": [
      "aer"
    ],
    "terms": [
      "PCIe · Peripheral Component Interconnect Express · 高速串行外围设备互联",
      "AER · Advanced Error Reporting · 高级错误报告",
      "Lane · 单通道高速收发信号组"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "bmc",
    "title": "带外管理控制器",
    "en": "BMC / Out-of-band",
    "group": 3,
    "parent": "server",
    "model": "bmc",
    "lead": "带外管理控制器独立于主操作系统，提供传感器、事件、远程电源和维护接口。",
    "paras": [
      "主机OS未启动时，BMC在有待机供电的条件下仍可工作；若待机电力或管理网中断，也可能无法访问。",
      "BMC、Host管理IP与NPU端口IP不必共享网口或网络。管理不可达应与数据面状态分开。"
    ],
    "protocol": [
      "按产品支持管理接口与认证",
      "带外管理不承载模型张量主流量"
    ],
    "compare": "华为iBMC与NVIDIA整机的BMC均服务硬件管理，但具体接口与事件格式随整机厂家变化。",
    "sources": [
      "a2"
    ],
    "terms": [
      "BMC · Baseboard Management Controller · 基板管理控制器",
      "OS · Operating System · 操作系统"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "nvme",
    "title": "本地SSD与存储控制器",
    "en": "Local Storage",
    "group": 3,
    "parent": "server",
    "model": "nvme",
    "lead": "本地固态盘保存系统、镜像、日志和缓存；NVMe是高速存储访问协议，不是所有SSD的统称。",
    "paras": [
      "闪存、控制器与接口共同决定容量、延迟、寿命和错误表现。块设备能识别并不说明文件系统能够写入。",
      "本地缓存可以重新生成，共享数据和训练状态则需要可靠持久化；两类数据的保护和清理策略不同。"
    ],
    "protocol": [
      "NVMe命令与PCIe传输（常见本地形态）",
      "文件系统在块设备之上提供文件语义"
    ],
    "compare": "双方可使用标准NVMe SSD。具体盘数和RAID能力由服务器决定，不由NPU/GPU品牌决定。",
    "sources": [
      "nvme",
      "write"
    ],
    "terms": [
      "SSD · Solid-State Drive · 固态硬盘",
      "NVMe · Non-Volatile Memory Express · 非易失性存储访问协议"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "hccs",
    "title": "紧耦合设备互联",
    "en": "HCCS / NVLink",
    "group": 4,
    "parent": "cluster",
    "model": "hccs",
    "lead": "设备间紧耦合互联承担高频、大带宽的数据交换，与常规服务器业务网有不同的性能与语义目标。",
    "paras": [
      "HCCS是华为体系中的高速互联概念；具体CPU/NPU连接、节点内/跨节点支持依产品。HCCL则是上层集合通信库，不是一种插头或芯片。",
      "把单机内数据同步放在高速互联上可以减少绕行，但实际带宽由端点、拓扑、分层和并发共同限制。"
    ],
    "protocol": [
      "华为：按产品支持HCCS/灵衢互联",
      "NVIDIA：NVLink，部分CPU-GPU采用NVLink-C2C"
    ],
    "compare": "这些是职责对照，不是兼容协议。HCCS线缆不能被理解为直接插入NVLink即可工作。",
    "sources": [
      "hccs",
      "nv72"
    ],
    "terms": [
      "HCCS · Huawei Cache Coherence System · 华为缓存一致性系统",
      "HCCL · Huawei Collective Communication Library · 华为集合通信库",
      "C2C · Chip-to-Chip · 芯片到芯片"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "superpod",
    "title": "超节点与规模边界",
    "en": "SuperPoD / Scale-up Domain",
    "group": 4,
    "parent": "cluster",
    "model": "superpod",
    "lead": "超节点把多个计算资源置于更紧密的互联域中。物理上可以跨柜，逻辑上提供更紧耦合的设备协作，但并不自动成为一个操作系统进程。",
    "paras": [
      "Scale-up强调域内互联能力和语义，Scale-out通过网络扩展多个计算单元。二者是组织方式，不能只凭“柜内/柜外”判断。",
      "模型的A3整柜数量依据公开产品页；柜内抽屉和微观封装仍是示意。A2以服务器集群说明，不追认成灵衢超节点；用户所称A5与公开Atlas950的映射缺少明确证据，独立标注。"
    ],
    "protocol": [
      "域内：按代际HCCS/灵衢或NVLink",
      "域间：以太/RDMA或其他支持的Scale-out网络"
    ],
    "compare": "A3 384 NPU跨12＋4柜；GB200 NVL72为72 GPU机架级NVLink域。不能拿不同规模和精度的总算力做等效单机判断。",
    "sources": [
      "a3",
      "a950",
      "nv72",
      "ub"
    ],
    "terms": [
      "Scale-up · 扩展紧耦合计算域",
      "Scale-out · 横向增加独立计算单元",
      "SuperPoD · 产品/系统组织名称，不擅自扩展PoD缩写"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "busdevice",
    "title": "灵衢总线互联设备",
    "en": "UnifiedBus Fabric Device",
    "group": 4,
    "parent": "superpod",
    "model": "busdevice",
    "lead": "总线互联设备在端点之间提供受支持的路由、转发与资源协同，使多个计算设备形成超节点。",
    "paras": [
      "公开UnifiedBus规范涵盖架构、编程模型、固件和管理。不同代际的实现不应只凭宣传名称当成全部相同。",
      "端口、转发芯片、缓冲和控制管理具有不同故障域。设备显示在线但端到端事务失败，需要继续追踪具体资源和完成结果。"
    ],
    "protocol": [
      "总线的事务、传输、链路与物理功能按对应规范",
      "不是把RoCE换一个名称，也不默认执行ARP/MAC学习"
    ],
    "compare": "NVIDIA NVLink Switch在紧耦合域中承担设备互联职责；协议与系统能力不与灵衢一一等价。",
    "sources": [
      "ub",
      "a3",
      "nv72"
    ],
    "terms": [
      "UB（本页）· UnifiedBus · 灵衢总线；不是AI Core的Unified Buffer"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "buschip",
    "title": "总线转发芯片与缓冲",
    "en": "Bus Forwarding ASIC",
    "group": 4,
    "parent": "busdevice",
    "model": "buschip",
    "lead": "专用转发芯片处理总线端口之间的数据与事务，内部缓冲吸收速率差，路由与流控决定事务能否前进。",
    "paras": [
      "一个端口显示连通，只说明部分链路条件满足。转发表、信用、目的端点或芯片内部错误仍可能阻止数据完成。",
      "图中显示端口输入、转发区域与出口缓冲的逻辑职责，不标注厂商未公开的芯片数量或内部微结构。"
    ],
    "protocol": [
      "总线事务转发与流控",
      "错误码、缓冲语义依对应芯片/固件"
    ],
    "compare": "可与NVLink Switch的域内转发职责对照，但不可套用以太网MAC表或NVIDIA完成码。",
    "sources": [
      "ub"
    ],
    "terms": [
      "ASIC · Application-Specific Integrated Circuit · 专用集成电路"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "busport",
    "title": "总线端口与链路训练",
    "en": "Bus Port / Link",
    "group": 4,
    "parent": "busdevice",
    "model": "busport",
    "lead": "总线端口把设备内部数据路径连接到电/光链路，并与对端建立匹配的链路状态。",
    "paras": [
      "可能涉及lane训练、错误检测、重传与流控。链路层重传和传输层重传属于不同范围，观察时要确认计数器定义。",
      "连接器外形、光纤介质与端口协议是三个层次。不能因为用了光模块，就在这个端口上默认查ARP。"
    ],
    "protocol": [
      "物理lane、链路训练与重传",
      "更上层总线事务/传输协议按产品版本"
    ],
    "compare": "华为与NVIDIA紧耦合端口均需要可靠物理连接，但协议不可混用。",
    "sources": [
      "ub",
      "a950"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "ethernet",
    "title": "以太网与叶脊拓扑",
    "en": "Ethernet / Leaf-Spine",
    "group": 4,
    "parent": "cluster",
    "model": "ethernet",
    "lead": "以太网络连接不同节点或超节点，可以承载管理、存储和RDMA业务；平面划分可以物理分离，也可以逻辑隔离。",
    "paras": [
      "Leaf接入端点，Spine连接多个Leaf，为跨Leaf通信提供路径。图中线缆走向显示角色，不代表每条线都承担同一种业务。",
      "ECMP在多个等价路径之间选择流量，不能保证任意负载下完全均匀。拥塞、地址或策略问题可能发生在物理链路正常时。"
    ],
    "protocol": [
      "物理介质→以太网MAC→IP→UDP/RoCEv2或TCP等",
      "队列按策略应用PFC/ECN/CFC等受支持机制"
    ],
    "compare": "华为CloudEngine可作为集群以太网络；NVIDIA使用Spectrum Ethernet或Quantum InfiniBand等不同选择，不能说NVIDIA只支持InfiniBand。",
    "sources": [
      "pfc",
      "ecn",
      "rdma",
      "nv72"
    ],
    "terms": [
      "ECMP · Equal-Cost Multi-Path · 等价多路径",
      "MAC · Media Access Control · 媒体访问控制",
      "IP · Internet Protocol · 互联网协议"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "switch",
    "title": "框式以太交换机",
    "en": "Ethernet Switch Chassis",
    "group": 4,
    "parent": "ethernet",
    "model": "switch",
    "lead": "交换机由控制管理、端口转发、内部交换结构及供电散热共同组成。框式产品把部分职能做成独立板卡。",
    "paras": [
      "主控板建立控制状态并下发表项；接口板收发和处理报文；交换网板连接不同接口板。正常业务不需要逐包交给主控CPU处理。",
      "盒式设备可把这些功能集成到一个机箱中，未必存在可独立拔出的主控板或网板。"
    ],
    "protocol": [
      "MAC/VLAN/IP转发与网络控制",
      "内部Switch Fabric搬运报文",
      "管理与遥测属于控制面"
    ],
    "compare": "CloudEngine与NVIDIA Spectrum交换机都有数据面与控制面边界；板卡数量和框式/盒式形态按型号。",
    "sources": [
      "pfc",
      "cfc",
      "rdma"
    ],
    "terms": [
      "VLAN · Virtual Local Area Network · 虚拟局域网"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "control",
    "title": "主控板与控制面",
    "en": "Supervisor / Control Plane",
    "group": 4,
    "parent": "switch",
    "model": "control",
    "lead": "主控负责配置、协议计算、管理和监控，并把转发状态下发给数据面。",
    "paras": [
      "主备控制器提高管理和控制可用性；切换时已有表项是否继续转发取决于产品与故障范围。",
      "管理连接失败、控制进程异常和板级硬件失效不是同义词。进程内存压力也可能造成主控表现异常。"
    ],
    "protocol": [
      "网络控制协议与管理接口",
      "板间控制通信",
      "不是普通业务逐包必经通路"
    ],
    "compare": "两家网络体系均区分控制面和数据面；具体高可用实现不相同。",
    "sources": [
      "rdma"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "linecard",
    "title": "接口板与端口资源",
    "en": "Line Card",
    "group": 4,
    "parent": "switch",
    "model": "linecard",
    "lead": "接口板承载端口及相应的PHY、MAC、转发芯片和缓冲，板上多个端口可能共享内部资源。",
    "paras": [
      "一个板故障可能影响一组端口，而单个模块或线缆问题可能只影响一条连接。资源映射要保留“机框→槽位→端口→光模块”。",
      "观察同板相关性可以缩小故障域，但不能仅因同时报错就排除机框供电或上游网络。"
    ],
    "protocol": [
      "入口解析、查表、队列与出口发送",
      "内部连接交换网板"
    ],
    "compare": "按槽位组织是框式设备的典型抽象，不套用到所有盒式交换机。",
    "sources": [
      "rdma"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "fabric",
    "title": "交换网板与内部交换结构",
    "en": "Switch Fabric",
    "group": 4,
    "parent": "switch",
    "model": "fabric",
    "lead": "交换网板把不同接口板连接起来，提供内部跨板交换能力。它不是控制面的“主控板”。",
    "paras": [
      "入口接口板决定报文去向后，数据通过内部交换结构到达目标出口。内部带宽、调度和冗余影响跨板吞吐。",
      "同板转发正常而跨板异常是有价值的线索，但是否经过相同内部路径仍需看实际产品。"
    ],
    "protocol": [
      "内部交换协议与调度依厂商实现",
      "对外端口仍按以太协议运行"
    ],
    "compare": "内部交换结构是通用网络设备概念，与NVLink或灵衢整域互联不是同一个命名层次。",
    "sources": [
      "rdma"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "ethport",
    "title": "以太端口、PHY与MAC",
    "en": "Ethernet Port",
    "group": 4,
    "parent": "linecard",
    "model": "ethport",
    "lead": "物理端口通过光模块或铜缆与对端连接，PHY处理物理信号，MAC处理以太帧。",
    "paras": [
      "管理状态表示是否允许使用，运行状态表示链路是否建立；两者正常也不保证报文一定能到达目的端。",
      "FEC对编码冗余进行纠正，帧校验用于检测帧错误，队列丢弃则可能根本不是物理误码。三个计数必须分开解读。"
    ],
    "protocol": [
      "PHY/编码/FEC→MAC与FCS→转发队列",
      "上层可能是IP、RoCE、存储或管理流量"
    ],
    "compare": "以太网物理端口在两家集群都存在；不与HCCS、NVLink或灵衢总线端口混为一类。",
    "sources": [
      "pfc",
      "rdma",
      "errdown"
    ],
    "terms": [
      "FCS · Frame Check Sequence · 帧校验序列",
      "SerDes · Serializer/Deserializer · 串行器/解串器"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "queue",
    "title": "端口队列与流量控制",
    "en": "Buffer / PFC / ECN / CFC",
    "group": 4,
    "parent": "switch",
    "model": "queue",
    "lead": "交换机缓冲吸收短时速率差。长期到达速率大于排出能力时，必须通过限速、反馈或丢弃控制压力。",
    "paras": [
      "PFC在指定优先级上请求相邻发送端暂停；ECN给IP报文标记拥塞，再由传输机制反馈；CFC以接收端信用授权限制发送。三者不是一个开关的三个名字。",
      "死锁要求关注持续无进展与循环资源依赖。PFC/CFC计数或暂停帧很多本身还不能证明死锁；需要结合窗口、队列、信用和拓扑。"
    ],
    "protocol": [
      "PFC · 逐优先级逐跳暂停",
      "ECN · IP显式拥塞标记",
      "CFC · 接收端信用授权；仅在支持设备上适用"
    ],
    "compare": "InfiniBand也有自身流控；不能把任意“信用”实现等同于华为CFC。对照机制应限定协议与版本。",
    "sources": [
      "pfc",
      "ecn",
      "cfc",
      "cfc_config"
    ],
    "terms": [
      "PFC · Priority-based Flow Control · 基于优先级的流控",
      "ECN · Explicit Congestion Notification · 显式拥塞通知",
      "CFC · Credit-based Flow Control · 信用流控",
      "CNP · Congestion Notification Packet · RoCE拥塞反馈报文"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "mac",
    "title": "转发表、ARP与ND",
    "en": "Addressing / Forwarding State",
    "group": 4,
    "parent": "switch",
    "model": "mac",
    "lead": "物理链路提供通道，地址与表项决定数据往哪里走。以太网MAC表、IP路由和邻居解析各自有职责。",
    "paras": [
      "MAC表关联地址与端口；ARP为IPv4解析链路地址；IPv6 ND还负责邻居可达性与路由器发现。它们是设备内的逻辑状态，不是三块独立网卡。",
      "地址冲突、哈希桶冲突、表项满、合法迁移和安全攻击可以有相似症状，但产生机制不同。模型中的表格块仅用于解释逻辑状态。"
    ],
    "protocol": [
      "MAC/VLAN查表",
      "ARP（IPv4）与ND（IPv6）",
      "路由与策略按部署"
    ],
    "compare": "相同以太协议可在华为与NVIDIA以太网络上使用，但厂商表容量、哈希和安全特性依型号。",
    "sources": [
      "arp",
      "nd"
    ],
    "terms": [
      "ARP · Address Resolution Protocol · 地址解析协议",
      "ND · Neighbor Discovery · 邻居发现",
      "Hash · 哈希，将键映射到索引位置"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "nic",
    "title": "网络控制器与RDMA资源",
    "en": "NIC / RDMA Endpoint",
    "group": 4,
    "parent": "server",
    "model": "nic",
    "lead": "网络控制器将主机或设备数据转换为网络传输，RDMA能力由受支持端点及其驱动共同提供。",
    "paras": [
      "发送前需要资源、内存授权和连接状态。直接内存访问减少数据路径上的CPU参与，但不意味着完全没有CPU、驱动和权限管理。",
      "不同昇腾产品可以有设备侧网络出口；不能假设所有NPU通信都经过同一张Host网卡。"
    ],
    "protocol": [
      "以太/RoCE或所选网络",
      "MR内存区域、QP队列对、CQ完成队列",
      "连接和权限由软件与硬件协同"
    ],
    "compare": "NVIDIA ConnectX承载以太/RDMA等能力；Atlas设备侧网络与Host NIC位置依型号。",
    "sources": [
      "rdma",
      "hccs"
    ],
    "terms": [
      "NIC · Network Interface Controller · 网络接口控制器",
      "RDMA · Remote Direct Memory Access · 远程直接内存访问",
      "RoCE · RDMA over Converged Ethernet · 以太网上的RDMA"
    ],
    "scope": "通用结构示意"
  },
  {
    "id": "npu_port",
    "title": "NPU侧网络出口",
    "en": "Device-side Network Port",
    "group": 4,
    "parent": "npu",
    "model": "npu_port",
    "lead": "设备侧端口让NPU参与网络通信，其地址、健康状态和数据路径未必与Host管理网相同。",
    "paras": [
      "先识别它属于RoCE、HCCS还是灵衢。以太类型可涉及MAC/IP和邻居解析，总线类型应检查对应协议。",
      "端口、光模块和线缆是相邻但独立的资源；单通、误码和探测失败需要查看两端。"
    ],
    "protocol": [
      "RoCE端口：以太/IP/UDP/RDMA",
      "总线端口：对应总线协议，不混用"
    ],
    "compare": "NVIDIA GPU经网络控制器参与跨节点通信，与GPU间NVLink有明确边界；不能只看“加速器端口”四字就判断协议。",
    "sources": [
      "hccs",
      "rdma"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "cq",
    "title": "通信队列与完成结果",
    "en": "QP / CQ / CQE",
    "group": 4,
    "parent": "nic",
    "model": "cq",
    "lead": "队列是端点使用的逻辑资源。完成队列中的一个条目记录操作结果，可能成功，也可能因本地、远端或网络原因失败。",
    "paras": [
      "队列对包含发送/接收工作队列；完成队列供软件获知结果。完成项的状态、操作类型、端点与厂商扩展字段是定位的重要依据。",
      "图中展示的是逻辑结构，旁边的实体网卡才是物理资源。灵衢总线的CQE格式应按其规范，不能直接复用NVIDIA RDMA错误码。"
    ],
    "protocol": [
      "WR/WQE提交→端点执行→CQE结果",
      "错误类型包含权限、状态、超时或资源问题；按具体协议解码"
    ],
    "compare": "CQE是通用完成概念，不是“网线报错包”。NVIDIA资料仅用于解释类比，不作为华为总线错误码表。",
    "sources": [
      "rdma",
      "ub"
    ],
    "terms": [
      "QP · Queue Pair · 队列对",
      "CQ · Completion Queue · 完成队列",
      "CQE · Completion Queue Entry · 完成队列项",
      "WR · Work Request · 工作请求",
      "WQE · Work Queue Element · 工作队列元素"
    ],
    "scope": "逻辑对象示意，不是硬件外观"
  },
  {
    "id": "probe",
    "title": "NPU间连通性与观测范围",
    "en": "End-to-end Reachability",
    "group": 4,
    "parent": "ethernet",
    "model": "probe",
    "lead": "端到端探测把多个资源串起来验证某个通信行为，但探测失败通常不能单独给出根因。",
    "paras": [
      "先明确Ping究竟使用ICMP还是某种设备专用/RDMA测试；本次用户清单未提供探测命令，因此保留“协议待确认”。",
      "对多节点构建失败矩阵：只涉及某个端点、某个接入交换机或某组跨柜路径，会指向不同故障域。但相关性仍须与直接设备证据交叉验证。"
    ],
    "protocol": [
      "探测协议先确认",
      "物理连通、IP可达与RDMA读写是不同验证层"
    ],
    "compare": "两家平台都需要分层验证。Ping成功不等于内存授权、队列资源和通信库全部正常。",
    "sources": [
      "rdma",
      "arp",
      "nd"
    ],
    "terms": [
      "ICMP · Internet Control Message Protocol · 互联网控制消息协议"
    ],
    "scope": "逻辑探测路径；不是独立硬件"
  },
  {
    "id": "storage",
    "title": "共享存储与数据持久化",
    "en": "Shared Storage",
    "group": 5,
    "parent": "cluster",
    "model": "storage",
    "lead": "共享存储让多个计算节点读取数据集、权重并保存训练状态，物理上由控制器、介质和网络组成。",
    "paras": [
      "文件、块和对象访问提供不同语义。读取大量小文件依赖元数据与随机访问能力，保存大块状态更依赖带宽和持久化效率。",
      "故障可以在介质、控制器、存储网络、文件系统和应用之间传播；写入异常不应直接挂到NPU芯片。"
    ],
    "protocol": [
      "本地：NVMe/PCIe等",
      "共享：文件/块/对象协议按方案选择",
      "网络与存储语义分层"
    ],
    "compare": "两家计算平台均可使用外部共享存储，品牌不是强制绑定。",
    "sources": [
      "nvme",
      "write"
    ],
    "terms": [],
    "scope": "通用结构示意"
  },
  {
    "id": "filesystem",
    "title": "文件系统与容量语义",
    "en": "Filesystem",
    "group": 5,
    "parent": "storage",
    "model": "filesystem",
    "lead": "文件系统将块存储组织成目录、文件、权限和元数据，是硬件资源上方的逻辑层。",
    "paras": [
      "文件写入可能受到数据块、inode、配额、权限、只读状态或底层I/O影响。只看剩余字节不足以解释全部写入失败。",
      "这里补充软件边界是为了准确挂接用户原始故障，不把文件系统错误错误归类为某颗硬件坏了。"
    ],
    "protocol": [
      "文件系统调用→文件/元数据→块设备或远端存储",
      "持久化完成需要符合应用与系统同步语义"
    ],
    "compare": "Linux文件系统语义与加速器品牌无直接绑定。",
    "sources": [
      "write"
    ],
    "terms": [
      "inode · 文件系统索引节点",
      "errno · 系统调用错误标识",
      "I/O · 输入/输出"
    ],
    "scope": "软件逻辑边界；由存储硬件承载"
  },
  {
    "id": "os",
    "title": "主机进程与系统状态",
    "en": "OS / Processes",
    "group": 5,
    "parent": "server",
    "model": "os",
    "lead": "操作系统管理进程、内存、设备和文件系统。它把硬件资源提供给应用，但操作系统异常不等于对应硬件永久损坏。",
    "paras": [
      "进程失效可能是退出、崩溃、内存不足终止，也可能只是心跳超时。需要先确认进程真实状态和退出原因。",
      "硬件错误可能经驱动/固件传播到进程，反过来应用错误也可能产生设备错误信息；按时间与错误码区分。"
    ],
    "protocol": [
      "系统调用、驱动、设备接口",
      "本页仅说明硬件上方的软件边界，不展开训练框架"
    ],
    "compare": "华为与NVIDIA驱动事件格式不同；Linux进程、内存和文件语义仍是共同分析层。",
    "sources": [
      "write",
      "xid",
      "aer"
    ],
    "terms": [
      "OS · Operating System · 操作系统",
      "OOM · Out of Memory · 内存不足"
    ],
    "scope": "软件逻辑边界；不是额外物理板卡"
  }
];
