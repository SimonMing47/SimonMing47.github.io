/* Deterministic, interactive diagrams. Coordinates express relationships, not CAD. */
const AtlasTopology = (() => {
 const titles={system:'全局资源与平面',pod:'代际柜级组网',host:'服务器与内存域',matrix:'计算与本地存储路径',ethernet:'Leaf–Spine组网',switch:'交换机控制与数据面',power:'供电路径',cooling:'散热回路',optical:'双向物理链路',queue:'提交、传输与完成',storage:'存储与文件路径',bus:'域内与域间互联'};
 const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function make(kind,profile){
  const d={kind,title:titles[kind],nodes:[],edges:[],notes:[],sources:[],width:1000,height:620,heading:''};
  const node=(id,res,x,y,title,sub='',role='data',w=200,h=76)=>{d.nodes.push({id,res,x,y,w,h,title,sub,role});return id;};
  const line=(from,to,type='data',points=null,arrow=true)=>d.edges.push({from,to,type,points,arrow});
  const text=(x,y,value)=>d.notes.push({x,y,text:value});
  if(kind==='system'){
   d.heading='并行支撑关系：电、热、管理和数据不是同一条流水线';d.sources=['a2public','a3','nvnetwork','ub'];
   node('power','power',30,105,'供配电','UPS / PDU / PSU','power');node('cooling','cooling',30,375,'散热设施','空气 / 液路 / 换热','cool');
   node('compute','superpod',375,265,profile==='A2'?'服务器集群':'计算互联域','机柜 → 服务器 → 加速器','data',250,90);
   node('mgmt','bmc',750,80,'带外管理网','BMC / 管理接口','control');node('net','ethernet',750,265,'集群计算网络','RoCE / 指定网络方案');node('storage','storage',750,450,'共享存储','数据集 / 权重 / 状态');
   line('power','compute','power',[[230,143],[290,143],[290,292],[375,292]]);line('compute','cooling','cool',[[375,330],[285,330],[285,413],[230,413]]);
   line('mgmt','compute','control',[[750,118],[690,118],[690,275],[625,275]]);line('compute','net','data',[[625,309],[750,309]],false);line('storage','compute','data',[[750,488],[690,488],[690,341],[625,341]],false);
   text(345,200,'电力送入、热量送出，控制与业务分别通信');text(55,570,'箭头区分能量与信息；线条未给出实际端口号。');
  }else if(kind==='pod'){
   d.sources=PROFILES[profile].sources;d.heading=PROFILES[profile].title;
   if(profile==='A5'){
    node('id','superpod',70,90,'A5代际标识','未核实公开型号','unknown',350,90);
    node('model','superpod',580,90,'产品型号','不填入猜测的型号','unknown',350,90);
    node('cab','rack',70,270,'机柜与节点数量','未确认，不借用A3柜数','unknown',350,90);
    node('fabric','hccs',580,270,'互联协议与拓扑','未确认，不复用950布线','unknown',350,90);
    line('id','model','control',[[420,135],[580,135]]);line('cab','fabric','control',[[420,315],[580,315]]);
    text(70,470,'四个框是资料维度，不是四台设备。');text(70,510,'Atlas950保留独立入口；其公开规格不作为A5的默认值。');
   }else if(profile==='A2'){
    node('sp','ethernet',375,80,'外部RoCE网络','Leaf–Spine关系示意','network',250,85);
    for(let i=0;i<4;i++){let x=35+i*243;node('c'+i,'rack',x,310,'服务器组 '+(i+1),'柜数为示意，非产品定额','data',200,90);line('sp','c'+i,'network',[[400+i*66,165],[400+i*66,205+i*20],[x+100,205+i*20],[x+100,310]]);}
    text(50,470,'每台800T A2：4U / 4 CPU / 32个DDR4插槽 / 8×200GE出口');text(50,515,'网络把独立服务器连接起来；本图不虚构独立灵衢互联柜。');
   }else if(profile==='NV'){
    node('s','hccs',360,85,'9个NVLink交换托盘','每托盘2颗NVSwitch','bus',280,90);
    for(let i=0;i<3;i++){let x=70+i*320;node('t'+i,'server',x,310,`计算托盘 ${i*6+1}–${i*6+6}`,'每托盘2 CPU + 4 GPU','data',220,90);line('s','t'+i,'bus',[[420+i*75,175],[420+i*75,225+i*18],[x+110,225+i*18],[x+110,310]]);}
    text(65,472,'共18个计算托盘 × 4 GPU = 72 GPU；同柜还有管理与供电部件。');text(65,515,'连线表示NVLink域内关联，不是实际端口接线；域外网络另见组网图。');
   }else{
    const count=profile==='A3'?12:16,cols=count/2;d.heading+=` · ${count}计算柜 + 4互联柜`;
    node('domain','busdevice',280,110,profile==='A3'?'4个总线设备柜':'4个灵衢互联柜',profile==='A3'?'风冷 / 域内互联':'液冷 / 域内互联','bus',440,86);
    for(let i=0;i<count;i++){const x=20+(i%cols)*(960/cols),y=315+Math.floor(i/cols)*123;node('c'+i,'rack',x,y,'C'+String(i+1).padStart(2,'0'),'计算柜 / 液冷','data',960/cols-12,82);}
    // A single domain spine is a conceptual aggregate, not a claim of direct full mesh.
    line('domain','c0','bus',[[500,196],[500,250],[20+ (960/cols-12)/2,250],[20+(960/cols-12)/2,315]],false);
    for(let i=1;i<cols;i++){const x=20+i*960/cols+(960/cols-12)/2;line('domain','c'+i,'bus',[[500,250],[x,250],[x,315]],false);}
    for(let i=cols;i<count;i++){const x=20+(i%cols)*960/cols+(960/cols-12)/2;line('domain','c'+i,'bus',[[720,153],[985,153],[985,552],[x,552],[x,520]],false);}
    text(32,602,'所有计算柜分别关联域内互联；聚合线不代表交换机端口一一对应。');
   }
  }else if(kind==='host'){
   d.heading=profile==='A2'?'A2主机资源：型号数量与连接关系分别表达':'主机内存与设备内存是不同资源域';d.sources=[profile==='A2'?'a2public':profile==='NV'?'nvrack':profile==='950'?'a950':profile==='A5'?'catalog':'a3','aer','hccs'];
   node('dram','dram',40,70,profile==='A2'?'32个DDR4插槽':profile==='NV'?'Grace LPDDR5X':'主机DRAM','CPU侧数据与进程','memory',260);
   node('cpu','cpu',390,70,profile==='A2'?'4颗鲲鹏920':profile==='NV'?'2颗Grace / 托盘':'主机CPU','通用计算 / 内存控制','data',250);
   node('bmc','bmc',750,70,'BMC管理控制器','独立管理通道','control',210);
   node('pcie','pcie',390,270,'I/O互联','PCIe等：依产品拓扑','bus',250);
   node('disk','nvme',40,445,'本地存储','NVMe / 指定接口','memory',245);
   node('nic','nic',390,445,'网络端点','数据网络，不是BMC','network',250);
   node('acc','npu',750,270,profile==='NV'?'4个GPU / 托盘':'NPU设备域','计算 + 设备内存','data',210);
   node('hbm','hbm',750,445,'HBM','设备侧主存','memory',210);
   line('cpu','dram','data',[[390,108],[300,108]],false);line('cpu','pcie','control',[[515,146],[515,270]]);line('pcie','acc','bus',[[640,308],[750,308]],false);line('acc','hbm','data',[[855,346],[855,445]],false);line('pcie','nic','network',[[515,346],[515,445]],false);line('pcie','disk','data',[[390,308],[320,308],[320,483],[285,483]],false);line('bmc','cpu','control',[[750,108],[640,108]],false);
   text(30,580,'I/O连接是职责示意，不声称所有CPU→加速器数据必经同一PCIe交换芯片。');
  }else if(kind==='matrix'){
   const nv=profile==='NV';d.heading=nv?'GPU执行资源：存储层次不与昇腾Buffer一一等价':'矩阵与向量路径：分支工作区，而非一条串行缓存链';d.sources=nv?['cuda','nvrack']:['core200'];
   node('gm','hbm',35,270,'设备主存 / HBM','保存权重与大块数据','memory',200,85);
   node('a','buffers',320,120,nv?'L2 / 本地工作区':'L1 → L0A / L0B',nv?'缓存与软件管理的存储':'矩阵左右输入分块','memory',280);
   node('cube','core',735,120,nv?'SM / Tensor Core':'Cube → L0C',nv?'GPU并行执行资源':'矩阵计算 / 累加结果','data',230);
   node('ub','buffers',320,400,nv?'Shared memory / 寄存器':'Unified Buffer',nv?'线程协作及局部数据':'向量本地工作区','memory',280);
   node('vector','core',735,400,nv?'SM执行与同步':'Vector / 向量单元',nv?'依赖与调度不能省略':'向量计算 / 格式转换','data',230);
   line('gm','a','data',[[235,290],[275,290],[275,158],[320,158]]);line('a','cube','data',[[600,158],[735,158]]);line('cube','gm','data',[[850,120],[850,70],[135,70],[135,270]]);
   line('gm','ub','data',[[235,332],[275,332],[275,438],[320,438]]);line('ub','vector','data',[[600,438],[735,438]],false);line('ub','gm','data',[[465,476],[465,535],[135,535],[135,355]]);
   text(325,260,nv?'功能路径示意，不能据此推断Blackwell片内布局':'图解依据注明版本的公开架构，不推定A2/A3/A5核内布图');text(325,306,'搬运完成 → 输入可用 → 计算 → 结果完成 → 后续使用');text(70,590,'线条表示数据依赖；回写和跨工作区路径依具体架构与指令支持。');
  }else if(kind==='ethernet'){
   d.heading='叶脊网络：每个Leaf分别连接每个Spine';d.sources=['rdma','pfc','nvnetwork'];
   node('s0','switch',175,80,'Spine 1','上层交换机','network',210);node('s1','switch',615,80,'Spine 2','上层交换机','network',210);
   for(let i=0;i<3;i++){let x=65+i*330;node('l'+i,'switch',x,325,'Leaf '+(i+1),'端点接入交换机','network',205);node('e'+i,'server',x,495,'服务器 / 计算域','端点与网络地址','data',205);line('l'+i,'e'+i,'network',[[x+102,401],[x+102,495]],false);
    for(let j=0;j<2;j++){let sx=(j?615:175)+45+i*57;line('s'+j,'l'+i,'network',[[sx,156],[sx,210+j*56+i*12],[x+65+j*74,210+j*56+i*12],[x+65+j*74,325]],false);}}
   text(70,30,'实线每一条都表示独立逻辑连接；无圆点的交叉处不相连。');text(65,610,'多路径不代表单流自动叠加全部带宽；数量仅是拓扑原理示例。');
  }else if(kind==='switch'){
   d.heading='普通报文走数据面；主控通过独立控制通路下发规则';d.sources=['rdma','pfc'];
   node('ctrl','control',335,80,'主控板','配置 / 协议 / 管理','control',330);
   node('in','linecard',45,310,'入口接口板','端口 / 查表 / 缓冲','network',235);
   node('fabric','fabric',390,310,'交换网板','跨板交换资源','bus',225);
   node('out','linecard',725,310,'出口接口板','队列 / 出口PHY','network',235);
   line('in','fabric','network',[[280,348],[390,348]]);line('fabric','out','network',[[615,348],[725,348]]);
   for(const [id,x]of [['in',160],['fabric',500],['out',840]])line('ctrl',id,'control',[[500,156],[500,225],[x,225],[x,310]]);
   text(55,470,'盒式交换机可将这些功能集成在同一个机箱中，未必有独立可插拔板卡。');text(55,520,'主控高负载与数据面饱和不是同一个指标。');
  }else if(kind==='power'){
   d.heading='电能从设施输入，经分配与转换到达芯片';d.sources=['power','a2public','nvrack'];
   const ids=['ups','pdu','psu','vrm','npu'],names=['UPS','机柜配电','设备电源','板级稳压','芯片电源域'],subs=['后备与转换','支路 / 保护','供电转换','低压 / 大电流','CPU / 加速器'];
   ids.forEach((id,i)=>{node(id,id,25+i*195,250,names[i],subs[i],'power',170,96);if(i)line(ids[i-1],id,'power',[[25+(i-1)*195+170,298],[25+i*195,298]]);});
   text(35,135,'这是职责路径，不表示每种部署都必须使用相同输入电制与设备级数。');text(35,445,'遥测信号走管理通道；铜母排不是以太网线，也不承载RoCE。');text(35,490,'冗余需要同时核对路径独立性与剩余容量。');
  }else if(kind==='cooling'){
   const air=profile==='A2';d.heading=air?'A2风冷：空气经过散热器后带走热量':'液冷闭环：供液、冷板与回液';d.sources=['cool',profile==='A2'?'a2public':profile==='NV'?'nvrack':profile==='950'?'a950':'a3'];
   if(air){node('c','npu',385,85,'发热器件','CPU / 加速器','data',230);node('sink','coldplate',385,270,'散热器','本视图指空气散热器','cool',230);node('fan','fan',35,270,'风扇与冷空气','推动有效气流','cool',230);node('hot','cooling',735,270,'热空气与设施冷源','热量离开设备','heat',230);line('c','sink','heat',[[500,161],[500,270]]);line('fan','sink','cool',[[265,308],[385,308]]);line('sink','hot','heat',[[615,308],[735,308]]);}
   else{node('cdu','cdu',60,245,'CDU / 换热边界','连接设施冷源','cool',240,110);node('cold','coldplate',670,245,'芯片冷板','液体吸热后返回','cool',265,110);node('chip','npu',670,75,'处理器封装','热经导热界面传递','data',265);line('chip','cold','heat',[[800,151],[800,245]]);line('cdu','cold','cool',[[300,272],[450,272],[450,225],[640,225],[640,272],[670,272]]);line('cold','cdu','heat',[[670,330],[530,330],[530,430],[350,430],[350,330],[300,330]]);text(330,195,'供液 →');text(390,470,'← 回液');}
   text(60,545,'蓝线表示冷却介质，橙线表示带热回路或热量；不承载模型数据。');text(60,585,profile==='A3'?'A3仅计算柜采用液冷；总线设备柜公开规格为风冷。':'具体冷却液、压力、接口与温度按型号设计。');
  }else if(kind==='optical'){
   d.heading='双向物理链路：发送端必须接到对端接收端';d.sources=['eth','rdma'];
   node('a','npu_port',45,170,'端点A','协议控制器 / PHY','network',235,95);node('b','ethport',720,170,'端点B','协议控制器 / PHY','network',235,95);
   node('at','optic',60,345,'TX 发射','电 → 光','network',205);node('ar','optic',60,470,'RX 接收','光 → 电','network',205);node('br','optic',735,345,'RX 接收','光 → 电','network',205);node('bt','optic',735,470,'TX 发射','电 → 光','network',205);
   line('at','br','cool',[[265,383],[735,383]]);line('bt','ar','heat',[[735,508],[265,508]]);line('a','at','control',[[160,265],[160,345]]);line('b','br','control',[[830,265],[830,345]]);
   text(353,350,'光纤方向一：A发 → B收');text(353,550,'光纤方向二：B发 → A收');text(55,105,'双纤是一个示例；单纤双向、并行光学、DAC与AOC须分别匹配规格。');
  }else if(kind==='queue'){
   d.heading='逻辑队列与数据传输：CQE不是一个物理器件';d.sources=['rdma','ub'];
   node('app','os',40,85,'软件 / 驱动','创建并授权资源','control',245);node('sq','cq',390,85,'工作队列','提交操作请求','control',230);node('ep','nic',390,285,'通信端点硬件','执行数据传输','network',230);node('remote','npu',735,285,'远端资源','受授权的内存区域','memory',230);node('cq','cq',40,455,'CQ / CQE','读取完成状态','control',245);
   line('app','sq','control',[[285,123],[390,123]]);line('sq','ep','control',[[505,161],[505,285]]);line('ep','remote','data',[[620,323],[735,323]],false);line('ep','cq','control',[[390,323],[340,323],[340,493],[285,493]]);line('cq','app','control',[[80,455],[80,161]]);
   text(390,485,'提交完成 ≠ 远端应用已经消费');text(390,525,'错误码要结合具体协议、操作类型与端点。');
  }else if(kind==='storage'){
   d.heading='从文件语义到物理介质，再到计算设备';d.sources=['write','nvme','rdma'];
   node('app','os',50,90,'应用进程','文件路径 / 权限','control',240);node('fs','filesystem',390,90,'文件系统','目录 / 元数据 / 配额','control',250);node('disk','nvme',50,350,'本地NVMe','本机块设备','memory',240);node('storage','storage',390,350,'共享存储','文件 / 块 / 对象','memory',250);node('ram','dram',745,90,'主机DRAM','数据准备与缓存','memory',210);node('hbm','hbm',745,350,'设备内存','加速计算输入','memory',210);
   line('app','fs','control',[[290,128],[390,128]]);line('fs','disk','control',[[440,166],[440,238],[170,238],[170,350]]);line('fs','storage','control',[[580,166],[580,350]]);line('storage','ram','data',[[640,388],[692,388],[692,128],[745,128]]);line('ram','hbm','data',[[850,166],[850,350]]);text(75,520,'本地盘并非天然共享；写入成功与持久化完成需要按具体接口语义区分。');
  }else if(kind==='bus'){
   const nv=profile==='NV';d.heading='把紧耦合域与跨域网络分开';d.sources=nv?['nvrack','nvnetwork']:profile==='A2'?['a2public','hccs']:profile==='A5'?['catalog','ub']:['a3','ub','hccs'];
   node('a','npu',50,255,nv?'GPU组A':'NPU组A','设备端点','data',210);node('b',profile==='A2'?'hccs':'busdevice',385,255,nv?'NVLink交换':profile==='A2'?'设备紧耦合互联':'域内总线互联',profile==='A2'?'HCCS概念 / 不推定布线':'Scale-up范围','bus',230);node('c','npu',745,255,nv?'GPU组B':'NPU组B','同一互联域','data',210);line('a','b','bus',[[260,293],[385,293]],false);line('b','c','bus',[[615,293],[745,293]],false);
   node('out','ethernet',385,465,nv?'InfiniBand等计算网':'以太网 / RoCE等','连接另一个计算域','network',230);line('a','out','network',[[155,331],[155,505],[385,505]],false);
   text(52,125,'并非所有端点之间都直接连线；交换结构可以连接多个设备。');text(52,170,'画出协议域，不推断未公开的lane分配或端口一一对应。');
  }
  if(profile==='A5'&&kind!=='pod'){d.heading='通用原理，不代表A5产品拓扑 · '+d.heading;d.sources=[...new Set([...d.sources,'catalog'])];}
  return d;
 }
 function auto(id){if(['power','ups','pdu','psu','vrm'].includes(id))return 'power';if(['cooling','cdu','coldplate','fan'].includes(id))return 'cooling';if(['copper','fiber','optic','ethport','npu_port'].includes(id))return 'optical';if(['core','buffers','dma','npu','hbm','board'].includes(id))return 'matrix';if(['server','cpu','cache','dram','nic','pcie','bmc'].includes(id))return 'host';if(['queue','cq'].includes(id))return 'queue';if(['switch','control','linecard','fabric','mac'].includes(id))return 'switch';if(['storage','filesystem','nvme','os'].includes(id))return 'storage';if(['superpod','rack'].includes(id))return 'pod';if(['hccs','busdevice','buschip','busport'].includes(id))return 'bus';if(['ethernet','probe'].includes(id))return 'ethernet';return 'system';}
 function wrap(text,width,size=19){const max=Math.max(5,Math.floor((width-24)/size));let out=[],line='',units=0;for(const c of text){let n=/[\x00-\x7F]/.test(c)?.55:1;if(units+n>max){out.push(line);line='';units=0;}line+=c;units+=n;}if(line)out.push(line);return out;}
 function svg(d,active){const by=Object.fromEntries(d.nodes.map(n=>[n.id,n]));const parts=[];parts.push(`<svg class="topology-svg" viewBox="0 0 ${d.width} ${d.height}" role="img" aria-label="${E(d.title+'：'+d.heading)}"><defs><marker id="arrow-${d.kind}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0 L8 4 L0 8 Z" fill="context-stroke"/></marker></defs>`);
  for(const e of d.edges){const a=by[e.from],b=by[e.to];if(!a||!b)continue;const pts=e.points||[[a.x+a.w/2,a.y+a.h],[b.x+b.w/2,b.y]];parts.push(`<polyline class="wire ${e.type}" data-from="${e.from}" data-to="${e.to}" points="${pts.map(p=>p.join(',')).join(' ')}" ${e.arrow?`marker-end="url(#arrow-${d.kind})"`:''}/>`);}
  for(const n of d.nodes){const ls=wrap(n.title,n.w,20),ys=n.y+29-(ls.length>1?7:0);parts.push(`<g class="diagram-node ${n.role} ${n.res===active?'is-current':''}" data-go="${n.res}" data-node="${n.id}" tabindex="0" role="button" aria-label="查看${E(n.title+'，'+n.sub)}"><title>${E(n.title+' — '+n.sub)}</title><rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8"/><text class="diagram-title" x="${n.x+n.w/2}" y="${ys}" text-anchor="middle">${ls.map((t,i)=>`<tspan x="${n.x+n.w/2}" dy="${i?23:0}">${E(t)}</tspan>`).join('')}</text><text class="diagram-sub" x="${n.x+n.w/2}" y="${n.y+n.h-13}" text-anchor="middle">${E(n.sub)}</text></g>`);}
  for(const n of d.notes)parts.push(`<text class="diagram-note" x="${n.x}" y="${n.y}">${E(n.text)}</text>`);parts.push('</svg>');return parts.join('');}
 return {titles,make,svg,auto,wrap};
})();
