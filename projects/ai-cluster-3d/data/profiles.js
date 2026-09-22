// Canonical, editable data. No build step required.
const PROFILES = {
  "A2": {
    "title": "Atlas 800T A2",
    "short": "A2 · 服务器集群",
    "racks": 4,
    "busracks": 0,
    "confirmed": true,
    "notes": "采用A2服务器＋集群网络的公开产品边界。机柜数量为示意，不把A2全部称为灵衢超节点。",
    "specs": [
      [
        "产品层次",
        "服务器"
      ],
      [
        "机内/机间",
        "按具体型号与组网说明"
      ],
      [
        "机柜数量",
        "示意，不是官方定额"
      ]
    ],
    "sources": [
      "a2",
      "hccs"
    ]
  },
  "A3": {
    "title": "Atlas 900 A3 SuperPoD",
    "short": "A3 · 384 NPU",
    "racks": 12,
    "busracks": 4,
    "confirmed": true,
    "notes": "整域柜数采用官方最大配置；柜内抽屉、封装内部与线缆走向为解释性示意，不替代物料清单。",
    "specs": [
      [
        "规模上限",
        "384 NPU"
      ],
      [
        "柜级结构",
        "12计算柜＋4总线设备柜"
      ],
      [
        "散热",
        "计算柜液冷／总线柜风冷"
      ],
      [
        "D2D双向带宽",
        "784 GB/s（产品页口径）"
      ]
    ],
    "sources": [
      "a3"
    ]
  },
  "A5": {
    "title": "A5 · 型号映射待确认",
    "short": "A5 · 标识待核实",
    "racks": 4,
    "busracks": 2,
    "confirmed": false,
    "notes": "保留用户提出的A5入口；尚无本次已核实的一一对应公开产品说明。只展示通用总线结构，不把A3或Atlas950参数直接套入。可切到Atlas950查看独立公开实例。",
    "specs": [
      [
        "产品型号",
        "待确认"
      ],
      [
        "机柜/芯片数量",
        "不推定"
      ],
      [
        "视图",
        "通用超节点示意"
      ]
    ],
    "sources": [
      "ub",
      "a950"
    ]
  },
  "950": {
    "title": "Atlas 950 SuperPoD",
    "short": "Atlas 950 · 公开实例",
    "racks": 16,
    "busracks": 4,
    "confirmed": true,
    "notes": "根据2026-09-22访问的当前公开产品页，最大1024颗950DT、16＋4柜。与早期路线图数字区分，不作为A5别名。",
    "specs": [
      [
        "规模上限",
        "1024 × 昇腾950DT"
      ],
      [
        "柜级结构",
        "16计算柜＋4灵衢互联柜"
      ],
      [
        "设备内存",
        "每颗96 GB（页面口径）"
      ],
      [
        "散热",
        "计算柜与互联柜均液冷"
      ]
    ],
    "sources": [
      "a950"
    ]
  },
  "NV": {
    "title": "NVIDIA GB200 NVL72",
    "short": "NVIDIA · GB200 NVL72",
    "racks": 1,
    "busracks": 0,
    "confirmed": true,
    "notes": "固定选择GB200 NVL72作为架构对照，不宣称是NVIDIA最新产品。展示72 GPU的机架级互联域，内部槽位仅为示意。",
    "specs": [
      [
        "计算资源",
        "72 GPU＋36 Grace CPU"
      ],
      [
        "紧耦合域",
        "NVLink"
      ],
      [
        "形态",
        "液冷机架"
      ],
      [
        "跨域网络",
        "Ethernet或InfiniBand等方案"
      ]
    ],
    "sources": [
      "nv72"
    ]
  }
};
