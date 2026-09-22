// Canonical, editable data. No build step required.
const FAULTS = [
  {
    "id": "C01",
    "name": "NPU过热关机",
    "domain": "计算",
    "resources": [
      "npu",
      "coldplate",
      "fan"
    ],
    "kind": "保护动作",
    "mechanism": "计算产生的热量无法及时传出，结温触及设备保护条件，设备降功耗、复位或关断；整机是否关机取决于产品联动。",
    "evidence": [
      "芯片温度与功耗曲线",
      "冷却液流量/进出口温差、风扇转速",
      "设备保护事件时间线"
    ],
    "caution": "不能由“过热”直接认定芯片损坏，也不要臆造通用关机温度。",
    "sources": [
      "a3",
      "cool"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "散热能力不足",
      "芯片温度升高",
      "热保护触发",
      "NPU或作业退出"
    ]
  },
  {
    "id": "C02",
    "name": "NPU ECC历史计数超门限",
    "domain": "计算",
    "resources": [
      "hbm",
      "npu"
    ],
    "kind": "阈值告警",
    "mechanism": "纠错码（Error-Correcting Code，ECC）相关历史累计计数超过管理规则阈值。计数可能包含不同存储域和不同错误类型。",
    "evidence": [
      "计数类型及覆盖存储域",
      "设备启动/复位时间与计数是否清零",
      "单位时间增量和物理地址分布"
    ],
    "caution": "历史总量超限不等于当前正在发生错误；须区分可纠正与不可纠正、累计值与增长速率。",
    "sources": [
      "ecc",
      "aer"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C03",
    "name": "NPU芯片健康状态严重告警",
    "domain": "计算",
    "resources": [
      "npu",
      "board"
    ],
    "kind": "汇总状态",
    "mechanism": "驱动、固件或管理系统把底层事件汇总为“严重”级别的健康状态。触发源可能是温度、存储、互联或内部执行单元。",
    "evidence": [
      "原始错误码和子模块",
      "健康级别转换时间",
      "并发温度、内存与链路事件"
    ],
    "caution": "等级名称不是根因，也不能单凭等级决定更换板卡；不同产品/版本的升级与消除规则不同。",
    "sources": [
      "hccs",
      "xid"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C04",
    "name": "NPU芯片健康状态紧急告警",
    "domain": "计算",
    "resources": [
      "npu",
      "board"
    ],
    "kind": "汇总状态",
    "mechanism": "驱动、固件或管理系统把底层事件汇总为“紧急”级别的健康状态。触发源可能是温度、存储、互联或内部执行单元。",
    "evidence": [
      "原始错误码和子模块",
      "健康级别转换时间",
      "并发温度、内存与链路事件"
    ],
    "caution": "等级名称不是根因，也不能单凭等级决定更换板卡；不同产品/版本的升级与消除规则不同。",
    "sources": [
      "hccs",
      "xid"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C05",
    "name": "NPU MCE/AER错误",
    "domain": "计算",
    "resources": [
      "pcie",
      "npu"
    ],
    "kind": "上报通道",
    "mechanism": "高级错误报告（Advanced Error Reporting，AER）记录PCIe事务或链路错误；机器检查异常（Machine Check Exception，MCE）是另一类处理器硬件错误上报概念。清单将两者合并命名，实际必须拆开查。",
    "evidence": [
      "PCIe设备地址和首个AER状态",
      "错误严重性和原始日志",
      "CPU架构、固件与设备事件"
    ],
    "caution": "MCE不能直接套用为昇腾NPU内部统一错误格式；鲲鹏的硬件错误可能通过Arm RAS/固件链路上报。",
    "sources": [
      "aer",
      "xid"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C06",
    "name": "操作系统进程失效",
    "domain": "计算",
    "resources": [
      "os",
      "server"
    ],
    "kind": "软件状态",
    "mechanism": "进程退出、崩溃、被内存回收机制终止，或心跳未及时上报，都会被管理系统表现为进程失效。",
    "evidence": [
      "退出码/信号、服务日志",
      "内核内存不足记录",
      "心跳超时与CPU调度延迟"
    ],
    "caution": "心跳丢失不等于进程已退出；重启进程不能修复资源耗尽或上游依赖。",
    "sources": [
      "write"
    ],
    "origin": "收录条目",
    "originalCategory": "OS",
    "chain": []
  },
  {
    "id": "C07",
    "name": "文件系统写入异常",
    "domain": "计算",
    "resources": [
      "filesystem",
      "nvme",
      "storage"
    ],
    "kind": "软件/存储交界",
    "mechanism": "写请求可能因空间或配额耗尽、只读挂载、权限问题或底层I/O错误失败。应用write成功后仍可能在同步落盘阶段遇到错误。",
    "evidence": [
      "errno、应用路径与挂载点",
      "文件系统只读状态",
      "块设备错误和远端存储日志"
    ],
    "caution": "这是文件系统现象，不能直接认定SSD损坏；按EIO/ENOSPC/EDQUOT等区分。",
    "sources": [
      "write",
      "nvme"
    ],
    "origin": "收录条目",
    "originalCategory": "OS",
    "chain": []
  },
  {
    "id": "C08",
    "name": "NPU端口状态异常",
    "domain": "计算",
    "resources": [
      "npu_port",
      "optic"
    ],
    "kind": "端口状态",
    "mechanism": "端口管理状态、物理信号、链路训练或设备侧网络状态不满足工作条件，导致端口不可用或状态不一致。",
    "evidence": [
      "admin/oper状态",
      "对端端口和光功率",
      "协商速率、lane、FEC与设备日志"
    ],
    "caution": "先确认端口属于RoCE、HCCS还是灵衢，不同接口不能沿用同一诊断命令与协议假设。",
    "sources": [
      "hccs",
      "rdma"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C09",
    "name": "服务器状态异常",
    "domain": "计算",
    "resources": [
      "server",
      "bmc"
    ],
    "kind": "汇总状态",
    "mechanism": "服务器可能掉电、复位、操作系统失联，或只是管理通道不可达；管理平台以一个状态呈现多个不同层次。",
    "evidence": [
      "BMC供电状态与事件",
      "主机运行时间/心跳",
      "管理网和业务网分别探测"
    ],
    "caution": "服务器离线不等于断电。BMC、操作系统与NPU是不同的可达性域。",
    "sources": [
      "a2"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C10",
    "name": "CPU部分核故障",
    "domain": "计算",
    "resources": [
      "cpu"
    ],
    "kind": "计算资源",
    "mechanism": "硬件核心异常或固件隔离可能减少可用CPU核数；操作系统也可以出于配置或维护将核心下线。",
    "evidence": [
      "在线/离线CPU列表",
      "硬件错误记录",
      "固件隔离与运维变更"
    ],
    "caution": "核心离线只是状态，必须排除人工热插拔、启动参数和资源限制。",
    "sources": [
      "aer"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C11",
    "name": "文件系统容量不足",
    "domain": "计算",
    "resources": [
      "filesystem",
      "nvme",
      "storage"
    ],
    "kind": "容量阈值",
    "mechanism": "数据块、索引节点（inode）或租户配额被耗尽，应用即使看到部分剩余字节也可能无法创建文件。",
    "evidence": [
      "块空间、inode、配额分别检查",
      "已删除但仍打开的文件",
      "日志和快照增长速率"
    ],
    "caution": "不能只看df容量百分比；清理文件前需确认归属和备份，告警阈值不是通用常数。",
    "sources": [
      "write"
    ],
    "origin": "收录条目",
    "originalCategory": "OS",
    "chain": []
  },
  {
    "id": "C12",
    "name": "NPU状态异常",
    "domain": "计算",
    "resources": [
      "npu",
      "board"
    ],
    "kind": "汇总状态",
    "mechanism": "设备不可枚举、固件未就绪、复位中或健康上报异常均可能形成该状态。",
    "evidence": [
      "设备枚举、驱动绑定和固件状态",
      "原始错误码",
      "业务是否受影响"
    ],
    "caution": "“可枚举”“驱动可查询”“算子可运行”不是同一层的可用性。",
    "sources": [
      "aer",
      "hccs"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C13",
    "name": "疑似光模块故障",
    "domain": "计算",
    "resources": [
      "optic"
    ],
    "kind": "疑似归因",
    "mechanism": "激光器、接收器、模块供电或内部处理电路异常可能降低链路质量；同样现象也可由光纤端面或端口引起。",
    "evidence": [
      "模块诊断数据和两端收发光功率",
      "温度、电压、误码",
      "合规维护中的交叉替换结果"
    ],
    "caution": "“疑似”不等于模块已经损坏。对照端口、跳线与模块才能缩小故障域。",
    "sources": [
      "rdma"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C14",
    "name": "NPU到交换机端口链路单通",
    "domain": "计算",
    "resources": [
      "fiber",
      "npu_port",
      "ethport"
    ],
    "kind": "方向性异常",
    "mechanism": "发送与接收使用独立方向，一个方向的光路、lane、接收器或转发策略异常，可能造成单向计数或探测不对称。",
    "evidence": [
      "两端TX/RX计数、光功率",
      "双向探测与抓取的帧类型",
      "策略、地址和路由"
    ],
    "caution": "物理Up不保证双向数据可用；也不能把上层单向探测失败直接证明为光纤故障。",
    "sources": [
      "rdma",
      "arp"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C15",
    "name": "光链路脏污",
    "domain": "计算",
    "resources": [
      "fiber",
      "optic",
      "ethport"
    ],
    "kind": "物理链路",
    "mechanism": "端面灰尘、油污或污染物造成额外插入损耗、反射或光路不稳定，降低接收信号裕量。",
    "evidence": [
      "两端光功率的绝对值和趋势",
      "FEC/CRC与链路震荡时间线",
      "按维护规范进行端面检查、清洁或插接检查"
    ],
    "caution": "不能仅凭光功率偏低判定脏污；衰减也可能来自距离、弯折、模块或接收端。自动恢复策略不会自动清洁端面或拧紧连接器。",
    "sources": [
      "a3",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "端面/插接质量下降",
      "接收裕量变小",
      "误码或重传增加",
      "链路抖动/通信变慢"
    ]
  },
  {
    "id": "C16",
    "name": "光链路松动",
    "domain": "计算",
    "resources": [
      "fiber",
      "optic",
      "ethport"
    ],
    "kind": "物理链路",
    "mechanism": "连接器未锁紧、插接不完全或受力牵拉使耦合状态变化，可能引起间歇性衰减和断链。",
    "evidence": [
      "两端光功率的绝对值和趋势",
      "FEC/CRC与链路震荡时间线",
      "按维护规范进行端面检查、清洁或插接检查"
    ],
    "caution": "不能仅凭光功率偏低判定脏污；衰减也可能来自距离、弯折、模块或接收端。自动恢复策略不会自动清洁端面或拧紧连接器。",
    "sources": [
      "a3",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "端面/插接质量下降",
      "接收裕量变小",
      "误码或重传增加",
      "链路抖动/通信变慢"
    ]
  },
  {
    "id": "C17",
    "name": "CPU 片上内存产生不可纠正错误",
    "domain": "计算",
    "resources": [
      "cpu",
      "cache"
    ],
    "kind": "存储错误",
    "mechanism": "CPU芯片内部缓存或其他片内存储检测到无法由相应保护机制恢复的数据错误，可能触发异常、隔离或复位。",
    "evidence": [
      "原始错误地址、bank或部件标识",
      "CPU/固件错误记录",
      "与进程异常的时间对应"
    ],
    "caution": "这里的“片上内存”不能默认解释成服务器DDR内存条。须定位到缓存、内部SRAM等实际存储域。",
    "sources": [
      "aer"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C18",
    "name": "HBM多bit ECC错误",
    "domain": "计算",
    "resources": [
      "hbm"
    ],
    "kind": "存储错误",
    "mechanism": "高带宽内存（High Bandwidth Memory，HBM）读出数据与校验不一致，平台报告多位错误；可否纠正、是否可隔离及其业务影响，取决于实际ECC方案与错误范围。",
    "evidence": [
      "可纠正/不可纠正状态位",
      "错误地址及重复性",
      "设备隔离、页面处理和任务退出记录"
    ],
    "caution": "“多bit”不自动等于所有产品上的不可纠正错误；“严重”分级的具体阈值未提供，不虚构数值。",
    "sources": [
      "ecc"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "存储数据/校验不一致",
      "ECC检测并上报",
      "按能力纠正或隔离",
      "任务继续、失败或设备退出"
    ]
  },
  {
    "id": "C19",
    "name": "HBM多bit ECC严重错误",
    "domain": "计算",
    "resources": [
      "hbm"
    ],
    "kind": "存储错误",
    "mechanism": "高带宽内存（High Bandwidth Memory，HBM）读出数据与校验不一致，平台报告多位错误；可否纠正、是否可隔离及其业务影响，取决于实际ECC方案与错误范围。",
    "evidence": [
      "可纠正/不可纠正状态位",
      "错误地址及重复性",
      "设备隔离、页面处理和任务退出记录"
    ],
    "caution": "“多bit”不自动等于所有产品上的不可纠正错误；“严重”分级的具体阈值未提供，不虚构数值。",
    "sources": [
      "ecc"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "存储数据/校验不一致",
      "ECC检测并上报",
      "按能力纠正或隔离",
      "任务继续、失败或设备退出"
    ]
  },
  {
    "id": "C20",
    "name": "NPU芯片健康状态次要告警",
    "domain": "计算",
    "resources": [
      "npu",
      "board"
    ],
    "kind": "汇总状态",
    "mechanism": "驱动、固件或管理系统把底层事件汇总为“次要”级别的健康状态。触发源可能是温度、存储、互联或内部执行单元。",
    "evidence": [
      "原始错误码和子模块",
      "健康级别转换时间",
      "并发温度、内存与链路事件"
    ],
    "caution": "等级名称不是根因，也不能单凭等级决定更换板卡；不同产品/版本的升级与消除规则不同。",
    "sources": [
      "hccs",
      "xid"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C21",
    "name": "NPU芯片健康状态提示告警",
    "domain": "计算",
    "resources": [
      "npu",
      "board"
    ],
    "kind": "汇总状态",
    "mechanism": "驱动、固件或管理系统把底层事件汇总为“提示”级别的健康状态。触发源可能是温度、存储、互联或内部执行单元。",
    "evidence": [
      "原始错误码和子模块",
      "健康级别转换时间",
      "并发温度、内存与链路事件"
    ],
    "caution": "等级名称不是根因，也不能单凭等级决定更换板卡；不同产品/版本的升级与消除规则不同。",
    "sources": [
      "hccs",
      "xid"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C22",
    "name": "CPU芯片健康状态次要告警",
    "domain": "计算",
    "resources": [
      "cpu"
    ],
    "kind": "汇总状态",
    "mechanism": "多个CPU子系统事件被固件或管理软件归纳为健康级别，可能涉及温度、缓存、供电、核心或互联。",
    "evidence": [
      "原始硬件事件",
      "错误严重性与恢复状态",
      "CPU、BMC和操作系统时间线"
    ],
    "caution": "健康级别是汇总结果，不是可直接更换某个部件的证据。",
    "sources": [
      "aer",
      "xid"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C23",
    "name": "CPU芯片健康状态严重告警",
    "domain": "计算",
    "resources": [
      "cpu"
    ],
    "kind": "汇总状态",
    "mechanism": "多个CPU子系统事件被固件或管理软件归纳为健康级别，可能涉及温度、缓存、供电、核心或互联。",
    "evidence": [
      "原始硬件事件",
      "错误严重性与恢复状态",
      "CPU、BMC和操作系统时间线"
    ],
    "caution": "健康级别是汇总结果，不是可直接更换某个部件的证据。",
    "sources": [
      "aer",
      "xid"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C24",
    "name": "疑似交换机故障导致NPU间Ping异常",
    "domain": "计算",
    "resources": [
      "ethernet",
      "switch",
      "probe"
    ],
    "kind": "疑似归因",
    "mechanism": "探测报文没有按预期往返，可能涉及端点、地址解析、网络路径、策略或超时。带“疑似”的条目是在探测失败基础上的范围推断。",
    "evidence": [
      "明确探测工具和实际协议",
      "源/目的NPU与失败矩阵",
      "排除地址、策略与管理通道影响"
    ],
    "caution": "这份清单只写Ping，未指定ICMP或专用RDMA探测。Ping失败不能直接证明RDMA失败；成功也不能证明队列与内存访问正常。",
    "sources": [
      "rdma",
      "arp",
      "nd"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C25",
    "name": "疑似节点故障导致NPU间Ping异常",
    "domain": "计算",
    "resources": [
      "server",
      "probe"
    ],
    "kind": "疑似归因",
    "mechanism": "探测报文没有按预期往返，可能涉及端点、地址解析、网络路径、策略或超时。带“疑似”的条目是在探测失败基础上的范围推断。",
    "evidence": [
      "明确探测工具和实际协议",
      "源/目的NPU与失败矩阵",
      "排除地址、策略与管理通道影响"
    ],
    "caution": "这份清单只写Ping，未指定ICMP或专用RDMA探测。Ping失败不能直接证明RDMA失败；成功也不能证明队列与内存访问正常。",
    "sources": [
      "rdma",
      "arp",
      "nd"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C26",
    "name": "NPU间Ping异常",
    "domain": "计算",
    "resources": [
      "probe",
      "npu_port"
    ],
    "kind": "端到端症状",
    "mechanism": "探测报文没有按预期往返，可能涉及端点、地址解析、网络路径、策略或超时。带“疑似”的条目是在探测失败基础上的范围推断。",
    "evidence": [
      "明确探测工具和实际协议",
      "源/目的NPU与失败矩阵",
      "排除地址、策略与管理通道影响"
    ],
    "caution": "这份清单只写Ping，未指定ICMP或专用RDMA探测。Ping失败不能直接证明RDMA失败；成功也不能证明队列与内存访问正常。",
    "sources": [
      "rdma",
      "arp",
      "nd"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "C27",
    "name": "疑似NPU故障导致NPU间Ping异常",
    "domain": "计算",
    "resources": [
      "npu",
      "probe"
    ],
    "kind": "疑似归因",
    "mechanism": "探测报文没有按预期往返，可能涉及端点、地址解析、网络路径、策略或超时。带“疑似”的条目是在探测失败基础上的范围推断。",
    "evidence": [
      "明确探测工具和实际协议",
      "源/目的NPU与失败矩阵",
      "排除地址、策略与管理通道影响"
    ],
    "caution": "这份清单只写Ping，未指定ICMP或专用RDMA探测。Ping失败不能直接证明RDMA失败；成功也不能证明队列与内存访问正常。",
    "sources": [
      "rdma",
      "arp",
      "nd"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E01",
    "name": "接入侧链路端口状态震荡",
    "domain": "以太网络",
    "resources": [
      "ethport",
      "fiber"
    ],
    "kind": "端口状态",
    "mechanism": "端口反复在Up与Down之间切换，可能由插接、光信号、设备复位或协商不稳定引起。",
    "evidence": [
      "两端Up/Down时间与计数",
      "协商/FEC/光功率",
      "接入节点复位日志"
    ],
    "caution": "区别接入链路与骨干链路；先关联两端时间，不能只盯本端。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E02",
    "name": "PFC死锁",
    "domain": "以太网络",
    "resources": [
      "queue",
      "ethernet"
    ],
    "kind": "协议状态",
    "mechanism": "基于优先级的流量控制（Priority-based Flow Control，PFC）形成循环缓冲依赖时，各节点等待下游释放空间，暂停可能长期无法解除。",
    "evidence": [
      "同一优先级的暂停时长",
      "队列驻留与无发送进展",
      "拓扑上循环依赖或厂商检测事件"
    ],
    "caution": "PFC报文多不等于死锁；必须区分暂时拥塞、PFC风暴和持续无前进的状态。",
    "sources": [
      "pfc",
      "ecn"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E03",
    "name": "PFC速率超门限",
    "domain": "以太网络",
    "resources": [
      "queue",
      "ethernet"
    ],
    "kind": "阈值告警",
    "mechanism": "Pause帧速率或某种暂停指标超过配置阈值，说明特定优先级持续受到背压。",
    "evidence": [
      "指标单位：帧/秒还是暂停占比",
      "发送与接收PFC分别观察",
      "对应队列水位及ECN"
    ],
    "caution": "统计口径和采样窗未给出，不编造统一阈值；短突发不一定是业务故障。",
    "sources": [
      "pfc",
      "ecn"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E04",
    "name": "交换机MAC表项异常变化",
    "domain": "以太网络",
    "resources": [
      "mac",
      "switch"
    ],
    "kind": "转发表状态",
    "mechanism": "同一媒体访问控制地址（Media Access Control，MAC）在端口间频繁移动，或表项异常增减，可能由环路、重复地址、拓扑变更或主机迁移引起。",
    "evidence": [
      "MAC/VLAN/端口三元组",
      "移动频率与拓扑事件",
      "是否为合法迁移或链路聚合行为"
    ],
    "caution": "MAC表变化不自动等于攻击或硬件故障。",
    "sources": [
      "arp",
      "nd"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E05",
    "name": "交换机整机故障",
    "domain": "以太网络",
    "resources": [
      "switch"
    ],
    "kind": "汇总状态",
    "mechanism": "供电、主控、交换结构或系统软件问题导致设备无法提供预期转发或管理能力。",
    "evidence": [
      "带外电源与复位日志",
      "多端口业务可达性",
      "板卡状态与管理网状态"
    ],
    "caution": "整机故障和仅管理IP离线不是同义词。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E06",
    "name": "交换机反复重启",
    "domain": "以太网络",
    "resources": [
      "switch",
      "control"
    ],
    "kind": "设备状态",
    "mechanism": "看门狗、异常崩溃、电源波动或人工操作导致运行时间反复归零。",
    "evidence": [
      "boot reason与uptime",
      "供电事件",
      "软件版本/崩溃记录/变更"
    ],
    "caution": "重启只是结果，需找首个触发源，不能凭频次判断主控物理损坏。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E07",
    "name": "交换机设备离线",
    "domain": "以太网络",
    "resources": [
      "switch",
      "bmc"
    ],
    "kind": "可达性状态",
    "mechanism": "管理平台无法访问设备，可能是管理网络、认证、管理进程或整机不可用。",
    "evidence": [
      "管理/业务路径分开验证",
      "带外与控制台状态",
      "凭据和采集超时"
    ],
    "caution": "失去监控不等于失去转发。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E08",
    "name": "交换机主控板异常",
    "domain": "以太网络",
    "resources": [
      "control",
      "switch"
    ],
    "kind": "板级状态",
    "mechanism": "主控负责协议、配置和设备管理。主控异常会影响控制面收敛与状态维护，但已有硬件转发表可能短时继续工作。",
    "evidence": [
      "主备角色与切换",
      "控制进程日志",
      "CPU/内存与板间心跳"
    ],
    "caution": "普通转发数据一般不逐包经过主控CPU；不要画成所有报文穿过主控板。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E09",
    "name": "交换机主控板反复异常",
    "domain": "以太网络",
    "resources": [
      "control",
      "switch"
    ],
    "kind": "重复事件",
    "mechanism": "主控反复复位、主备切换或心跳异常，使控制状态无法稳定。",
    "evidence": [
      "重复事件窗口",
      "主备切换原因",
      "供电、软件与板间通信"
    ],
    "caution": "同名重复告警还可能是采集/去重问题，应先确认真实事件次数。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E10",
    "name": "交换机接口板异常",
    "domain": "以太网络",
    "resources": [
      "linecard",
      "ethport"
    ],
    "kind": "板级状态",
    "mechanism": "接口板承载物理端口、部分转发与缓冲资源；电源、板卡初始化或转发芯片问题可使一组端口同时受影响。",
    "evidence": [
      "板卡槽位、所有端口状态",
      "芯片与供电事件",
      "板间连通"
    ],
    "caution": "盒式交换机未必有可独立插拔的接口板，本视图以框式结构说明。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E11",
    "name": "交换机接口板反复异常",
    "domain": "以太网络",
    "resources": [
      "linecard",
      "ethport"
    ],
    "kind": "重复事件",
    "mechanism": "接口板不断复位、离线或重新初始化，引起该板端口反复中断。",
    "evidence": [
      "槽位事件时间线",
      "同槽位与同电源域相关性",
      "软件版本与初始化日志"
    ],
    "caution": "应区分板卡根因与机框供电/背板连带影响。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E12",
    "name": "交换机交换网板异常",
    "domain": "以太网络",
    "resources": [
      "fabric",
      "switch"
    ],
    "kind": "板级状态",
    "mechanism": "交换网板连接不同接口板，异常可能减少可用内部带宽或使部分入口到出口路径不可达。",
    "evidence": [
      "网板数量与工作状态",
      "跨板和同板转发差异",
      "内部链路错误"
    ],
    "caution": "主控板、接口板和交换网板的职能不同，不可互换。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E13",
    "name": "交换机交换网板反复异常",
    "domain": "以太网络",
    "resources": [
      "fabric",
      "switch"
    ],
    "kind": "重复事件",
    "mechanism": "交换网板反复上下线使内部转发路径反复重建，影响带宽或稳定性。",
    "evidence": [
      "网板上下线时间",
      "背板连接与供电",
      "内部重传/转发表变化"
    ],
    "caution": "冗余网板存在时，业务未必立即全部中断。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E14",
    "name": "交换机风扇异常",
    "domain": "以太网络",
    "resources": [
      "fan",
      "switch"
    ],
    "kind": "散热资源",
    "mechanism": "风扇停转、转速异常或控制链路问题削弱风量，升温后可能引起设备保护。",
    "evidence": [
      "风扇转速/目标PWM",
      "进出口温度",
      "风道方向与滤网"
    ],
    "caution": "风扇告警与芯片温度告警应建立时间因果，不能互相替代。",
    "sources": [
      "cool"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E15",
    "name": "交换机电源异常",
    "domain": "以太网络",
    "resources": [
      "psu",
      "switch"
    ],
    "kind": "供电资源",
    "mechanism": "电源输入缺失、输出异常、模块故障或冗余丧失，使整机可用功率或容错能力下降。",
    "evidence": [
      "输入/输出电压与功率",
      "冗余模式与剩余容量",
      "机柜供电路径"
    ],
    "caution": "单模块故障不必然导致整机掉电；同时检视两路是否共用上游故障点。",
    "sources": [
      "power"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E16",
    "name": "疑似二层环路",
    "domain": "以太网络",
    "resources": [
      "ethernet",
      "mac"
    ],
    "kind": "疑似归因",
    "mechanism": "二层存在未受控的循环转发路径，广播、未知单播等帧可能反复转发，导致MAC移动、带宽占用和CPU压力。",
    "evidence": [
      "广播/未知单播速率",
      "MAC移动与拓扑",
      "生成树/聚合/跨接状态"
    ],
    "caution": "MAC漂移单一证据不足；合法迁移、双归接入也可能产生类似现象。",
    "sources": [
      "arp",
      "pfc"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E17",
    "name": "MAC地址Hash冲突导致学习失败",
    "domain": "以太网络",
    "resources": [
      "mac"
    ],
    "kind": "转发表资源",
    "mechanism": "多个MAC键映射到相同硬件哈希桶，在桶容量不足时，即使整张表尚有空间也可能学习失败。",
    "evidence": [
      "失败原因是桶冲突还是整表满",
      "冲突计数和表项分布",
      "芯片/版本限制"
    ],
    "caution": "哈希碰撞不是MAC地址重复，也不自动等于攻击。",
    "sources": [
      "arp"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E18",
    "name": "接口丢包数异常增长",
    "domain": "以太网络",
    "resources": [
      "ethport",
      "queue"
    ],
    "kind": "计数症状",
    "mechanism": "拥塞缓冲溢出、策略丢弃、帧错误或内部资源问题都可能计入不同丢包项。",
    "evidence": [
      "精确计数器名称与增量",
      "队列丢弃和错误帧分开",
      "同期吞吐/水位/策略"
    ],
    "caution": "丢包计数增长本身不能证明线缆故障，应先分清丢弃原因。",
    "sources": [
      "pfc",
      "ecn"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E19",
    "name": "接口错误包数异常增长",
    "domain": "以太网络",
    "resources": [
      "ethport",
      "fiber"
    ],
    "kind": "计数症状",
    "mechanism": "帧校验失败、编码错误或超规格帧等导致错误计数上升，可能来自信号完整性、模块/线缆或不匹配配置。",
    "evidence": [
      "CRC/FCS、FEC不可纠正与编码错",
      "光功率和两端设置",
      "前向纠错前后误码"
    ],
    "caution": "正常的FEC纠正计数不是等量的业务丢包；应关注不可纠正与增长趋势。",
    "sources": [
      "rdma"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E20",
    "name": "交换机端口error-down",
    "domain": "以太网络",
    "resources": [
      "ethport"
    ],
    "kind": "保护动作",
    "mechanism": "设备检测到配置的保护条件后，将接口置于错误禁用状态；触发源可能是环路保护、频繁震荡或特定流控异常。",
    "evidence": [
      "明确error-down reason",
      "最初触发告警",
      "配置与实际版本"
    ],
    "caution": "error-down是保护结果，不是根因；不要一上来反复shutdown/undo shutdown。",
    "sources": [
      "errdown"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E21",
    "name": "交换机物理端口假死",
    "domain": "以太网络",
    "resources": [
      "ethport",
      "switch"
    ],
    "kind": "症状描述",
    "mechanism": "端口显示Up或可查询，但实际报文转发无进展。可能是MAC/PHY、队列、转发表、固件或上层策略问题。",
    "evidence": [
      "Up状态与双向流量对照",
      "队列/PFC及芯片计数",
      "对端与替代路径"
    ],
    "caution": "“假死”不是标准协议状态，必须提供明确的“有链路无转发”证据。",
    "sources": [
      "pfc",
      "rdma"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E22",
    "name": "主机IP地址冲突",
    "domain": "以太网络",
    "resources": [
      "nic",
      "mac"
    ],
    "kind": "地址冲突",
    "mechanism": "同一广播域或寻址范围内两个端点使用相同IP，邻居映射可能在不同MAC间摆动。",
    "evidence": [
      "重复地址检测",
      "ARP/ND映射变化",
      "资产与地址分配记录"
    ],
    "caution": "IP冲突不等于MAC哈希冲突，也不自动说明有人攻击。",
    "sources": [
      "arp",
      "nd"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E23",
    "name": "交换机收到IP地址冲突ARP报文",
    "domain": "以太网络",
    "resources": [
      "mac",
      "ethport"
    ],
    "kind": "协议告警",
    "mechanism": "交换机观察到不一致的IPv4与MAC绑定，或针对本地地址的冲突声明。",
    "evidence": [
      "报文源/目标IP与MAC",
      "绑定表及静态配置",
      "合法网关冗余与迁移"
    ],
    "caution": "这是冲突线索，不能仅靠报文名定位是主机误配还是欺骗。",
    "sources": [
      "arp"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E24",
    "name": "链路端口状态震荡",
    "domain": "以太网络",
    "resources": [
      "ethport",
      "fiber"
    ],
    "kind": "端口状态",
    "mechanism": "物理或逻辑端口反复切换可用状态，使路由、聚合与业务路径持续重建。",
    "evidence": [
      "同一端口状态变更时间",
      "两端光功率/协商",
      "设备重启或人工操作"
    ],
    "caution": "先定位链路两端和所属平面，避免同名端口的资源映射错误。",
    "sources": [
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E25",
    "name": "光链路松动",
    "domain": "以太网络",
    "resources": [
      "fiber",
      "optic",
      "ethport"
    ],
    "kind": "物理链路",
    "mechanism": "连接器未锁紧、插接不完全或受力牵拉使耦合状态变化，可能引起间歇性衰减和断链。",
    "evidence": [
      "两端光功率的绝对值和趋势",
      "FEC/CRC与链路震荡时间线",
      "按维护规范进行端面检查、清洁或插接检查"
    ],
    "caution": "不能仅凭光功率偏低判定脏污；衰减也可能来自距离、弯折、模块或接收端。自动恢复策略不会自动清洁端面或拧紧连接器。",
    "sources": [
      "a3",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "端面/插接质量下降",
      "接收裕量变小",
      "误码或重传增加",
      "链路抖动/通信变慢"
    ]
  },
  {
    "id": "E26",
    "name": "光链路脏污",
    "domain": "以太网络",
    "resources": [
      "fiber",
      "optic",
      "ethport"
    ],
    "kind": "物理链路",
    "mechanism": "端面灰尘、油污或污染物造成额外插入损耗、反射或光路不稳定，降低接收信号裕量。",
    "evidence": [
      "两端光功率的绝对值和趋势",
      "FEC/CRC与链路震荡时间线",
      "按维护规范进行端面检查、清洁或插接检查"
    ],
    "caution": "不能仅凭光功率偏低判定脏污；衰减也可能来自距离、弯折、模块或接收端。自动恢复策略不会自动清洁端面或拧紧连接器。",
    "sources": [
      "a3",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "端面/插接质量下降",
      "接收裕量变小",
      "误码或重传增加",
      "链路抖动/通信变慢"
    ]
  },
  {
    "id": "E27",
    "name": "交换机收到ARP非法报文",
    "domain": "以太网络",
    "resources": [
      "mac"
    ],
    "kind": "协议校验",
    "mechanism": "地址解析协议（Address Resolution Protocol，ARP）字段、绑定关系或安全策略不符合要求，被设备标记为非法。",
    "evidence": [
      "报文字段与丢弃原因",
      "校验规则/绑定表",
      "源端点配置"
    ],
    "caution": "非法可能是误配置或格式错误，不足以直接认定恶意攻击。",
    "sources": [
      "arp"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E28",
    "name": "ARP攻击",
    "domain": "以太网络",
    "resources": [
      "mac",
      "ethernet"
    ],
    "kind": "安全事件",
    "mechanism": "伪造或大量ARP报文可能污染邻居绑定或占用处理资源，引发错误转发与不可达。",
    "evidence": [
      "异常源和速率",
      "可信绑定对照",
      "邻居变化与控制面压力"
    ],
    "caution": "这里只说明防御诊断，不提供攻击构造；正常免费ARP和主机迁移应排除。",
    "sources": [
      "arp"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E29",
    "name": "ND攻击",
    "domain": "以太网络",
    "resources": [
      "mac",
      "ethernet"
    ],
    "kind": "安全事件",
    "mechanism": "针对IPv6邻居发现（Neighbor Discovery，ND）的伪造或洪泛可能改变邻居/路由器状态或耗尽处理资源。",
    "evidence": [
      "邻居通告/请求/路由器通告类型",
      "邻居表和CPU压力",
      "来源端口与策略"
    ],
    "caution": "ND不是“IPv6版ARP”这么简单，还包括路由器发现和可达性检测。",
    "sources": [
      "nd"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E30",
    "name": "交换机端口Down",
    "domain": "以太网络",
    "resources": [
      "ethport"
    ],
    "kind": "端口状态",
    "mechanism": "管理员禁用、对端掉电、链路断开或训练不成功，使端口无法建立数据链路。",
    "evidence": [
      "管理状态和运行状态",
      "对端供电与端口",
      "模块、线缆、速率与FEC"
    ],
    "caution": "Down是状态，不是“光模块坏了”的结论。",
    "sources": [
      "aer",
      "rdma"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "E31",
    "name": "CFC死锁超阈值",
    "domain": "以太网络",
    "resources": [
      "queue",
      "ethernet"
    ],
    "kind": "协议状态",
    "mechanism": "信用流控（Credit-based Flow Control，CFC）要求有接收端授予的信用才能发送。信用持续为零或循环等待可能触发厂商死锁检测；次数等指标超过配置阈值形成告警。",
    "evidence": [
      "设备型号与CFC支持版本",
      "优先级信用值和返回进展",
      "原始死锁事件、计数窗与配置阈值"
    ],
    "caution": "CFC是信用授权，PFC是按优先级暂停；两者不能混为同一种机制。具体阈值按版本与实际配置，不写死。",
    "sources": [
      "cfc",
      "cfc_config"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B01",
    "name": "设备链路层重传异常",
    "domain": "灵衢总线网络",
    "resources": [
      "busport",
      "busdevice"
    ],
    "kind": "计数症状",
    "mechanism": "链路层检测到错误、序号不连续或确认异常，触发重传；超过规则条件才产生本告警。",
    "evidence": [
      "重传原因、速率、lane状态",
      "链路层与传输层统计分别核对",
      "误码、拥塞与对端复位"
    ],
    "caution": "重传是可靠性机制，不等同于数据已经丢失；链路层和传输层重传不可混写。",
    "sources": [
      "ub",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B02",
    "name": "交换机物理端口假死",
    "domain": "灵衢总线网络",
    "resources": [
      "busport",
      "busdevice"
    ],
    "kind": "症状描述",
    "mechanism": "总线设备端口仍可查询或显示连通，但事务完成或转发无进展。",
    "evidence": [
      "端口状态与事务完成对照",
      "信用/队列及链路计数",
      "对端状态"
    ],
    "caution": "总线端口不是以太网端口；不凭名称套用MAC/ARP诊断。",
    "sources": [
      "ub"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B03",
    "name": "链路端口状态震荡",
    "domain": "灵衢总线网络",
    "resources": [
      "busport",
      "hccs"
    ],
    "kind": "端口状态",
    "mechanism": "总线或高速互联反复训练、掉链或降lane，导致连接状态不断变化。",
    "evidence": [
      "两端训练/恢复时间",
      "lane与物理链路统计",
      "设备复位和连接器状态"
    ],
    "caution": "不同网络平面的恢复条件分别定义，不能从别的平面同名故障推定恢复行为。",
    "sources": [
      "ub",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B04",
    "name": "交换机整机故障",
    "domain": "灵衢总线网络",
    "resources": [
      "busdevice"
    ],
    "kind": "汇总状态",
    "mechanism": "总线互联设备不可用，可能来自供电、转发芯片、固件或管理控制；影响范围取决于冗余拓扑。",
    "evidence": [
      "带外供电和运行时间",
      "端口/芯片状态",
      "替代路径与故障域"
    ],
    "caution": "这里的“交换机”位于灵衢总线平面，不默认解释为以太网交换机。",
    "sources": [
      "ub",
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B05",
    "name": "灵衢总线设备反复重启",
    "domain": "灵衢总线网络",
    "resources": [
      "busdevice"
    ],
    "kind": "设备状态",
    "mechanism": "总线设备复位或重新初始化重复发生，中断依赖其转发的连接。",
    "evidence": [
      "重启原因和运行时间",
      "固件事件",
      "供电/温度与变更记录"
    ],
    "caution": "反复重启可以是连带结果，先看最早事件。",
    "sources": [
      "ub"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B06",
    "name": "光链路脏污",
    "domain": "灵衢总线网络",
    "resources": [
      "fiber",
      "optic",
      "busport"
    ],
    "kind": "物理链路",
    "mechanism": "端面灰尘、油污或污染物造成额外插入损耗、反射或光路不稳定，降低接收信号裕量。",
    "evidence": [
      "两端光功率的绝对值和趋势",
      "FEC/CRC与链路震荡时间线",
      "按维护规范进行端面检查、清洁或插接检查"
    ],
    "caution": "不能仅凭光功率偏低判定脏污；衰减也可能来自距离、弯折、模块或接收端。自动恢复策略不会自动清洁端面或拧紧连接器。",
    "sources": [
      "a3",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "端面/插接质量下降",
      "接收裕量变小",
      "误码或重传增加",
      "链路抖动/通信变慢"
    ]
  },
  {
    "id": "B07",
    "name": "光链路松动",
    "domain": "灵衢总线网络",
    "resources": [
      "fiber",
      "optic",
      "busport"
    ],
    "kind": "物理链路",
    "mechanism": "连接器未锁紧、插接不完全或受力牵拉使耦合状态变化，可能引起间歇性衰减和断链。",
    "evidence": [
      "两端光功率的绝对值和趋势",
      "FEC/CRC与链路震荡时间线",
      "按维护规范进行端面检查、清洁或插接检查"
    ],
    "caution": "不能仅凭光功率偏低判定脏污；衰减也可能来自距离、弯折、模块或接收端。自动恢复策略不会自动清洁端面或拧紧连接器。",
    "sources": [
      "a3",
      "a950"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": [
      "端面/插接质量下降",
      "接收裕量变小",
      "误码或重传增加",
      "链路抖动/通信变慢"
    ]
  },
  {
    "id": "B08",
    "name": "HCCS连通异常",
    "domain": "灵衢总线网络",
    "resources": [
      "hccs",
      "busport",
      "npu"
    ],
    "kind": "互联症状",
    "mechanism": "华为缓存一致性系统（Huawei Cache Coherence System，HCCS）相关端点未建立预期连接，或连接中断；实际链路范围取决于产品拓扑。",
    "evidence": [
      "端点编号与连接矩阵",
      "训练/错误计数",
      "设备复位与版本一致性"
    ],
    "caution": "HCCS硬件互联不是HCCL软件通信库；不将两者错误码直接等价。",
    "sources": [
      "hccs"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B09",
    "name": "设备芯片转发异常",
    "domain": "灵衢总线网络",
    "resources": [
      "buschip",
      "busdevice"
    ],
    "kind": "芯片级状态",
    "mechanism": "总线转发芯片的内部状态、路由资源或数据通路出现异常，造成特定端口或路径无法处理事务。",
    "evidence": [
      "芯片级错误码与端口关联",
      "内部缓冲/路由信息",
      "是否伴随ECC或复位"
    ],
    "caution": "只有板级或整机汇总告警时，不能自行定位到某颗芯片。",
    "sources": [
      "ub"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B10",
    "name": "设备数据转发异常",
    "domain": "灵衢总线网络",
    "resources": [
      "busdevice",
      "busport"
    ],
    "kind": "数据通路症状",
    "mechanism": "端到端事务未按预期转发，可能涉及路由、信用、队列、目的设备或固件。",
    "evidence": [
      "入口与出口进展",
      "路径/端点状态",
      "首个错误的层级和时间"
    ],
    "caution": "先辨别本地发送失败、设备内部丢弃和远端不可达。",
    "sources": [
      "ub"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B11",
    "name": "接口丢包数异常增长",
    "domain": "灵衢总线网络",
    "resources": [
      "busport",
      "busdevice"
    ],
    "kind": "计数症状",
    "mechanism": "总线端口的特定丢弃统计在采样窗内增加，可能来自缓冲资源、报文校验或协议状态不匹配。",
    "evidence": [
      "计数器精确定义与增量",
      "对端状态/流控资源",
      "业务完成率"
    ],
    "caution": "此处packet/cell/transaction的计数单位必须看对应产品定义，不能套用以太网公式。",
    "sources": [
      "ub"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B12",
    "name": "接口拥塞",
    "domain": "灵衢总线网络",
    "resources": [
      "busport",
      "busdevice"
    ],
    "kind": "资源压力",
    "mechanism": "到达某端口的事务速率持续大于其排出能力，缓冲占用增加并向上游施加背压。",
    "evidence": [
      "队列/信用与等待时间",
      "进出口有效带宽",
      "流量矩阵与热点"
    ],
    "caution": "拥塞可以来自负载映射，而非硬件损坏；不将所有总线背压都称为PFC。",
    "sources": [
      "ub"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B13",
    "name": "非法报文故障",
    "domain": "灵衢总线网络",
    "resources": [
      "busport",
      "busdevice"
    ],
    "kind": "协议校验",
    "mechanism": "报文或事务的格式、状态、权限或目的信息不符合总线协议预期，被接收端拒绝或上报。",
    "evidence": [
      "原始错误码与协议层",
      "版本、端点和权限状态",
      "是否伴随物理层误码"
    ],
    "caution": "这里不是ARP/ND非法报文；恢复动作应依据对应总线协议、错误状态与设备规范判断。",
    "sources": [
      "ub"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B14",
    "name": "超节点总线平面连通性异常",
    "domain": "灵衢总线网络",
    "resources": [
      "superpod",
      "busdevice",
      "hccs"
    ],
    "kind": "端到端症状",
    "mechanism": "超节点内部一组设备间无法完成预期互联检查，可能横跨端点、链路、转发设备与配置。",
    "evidence": [
      "节点对失败矩阵",
      "物理与逻辑拓扑",
      "按路径关联链路、芯片和复位事件"
    ],
    "caution": "连通性失败是一组资源共同形成的症状，不等于“整个超节点都坏了”。",
    "sources": [
      "ub",
      "a3"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "B15",
    "name": "总线网络CQE故障",
    "domain": "灵衢总线网络",
    "resources": [
      "cq",
      "busport",
      "npu"
    ],
    "kind": "完成状态",
    "mechanism": "完成队列项（Completion Queue Entry，CQE）记录一次操作的完成结果。错误CQE可能指示超时、权限/地址错误、连接状态或远端异常，不是一个独立物理部件。",
    "evidence": [
      "CQE status与厂商子错误码",
      "操作类型、本地/远端端点",
      "首次错误与后续flush/重试错误"
    ],
    "caution": "通用RDMA文档只用于理解完成语义；灵衢专用CQE字段与状态码必须按该产品规范解释，不能照抄InfiniBand码值。",
    "sources": [
      "ub",
      "rdma"
    ],
    "origin": "收录条目",
    "originalCategory": "硬件资源",
    "chain": []
  },
  {
    "id": "X01",
    "name": "UPS后备能力不足",
    "domain": "设施资源",
    "resources": [
      "ups",
      "power"
    ],
    "kind": "补充案例",
    "mechanism": "电池老化或剩余电量不足，使断电后的维持时间低于系统切换需求。",
    "evidence": [
      "负载与电池容量趋势",
      "自检与实际维护记录"
    ],
    "caution": "不是开启网页开关能修复的问题；供电维护由合格人员进行。",
    "sources": [
      "power"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X02",
    "name": "机柜配电过载或双路同源",
    "domain": "设施资源",
    "resources": [
      "pdu",
      "power"
    ],
    "kind": "补充案例",
    "mechanism": "支路负载超过设计容量，或名义A/B两路共用同一个上游故障点，降低供电可靠性。",
    "evidence": [
      "支路电流与相位负载",
      "A/B供电拓扑",
      "断路保护记录"
    ],
    "caution": "不要把“两根电源线”直接等同于“两条独立供电路径”。",
    "sources": [
      "power"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X03",
    "name": "电源冗余能力丧失",
    "domain": "设施资源",
    "resources": [
      "psu"
    ],
    "kind": "补充案例",
    "mechanism": "电源失效后剩余模块仍能带载但已无冗余，下一次失效可能使设备掉电。",
    "evidence": [
      "冗余状态",
      "剩余功率容量",
      "负载峰值"
    ],
    "caution": "冗余丧失是风险状态，不一定已经业务中断。",
    "sources": [
      "power"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X04",
    "name": "VRM输出异常",
    "domain": "供电资源",
    "resources": [
      "vrm",
      "board"
    ],
    "kind": "补充案例",
    "mechanism": "电压调节模块（Voltage Regulator Module，VRM）输出欠压、过压或纹波异常，可能使芯片保护或计算不稳定。",
    "evidence": [
      "板级电源遥测与保护事件",
      "芯片功率瞬态",
      "同电源域关联"
    ],
    "caution": "不提供带电测量或短接等危险操作；由硬件维护规范验证。",
    "sources": [
      "power"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X05",
    "name": "液冷流量不足或漏液",
    "domain": "散热资源",
    "resources": [
      "cdu",
      "coldplate",
      "cooling"
    ],
    "kind": "补充案例",
    "mechanism": "泵、阀、滤路或接头异常改变流量/压力，降低换热能力；漏液还可能触发设施保护。",
    "evidence": [
      "流量、压差、液位与漏液传感器",
      "温度变化",
      "泵阀工作状态"
    ],
    "caution": "高温不一定意味着漏液；物理处置需遵守断电与液冷维护规范。",
    "sources": [
      "cool",
      "a950"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X06",
    "name": "散热受限导致降频",
    "domain": "性能症状",
    "resources": [
      "coldplate",
      "fan",
      "npu"
    ],
    "kind": "补充案例",
    "mechanism": "温度或功率逼近允许边界时设备降低频率，吞吐下降但不一定关机。",
    "evidence": [
      "实际频率与限制原因",
      "温度、功耗和工作负载",
      "散热链路状态"
    ],
    "caution": "性能下降不等于算子问题；功率限制与温度限制要分开。",
    "sources": [
      "cool",
      "xid"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X07",
    "name": "主机DRAM可纠正/不可纠正错误",
    "domain": "存储资源",
    "resources": [
      "dram"
    ],
    "kind": "补充案例",
    "mechanism": "主机动态随机存取内存（Dynamic Random-Access Memory，DRAM）或其访问链路产生保护错误，影响CPU侧数据。",
    "evidence": [
      "DIMM槽位和错误地址",
      "可纠正/不可纠正标记",
      "内存控制器日志"
    ],
    "caution": "与NPU HBM、CPU片内缓存是三个不同资源域。",
    "sources": [
      "ecc"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X08",
    "name": "NVMe介质错误或磨损预警",
    "domain": "存储资源",
    "resources": [
      "nvme"
    ],
    "kind": "补充案例",
    "mechanism": "闪存介质与备用块状态恶化，或控制器报告不可恢复数据错误，影响读写可靠性。",
    "evidence": [
      "健康日志和介质错误",
      "可用备用容量",
      "应用I/O异常关联"
    ],
    "caution": "耐久度指标超过建议值不等于每次I/O都失败；依厂商规范处理。",
    "sources": [
      "nvme",
      "write"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X09",
    "name": "存储访问尾时延升高",
    "domain": "性能症状",
    "resources": [
      "storage",
      "filesystem"
    ],
    "kind": "补充案例",
    "mechanism": "共享存储负载、网络或后端介质导致少数I/O极慢，使数据加载和快照持久化被拖延。",
    "evidence": [
      "延迟分位数与队列深度",
      "存储网与后端指标",
      "并发读写模式"
    ],
    "caution": "带宽平均值正常仍可能出现明显长尾。",
    "sources": [
      "nvme",
      "write"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X10",
    "name": "PCIe降速或链路宽度缩减",
    "domain": "互联状态",
    "resources": [
      "pcie"
    ],
    "kind": "补充案例",
    "mechanism": "链路协商到较低代际或更少lane，设备能运行但主机与设备间带宽降低。",
    "evidence": [
      "当前速率/宽度与能力值",
      "AER与重训记录",
      "插槽、转接与拓扑"
    ],
    "caution": "省电状态不等于永久降速；在有效负载下核实。",
    "sources": [
      "aer"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X11",
    "name": "FEC不可纠正码字增长",
    "domain": "链路质量",
    "resources": [
      "fiber",
      "optic",
      "ethport"
    ],
    "kind": "补充案例",
    "mechanism": "前向纠错（Forward Error Correction，FEC）无法修复部分编码块，可能形成丢帧或链路不稳定。",
    "evidence": [
      "纠错前后误码",
      "不可纠正计数速率",
      "模块与FEC配置"
    ],
    "caution": "FEC纠正正常工作并不表示业务已经出错。",
    "sources": [
      "rdma"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X12",
    "name": "速率、FEC或光学规格不匹配",
    "domain": "兼容性",
    "resources": [
      "optic",
      "ethport",
      "fiber"
    ],
    "kind": "补充案例",
    "mechanism": "端口速率、编码、lane映射或模块光学规格不一致，链路可能无法建立或质量恶化。",
    "evidence": [
      "两端模块料号与规范",
      "速率/FEC/lane配置",
      "光纤类别和连接器"
    ],
    "caution": "同样的OSFP/QSFP外形不保证协议、速率或波长兼容。",
    "sources": [
      "rdma"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X13",
    "name": "MTU不一致",
    "domain": "配置状态",
    "resources": [
      "ethernet",
      "nic",
      "ethport"
    ],
    "kind": "补充案例",
    "mechanism": "最大传输单元（Maximum Transmission Unit，MTU）在路径中不一致，较大报文可能被丢弃或需要不同处理。",
    "evidence": [
      "路径各段MTU",
      "小包与大包差异",
      "ICMP反馈和丢弃统计"
    ],
    "caution": "小包Ping成功并不保证目标负载尺寸通信成功。",
    "sources": [
      "rdma"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X14",
    "name": "ECN/优先级映射不匹配",
    "domain": "配置状态",
    "resources": [
      "queue",
      "ethernet"
    ],
    "kind": "补充案例",
    "mechanism": "业务报文映射到错误队列，或拥塞标记与端点响应不一致，影响端到端流量调节。",
    "evidence": [
      "优先级映射",
      "队列ECN/丢弃",
      "发送端对拥塞反馈的响应"
    ],
    "caution": "不要认为开启PFC就自动获得正确无损网络。",
    "sources": [
      "pfc",
      "ecn"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X15",
    "name": "管理凭据或证书异常导致采集失联",
    "domain": "控制面",
    "resources": [
      "bmc",
      "control"
    ],
    "kind": "补充案例",
    "mechanism": "认证失败、证书失效或权限变化使采集进程无法获取设备状态，而转发或计算可能继续正常。",
    "evidence": [
      "认证错误与证书时间",
      "管理网络连通",
      "业务面独立验证"
    ],
    "caution": "采集不可达不是物理设备离线的充分证据。",
    "sources": [
      "a2"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X16",
    "name": "内存不足导致进程被终止",
    "domain": "软件资源",
    "resources": [
      "os",
      "dram"
    ],
    "kind": "补充案例",
    "mechanism": "进程或控制组的内存需求超过限制，操作系统可能终止进程来回收资源。",
    "evidence": [
      "内核/容器事件",
      "实际内存与限制",
      "进程退出原因"
    ],
    "caution": "主机内存不足与NPU设备内存不足是不同故障域。",
    "sources": [
      "write"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X17",
    "name": "NPU设备内存分配失败",
    "domain": "容量状态",
    "resources": [
      "hbm",
      "npu"
    ],
    "kind": "补充案例",
    "mechanism": "模型、激活或缓冲申请超过可用设备内存，或分配受到碎片与资源限制影响。",
    "evidence": [
      "申请大小和空闲容量",
      "对象生命周期",
      "占用进程和分配器日志"
    ],
    "caution": "这是容量/分配问题，不等同于HBM ECC硬件错误。",
    "sources": [
      "ecc"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X18",
    "name": "通信队列或完成队列资源耗尽",
    "domain": "通信资源",
    "resources": [
      "cq",
      "nic"
    ],
    "kind": "补充案例",
    "mechanism": "队列资源达到容量或完成项未及时消费，操作无法入队或完成队列发生溢出。",
    "evidence": [
      "队列深度与消费速率",
      "资源创建失败码",
      "异步完成队列事件"
    ],
    "caution": "CQE错误并不都来自网络丢包；也可能来自本地资源管理。",
    "sources": [
      "rdma"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X19",
    "name": "远端内存访问权限错误",
    "domain": "协议/资源",
    "resources": [
      "cq",
      "nic"
    ],
    "kind": "补充案例",
    "mechanism": "远端内存区域授权或访问键不匹配，使通信设备拒绝读写。",
    "evidence": [
      "完成状态与访问权限",
      "内存区域生命周期",
      "端点与连接一致性"
    ],
    "caution": "仅说明防御诊断；通信失败不必然来自链路。",
    "sources": [
      "rdma"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X20",
    "name": "NVLink链路异常（NVIDIA对照）",
    "domain": "厂商对照",
    "resources": [
      "hccs"
    ],
    "kind": "补充案例",
    "mechanism": "NVIDIA紧耦合互联路径发生链路或协议错误，影响GPU间通信。",
    "evidence": [
      "NVIDIA原始Xid/链路事件",
      "GPU与交换结构状态",
      "版本和拓扑"
    ],
    "caution": "用于对照故障域，不把NVLink故障码翻译成HCCS错误码。",
    "sources": [
      "xid",
      "nv72"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X21",
    "name": "GPU Xid事件（NVIDIA对照）",
    "domain": "厂商对照",
    "resources": [
      "npu"
    ],
    "kind": "补充案例",
    "mechanism": "NVIDIA驱动的Xid消息汇总不同种类的GPU异常；来源可能是应用、软件或硬件。",
    "evidence": [
      "原始Xid编号和上下文",
      "驱动版本",
      "应用与硬件日志"
    ],
    "caution": "Xid不是一种固定硬件故障，也不与昇腾健康等级一一对应。",
    "sources": [
      "xid"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  },
  {
    "id": "X22",
    "name": "设备驱动或固件版本不兼容",
    "domain": "版本状态",
    "resources": [
      "os",
      "npu",
      "busdevice"
    ],
    "kind": "补充案例",
    "mechanism": "设备、驱动、固件与用户态软件不在支持组合中，可能导致初始化失败、功能缺失或异常。",
    "evidence": [
      "实际版本清单",
      "兼容性矩阵",
      "首次变更时间"
    ],
    "caution": "是跨层关联，不推定为NPU物理损坏。",
    "sources": [
      "a2",
      "ub"
    ],
    "origin": "补充案例",
    "originalCategory": "未提供",
    "chain": []
  }
];
