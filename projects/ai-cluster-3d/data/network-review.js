/* Product-specific networking: primary documentation pinned to one upstream commit.
 * Geometry shows declared relationships; it is not a manufacturing cable map. */
const NETWORK_UPSTREAM='694426b825457d9014ab2ff0d0dbf484cf9dcc29';
const NETWORK_GITHUB='https://github.com/Ascend/mind-cluster/blob/'+NETWORK_UPSTREAM+'/';
for(const [id,title,path,scope] of [
 ['net_affinity','MindCluster｜A3、850、950处理器与节点互联','docs/zh/scheduling/04_usage/03_basic_scheduling/01_affinity_scheduling/03_ascend_ai_processor_based_affinity.md','A3的SIO/HiAM/HCCS-L1/L2及逻辑域间RoCE；850的5808组网；950的X/Y/Z多维互联。正文个别“超节点包含8颗”用词结合后文8 OS/64颗解读为节点层，不能当成整个产品上限。'],
 ['net_overview','MindCluster｜不同产品的亲和性与组网范围','docs/zh/scheduling/04_usage/03_basic_scheduling/01_affinity_scheduling/02_affinity_scheduling_description.md','交叉确认产品组网类别与优先调度范围。只引用互联与调度段落，不把文中HCCS称为HCCL硬件形态的简化表述当作定义。'],
 ['net_a5types','MindCluster｜A5产品标识常量','component/ascend-common/api/const_v2.go','A5PodType=950-SuperPod-Atlas-8；同时存在850系列A5标识，不能说所有A5都只有一种硬件形态。'],
 ['net_a5rank','MindCluster｜A5 Rank层级与端口生成','component/ascend-device-plugin/pkg/server/npu_base_v2.go','getRankLevelInfoKeyArr/getID/getNetTypeForLevel按Pod、服务器和卡类型分支；层级标签不是必须串行经过的四台交换机。'],
 ['net_topofile','MindCluster｜实际拓扑文件选择','component/ascend-device-plugin/pkg/common/constants_v2.go','950/850等拓扑文件路径由产品类型选择；本网站未取得现场JSON，不编造端口到端口接线。']
])SOURCES[id]={title,url:NETWORK_GITHUB+path,scope,version:'上游提交 '+NETWORK_UPSTREAM.slice(0,12),checked:'2026-09-23',verification:'primary-body',statusLabel:'官方文档/代码 · 已核读相关段落'};
SOURCES.net_950demo={title:'华为｜2026年7月Atlas950真机展示',url:'https://www.huawei.com/cn/news/2026/7/atlas-950-superpod',scope:'公开1024卡真机实例；与早期8192卡规划规格分开，不推断路线图已经全部交付。',version:'2026-07-17',checked:'2026-09-23',verification:'primary-body',statusLabel:'官方实例 · 按日期限定'};
SOURCES.net_roadmap={title:'华为｜2025年9月SuperPoD路线图',url:'https://www.huawei.com/en/news/2025/9/hc-xu-keynote-speech',scope:'8192卡、128计算柜+32通信柜是该次公布口径，不与当前1024卡产品实例拼接。UBoE解释为UnifiedBus over Ethernet。',version:'2025-09',checked:'2026-09-23',verification:'primary-body',statusLabel:'历史官方规划 · 非本图交付配置'};
const NETWORK_REVIEW={
 A3:{title:'A3 · HiAM与两级HCCS',diagram:'net-a3',sources:['a3','net_affinity','net_overview'],paragraphs:[
 '每个计算节点在这份调度文档中包含8个HiAM模组；每个模组内的2个处理单元通过SIO配对，模组之间使用HCCS-L1，计算节点之间使用HCCS-L2。SIO、HiAM在这里按文档中的连接职责解释，不猜写未给出的英文全称。',
 '同一逻辑超节点内使用HCCS，不同逻辑超节点之间按该文档使用RoCE。例如任务共64个调度单元、sp-block=32时分成两个逻辑域；这是软件分组，不等同于物理柜位。HCCS-L1/L2也不是计算核的L1/L0缓冲。',
 '产品页的384 NPU规模、调度文档的每节点16个处理单元与8个HiAM，是不同上下文的计数。未拿到逐设备映射时，不用384除以16推导主机数量，更不把一个逻辑Device直接当一块板卡。'
 ],analogy:'像先把两名工人组成紧密搭档，再把搭档编入车间，车间通过专用通道协作；不同工作分区之间另走运输网络。搭档数、车间数、楼房数不能混着数。'},
 A5:{title:'A5 · 以Atlas950公开实例展开',diagram:'net-axes',sources:['net_a5types','net_affinity','net_a5rank','a950','net_950demo'],paragraphs:[
 '官方代码把一种A5超节点标识定义为950-SuperPod-Atlas-8，另外也定义850系列形态。这里选择950作为A5的具体产品实例，不再宣称A5完全没有公开型号证据，也不说A5一律等于950。',
 '950互联按局部性分层：一个节点/OS域内8个处理器构成X轴全连接；机架内8个OS域合计64个处理器，通过LRS建立Y轴互联；机架之间通过LRS的UB出口形成Z轴。本图取当前产品页16个计算柜、1024处理器实例。LRS按官方名称表示跨板与跨柜互联功能，不臆造其英文展开或内部芯片数量。',
 'A5 Rank代码区分Pod场景的UB、UB、UBG、ROCE与服务器超节点场景的UB、UB、UBOE、ROCE。第0层拓扑由文件描述，后续层级标为CLOS；这些是通信范围与选择，不能据此画成每条数据必经四级串联。实际物理端口映射由产品拓扑文件确定。'
 ],analogy:'像座位有排、教室和楼栋三个坐标：先在一排协作，再跨教室、跨楼栋。多维全互联不意味着每张座位都用一根独立线直接连到所有其他座位。'},
 '950':{title:'Atlas950 · 1024处理器产品实例',diagram:'net-axes',sources:['a950','net_affinity','net_a5types','net_950demo','net_roadmap'],paragraphs:[
 '本入口固定当前公开产品页的1024处理器、16计算柜+4灵衢互联柜，全液冷；不是把早期8192卡、128+32柜的规划缩写成相同部署。两份资料都保留日期和适用范围。',
 '每节点8处理器、每计算机架8个OS域合计64处理器；16个计算机架形成该1024处理器实例。X、Y、Z分别表示节点内、机架内跨节点和跨机架的互联范围，而不是操作系统线程数、网卡数或布线方向。',
 '官方亲和性资料说明该处理器采用2个计算DIE和2个IO DIE合封；示意图只按这四类裸片构成表示，不增加未经核实的HBM堆叠数、冷板加工结构或每条链路带宽。'
 ],analogy:'建筑平面图说明房间如何分区，设备接线图才决定具体插座连到哪里。本图把已公开的分区关系画清楚，不用分区图冒充线缆施工图。'}
};
Object.assign(PROFILES.A5,{title:'A5 · Atlas 950 SuperPoD实例',short:'A5 · 950实例 / X-Y-Z',racks:16,busracks:4,confirmed:true,notes:NETWORK_REVIEW.A5.paragraphs.join(' '),sources:NETWORK_REVIEW.A5.sources,specs:[['型号关联','代码明确950-SuperPod-Atlas-8'],['本图配置','1024处理器；16计算柜+4互联柜'],['节点 / X轴','8处理器 / 一个OS域'],['机架 / Y轴','8个OS域 / 64处理器'],['跨架 / Z轴','通过LRS的UB出口扩展'],['另有A5形态','850系列；见独立5808组网图']]});
for(const key of ['A3','A5','950']){const v=NETWORK_REVIEW[key];Object.assign(PROFILE_EXPLAIN[key],{kind:v.title,scope:'产品实例 + 固定提交的拓扑证据',story:v.paragraphs[0],difference:v.paragraphs[1],facts:v.sources});}
PROFILES.A3.notes=NETWORK_REVIEW.A3.paragraphs.join(' ');PROFILES.A3.sources=NETWORK_REVIEW.A3.sources;
PROFILES['950'].notes=NETWORK_REVIEW['950'].paragraphs.join(' ');PROFILES['950'].sources=NETWORK_REVIEW['950'].sources;
Object.assign(GUIDE_TERMS,{
 HiAM:'文档中以SIO连接两个处理单元组成的模组；A3计算节点含8个。来源未给出英文全称，不猜写。',SIO:'本资料中A3模组内处理单元的配对互联名称；不同于模组间HCCS。',
 LRS:'950文档中承担Y轴跨板与Z轴出口互联的功能名称；不从缩写推定封装或芯片个数。',
 UBG:'A5 Pod场景Rank第2层使用的网络类型标签；不是另一块软件网卡。完整英文展开未由所用代码定义。',
 UBoE:'UnifiedBus over Ethernet，基于以太网承载UnifiedBus；不与RoCE视为同一协议。',
 EID:'端点标识；A5代码对UB/UBG采用EID地址类型，不能直接当作IPv4地址。',
 'FullMesh':'全连接互联关系；在多维拓扑中须明确是哪一轴内的成员全连接。',
 'sp-block':'此文档中作业的逻辑超节点规模参数；不是机柜数量，也不是物理光口编号。'
});
for(const id of ['superpod','server','hccs','busdevice','busport','npu','board']){const r=RESOURCES.find(v=>v.id===id);r.sources=[...new Set([...r.sources,'net_affinity','net_a5types'])];}
DEEP_GUIDE.superpod=[
 '物理超节点、逻辑超节点和Kubernetes Pod分属不同层次。物理超节点组织设备与互联；逻辑超节点按作业需求分组；Kubernetes Pod是容器调度对象，不是机柜。',
 'A3需区分SIO配对、HiAM、HCCS-L1、HCCS-L2及逻辑域间RoCE。所选A5/950实例则需区分X轴8处理器、Y轴64处理器与Z轴跨架连接，不能用同一张星形图替代。',
 '柜级展示引用当前产品配置；组网展示引用固定版本的亲和性文档和代码。产品规模与逻辑Device数量不混算，实际施工端口表不由示意图反推。'];
