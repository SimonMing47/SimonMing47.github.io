/* Model variants are governed by explicit product evidence. Unknown != generic clone. */
const createLegacyModel = createModel;
createModel = function(resource, profile) {
 const P=PROFILES[profile];
 if(profile==='A5' && ['superpod','rack','server','busdevice','buschip','busport','hccs'].includes(resource.id)){
  const s=new GeometryScene();s.extent=14;s.target=[0,1.4,0];s.grid(14);
  // Empty frames represent missing evidence dimensions, not cabinets or chip counts.
  const labels=['型号映射待核实','计算资源数量待核实','互联拓扑待核实'];
  labels.forEach((name,i)=>{let x=(i-1)*3.6;for(let xx of [-1.3,1.3])s.box([x+xx,1.3,0],[.025,2.6,.04],'#64758b',{pick:false});for(let yy of [0,2.6])s.box([x,yy,0],[2.6,.025,.04],'#64758b',{pick:false});s.box([x,1.2,0],[.14,.14,.06],'#edbb7c',{resource:'superpod',name,label:true});});
  s.caption='A5公开型号映射尚未核实。空框表示资料维度，不表示设备外形或数量；不会复用A3、Atlas950模型冒充。';return s;
 }
 if(resource.id==='superpod'||resource.id==='rack')return cabinetModel(resource,profile);
 if(resource.id==='server'&&['A2','NV'].includes(profile))return hostVariant(profile);
 const s=createLegacyModel(resource,profile);
 if(profile==='NV'){
  const names={'npu':'GPU封装（概念）','core':'SM / Tensor Core（功能区）','buffers':'本地存储（功能示意）','hccs':'NVLink互联','busdevice':'NVLink交换资源','buschip':'NVSwitch转发资源','busport':'NVLink接口'};
  s.parts.forEach(p=>{if(names[p.resource])p.name=names[p.resource];});
  if(['core','buffers','dma'].includes(resource.id)){
   const labels=['矩阵运算功能','通用并行执行','调度与控制','本地缓存/共享存储','寄存器等局部状态'];let i=0;
   s.parts.forEach(p=>{if(p.resource==='core'||p.resource==='buffers')p.name=labels[(i++)%labels.length];});
   s.caption='NVIDIA执行资源的功能示意，不将昇腾Cube/L0/Unified Buffer当成Blackwell真实版图。GPU具体微结构与实现以对应架构文档为准。';
  }
 }
 if(resource.id==='server'&&['A3','950'].includes(profile))s.caption='通用计算节点结构；未按整域规格推定单节点CPU/NPU数量和实际板位。';
 if(profile==='A5')s.caption='通用资源原理模型；未证明这是A5的真实布局。'+(s.caption||'');
 else if(['cpu','npu','hbm','board','core','buffers','dma'].includes(resource.id))s.caption=(s.caption||'微观结构仅作功能示意。')+' 产品切换不伪造未公开的核数或裸片数量。';
 return s;
}
function cabinetModel(resource,profile){
 const s=new GeometryScene(),p=PROFILES[profile];
 const box=(pos,size,color,res,name,ex=[0,0,0],label=false)=>s.box(pos,size,color,{resource:res,name,ex,label});
 const pipe=(a,b,color,res,name,ex=[0,0,0],label=false)=>s.rod(a,b,.055,color,{resource:res,name,ex,label,segments:8});
 function rack(x,z,type,index,detailed=false){
  const w=2.05,h=5.1,d=1.9,origin=[x,0,z];const id=type==='compute'?'rack':type==='nv'?'rack':'busdevice';
  const name=type==='compute'?`C${String(index+1).padStart(2,'0')} 计算柜`:type==='nv'?'NVL72计算机架':`B${index+1} 互联柜`;
  const ex=[x*.12,0,z*.18],at=v=>v.map((q,i)=>q+origin[i]);
  for(let xx of [-w/2,w/2])for(let zz of [-d/2,d/2])box(at([xx,h/2,zz]),[.065,h,.065],'#526e82',id,name,ex,index===0&&xx<0&&zz>0);
  box(at([0,.07,0]),[w+.13,.14,d+.13],'#243b50',id,name,ex);
  for(let y of [.2,h])for(let zz of [-d/2,d/2])box(at([0,y,zz]),[w,.07,.07],'#7395aa',id,name,ex);
  const liquid=profile!=='A2' && (type==='compute'||type==='nv'||profile==='950');
  if(liquid){for(let sign of [-1,1])pipe(at([sign*.80,.3,-.84]),at([sign*.80,4.8,-.84]),sign<0?'#56afd6':'#cd846d','coldplate',sign<0?'供液歧管':'回液歧管',[ex[0]+(detailed?sign*.65:0),0,ex[2]-.1],detailed&&sign<0);}
  box(at([1.03,2.6,-.78]),[.12,4.7,.12],'#bd9761','pdu','机柜配电',[ex[0]+(detailed?.5:0),0,ex[2]],detailed);
  // Counts within Huawei cabinets are reduced structural samples, not inferred BOMs.
  const count=type==='nv'?29:(detailed?7:5);
  for(let j=0;j<count;j++){
   const isNVSwitch=type==='nv'&&j>=18&&j<27,isManagement=type==='nv'&&j>=27;
   const rid=isManagement?'switch':isNVSwitch?'hccs':type==='bus'?'busdevice':'server';
   const text=type==='nv'?(isManagement?'管理TOR交换机':isNVSwitch?`NVLink交换托盘 ${j-17}`:`计算托盘 ${j+1}`):type==='bus'?'互联设备（缩略）':'计算抽屉（缩略）';
   let yy=.4+j*(4.4/count),thick=type==='nv'?.105:.4;
   let move=[ex[0],detailed?(j-count/2)*.022:0,ex[2]+(detailed?(.4+j%3*.3):0)];
   box(at([0,yy,0]),[1.88,thick,1.76],isNVSwitch||type==='bus'?'#536086':'#68899a',rid,text,move,detailed&&[0,18,27].includes(j));
   box(at([0,yy,.92]),[1.78,thick*.73,.075],isManagement?'#ab8b5a':'#132737',rid,text,move);
   for(let i=0;i<(type==='nv'?4:6);i++)box(at([-.72+i*.27,yy,.963]),[.10,thick*.43,.015],'#244f60',rid,text,move);
  }
  if(!liquid){for(let i=0;i<3;i++){box(at([-.5+i*.5,4.87,-.6]),[.37,.15,.35],'#4d6576','fan','风冷模块',[ex[0],detailed?.5:0,ex[2]],detailed&&i===0);}}
 }
 if(resource.id==='rack'||profile==='NV'){
  s.extent=12.5;s.target=[0,2.0,0];s.grid(11);rack(0,0,profile==='NV'?'nv':'compute',0,true);
  s.caption=profile==='NV'?'DGX GB200：18个计算托盘、9个NVLink交换托盘、2个管理TOR；位置与尺寸为示意，供电框未按数量复刻。':profile==='A2'?'A2机柜示意：风冷4U服务器，不添加液冷歧管；柜内服务器数量非官方定额。':'计算柜结构示意：导轨、计算抽屉、配电与供回液。抽屉数量未由整柜总规格推断。';
 }else{
  const n=p.racks,b=p.busracks,cols=profile==='A2'?2:n/2,step=2.65;
  s.extent=profile==='A2'?21:cols*step*1.58;s.target=[0,1.8,-.9];s.grid(Math.max(18,cols*step+6));
  for(let i=0;i<n;i++)rack((i%cols-(cols-1)/2)*step,(Math.floor(i/cols)-.5)*4.7,'compute',i);
  for(let i=0;i<b;i++)rack((i-(b-1)/2)*step,-7.4,'bus',i);
  // No made-up device-to-device cabling. Logical connections live in the wireframe.
  if(profile==='A2')s.caption='4个机柜表示可横向扩展的服务器组，不是A2产品固定规模；风冷结构。具体通信连接请切换“组网线框”。';
  else s.caption=profile==='A3'?'A3公开最大柜级结构：12计算柜（液冷）+4总线设备柜（风冷）。没有编造全互联端口布线。':'Atlas950公开最大柜级结构：16计算柜+4互联柜，均液冷。柜级数量有来源；内部抽屉为缩略表示。';
 }
 return s;
}
function hostVariant(profile){
 const s=new GeometryScene();s.grid(17);s.extent=17;s.target=[0,.7,0];
 const B=(p,z,c,r,n,e=[0,0,0],l=false)=>s.box(p,z,c,{resource:r,name:n,ex:e,label:l});
 B([0,.08,0],[10,.15,7.6],'#698598','server',profile==='A2'?'800T A2主机资源示意':'DGX GB200计算托盘示意');
 for(let x of [-5,5])B([x,.44,0],[.08,.75,7.6],'#3c5d72','server','机箱侧壁');
 B([0,.22,0],[9.6,.08,7.1],'#21756f','board','主板/板间结构');
 if(profile==='A2'){
  for(let z of [-1.5,1.05])for(let x of [-2.7,1.5]){
   B([x,.4,z],[1.25,.18,1.18],'#bdcbd6','cpu','鲲鹏920 CPU',[0,.6,0],x<0&&z<0);
   for(let side of [-1,1])for(let i=0;i<4;i++){
    const xx=x+side*(.93+i*.20);B([xx,.32,z],[.11,.12,1.55],'#252f42','dram','DDR4插槽（总32）',[side*.14,.08,0]);
    B([xx,.67,z],[.05,.53,1.43],'#429e86','dram','DDR4 DIMM示意',[side*.14,.65,0],x<0&&z<0&&side<0&&i===0);
   }
  }
  B([0,.38,3.00],[6.5,.25,.86],'#33aa9b','npu','NPU模组区域（数量不推定）',[0,.9,.55],true);
  for(let i=0;i<8;i++){const x=-4.2+i*1.2;B([x,.60,-3.30],[.79,.68,.32],'#3a556a','fan',`风扇模组 ${i+1}`,[0,.4,-.8],i===0);s.rod([x,.6,-3.5],[x,.6,-3.1],.26,'#142e41',{resource:'fan',name:'风扇叶轮',ex:[0,.4,-.8],segments:12});}
  for(let i=0;i<4;i++)B([4.35,.65,-2.4+i*1.15],[.85,.8,.95],'#91a7b7','psu',`电源模块 ${i+1}`,[1.8,.15,0],i===0);
  for(let i=0;i<8;i++)B([-3.5+i,.5,3.7],[.48,.21,.32],'#b69d72','npu_port',`200GE QSFP出口 ${i+1}`,[0,.15,1.1],i===0);
  s.caption='A2公开数量：4 CPU、32 DDR4插槽、8风扇、4电源、8×200GE。几何位置是说明性排布；NPU区域不推断芯片数或全互联。';
 }else{
  for(let x of [-2.3,2.3]){
   B([x,.48,-1.6],[1.45,.2,1.35],'#bacbd4','cpu','Grace CPU',[0,.45,-.25],x<0);
   for(let i=0;i<4;i++)B([x-1.00+i*.66,.34,-2.6],[.45,.15,.50],'#80a8d0','dram','LPDDR5X（非DIMM外观）',[0,.4,-.4],i===0&&x<0);
   for(let z of [.2,1.75]){B([x,.47,z],[1.8,.28,1.32],'#2ec9b0','npu','Blackwell GPU',[x*.15,.8,z*.2],x<0&&z===.2);B([x,.75,z],[2.0,.15,1.47],'#7598ad','coldplate','GPU冷板',[x*.15,1.65,z*.2]);}
  }
  for(let i=0;i<4;i++)B([-3.5+i*2.3,.38,3.15],[.70,.28,.72],'#cea96a','nic','ConnectX-7出口',[0,.25,.75],i===0);
  for(let x of [-4.1,4.1])s.rod([x,.73,-3.4],[x,.73,2.9],.075,x<0?'#51afdb':'#d2866d',{resource:'coldplate',name:'供回液支路',ex:[x*.1,.4,0]});
  s.caption='DGX GB200每托盘2 Grace CPU、4 Blackwell GPU；CPU/GPU液冷，部分外设风冷。板位与尺寸是示意，不复制厂商CAD。';
 }
 return s;
}
