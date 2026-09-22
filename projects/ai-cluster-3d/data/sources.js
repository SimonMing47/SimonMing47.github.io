// Canonical, editable data. No build step required.
const SOURCES = {
  "a2": {
    "title": "华为｜Atlas 800T A2 Training Server User Guide",
    "url": "https://support.huawei.com/enterprise/en/doc/EDOC1100349804/d7ebb795/overview",
    "scope": "A2服务器产品边界；用户指南。检索摘要可见，部分章节可能要求登录。",
    "checked": "2026-09-22"
  },
  "a3": {
    "title": "华为｜Atlas 900 A3 SuperPoD 产品规格",
    "url": "https://e.huawei.com/cn/products/computing/ascend/atlas-900-a3-superpod",
    "scope": "384 NPU、12计算柜＋4总线设备柜、供电散热；不是任意A3产品的通用规格。",
    "checked": "2026-09-22"
  },
  "a950": {
    "title": "昇腾｜Atlas 950 SuperPoD 公开产品页",
    "url": "https://www.hiascend.com/hardware/cluster",
    "scope": "截至2026-09-22页面：最大1024颗950DT、16＋4机柜。不能据此自行认定用户所称A5与其一一对应。",
    "checked": "2026-09-22"
  },
  "hccs": {
    "title": "昇腾｜HCCL术语与相关概念（8.2.RC1）",
    "url": "https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/82RC1alpha003/hccl/hcclug/hcclug_000002.html",
    "scope": "HCCS/HCCL、通信域、RDMA术语；不是故障阈值规范。",
    "checked": "2026-09-22"
  },
  "core": {
    "title": "昇腾｜Ascend C AI Core基本架构",
    "url": "https://www.hiascend.com/document/detail/zh/CANNCommunityEdition/800alpha003/devguide/opdevg/tbeaicpudevg/atlasopdev_10_0008.html",
    "scope": "计算/存储/搬运单元的公开抽象；不推定具体芯片内部核数或物理布局。",
    "checked": "2026-09-22"
  },
  "ub": {
    "title": "UnifiedBus｜官方规范入口",
    "url": "https://www.unifiedbus.com/en",
    "scope": "总线架构、固件、编程模型与资源管理；版本专用错误码须查相应规范。",
    "checked": "2026-09-22"
  },
  "aer": {
    "title": "Linux Kernel｜PCIe Advanced Error Reporting",
    "url": "https://docs.kernel.org/PCI/pcieaer-howto.html",
    "scope": "可纠正、不可纠正非致命、不可纠正致命错误分类。",
    "checked": "2026-09-22"
  },
  "pfc": {
    "title": "IEEE｜802.1Qbb Priority-based Flow Control",
    "url": "https://1.ieee802.org/dcb/802-1qbb/",
    "scope": "按优先级的逐跳暂停语义。",
    "checked": "2026-09-22"
  },
  "cfc": {
    "title": "华为｜什么是信用流控CFC",
    "url": "https://info.support.huawei.com/info-finder/encyclopedia/zh/CFC.html",
    "scope": "Credit-based Flow Control：接收端授权信用，发送端按信用发送。",
    "checked": "2026-09-22"
  },
  "cfc_config": {
    "title": "华为｜CloudEngine CFC配置说明",
    "url": "https://support.huawei.cn/enterprise/en/doc/EDOC1100561739/3af1df76/configuring-cfc",
    "scope": "版本V300R025C10下的信用、死锁检测与配置；全文可能要求授权。不能外推到所有设备。",
    "checked": "2026-09-22"
  },
  "errdown": {
    "title": "华为｜CloudEngine error-down告警说明",
    "url": "https://support.huawei.com/enterprise/en/doc/EDOC1100561862/7b3e444f/error-down-4-hwerrordown_active",
    "scope": "error-down有多种触发原因；CFC是部分版本中的一种原因。",
    "checked": "2026-09-22"
  },
  "ecn": {
    "title": "IETF｜RFC 3168：显式拥塞通知",
    "url": "https://datatracker.ietf.org/doc/html/rfc3168",
    "scope": "IP头拥塞标记；不等同于PFC暂停。",
    "checked": "2026-09-22"
  },
  "arp": {
    "title": "IETF｜RFC 826：地址解析协议",
    "url": "https://datatracker.ietf.org/doc/html/rfc826",
    "scope": "IPv4与以太网地址解析基础。",
    "checked": "2026-09-22"
  },
  "nd": {
    "title": "IETF｜RFC 4861：IPv6邻居发现",
    "url": "https://datatracker.ietf.org/doc/html/rfc4861",
    "scope": "邻居解析、可达性及安全边界。",
    "checked": "2026-09-22"
  },
  "rdma": {
    "title": "NVIDIA DOCA｜RDMA-aware Networks Programming Guide",
    "url": "https://networking-docs.nvidia.com/doca/archive/3-5-0/rdma-aware-networks-programming-guide",
    "scope": "MR/QP/CQ/CQE与完成状态。仅作通用RDMA对照，不将NVIDIA状态码套用到灵衢。",
    "checked": "2026-09-22"
  },
  "nv72": {
    "title": "NVIDIA｜GB200 NVL72",
    "url": "https://www.nvidia.com/en-us/data-center/gb200-nvl72/",
    "scope": "72 GPU、36 Grace CPU、液冷机架、NVLink/NVLink-C2C；采用固定产品实例而非最新版排行榜。",
    "checked": "2026-09-22"
  },
  "xid": {
    "title": "NVIDIA｜Xid错误：Introduction",
    "url": "https://docs.nvidia.com/deploy/xid-errors/latest/introduction.html",
    "scope": "Xid是诊断信息，根因可能来自硬件、驱动或应用。",
    "checked": "2026-09-22"
  },
  "ecc": {
    "title": "NVIDIA｜GPU Memory Error Management：Overview",
    "url": "https://docs.nvidia.com/deploy/a100-gpu-mem-error-mgmt/latest/overview.html",
    "scope": "错误隔离、页面下线与行重映射的特定产品机制；不是华为恢复策略。",
    "checked": "2026-09-22"
  },
  "write": {
    "title": "Linux man-pages｜write(2)",
    "url": "https://man7.org/linux/man-pages/man2/write.2.html",
    "scope": "写入错误EIO、ENOSPC、EDQUOT等；成功写入不等同于数据已经持久化。",
    "checked": "2026-09-22"
  },
  "nvme": {
    "title": "NVM Express｜官方规范入口",
    "url": "https://nvmexpress.org/",
    "scope": "NVMe存储命令与设备规范；并非所有SSD采用NVMe。",
    "checked": "2026-09-22"
  },
  "power": {
    "title": "华为｜数据中心能源与关键供电",
    "url": "https://digitalpower.huawei.com/cn",
    "scope": "数据中心供电、制冷与监控体系公开入口。",
    "checked": "2026-09-22"
  },
  "cool": {
    "title": "华为｜FusionCol/NetCol Smart Cooling 告警参考",
    "url": "https://support.huawei.com/enterprise/en/doc/EDOC1100227874",
    "scope": "冷却设备告警类型的公开文档入口；具体维护按型号操作规程。",
    "checked": "2026-09-22"
  }
};
