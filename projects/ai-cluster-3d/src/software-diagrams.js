/* Logical architecture, sequences and swimlanes. No software object is a physical card. */
(() => {
 const oldMake=AtlasTopology.make,oldAuto=AtlasTopology.auto,oldSvg=AtlasTopology.svg,oldModel=createModel;
 createModel=function(r,p){if(!SW_INDEX[r.id])return oldModel(r,p);const m=SW_INDEX[r.id],carrier=RESOURCES.find(x=>x.id===m.carrier[0])||RESOURCES.find(x=>x.id==='server');const s=oldModel(carrier,p);s.caption=`承载硬件：${carrier.title}。${m.title}是软件模块；本3D仅显示它所依赖的硬件，不表示软件具有此物理外观。`;return s;};
 const defs={
 'sw-stack':{title:'AI Infra 全栈职责图',cols:4,ids:['node-software','execution','containers','orchestration','training','serving','operations','ccae'],edges:[[0,1,'data'],[2,3,'control'],[4,1,'data'],[5,1,'data'],[6,7,'control']],note:'软件分类按职责组织，不是所有请求必须逐框串行穿过；点击模块继续深入。'},
 'sw-boot':{title:'节点使能与验证流程',ids:['boot','driver','compat','acl','device-access','device-plugin'],edges:[[0,1,'control'],[1,3,'control'],[2,1,'control'],[3,4,'control'],[4,5,'control']],note:'依赖关系示意，设备固件与主机驱动的实际启动交互依型号；最后还需应用验证。'},
 'sw-runtime':{title:'框架到设备：即时与图路径',ids:['torchnpu','mindspore','cuda-stack','graph-compile','operators','acl','driver','npu','hbm'],edges:[[0,3,'control'],[1,3,'control'],[0,4,'data'],[3,4,'control'],[4,5,'control'],[5,6,'control'],[6,7,'control'],[7,8,'data']],note:'画出昇腾的职责关系；CUDA是并列对照，不串入昇腾路径。即时路径不强制经过GE。'},
 'sw-memory':{title:'软件内存对象与真实存储域',ids:['frameworks','device-memory','dram','dma','hbm','kv-cache'],edges:[[0,1,'control'],[1,4,'control'],[2,3,'data'],[3,4,'data'],[5,4,'control']],note:'对象分配与数据搬运不同；缓存分配器保留空间不等于全部空间都是活跃张量。'},
 'sw-compile':{title:'计算表达、编译与Kernel执行',ids:['frameworks','graph-compile','operators','streams','buffers','core'],edges:[[0,1,'control'],[1,2,'control'],[2,3,'control'],[3,5,'control'],[4,5,'data']],note:'编译与运行阶段区分；图融合和并行程度取决于目标后端，不承诺固定加速。'},
 'sw-container':{title:'容器接入：三种Runtime别混淆',ids:['images','kworker','device-plugin','device-access','isolation','execution','driver','npu','partition'],edges:[[0,1,'control'],[2,3,'control'],[1,3,'control'],[3,4,'control'],[5,6,'control'],[6,7,'control'],[8,2,'control']],note:'容器运行时准备进程，计算运行时提交设备任务；硬件分区能力依产品。'},
 'sw-schedule':{title:'从作业申请到本机运行',ids:['kcontrol','quota','gang','placement','kworker','device-plugin','containers','rank','training'],edges:[[0,1,'control'],[1,2,'control'],[2,3,'control'],[3,4,'control'],[5,4,'control'],[4,6,'control'],[6,7,'control'],[7,8,'control']],note:'配额、分组与位置是不同约束；获得节点不等于模型已就绪。'},
 'sw-network':{title:'Pod网络与高性能通信边界',ids:['kworker','pod-network','nic','rank','collective-libs','ethernet','security','bmc'],edges:[[0,1,'control'],[1,2,'control'],[3,4,'control'],[4,2,'data'],[2,5,'data'],[6,1,'control']],note:'带外管理独立；CNI连通不能单独证明队列、授权和设备侧RDMA路径全部正常。'},
 'sw-storage':{title:'制品与数据：申请、读取、持久化',ids:['artifacts','volume-csi','storage','dataloader','dram','device-memory','checkpoint','filesystem'],edges:[[0,2,'data'],[1,2,'control'],[2,3,'data'],[3,4,'data'],[4,5,'data'],[6,7,'data'],[7,2,'data']],note:'CSI是接入接口，Checkpoint是应用状态。例示数据路径，不要求全部部署使用同一文件系统。'},
 'sw-mindcluster':{title:'MindCluster各级协同边界',ids:['mindcluster','mindcluster-components','device-plugin','device-access','gang','kworker','npu','fault-recovery','ccae'],edges:[[0,1,'control'],[1,2,'control'],[1,4,'control'],[2,5,'control'],[3,5,'control'],[5,6,'control'],[1,7,'control']],note:'组件职责示意；CCAE是并列资源健康管理，不虚构所有组件间的固定私有消息协议。'},
 'sw-alternative':{title:'资源调度与应用调度：可选路线',ids:['orchestration','slurm','ray','containers','rank','training'],edges:[[0,3,'control'],[1,4,'control'],[2,5,'control'],[3,4,'control'],[4,5,'control']],note:'Kubernetes、Slurm与Ray不是默认串联的必装三件套；实际组合必须明确资源所有权。'},
 'sw-training':{title:'训练：输入、梯度、更新与保存',ids:['dataloader','frameworks','autograd','collective-libs','precision','recompute','mindspeed','checkpoint','hbm'],edges:[[0,1,'data'],[1,2,'data'],[2,3,'data'],[4,2,'control'],[5,2,'control'],[6,1,'control'],[2,7,'data'],[1,8,'data']],note:'混合精度与重计算是可选策略；MindSpeed用于对应支持路线，不是MindSpore必经层。'},
 'sw-parallel':{title:'并行策略切分的到底是什么',ids:['data-parallel','tensor-parallel','pipeline-parallel','expert-parallel','fsdp-zero','rank','collective-libs','placement'],edges:[[0,5,'control'],[1,5,'control'],[2,5,'control'],[3,5,'control'],[4,5,'control'],[5,6,'data'],[7,5,'control']],note:'五种策略可按框架能力组合；图表示依赖通信组，不表示必须全部启用。'},
 'sw-kv':{title:'请求状态、KV逻辑块与物理容量',ids:['tokenizer','prefill-decode','kv-cache','paged-cache','prefix-cache','hbm'],edges:[[0,1,'data'],[1,2,'data'],[2,3,'control'],[3,5,'data'],[4,2,'control']],note:'KV分页不消除容量，前缀缓存不等于答案缓存；普通完整注意力公式有明确适用条件。'},
 'sw-serving':{title:'服务入口、引擎与设备执行',ids:['request-routing','tokenizer','batching','inference-engines','mindie','vllm','execution','autoscale','benchmark'],edges:[[0,1,'data'],[1,2,'data'],[2,3,'control'],[3,4,'control'],[3,5,'control'],[4,6,'data'],[5,6,'data'],[8,7,'control'],[7,0,'control']],note:'MindIE与vLLM是可选执行路线，不是顺次调用；扩缩容与迭代批处理不在同一层。'},
 'sw-observe':{title:'观测、关联与受控处理',ids:['npu','metrics','telemetry','profiling','operations','fault-recovery','checkpoint','ccae'],edges:[[0,1,'control'],[0,3,'control'],[1,4,'control'],[2,4,'control'],[3,4,'control'],[4,5,'control'],[6,5,'control'],[7,4,'control']],note:'关联用于定位，不能代替直接证据。监测与修复动作分开，图谱本身不连接任何设备。'},
 'sw-security':{title:'管理、运行、网络与数据权限',ids:['security','kcontrol','isolation','device-access','pod-network','artifacts','storage'],edges:[[0,1,'control'],[0,2,'control'],[0,3,'control'],[0,4,'control'],[0,5,'control'],[5,6,'data']],note:'不同线表示需要各自授权的边界；通过API认证不等于拥有设备和数据的全部访问权。'}
 };
 const sequences={
 'sw-launch':{title:'作业启动时序',actors:['kcontrol','kworker','device-plugin','containers','rank'],steps:[[0,0,'接受任务规格并生成运行对象'],[0,1,'绑定节点后，节点开始准备'],[1,2,'设备分配准备（Allocate）'],[2,1,'返回设备接入信息'],[1,3,'调用运行时启动应用进程'],[3,4,'分布式参与者会合并建立通信']],note:'职责时序，省略并行的镜像/卷/网络准备；不是所有实现的逐函数调用栈。'},
 'sw-stream':{title:'异步提交与跨流依赖时序',actors:['acl','dma','streams','core'],steps:[[0,1,'提交输入搬运：主机可以先返回'],[1,2,'记录输入就绪事件'],[2,3,'满足依赖后允许计算'],[0,1,'另一缓冲可准备下一批'],[3,2,'计算结果完成事件'],[2,0,'消费者等待所需结果后继续']],note:'不同流具有并发机会，不保证重叠；复用缓冲必须等待最后使用者。'},
 'sw-collective':{title:'通信域与Sum AllReduce时序',actors:['rank','collective-libs','hccs','npu'],steps:[[0,1,'各参与者建立同一通信域'],[0,1,'提交匹配操作、类型和数量'],[1,2,'按受支持算法分段交换'],[2,3,'在设备间完成归约与结果传递'],[3,1,'操作完成'],[1,0,'例：1、2、3归约后每方得到6']],note:'算法与路由依实现；求和结果6不是平均值，除法需按目标语义处理。'},
 'sw-pipeline':{title:'流水线微批与反向协作',actors:['dataloader','pipeline-parallel','autograd','collective-libs'],steps:[[0,1,'微批A进入模型前部阶段'],[1,2,'A前进；前部可准备微批B'],[2,1,'反向所需梯度按依赖传回'],[1,3,'按并行方案完成通信'],[3,2,'同步条件满足后更新'],[2,0,'进入下一训练步']],note:'示意仅展示逻辑协作，不按图上间距推断真实耗时或特定1F1B调度。'},
 'sw-inference':{title:'一次自回归推理请求',actors:['request-routing','tokenizer','prefill-decode','kv-cache','execution'],steps:[[0,1,'准入并组织模板/输入'],[1,2,'提交已知输入token序列'],[2,4,'处理Prompt，得到首个新token'],[4,3,'保存可复用的历史KV'],[2,4,'后续迭代处理上一个新token'],[4,0,'返回新输出，直至停止或取消']],note:'Prefill可产生首个新token；后续Decode不重算全部历史KV。时序省略引擎内调度细节。'},
 'sw-pd':{title:'P/D分离的数据交接',actors:['request-routing','prefill-decode','pd-disaggregation','kv-cache','execution'],steps:[[0,1,'将Prompt交给Prefill实例'],[1,3,'生成输入对应KV'],[3,2,'交付状态与传输计划'],[2,4,'将兼容KV送到Decode侧'],[4,4,'数据就绪后继续Decode'],[4,0,'返回输出并管理请求生命周期']],note:'两个计算阶段位于不同实例；连接器与模型支持有版本限制，传输成本不能省略。'},
 'sw-checkpoint':{title:'受控保存与故障恢复',actors:['training','checkpoint','storage','fault-recovery','rank'],steps:[[0,1,'在约定训练边界采集状态'],[1,2,'保存分片及元数据'],[2,1,'验证本次版本完整性'],[3,2,'故障后选择兼容可恢复点'],[3,4,'准备替代成员与通信域'],[2,0,'加载训练状态并验证进度']],note:'完整性确认是工程设计原则；不是宣称所有框架默认支持跨任意版本的原子恢复。'},
 'sw-rl':{title:'生成、评价与训练更新',actors:['serving','rl-workflow','training','artifacts'],steps:[[3,0,'为生成器指定参数版本'],[0,1,'生成样本/轨迹'],[1,2,'组织评价与算法所需数据'],[2,2,'执行训练更新'],[2,3,'输出新的参数状态'],[3,0,'按策略同步给生成器']],note:'通用数据流，不指定所有RL算法都有相同角色；同步与异步选择影响版本一致性。'}
 };
 AtlasTopology.titles['sw-batch']='请求生命周期与迭代调度泳道';
 Object.entries(defs).forEach(([k,v])=>AtlasTopology.titles[k]=v.title);
 Object.entries(sequences).forEach(([k,v])=>AtlasTopology.titles[k]=v.title);
 AtlasTopology.auto=id=>SW_INDEX[id]?.diagram||oldAuto(id);
 AtlasTopology.make=function(kind,profile){
  if(kind==='sw-batch')return {kind,title:'请求生命周期与迭代调度泳道',heading:'每轮重新选择可运行请求；阶段耗时与实际混合策略依引擎',width:1120,height:610,nodes:[],edges:[],notes:[],sources:['sw_batch','sw_vllm'],batchLane:true,software:true,profile};
  const def=defs[kind],seq=sequences[kind];if(!def&&!seq)return oldMake(kind,profile);
  const ids=def?.ids||seq.actors;const sources=[...new Set(ids.flatMap(id=>SW_INDEX[id]?.sources||RESOURCES.find(r=>r.id===id)?.sources||[]))];
  if(seq)return {kind,title:seq.title,heading:'从上到下为逻辑先后；纵向距离不是时间刻度',width:1120,height:800,nodes:[],edges:[],notes:[],sources,sequence:seq,software:true,profile};
  const cols=def.cols||3,gap=cols===4?32:71,w=(1040-gap*(cols-1))/cols,h=102,x0=40,y0=35,rows=Math.ceil(ids.length/cols),height=rows*185+40;
  const nodes=ids.map((id,i)=>{let m=SW_INDEX[id]||RESOURCES.find(r=>r.id===id);return {id,res:id,x:x0+(i%cols)*(w+gap),y:y0+Math.floor(i/cols)*185,w,h,title:m.title,sub:SW_INDEX[id]?(SOFTWARE_LAYERS[m.layer]):'承载硬件',role:SW_INDEX[id]?'control':'data'};});
  const edges=def.edges.map(([a,b,type],i)=>{const A=nodes[a],B=nodes[b];let points;
   if(Math.floor(a/cols)===Math.floor(b/cols)&&Math.abs(a-b)===1){const sign=b>a?1:-1;points=[[A.x+(sign>0?w:0),A.y+h/2],[B.x+(sign>0?0:w),B.y+h/2]];}
   else {const lane=20+(i%4)*10;const ax=A.x+w*.38+(i%3)*30,bx=B.x+w*.4+(i%3)*22;
    if(B.y>A.y){points=[[ax,A.y+h],[ax,A.y+h+lane],[B.x-20-(i%3)*11,A.y+h+lane],[B.x-20-(i%3)*11,B.y-20],[bx,B.y-20],[bx,B.y]];}
    else points=[[ax,A.y+h],[ax,A.y+h+18],[22+(i%3)*6,A.y+h+18],[22+(i%3)*6,B.y-18],[bx,B.y-18],[bx,B.y]];
   }return {from:A.id,to:B.id,type,points,arrow:true};});
  return {kind,title:def.title,heading:def.note,width:1120,height,nodes,edges,notes:[],sources,software:true,profile};
 };
 AtlasTopology.svg=function(d,active){
  if(d.batchLane){let out='<svg class="topology-svg" viewBox="0 0 1120 610" role="img" aria-label="连续批处理泳道示意">';const grid=[['预填充A','生成A₁','生成A₂ / 完成','',''],['未到达','预填充B','生成B₁','生成B₂','生成B₃'],['未到达','未到达','未到达','预填充C','生成C₁']];for(let i=0;i<5;i++)out+='<text class="diagram-note" x="'+(275+i*178)+'" y="68" text-anchor="middle">调度迭代 '+(i+1)+'</text>';for(let j=0;j<3;j++){let y=105+j*128;out+='<rect x="25" y="'+y+'" width="1070" height="106" rx="8" fill="#142638"/><text class="diagram-title" x="100" y="'+(y+57)+'" text-anchor="middle">请求 '+String.fromCharCode(65+j)+'</text>';for(let i=0;i<5;i++){let t=grid[j][i],x=196+i*178;out+='<g class="diagram-node '+(t.startsWith('预')?'bus':'control')+'" data-go="batching" tabindex="0" role="button"><rect x="'+x+'" y="'+(y+20)+'" width="158" height="66" rx="6"/><text class="diagram-sub" x="'+(x+79)+'" y="'+(y+59)+'" text-anchor="middle">'+(t||'释放槽位')+'</text></g>';}}return out+'<text class="diagram-note" x="32" y="530">请求A完成后，不必等待整组B结束才接纳C；完成和新到达请求改变每轮集合。</text><text class="diagram-note" x="32" y="575">方框是解释性迭代，不是固定时长；此例不声称所有引擎都采用同一混合策略。</text></svg>';}
  if(!d.sequence)return oldSvg(d,active);
  const E=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),seq=d.sequence,n=seq.actors.length,spacing=1040/n,xs=seq.actors.map((_,i)=>40+spacing*(i+.5)),h=110+seq.steps.length*96+75;
  d.height=h;const marker='seq-'+d.kind;
  let s=`<svg class="topology-svg sequence-svg" viewBox="0 0 1120 ${h}" role="img" aria-label="${E(d.title)}"><defs><marker id="${marker}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#9ac8dc"/></marker></defs>`;
  seq.actors.forEach((id,i)=>{const title=SW_INDEX[id]?.title||id,lines=AtlasTopology.wrap(title,spacing-24,17),x=xs[i];s+=`<g data-go="${id}" role="button" tabindex="0" class="diagram-node control ${active===id?'is-current':''}"><rect x="${x-spacing/2+7}" y="20" width="${spacing-14}" height="83" rx="7"/><text x="${x}" y="${lines.length>1?48:60}" text-anchor="middle" class="diagram-title" style="font-size:17px">${lines.map((v,k)=>`<tspan x="${x}" dy="${k?23:0}">${E(v)}</tspan>`).join('')}</text></g><line x1="${x}" y1="105" x2="${x}" y2="${h-38}" class="wire control"/>`;});
  seq.steps.forEach(([a,b,text],i)=>{const y=158+i*96,xa=xs[a],xb=xs[b],left=Math.min(xa,xb),right=Math.max(xa,xb),label=String(i+1).padStart(2,'0')+' · '+text;
   const labelWidth=Math.min(610,label.length*17+25),center=a===b?Math.max(labelWidth/2+20,Math.min(1120-labelWidth/2-20,xa)):Math.max(labelWidth/2+20,Math.min(1120-labelWidth/2-20,(left+right)/2));
   s+=`<rect class="sequence-label-bg" x="${center-labelWidth/2}" y="${y-34}" width="${labelWidth}" height="28" rx="4"/><text x="${center}" y="${y-14}" class="diagram-note" text-anchor="middle">${E(label)}</text>`;
   s+=a===b?`<path d="M${xa} ${y} h35 v22 h-35" class="wire" marker-end="url(#${marker})"/>`:`<line x1="${xa}" y1="${y}" x2="${xb}" y2="${y}" class="wire" marker-end="url(#${marker})"/>`;
  });
  s+=`<text class="diagram-note" x="40" y="${h-13}" style="font-size:14px">${E(seq.note)}</text></svg>`;return s;
 };
 window.__softwareDiagrams={defs,sequences};
})();
