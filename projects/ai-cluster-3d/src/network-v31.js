/* Sourced topology correction. Scene coordinates show scope, not cable lengths. */
(() => {
 const oldModel=createModel,oldMake=AtlasTopology.make,oldAuto=AtlasTopology.auto;
 const byId=id=>RESOURCES.find(r=>r.id===id);
 const palette={pcb:'#23776e',unit:'#41c4aa',io:'#a994df',host:'#86a6bf',shell:'#547083',wire:'#9e8bd1'};
 function nodeScene(p,single=false){
  const s=new GeometryScene();s.extent=single?8:15;s.target=[0,.7,0];s.grid(single?9:16);
  const B=(pos,size,c,res,name,ex=[0,0,0],label=false)=>s.box(pos,size,palette[c]||c,{resource:res,name,ex,label});
  const link=(a,b,res,name,ex=[0,0,0])=>s.rod(a,b,.025,palette.wire,{resource:res,name,ex,segments:8});
  if(single){
   B([0,.15,0],[3.3,.12,2.9],'pcb','board','封装基底');
   if(p==='A3'){
    for(let i=0;i<2;i++)B([-0.9+i*1.8,.42,0],[1.15,.28,1.6],'unit','npu','配对处理单元 '+i,[i? .45:-.45,.45,0],true);
    link([-.3,.4,0],[.3,.4,0],'hccs','模组内SIO');
    s.caption='A3 HiAM关系：2个处理单元通过SIO配对；这是模组级示意，不把它误称为一个软件Device。';
   }else{
    for(let i=0;i<2;i++){B([-.8+i*1.6,.4,-.35],[1.15,.25,1.15],'unit','core','计算DIE '+i,[i?.3:-.3,.5,-.25],true);B([-.8+i*1.6,.4,.87],[1.15,.20,.60],'io','busport','IO DIE '+i,[i?.3:-.3,.5,.3],true);}
    s.caption='950及850系列公开说明：2个计算DIE + 2个IO DIE合封。相对位置为功能示意；未指定HBM堆叠数和实际走线。';
   }
   return s;
  }
  B([0,.10,0],[9.5,.18,6.8],'shell','server','计算节点机箱');B([0,.23,0],[9.2,.09,6.5],'pcb','board','主板区域');
  B([0,.42,-2.65],[6.7,.32,.80],'host','cpu','Host CPU与主机内存区',[0,.4,-.6],true);
  const points=[];
  for(let i=0;i<8;i++){
   const x=-3.45+(i%4)*2.3,z=-1.0+Math.floor(i/4)*2.1,ex=[x*.08,.20,Math.floor(i/4)*.6];
   B([x,.33,z],[1.92,.08,1.72],'pcb','board',p==='A3'?'HiAM '+i:'处理器模组 '+i,ex,i===0);
   if(p==='A3')for(let j=0;j<2;j++)B([x-.43+j*.86,.53,z],[.7,.22,1.14],'unit','npu','处理单元 '+(2*i+j),[...ex.slice(0,1),.55,ex[2]],i===0);
   else B([x,.53,z],[1.4,.24,1.25],'unit','npu','NPU '+i,[ex[0],.55,ex[2]],i<2);
   if(p==='A3')link([x-.12,.55,z],[x+.12,.55,z],'hccs','SIO配对',ex);
   points.push([x,.65,z]);
  }
  if(p!=='A3')for(let i=0;i<8;i++)for(let j=i+1;j<8;j++)link(points[i],points[j],'hccs','X轴HCCS mesh关系');
  B([-3.8,.47,2.65],[1.2,.32,.58],'io','npu_port',p==='A3'?'HCCS-L2出口':'域外端口区',[0,.25,.75],true);
  B([3.8,.47,2.65],[1.2,.32,.58],'host','nic','RoCE/主机网络区',[0,.25,.75],true);
  if(p!=='A5-850')for(let x of [-4.48,4.48])s.rod([x,.48,-2.1],[x,.48,2.2],.04,x<0?'#50a7ce':'#d29474',{resource:'coldplate',name:'供回液示意',ex:[x*.08,.25,0],segments:8});
  s.caption=p==='A3'?'A3节点：8个HiAM × 2个配对处理单元；SIO与模组间HCCS-L1、节点间HCCS-L2分开。主机区未推断CPU或DIMM数量。':p==='A5-850'?'850/850E节点：8个处理器的HCCS mesh；外接5808。位置是功能布局，不套用950的液冷柜结构。':'950节点/OS域：8个处理器形成X轴mesh。连接是拓扑关系，不是PCB走线；8个这样的OS域组成64处理器机架。';
  return s;
 }
 function axisScene(){
  const s=new GeometryScene();s.extent=29;s.target=[0,3.0,0];s.grid(22);
  for(let z=0;z<16;z++)for(let y=0;y<8;y++)for(let x=0;x<8;x++){
   const pos=[(x-3.5)*.78,y*.78+.2,(z-7.5)*.95],active=(y===0&&z===0)||(x===0&&z===0)||(x===0&&y===0);
   s.box(pos,[.30,.30,.30],active?'#6adebf':'#3c5067',{resource:'npu',name:`NPU (X${x}, Y${y}, Z${z})`,ex:[(x-3.5)*.1,y*.06,(z-7.5)*.10],label:x===0&&y===0&&[0,7,15].includes(z)});
  }
  for(const [axis,n,color]of [[0,8,'#69dac4'],[1,8,'#8cadde'],[2,16,'#c098da']])for(let a=0;a<n;a++)for(let b=a+1;b<n;b++){
   const q=i=>{const c=[0,0,0];c[axis]=i;return [(c[0]-3.5)*.78,c[1]*.78+.2,(c[2]-7.5)*.95];};
   s.rod(q(a),q(b),.012,color,{resource:'hccs',name:['X轴同OS','Y轴同机架','Z轴跨机架'][axis],segments:5});
  }
  s.caption='950的1024处理器逻辑拓扑：X=8，Y=8，Z=16。仅点亮各轴一组连接；位置是逻辑坐标，不是实际机柜高度、光缆方向或每端口接线。';
  return s;
 }
 function rack950(){
  const s=new GeometryScene();s.extent=12;s.target=[0,2,0];s.grid(11);
  for(const x of [-1.2,1.2])for(const z of [-1.0,1.0])s.box([x,2.65,z],[.08,5.3,.08],'#577588',{resource:'rack',name:'计算柜框架'});
  s.box([0,.1,0],[2.55,.18,2.2],'#344d63',{resource:'rack',name:'柜底'});
  for(let i=0;i<8;i++){
   const y=.55+i*.57,ex=[0,(i-3.5)*.08,.45+i%2*.40];
   s.box([0,y,0],[2.25,.12,1.84],'#658ea1',{resource:'server',name:'OS域 '+i+' / 8 NPU',ex,label:i===0||i===7});
   for(let j=0;j<8;j++)s.box([-.8+j%4*.53,y+.13,-.48+Math.floor(j/4)*.80],[.27,.16,.32],'#51bda5',{resource:'npu',name:'NPU '+j+' / OS '+i,ex});
  }
  for(const x of [-1.05,1.05])s.rod([x,.3,-.87],[x,5.0,-.87],.045,x<0?'#69bee6':'#d89876',{resource:'coldplate',name:x<0?'供液':'回液',ex:[x*.6,0,0],label:x<0});
  s.caption='950计算机架：8个OS域 × 8处理器 = 64。托盘相对位置、CPU/内存与管路位置为示意，未当作原厂装配图。';return s;
 }
 function servers850(){
  const s=new GeometryScene();s.extent=19;s.target=[0,1.3,0];s.grid(19);
  s.box([0,2.8,-4.1],[5,.5,1.6],'#8278ae',{resource:'busdevice',name:'5808交换机',label:true});
  for(let i=0;i<16;i++){const x=-5.0+i%4*3.3,z=-1.5+Math.floor(i/4)*1.7;s.box([x,.55,z],[2.8,.55,1.2],'#607f95',{resource:'server',name:'服务器 '+i+' / 8处理器',label:i===0||i===15,ex:[x*.08,0,z*.1]});s.rod([0,2.8,-3.3],[x,.7,z],.016,'#a3a7d2',{resource:'hccs',name:'服务器到5808的连接关系',segments:6});}
  s.caption='850/850E单层公开上限：一台5808下最多16个8处理器服务器，合计128。未据此虚构机柜数或精确端口线序。';return s;
 }
 createModel=function(r,p){
  if(SW_INDEX[r.id]){const m=SW_INDEX[r.id],carrier=byId(m.carrier[0]);const s=createModel(carrier,p);s.caption=`承载硬件：${carrier.title}。${m.title}是软件模块；本图不表示软件具有此物理外观。 `+s.caption;return s;}
  if(['A3','A5','950','A5-850'].includes(p)){
   if(['server','board'].includes(r.id))return nodeScene(p);
   if(r.id==='npu')return nodeScene(p,true);
   if((p==='A5'||p==='950')&&r.id==='rack')return rack950();
   if((p==='A5'||p==='950')&&r.id==='hccs')return axisScene();
   if(p==='A3'&&r.id==='hccs')return nodeScene(p);
   if(p==='A5-850'&&['superpod','hccs','busdevice','rack'].includes(r.id))return servers850();
   if(p==='A5')return oldModel(r,'950');
   if(p==='A5-850')return oldModel(r,'A2');
  }
  return oldModel(r,p);
 };
 const kinds={'net-a3':'A3：SIO / HiAM / HCCS层级','net-axes':'A5 / 950：X–Y–Z维度互联','net-850':'A5 / 850：5808交换式组网','net-levels':'A5：Rank层级与路径分支'};
 Object.assign(AtlasTopology.titles,kinds);
 function diagram(kind,p){
  const d={kind,title:kinds[kind],heading:'',width:1280,height:850,nodes:[],edges:[],notes:[],sources:[],networkReview:true};
  const N=(id,res,x,y,w,h,title,sub,role='bus')=>d.nodes.push({id,res,x,y,w,h,title,sub,role});
  const E=(from,to,type,points,arrow=false)=>d.edges.push({from,to,type,points,arrow});
  const T=(x,y,text)=>d.notes.push({x,y,text});
  if(kind==='net-a3'){
   d.sources=['net_affinity','a3'];d.heading='以A3调度文档的8个HiAM / 16个处理单元说明层级；不要与产品总量混算';
   for(let i=0;i<8;i++){const x=45+i%4*305,y=105+Math.floor(i/4)*142;N('h'+i,'npu',x,y,265,92,'HiAM '+i,`${2*i} ↔ ${2*i+1} · 模组内SIO`,'data');}
   N('l1','hccs',420,440,400,86,'HCCS-L1','模组之间；连接域而非一块新芯片');
   for(let i=0;i<8;i++){const a=d.nodes[i],x=a.x+a.w+8;E('h'+i,'l1','control',[[a.x+a.w,a.y+46],[x,a.y+46],[x,395],[620,395],[620,440]]);}
   N('node','server',45,630,325,90,'其他计算节点','各自包含8个HiAM','data');N('l2','busdevice',470,630,325,90,'HCCS-L2','同一逻辑超节点的节点间连接');N('roce','ethernet',895,630,325,90,'RoCE网络','跨逻辑超节点','network');
   E('l1','l2','bus',[[620,526],[620,630]]);E('node','l2','bus',[[370,675],[470,675]]);E('h7','roce','network',[[1225,293],[1260,293],[1260,675],[1220,675]]);
   T(45,575,'底部是通信范围，不表示所有报文必须串行经过HCCS和RoCE。');T(45,800,'例：64调度单元 / sp-block=32 → 两个逻辑域；域内HCCS，域间RoCE。');
  }else if(kind==='net-axes'){
   d.height=1090;d.sources=['net_affinity','a950','net_a5types'];d.heading='固定1024处理器实例：8（X）×8（Y）×16（Z）；各轴内连接，非全系统端口直拉';
   T(35,60,'X轴 · 同一节点 / OS域内，8个处理器通过HCCS形成mesh');
   for(let i=0;i<8;i++)N('x'+i,'npu',28+i*157,90,138,74,'X'+i,'处理器','data');
   for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const y=190+(j-i)*7;E('x'+i,'x'+j,'bus',[[97+i*157,164],[97+i*157,y],[97+j*157,y],[97+j*157,164]]);}
   T(35,283,'Y轴 · 同一计算机架8个OS域，共64处理器；LRS实现跨板连接');
   for(let i=0;i<8;i++)N('y'+i,'server',28+i*157,312,138,86,'OS '+i,'8处理器','data');
   for(let i=0;i<8;i++)for(let j=i+1;j<8;j++){const y=425+(j-i)*7;E('y'+i,'y'+j,'bus',[[97+i*157,398],[97+i*157,y],[97+j*157,y],[97+j*157,398]]);}
   T(35,515,'Y连线表达相应位置的轴内互联集合，不表示每两台OS只有一条物理线。');
   T(35,565,'Z轴 · 16个计算机架通过LRS的UB出口扩展；每架64处理器');
   for(let i=0;i<16;i++)N('z'+i,'rack',28+i%8*157,597+Math.floor(i/8)*134,138,84,'计算柜 '+i,'8 OS / 64处理器','data');
   N('f','busdevice',425,914,430,90,'4个灵衢互联柜','柜级结构；不推定内部交换设备数');
   E('z0','f','control',[[97,681],[14,681],[14,959],[425,959]]);E('z15','f','control',[[1196,815],[1268,815],[1268,959],[855,959]]);
   T(35,862,'Z轴经UB互联；未提供端口表，底部虚线仅标出柜级关联。');T(35,1055,'LRS保留官方功能名称；x128 IO不是128个NPU，也不是128根光缆。');
  }else if(kind==='net-850'){
   d.height=1020;d.sources=['net_affinity','net_a5types','net_a5rank'];d.heading='独立850/850E实例：不把950多维液冷机架套到交换式组网';
   N('sw','busdevice',430,65,420,86,'5808交换机','单层下最多16服务器 / 128处理器');
   for(let i=0;i<16;i++){const x=35+i%4*315,y=307+Math.floor(i/4)*139;N('s'+i,'server',x,y,260,84,'服务器 '+i,'8处理器 / 节点内HCCS mesh','data');const gutter=x+275;E('sw','s'+i,'bus',[[640,151],[640,215+i*3],[gutter,215+i*3],[gutter,y+42],[x+260,y+42]]);}
   T(40,915,'两层5808可支持文档所述1k规模；本图只展示单层上限，不推定整柜数。');T(40,965,'服务器和超节点场景的Rank分支不同；UBoE不等于RoCE。');
  }else{
   d.height=840;d.sources=['net_a5rank','net_a5types','net_topofile'];d.heading='Rank通信层级是范围与网络类型描述，不是必经的四级物理交换机';
   for(let i=0;i<4;i++)T(285+i*245,85,'Level '+i);
   const rows=[['Pod场景',['UB','UB','UBG','ROCE'],['节点范围','超节点范围','集群范围','集群范围']],['服务器超节点',['UB','UB','UBOE','ROCE'],['节点范围','超节点范围','集群范围','集群范围']],['独立服务器',['UB','省略','UBOE','ROCE'],['节点范围','无此逻辑层','集群范围','集群范围']]];
   rows.forEach(([title,types,scopes],r)=>{T(25,175+r*184,title);types.forEach((t,i)=>N('n'+r+i,'hccs',245+i*247,127+r*184,221,96,t,scopes[i],t==='ROCE'?'network':'bus'));});
   T(30,725,'Level 0：TOPO_FILE_DESC；更高层：CLOS（代码标签，不给交换机级数）。');T(30,773,'UB/UBG地址使用EID；UBoE分支使用IP地址。实际启用和端口集合依产品配置。');
  }
  return d;
 }
 AtlasTopology.make=function(kind,p){
  if(kinds[kind])return diagram(kind,p);
  if(['pod','bus'].includes(kind)&&NETWORK_REVIEW[p])return diagram(NETWORK_REVIEW[p].diagram,p);
  if(kind==='host'&&p==='A3')return diagram('net-a3',p);
  if(kind==='host'&&['A5','950'].includes(p))return diagram('net-axes',p);
  if(kind==='host'&&p==='A5-850')return diagram('net-850',p);
  return oldMake(kind,p);
 };
 AtlasTopology.auto=id=>oldAuto(id);
 window.AtlasNetwork={version:'3.1.0',diagram,upstream:NETWORK_UPSTREAM};
})();