for(const id of ['superpod','hccs']){const r=RESOURCES.find(v=>v.id===id);r.paras=DEEP_GUIDE.superpod;r.lead='先确认具体产品与通信范围，再理解设备之间如何互联。A3的HiAM/HCCS层级与所选A5/950的多维拓扑分别展示，不把代际名称当成统一组网。';}
NETWORK_REVIEW['A5-850']={title:'A5 · Atlas850/850E交换式组网',diagram:'net-850',sources:['net_a5types','net_affinity','net_a5rank'],paragraphs:[
 'A5代码同时包含850系列服务器、堆叠和超节点标识。850/850E与950应分成不同产品实例，不能只把16个计算柜改成另一种颜色。',
 '亲和性文档说明850/850E单服务器内8个处理器组成HCCS mesh；服务器之间经5808交换机连接。单台5808下最多16个服务器、128个处理器；两层5808组网可支持文档所称1k规模。本图固定展示单层128处理器上限的逻辑连接。',
 '服务器超节点场景的Rank层级为UB、UB、UBOE、ROCE，非超节点服务器省略第1层；与950 Pod场景的UBG分支不同。具体启用哪条路径取决于配置，不把所有网络层都强制串行。机柜数量和电源物料不由服务器数反推。'
],analogy:'950像按排、教室和楼栋组织的多维交通；850实例像多台服务器接入一台交换设备。两者都能扩大协作，但结构和约束不能互换。'};
PROFILES['A5-850']={title:'A5 · Atlas 850/850E组网实例',short:'A5 · 850 / 5808交换',racks:0,busracks:0,confirmed:true,notes:NETWORK_REVIEW['A5-850'].paragraphs.join(' '),sources:NETWORK_REVIEW['A5-850'].sources,specs:[['节点内','8处理器 HCCS mesh'],['单层互联','1台5808下最多16服务器'],['单层规模','最多128处理器'],['更大规模','两层5808，文档说明1k'],['网络类型分支','UB / UBOE / ROCE'],['柜数与实际布线','不从该调度文档推断']]};
PROFILE_EXPLAIN['A5-850']={kind:NETWORK_REVIEW['A5-850'].title,plane:'HCCS + 5808 / UBoE与RoCE分支',scope:'固定官方代码与亲和性文档',facts:NETWORK_REVIEW['A5-850'].sources,story:NETWORK_REVIEW['A5-850'].paragraphs[0],difference:NETWORK_REVIEW['A5-850'].paragraphs[1]};
