/* Reader UI v2: true recursive tree, global locator, synchronized diagram and profile. */
(() => {
 const q=id=>document.getElementById(id), E=esc;
 let saved;try{saved=JSON.parse(localStorage.getItem('atlas-tree-v2')||'null');}catch(_){saved=null;}
 const state={mode:'3d',diagram:'auto',scale:1,open:new Set(saved||['cluster','power','cooling','superpod','rack','server','board','npu','ethernet','switch']),diagramData:null};
 const originalSelect=selectResource, originalPanel=renderPanel;
 const NV_TEXT={npu:['GPU封装把Blackwell计算资源及其内存接口组织成可装配部件。设备主存HBM与片内缓存属于不同层次。','三维模型用于显示封装、计算区域、HBM与冷板之间的位置关系，不声明裸片或HBM堆叠的真实数量。'],core:['NVIDIA GPU按SM组织并行执行资源，线程被组织成线程块和warp，矩阵操作可以使用Tensor Core。','这与昇腾的Cube、Vector和本地Buffer不是名称替换关系。此图只比较计算、存储、搬运和同步职责，不复刻Blackwell版图。'],buffers:['GPU上寄存器、共享内存和缓存共同服务数据复用。它们的可见性、容量和编程语义应分别理解。','shared memory是线程块协作的关键存储资源；寄存器保存线程局部状态。不能把昇腾L0A/L0B/L0C或Unified Buffer当作GPU硬件名称。'],dma:['GPU与主机、以及设备内的拷贝由平台支持的搬运与同步机制协作完成。','提交拷贝、拷贝完成和后续线程可以安全读取不是同一时刻；读写依赖需要遵守CUDA同步语义。']};
 const ordered=id=>childResources(id).sort((a,b)=>READING_PATH.indexOf(a.id)-READING_PATH.indexOf(b.id));
 const ancestors=id=>{let out=[],n=RI[id],seen=new Set();while(n&&!seen.has(n.id)){seen.add(n.id);out.unshift(n.id);n=RI[n.parent];}return out;};
 const title=id=>id==='superpod'?(profile==='A2'?'服务器集群':profile==='A5'?'A5型号与资料边界':profile==='NV'?'NVL72机架互联域':'超节点计算域'):profile==='NV'&&id==='npu'?'GPU封装与计算芯片':profile==='NV'&&id==='hccs'?'NVLink紧耦合互联':profile==='NV'&&id==='core'?'GPU执行资源（功能）':RI[id]?.title||id;
 const persist=()=>{try{localStorage.setItem('atlas-tree-v2',JSON.stringify([...state.open]));}catch(_){}};
 function route(){const p=new URLSearchParams({resource:current,profile,view:state.mode,diagram:state.diagram});if(activeFault)p.set('fault',activeFault);try{history.replaceState(null,'','#'+p.toString());}catch(_){}}
 function setup(){
  q('nav').classList.add('nav-v2');q('resource-tree').setAttribute('role','tree');q('resource-tree').setAttribute('aria-label','集群资源层级树');
  q('nav').querySelector('h2').textContent='资源结构树';
  q('nav').querySelector('.nav-header').insertAdjacentHTML('beforeend','<div class="tree-actions"><button id="tree-expand">全部展开</button><button id="tree-collapse">收起</button><span>逐级缩进 · 保留路径</span></div>');
  const row=document.querySelector('.profile-row');row.classList.add('profile-row-v2');q('profile-select').hidden=true;row.querySelector('label').textContent='公开产品实例';
  row.insertAdjacentHTML('afterend','<div id="profile-tabs" class="profile-tabs" role="group" aria-label="产品实例切换"></div><div id="profile-message" class="profile-message"></div>');
  document.querySelector('.scene-head').insertAdjacentHTML('afterend','<div class="view-bar"><div class="view-buttons" role="group" aria-label="资源可视化模式"><button data-mode="3d" class="selected">3D 拆解</button><button data-mode="wire">组网线框</button></div><select id="diagram-picker" aria-label="线框图类型"><option value="auto">随当前资源自动选择</option>'+Object.entries(AtlasTopology.titles).map(([k,v])=>`<option value="${k}">${E(v)}</option>`).join('')+'</select><button id="start-route" title="从基础设施开始阅读">从底向上 ↗</button></div>');
  document.querySelector('.stage').insertAdjacentHTML('afterend','<section id="wire-panel" class="wire-panel" hidden><header><div><span class="eyebrow">RELATIONSHIP VIEW</span><h2 id="wire-title"></h2></div><div class="wire-tools"><button id="wire-minus" aria-label="缩小线框">−</button><button id="wire-reset">适应</button><button id="wire-plus" aria-label="放大线框">＋</button></div></header><p id="wire-heading"></p><div id="wire-scroll" class="wire-scroll"><div id="wire-canvas"></div></div><div class="wire-legend"><span class="data">数据</span><span class="control">控制 / 分组</span><span class="bus">域内互联</span><span class="heat">供电 / 热量</span><span class="cool">冷却介质</span></div><div id="wire-sources"></div></section>');
  q('detail-panel').insertAdjacentHTML('afterbegin','<section class="locator-card" aria-label="集群全局位置"><header><div><span class="eyebrow">GLOBAL LOCATOR</span><h2>集群全局定位</h2></div><button data-resource="cluster">回到全景 ↗</button></header><div id="global-locator"></div><div id="locator-path" class="locator-path" aria-live="polite"></div><div class="locator-foot">类别高亮 · 非实时告警 / 非实际机柜坐标</div></section>');
  document.querySelector('.mini-explore').insertAdjacentHTML('beforeend','<div class="read-step" id="reading-step"></div>');
 }
 renderNav=function(){
  const tree=q('resource-tree'),oldScroll=tree.scrollTop,query=q('resource-search').value.trim().toLowerCase();let visible=null,matched=new Set();
  if(query){visible=new Set();for(const r of RESOURCES){let all=[r.title,r.en,...r.terms,...(DEEP_GUIDE[r.id]||[]),...faultsFor(r.id).map(f=>f.name)].join(' ').toLowerCase();if(all.includes(query)){matched.add(r.id);ancestors(r.id).forEach(x=>visible.add(x));}}}
  function node(id,depth){if(visible&&!visible.has(id))return '';const r=RI[id],kids=ordered(id).filter(x=>!visible||visible.has(x.id)),has=kids.length>0,isOpen=!!query||state.open.has(id),count=faultsFor(id).length;
   const currentFlag=current===id?' aria-current="page"':'',related=ancestors(current).includes(id)&&current!==id;
   return `<li role="none"><div class="tree-row ${current===id?'current':''} ${related?'ancestor':''}" style="--depth:${depth}" data-depth="${depth}">${has?`<button class="tree-toggle" data-toggle="${id}" aria-label="${isOpen?'收起':'展开'}${E(title(id))}" aria-expanded="${isOpen}">${isOpen?'⌄':'›'}</button>`:'<span class="tree-terminal" aria-hidden="true">·</span>'}<button role="treeitem" class="tree-select ${query&&matched.has(id)?'match':''}" data-resource="${id}" aria-level="${depth+1}" ${has?`aria-expanded="${isOpen}"`:''}${currentFlag} tabindex="${current===id?0:-1}"><span class="tree-title">${E(title(id))}</span>${count?`<span class="count" aria-label="${count}条故障说明">${count}</span>`:''}</button></div>${has&&isOpen?`<ul role="group">${kids.map(k=>node(k.id,depth+1)).join('')}</ul>`:''}</li>`;
  }
  tree.innerHTML=visible&&!visible.size?'<div class="empty">没有匹配内容。可试“内存”“PCIe”或故障名称。</div>':`<ul class="tree-root" role="group">${node('cluster',0)}</ul>`;
  tree.scrollTop=oldScroll;
 };
 makeCrumb=function(id){return ancestors(id).map((k,i)=>`${i?'<span class="sep">/</span>':''}<button data-resource="${k}">${E(title(k))}</button>`).join('');};
 function family(id){if(['ups','pdu','psu','vrm','power'].includes(id))return 'power';if(['cooling','cdu','coldplate','fan'].includes(id))return 'cool';if(['copper','fiber','optic','ethernet','switch','control','linecard','fabric','ethport','queue','mac','probe','nic','bmc','cq'].includes(id))return 'network';if(['busdevice','buschip','busport','hccs'].includes(id))return 'bus';if(['storage','filesystem','nvme'].includes(id))return 'storage';return 'compute';}
 function locator(){
  const f=family(current),special=['cpu','dram','npu','hbm'].includes(current)?current:['core','buffers','dma','board','npu_port'].includes(current)?'npu':'rack';
  const b=(id,x,y,w,h,label,resource,hit)=>`<g tabindex="0" role="button" data-go="${resource}" class="mini-node ${hit?'active':''}" aria-label="${E(label)}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><text x="${x+w/2}" y="${y+h/2+4}" text-anchor="middle">${E(label)}</text></g>`;
  q('global-locator').innerHTML=`<svg viewBox="0 0 374 178" role="img" aria-label="当前资源：${E(title(current))}；所属${E(f)}"><path class="mini-wire" d="M80 43H115 M255 43H287 M255 91H287 M255 140H287 M80 132H115"/><rect class="mini-domain ${f==='compute'?'active-domain':''}" x="113" y="15" width="146" height="149" rx="8"/>${b('power',4,27,76,32,'供配电','power',f==='power')}${b('cool',4,116,76,32,'冷却设施','cooling',f==='cool')}${b('network',287,27,83,32,'管理 / 网络','ethernet',f==='network')}${b('bus',287,75,83,32,profile==='NV'?'NVLink':'域内互联','hccs',f==='bus')}${b('storage',287,123,83,32,'共享存储','storage',f==='storage')}${b('rack',123,27,126,31,'机柜 → 服务器','rack',f==='compute'&&special==='rack')}${b('cpu',123,76,58,31,'CPU','cpu',f==='compute'&&special==='cpu')}${b('dram',191,76,58,31,'主机内存','dram',f==='compute'&&special==='dram')}${b('npu',123,123,58,31,profile==='NV'?'GPU':'NPU','npu',f==='compute'&&special==='npu')}${b('hbm',191,123,58,31,'HBM','hbm',f==='compute'&&special==='hbm')}</svg>`;
  q('global-locator').dataset.current=current;q('global-locator').dataset.family=f;
  q('locator-path').innerHTML=ancestors(current).map((id,i)=>`${i?'<span>›</span>':''}<button data-resource="${id}" class="${id===current?'here':''}">${E(title(id))}</button>`).join('');
 }
 function drawDiagram(){
  const kind=state.diagram==='auto'?AtlasTopology.auto(current):state.diagram;state.diagramData=AtlasTopology.make(kind,profile);
  q('wire-title').textContent=state.diagramData.title;q('wire-heading').textContent=state.diagramData.heading;q('wire-canvas').innerHTML=AtlasTopology.svg(state.diagramData,current);
  fitDiagram();q('wire-sources').innerHTML='<span>本图依据 / 支持范围：</span>'+sourceLinks(state.diagramData.sources);
  q('wire-panel').dataset.kind=kind;q('wire-panel').dataset.profile=profile;
 }
 function fitDiagram(){
  const sc=document.querySelector('.wire-scroll');if(!sc||!state.diagramData||q('wire-panel').hidden)return;
  const availableWidth=Math.max(250,sc.clientWidth-28), availableHeight=Math.max(200,sc.clientHeight-8);
  const fit=window.innerWidth<=680?Math.max(800,availableWidth):Math.min(availableWidth,availableHeight*state.diagramData.width/state.diagramData.height);
  q('wire-canvas').style.width=Math.round(fit*state.scale)+'px';
 }
 function setMode(mode){state.mode=mode==='wire'?'wire':'3d';document.querySelector('.stage').hidden=state.mode!=='3d';document.querySelector('.scene-controls').hidden=state.mode!=='3d';q('wire-panel').hidden=state.mode!=='wire';document.querySelectorAll('[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===state.mode);b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode));});q('diagram-picker').hidden=state.mode!=='wire';drawDiagram();if(state.mode==='3d'){renderer.resize();renderer.dirty=true;}route();}
 function profileBar(){
  const labels={A2:['A2','风冷服务器'],A3:['A3','384 NPU超节点'],A5:['A5','资料待核实'],'950':['Atlas 950','独立公开实例'],NV:['NVIDIA','DGX GB200']};
  q('profile-tabs').innerHTML=['A2','A3','A5','950','NV'].map(k=>`<button data-profile="${k}" class="${profile===k?'selected':''} ${k==='A5'?'unverified':''}" aria-pressed="${profile===k}"><strong>${labels[k][0]}</strong><small>${labels[k][1]}</small></button>`).join('');
  const info=PROFILE_EXPLAIN[profile];q('profile-message').classList.toggle('unverified',profile==='A5');q('profile-message').innerHTML=`<span>${E(info.kind)}</span><span>${E(info.scope)}</span>`;
 }
 function annotate(root){
  const terms={...FAULT_TERMS,...GUIDE_TERMS,UB:'上下文相关：Unified Buffer为核内统一缓冲区；UnifiedBus为灵衢总线。两者不能混用。'};
  const keys=Object.keys(terms).filter(k=>/^[\w/.-]+$/.test(k)&&k.length>1).sort((a,b)=>b.length-a.length);
  const re=new RegExp(keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('a,abbr,button,script,style,svg,select')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT});
  const texts=[];while(walker.nextNode())texts.push(walker.currentNode);
  for(const n of texts){let value=n.nodeValue,m,last=0,frag=document.createDocumentFragment(),has=false;re.lastIndex=0;
   while((m=re.exec(value))){const key=m[0],before=value[m.index-1]||'',after=value[m.index+key.length]||'';if(/[A-Za-z0-9_]/.test(before)||/[A-Za-z0-9_]/.test(after))continue;frag.append(document.createTextNode(value.slice(last,m.index)));const a=document.createElement('abbr');a.textContent=key;a.title=terms[key];a.tabIndex=0;a.dataset.term=key;frag.append(a);last=m.index+key.length;has=true;}
   if(has){frag.append(document.createTextNode(value.slice(last)));n.replaceWith(frag);}
  }
 }
 renderPanel=function(){
  originalPanel();const r=RI[current];
  if(tab==='faults'&&profile==='NV')q('detail-content').insertAdjacentHTML('afterbegin','<div class="callout">当前为NVIDIA资源视角。原始清单中的昇腾告警用于故障域对照，不代表NVIDIA采用相同名称、错误码或恢复策略。</div>');
  if(tab==='resource'&&profile==='NV'&&NV_TEXT[current]){let ps=[...q('detail-content').children].filter(n=>n.tagName==='P');ps.forEach((n,i)=>{if(i<NV_TEXT[current].length)n.textContent=NV_TEXT[current][i];else n.remove();});}
  if(tab==='resource'){
   const guide=profile==='NV'&&NV_TEXT[current]?[...NV_TEXT[current],'功能图只说明资源职责；实际指令、内存可见性和同步方式以CUDA及所选GPU公开架构为准。']:DEEP_GUIDE[current]||[],info=PROFILE_EXPLAIN[profile];let html='<section class="deep-guide">';
   guide.forEach((t,i)=>{html+=`<h3>${['位置与组成','如何工作与连接','例子与边界'][i]}</h3><p>${E(t)}</p>`;});
   html+=`<div class="product-reading ${profile==='A5'?'unverified':''}"><h3>本产品实例怎么读</h3><p>${E(info.story)}</p><p>${E(info.difference)}</p>${sourceLinks(info.facts)}</div></section>`;
   const first=q('detail-content').querySelector('.section-head');if(first)first.insertAdjacentHTML('beforebegin',html);else q('detail-content').insertAdjacentHTML('beforeend',html);
  }
  if(tab==='compare'){
   q('detail-content').innerHTML=`<p class="lead">按相同层次比较 ${E(title(current))}，不把不同规模的总量当作单设备性能。</p><div class="compare-box"><h3>资源与连接职责</h3><p>${E(r.compare)}</p></div>${['A2','A3','A5','950','NV'].map(k=>`<section class="product-reading"><h3>${E(PROFILES[k].title)}</h3><p>${E(PROFILE_EXPLAIN[k].difference)}</p>${sourceLinks(PROFILE_EXPLAIN[k].facts)}<button data-profile="${k}">切换到这一实例 ↗</button></section>`).join('')}`;
  }
  if(profile==='NV'&&NV_TEXT[current]&&tab==='resource')q('detail-content').insertAdjacentHTML('beforeend',sourceLinks(['cuda','nvrack']));
  q('detail-title').textContent=title(current);annotate(q('detail-content'));
 };
 selectResource=function(id,options={}){
  if(!RI[id])return;ancestors(id).forEach(x=>state.open.add(x));originalSelect(id,options);profileBar();locator();drawDiagram();q('scene-title').textContent=title(current);q('detail-title').textContent=title(current);
  const i=READING_PATH.indexOf(current);q('reading-step').innerHTML=`<button ${i>0?`data-resource="${READING_PATH[i-1]}"`:'disabled'}>← 上一资源</button><span>从底向上 · ${i+1} / ${READING_PATH.length}</span><button ${i<READING_PATH.length-1?`data-resource="${READING_PATH[i+1]}"`:'disabled'}>下一资源 →</button>`;
  q('scene-note').classList.toggle('unverified',profile==='A5');persist();route();window.__atlasState={...window.__atlasState,view:state.mode,diagram:state.diagram,version:ATLAS_GUIDE_VERSION};
 };
 function toggle(id){if(state.open.has(id))state.open.delete(id);else state.open.add(id);renderNav();persist();q('resource-tree').querySelector(`[data-toggle="${id}"]`)?.focus();}
 function click(e){
  const go=e.target.closest('[data-go]');if(go){e.preventDefault();selectResource(go.dataset.go);return;}
  const t=e.target.closest('[data-toggle]');if(t){toggle(t.dataset.toggle);return;}
  const p=e.target.closest('[data-profile]');if(p){profile=p.dataset.profile;selectResource(current,{profile,tab});return;}
  const mode=e.target.closest('[data-mode]');if(mode){setMode(mode.dataset.mode);return;}
  const term=e.target.closest('[data-term]');if(term){openModal('help');q('modal-title').textContent=term.dataset.term;q('modal-subtitle').textContent='缩写与术语';q('modal-body').innerHTML=`<p class="lead">${E(term.title)}</p><p>术语需要结合当前资源与协议范围理解。</p>`;return;}
  const id=e.target.closest('button')?.id;
  if(id==='tree-expand'){RESOURCES.forEach(r=>state.open.add(r.id));renderNav();persist();}
  if(id==='tree-collapse'){state.open=new Set(['cluster']);renderNav();persist();}
  if(id==='start-route'){selectResource('power');}
  if(['wire-minus','wire-reset','wire-plus'].includes(id)){state.scale=id==='wire-reset'?1:Math.max(1,Math.min(2.4,state.scale+(id==='wire-plus'?.25:-.25)));drawDiagram();}
 }
 function keys(e){
  const svg=e.target.closest('[data-go]');if(svg&&['Enter',' '].includes(e.key)){e.preventDefault();selectResource(svg.dataset.go);return;}
  const ab=e.target.closest('[data-term]');if(ab&&['Enter',' '].includes(e.key)){e.preventDefault();ab.click();return;}
  const btn=e.target.closest('.tree-select');if(!btn)return;const id=btn.dataset.resource;let next=null;
  if(e.key==='ArrowRight'){if(!state.open.has(id)&&ordered(id).length){state.open.add(id);renderNav();next=id;}else next=ordered(id)[0]?.id;}
  else if(e.key==='ArrowLeft'){if(state.open.has(id)&&ordered(id).length){state.open.delete(id);renderNav();next=id;}else next=RI[id].parent;}
  else if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){const bs=[...q('resource-tree').querySelectorAll('.tree-select')],i=bs.indexOf(btn);next=(e.key==='Home'?bs[0]:e.key==='End'?bs.at(-1):bs[i+(e.key==='ArrowDown'?1:-1)])?.dataset.resource;}
  else return;e.preventDefault();if(next)q('resource-tree').querySelector(`[data-resource="${next}"]`)?.focus();persist();
 }
 setup();new ResizeObserver(()=>requestAnimationFrame(fitDiagram)).observe(document.querySelector('.wire-scroll'));document.addEventListener('click',click);document.addEventListener('keydown',keys);
 q('diagram-picker').addEventListener('change',e=>{state.diagram=e.target.value;state.scale=1;drawDiagram();route();});
 const initial=new URLSearchParams(location.hash.slice(1));state.mode=initial.get('view')==='wire'?'wire':'3d';state.diagram=initial.get('diagram') in AtlasTopology.titles?initial.get('diagram'):'auto';q('diagram-picker').value=state.diagram;
 selectResource(current,{profile,tab,fault:activeFault});setMode(state.mode);
 window.__atlasSelect=selectResource;
 window.__atlasExplorer={state,ancestors,title,setMode,diagram:()=>state.diagramData,version:ATLAS_GUIDE_VERSION};
})();
