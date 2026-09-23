/* Software-aware reading UI, rich accessible previews, source scopes, and local bookmarks. */
(() => {
 'use strict';
 const Q=id=>document.getElementById(id),E=esc,ex=window.__atlasExplorer;
 const oldSelect=selectResource,oldPanel=renderPanel,oldFaults=faultsFor,oldFaultCard=faultCard,oldOpenModal=openModal;
 const store=AtlasBookmarks.create({resources:RESOURCES.map(r=>r.id),faults:FAULTS.map(f=>f.id),profiles:Object.keys(PROFILES)});
 let domain='all',hoverTimer=null,hoverAnchor=null,libraryOpen=false,returnFocus=null;
 const SW_ROOTS=['software','node-software','execution','containers','orchestration','training','serving','operations'];
 const titles={overview:'整个知识点',position:'位置、组成与责任',mechanism:'一次工作如何完成',example:'例子与工程推导',boundary:'适用条件与边界',analogy:'类比与限度',protocol:'接口与依赖',sources:'来源与证据',compare:'厂商对照'};
 const spec=(kind='resource',id=current,section='overview',p=profile)=>({kind,id,section,profile:p});
 const savedButton=(s,label='收藏')=>{const saved=store.has(s);return `<button class="save-point ${saved?'saved':''}" data-save="${E(JSON.stringify(s))}" aria-pressed="${saved}" title="${saved?'取消收藏':'收藏到当前浏览器'}">${saved?'★ 已收藏':'☆ '+E(label)}</button>`;};
 const safeSources=ids=>[...new Set(ids)].filter(k=>SOURCES[k]);
 const citations=ids=>`<div class="evidence-links">${safeSources(ids).map(k=>`<a href="${E(SOURCES[k].url)}" target="_blank" rel="noopener noreferrer">${E(SOURCES[k].title)} ↗</a>`).join('')}</div>`;
 const recordTitle=v=>v.kind==='fault'?FI[v.id]?.name||v.id:RI[v.id]?.title||v.id;
 function resultMessage(add){const s=store.snapshot();toast((add?'已收藏':'已取消收藏')+(s.mode==='persistent'?' · 已写入当前浏览器':' · 仅本页面保存，请导出'));}
 function updateSaveButtons(){document.querySelectorAll('[data-save]').forEach(b=>{try{let s=JSON.parse(b.dataset.save),yes=store.has(s);b.classList.toggle('saved',yes);b.setAttribute('aria-pressed',String(yes));b.textContent=yes?'★ 已收藏':'☆ 收藏';}catch(_){}});Q('library-count').textContent=store.snapshot().count;const s=store.snapshot();Q('save-status').textContent=s.mode==='persistent'?'本地收藏 · 可导出备份':'暂存模式 · 请导出备份';}
 function headControls(){if(!Q('resource-save'))document.querySelector('.detail-header').insertAdjacentHTML('beforeend','<div id="resource-save" class="resource-save"></div>');Q('resource-save').innerHTML=savedButton(spec())+'<span>'+ (SW_INDEX[current]?'软件模块 · 不增加物理器件':'硬件资源 · 功能与连接边界')+'</span>';}
 function sourceDetails(ids){return safeSources(ids).map(k=>{const s=SOURCES[k];return `<section class="source-card evidence-card"><span class="verified ${s.verification==='primary-body'?'read':'legacy'}">${E(s.statusLabel||'参考来源')}</span><a href="${E(s.url)}" target="_blank" rel="noopener noreferrer">${E(s.title)} ↗</a><p>${E(s.scope)}</p><small>${E(s.version||'资料入口')} · 核读/记录日期 ${E(s.checked||'未记录')}</small></section>`;}).join('');}
 faultsFor=function(id,children=false){if(!SW_INDEX[id])return oldFaults(id,children);const target=children?descendantIDs(id):new Set([id]);const ids=new Set([...target].flatMap(k=>SW_FAULT_LINKS[k]||[]));return FAULTS.filter(f=>ids.has(f.id));};
 faultCard=function(f,open=false){return oldFaultCard(f,open).replace('<div class="fault-body">','<div class="fault-body"><div class="fault-bookmark">'+savedButton(spec('fault',f.id))+'</div>');};
 function softwarePanel(m){let html='';
  if(tab==='resource'){
   html=`<div class="content-evidence"><span>软件逻辑 / ${E(SOFTWARE_LAYERS[m.layer])}</span><span>资料核读：2026-09-23</span></div><p class="lead">${E(m.lead)}</p>${citations(m.sources)}<div class="carrier-links"><span>承载硬件</span>${m.carrier.map(k=>`<button data-resource="${k}">${E(RI[k].title)} ↗</button>`).join('')}</div>`;
   m.sections.forEach(s=>{html+=`<section id="point-${s.key}" class="knowledge-section"><header><h3>${E(s.title)}</h3>${savedButton(spec('section',m.id,s.key))}</header>${s.reasoning?'<span class="reasoning-label">原创建模例子 / 工程推导，不是厂商性能承诺</span>':''}<p>${E(s.text)}</p>${s.sources.length?citations(s.sources):''}</section>`;});
   html+=`<section id="point-boundary" class="knowledge-section"><header><h3>适用条件与边界</h3>${savedButton(spec('section',m.id,'boundary'))}</header><p>${E(m.boundary)}</p></section><section id="point-analogy" class="knowledge-section analogy"><header><h3>用一个比喻理解</h3>${savedButton(spec('section',m.id,'analogy'))}</header><p>${E(m.analogy)}</p><small>类比帮助理解职责，不是物理结构或实现保证。</small></section>`;
   if(m.terms.length)html+='<h3>名称与缩写</h3>'+m.terms.map(t=>'<p class="term-row">'+E(t)+'</p>').join('');
   const ff=faultsFor(m.id);if(ff.length)html+='<h3>相关故障知识</h3>'+ff.slice(0,8).map(f=>`<button class="use-link" data-open-fault="${f.id}">${E(f.name)} ↗</button>`).join('');
  }else if(tab==='protocol'){
   html=`<p class="lead">${E(m.lead)}</p><h3>接口、输入与输出</h3>${m.interfaces.length?m.interfaces.map(t=>`<p class="protocol-step">${E(t)}</p>`).join(''):`<p>${E(m.sections[1].text)}</p>`}<p class="callout">这些是软件调用、生命周期或数据依赖，不是机柜上新增的物理链路协议。请在中央逻辑图中查看调用方向。</p><h3>承载硬件</h3><div class="part-links">${m.carrier.map(id=>`<button data-resource="${id}">${E(RI[id].title)} ↗</button>`).join('')}</div><h3>适用边界</h3><p>${E(m.boundary)}</p>${citations(m.sources)}`;
  }else if(tab==='faults')html=renderFaults(RI[m.id]);
  else if(tab==='sources')html=`<p class="lead">每条来源只支持其注明的事实范围。</p><p>正文是基于公开资料的解释；例子与类比为原创说明。软件支持依发布版本和兼容矩阵，不由A2/A3/A5的代际名字自动决定。</p>${sourceDetails(m.sources)}<p class="callout">旧版文档用于解释稳定机制时，会保留版本，不将它当成当前安装配方。不能从产品宣传或目录入口推导未公开内部接口。</p>`;
  else if(tab==='compare'){
   const pairs={0:['昇腾硬件 / CANN / 框架与引擎','NVIDIA硬件 / CUDA / 框架与引擎'],1:['NPU驱动、固件与TorchNPU/CANN配套','GPU驱动、CUDA用户态库与框架配套'],2:['AscendCL、CANN图与算子路径','CUDA运行时、库与目标Kernel路径'],3:['设备插件 / Ascend容器接入 / 受支持vNPU','设备接入工具 / 受支持MIG等机制'],4:['MindCluster与Kubernetes/Volcano配套','Kubernetes或其他调度方案与NVIDIA设备支持'],5:['PyTorch+TorchNPU 或 MindSpore；按支持选择HCCL','PyTorch等框架及对应后端；按支持选择NCCL'],6:['MindIE或vLLM Ascend等受支持路线','vLLM、TensorRT-LLM等受支持路线'],7:['CCAE、MindCluster与通用遥测组件','厂商设备工具与通用遥测组件']};
   const p=pairs[m.layer];html=`<p class="lead">${E(m.compare||'只对照同一层的职责。支持能力、接口、模型范围与版本不能按名称一一替换。')}</p><div class="compare-box"><h3>昇腾路线</h3><p>${E(p[0])}</p></div><div class="compare-box"><h3>NVIDIA路线</h3><p>${E(p[1])}</p></div><p>${E(m.boundary)}</p><p class="callout">当前硬件视角：${E(PROFILES[profile].title)}。这不是软件兼容矩阵；尤其不能依据“A5”名字推断所有优化已支持。</p>${citations([...m.sources,'sw_torch_npu','cuda','sw_mindcluster'])}`;
  }
  Q('detail-content').innerHTML=html;Q('detail-content').scrollTop=0;document.querySelectorAll('.tab').forEach(b=>{b.classList.toggle('active',b.dataset.tab===tab);b.setAttribute('aria-selected',String(b.dataset.tab===tab));});Q('fault-tab-count').textContent=faultsFor(m.id).length;
 }
 renderPanel=function(){const m=SW_INDEX[current];if(m)softwarePanel(m);else {oldPanel();if(tab==='sources')Q('detail-content').insertAdjacentHTML('afterbegin','<div class="callout">硬件规格与通用机制分开核对。新软件来源为本轮正文核读；旧故障清单名称来自收录资料，引用不能代替专有错误码与阈值规范。</div>');}
  headControls();decorateTerms(Q('detail-content'));updateSaveButtons();};
 function decorateTerms(container){
  const terms={...FAULT_TERMS,...GUIDE_TERMS};Object.keys(terms).filter(t=>t.length>1&&/^[\w/.-]+$/.test(t)).sort((a,b)=>b.length-a.length).forEach(k=>{});
  const keys=Object.keys(terms).filter(t=>t.length>1&&/^[\w/.-]+$/.test(t)).sort((a,b)=>b.length-a.length),re=new RegExp(keys.map(t=>t.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g');
  const walk=document.createTreeWalker(container,NodeFilter.SHOW_TEXT,{acceptNode:n=>n.parentElement.closest('abbr,a,button,script,style,textarea,code')?NodeFilter.FILTER_REJECT:NodeFilter.FILTER_ACCEPT}),nodes=[];while(walk.nextNode())nodes.push(walk.currentNode);
  for(const node of nodes){let value=node.nodeValue,match,last=0,changed=false,frag=document.createDocumentFragment();re.lastIndex=0;while((match=re.exec(value))){let t=match[0],a=value[match.index-1]||'',b=value[match.index+t.length]||'';if(/[A-Za-z0-9_]/.test(a)||/[A-Za-z0-9_]/.test(b))continue;frag.append(document.createTextNode(value.slice(last,match.index)));let el=document.createElement('abbr');el.textContent=t;el.title=terms[t];el.tabIndex=0;el.dataset.term=t;frag.append(el);last=match.index+t.length;changed=true;}if(changed){frag.append(document.createTextNode(value.slice(last)));node.replaceWith(frag);}}
 }
 function softwareLocator(){const m=SW_INDEX[current];if(!m){Q('global-locator').classList.remove('software-map');return;}Q('global-locator').classList.add('software-map');Q('global-locator').dataset.current=current;Q('global-locator').dataset.family='software-'+m.layer;
  Q('global-locator').innerHTML=`<div class="software-locator" role="group" aria-label="软件全栈位置">${SW_ROOTS.map((id,i)=>`<button data-resource="${id}" class="${m.layer===i?'active':''}"><span>${i+1}</span>${E(SOFTWARE_LAYERS[i])}</button>`).join('')}</div><div class="map-carriers">承载于 ${m.carrier.map(k=>`<button data-resource="${k}">${E(RI[k].title)}</button>`).join('')}</div>`;
  document.querySelector('.locator-card h2').textContent='全栈位置 · 软件与硬件';
 }
 function filterTree(){Q('resource-tree').querySelectorAll('.tree-row').forEach(row=>{const id=row.querySelector('[data-resource]')?.dataset.resource;const li=row.parentElement;if(!id)return;const visible=domain==='all'||id==='cluster'||(domain==='software'?(!!SW_INDEX[id]):(!SW_INDEX[id]));li.hidden=!visible;});document.querySelectorAll('[data-domain]').forEach(b=>{b.classList.toggle('selected',b.dataset.domain===domain);b.setAttribute('aria-pressed',String(b.dataset.domain===domain));});}
 const oldNav=renderNav;renderNav=function(){oldNav();filterTree();};
 selectResource=function(id,options={}){
  if(!RI[id])return;const m=SW_INDEX[id];if(domain==='hardware'&&m||domain==='software'&&!m&&id!=='cluster')domain='all';
  if(m&&options.autoDiagram!==false){ex.state.diagram='auto';Q('diagram-picker').value='auto';}
  oldSelect(id,options);softwareLocator();headControls();updateSaveButtons();filterTree();
  document.querySelector('[data-mode="3d"]').textContent=m?'承载硬件 3D':'3D 拆解';document.querySelector('[data-mode="wire"]').textContent=m?'架构 / 时序':'组网线框';
  Q('profile-message').classList.toggle('software-profile',!!m);if(m)Q('profile-message').innerHTML=`<span>硬件上下文：${E(PROFILES[profile].short)}</span><span>软件能力按版本核对，不由代际名推断</span>`;
  if(m&&options.keepMode!==true)ex.setMode('wire');
  const a5Label=document.querySelector('[data-profile="A5"] small');if(a5Label)a5Label.textContent=m?'软件适配有依据':'硬件映射待核实';
  renderer.labelNodes?.forEach(({p,b})=>{if(p.resource)b.dataset.preview=p.resource;});
  window.__atlasState={...window.__atlasState,view:ex.state.mode,diagram:ex.state.diagram,knowledgeVersion:'3.0.0',domain:m?'software':'hardware'};
 };
 function hidePreview(){clearTimeout(hoverTimer);Q('knowledge-preview').hidden=true;hoverAnchor=null;}
 function showPreview(el){
  const id=el.dataset.preview||el.dataset.go||el.dataset.resource,term=el.dataset.term;let title,lead,analogy='',src=[],detail='';
  if(term){title=term;lead=el.title||GUIDE_TERMS[term]||FAULT_TERMS[term]||'';detail='术语需结合当前模块与目标版本理解。';}
  else {const r=RI[id];if(!r)return;const m=SW_INDEX[id];title=r.title;lead=r.lead;analogy=m?.analogy||'';src=r.sources;detail=m?'软件逻辑模块 · '+SOFTWARE_LAYERS[m.layer]:'硬件位置与功能示意';}
  hoverAnchor=el;const box=Q('knowledge-preview');box.innerHTML=`<div class="preview-heading"><span>${E(detail)}</span><button id="preview-close" aria-label="关闭知识预览">×</button></div><h3>${E(title)}</h3><p>${E(lead)}</p>${analogy?`<p class="preview-analogy">${E(analogy)}</p>`:''}${src.length?`<div class="preview-sources">${citations(src.slice(0,2))}</div>`:''}${id&&RI[id]?`<div class="preview-actions"><button data-resource="${id}">展开完整解释 ↗</button>${savedButton(spec('resource',id))}</div>`:''}`;box.hidden=false;
  const rect=el.getBoundingClientRect(),width=Math.min(400,innerWidth-24);box.style.width=width+'px';box.style.maxHeight=Math.min(470,innerHeight-24)+'px';const height=box.offsetHeight;let x=rect.right+12,y=rect.top;if(x+width>innerWidth-12)x=Math.max(12,rect.left-width-12);y=Math.max(12,Math.min(innerHeight-height-12,y));box.style.left=x+'px';box.style.top=y+'px';}
 function jumpBookmark(v){hidePreview();closeLibrary();if(v.kind==='fault'){openFault(v.id);selectResource(current,{profile:v.profile,tab:'faults',fault:v.id,keepMode:true});return;}
  selectResource(v.id,{profile:v.profile,tab:['protocol','sources','compare'].includes(v.section)?v.section:'resource'});requestAnimationFrame(()=>{const target=Q('point-'+v.section);if(target){Q('detail-content').scrollTop=target.offsetTop-Q('detail-content').offsetTop-12;target.classList.add('point-focus');setTimeout(()=>target.classList.remove('point-focus'),2200);}});
 }
 function openLibrary(){hidePreview();returnFocus=document.activeElement;libraryOpen=true;Q('bookmark-dialog').hidden=false;document.body.style.overflow='hidden';renderLibrary();setTimeout(()=>Q('bookmark-search').focus(),0);}
 function closeLibrary(){libraryOpen=false;Q('bookmark-dialog').hidden=true;document.body.style.overflow='';returnFocus?.focus?.();}
 function renderLibrary(){
  const search=Q('bookmark-search').value.trim().toLowerCase(),s=store.snapshot();Q('bookmark-status').textContent=s.warning||'收藏与备注仅存储在当前浏览器的本网站源下，不上传服务器。清理网站数据会删除收藏。';
  const list=s.items.filter(v=>[recordTitle(v),titles[v.section],v.note,PROFILES[v.profile]?.title].join(' ').toLowerCase().includes(search)).sort((a,b)=>b.created.localeCompare(a.created));
  Q('bookmark-items').innerHTML=list.map(v=>`<article class="bookmark-item" data-key="${E(v.key)}"><header><button class="bookmark-jump" data-bookmark-jump="${E(v.key)}">${E(recordTitle(v))} ↗</button><button data-remove-bookmark="${E(v.key)}" aria-label="移除${E(recordTitle(v))}">移除</button></header><small>${E(v.kind==='fault'?'故障说明':titles[v.section])} · ${E(PROFILES[v.profile]?.short||v.profile)}</small><label>我的备注<textarea maxlength="1600" data-note="${E(v.key)}" placeholder="记录自己的理解、疑问或待验证事项">${E(v.note)}</textarea></label><button data-save-note="${E(v.key)}">保存备注</button></article>`).join('')||'<div class="empty"><h3>这里保存值得反复阅读的知识点</h3><p>展开模块后点击“☆ 收藏”，也可以收藏某段解释或一条故障。收藏会保留产品视角。</p></div>';
  Q('bookmark-summary').textContent=`${list.length} / ${s.count} 项 · 导入采用合并，已有备注不会被覆盖`;
 }
 function downloadBookmarks(){const url=URL.createObjectURL(new Blob([store.exportJSON()],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='AI-Infra-知识收藏.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
 openModal=function(type){oldOpenModal(type);if(type==='help'){Q('modal-body').insertAdjacentHTML('afterbegin','<section class="subtle-box"><h3>软件层与本地知识收藏</h3><p>左侧可按硬件、软件或全栈过滤。软件模块默认展示架构图和时序，3D模式显示其承载硬件。悬停目录、图形或术语查看摘要与类比，点击进入完整说明。</p><p>整模块、解释段落及故障可单独收藏，支持备注和JSON备份。收藏仅保存到当前浏览器；存储不可用会提示临时模式。核查范围与资料日期以每条来源说明为准。</p></section>');}};
 function setup(){
  document.querySelector('.brand strong').textContent='AI Infra 全栈图谱';document.title='AI Infra 全栈图谱 · 硬件、软件与知识收藏';
  document.querySelector('.top-meta').innerHTML=`<span class="badge teal">硬件 × 软件</span><span class="badge">${RESOURCES.length} 知识节点</span><span class="badge orange">95 条故障说明</span>`;
  document.querySelector('.top-actions').insertAdjacentHTML('afterbegin','<button id="open-library" class="primary">☆ 收藏 <span id="library-count">0</span></button>');
  document.querySelector('.nav-header').insertAdjacentHTML('beforeend','<div class="domain-selector" role="group" aria-label="知识领域"><button data-domain="all" class="selected">全栈</button><button data-domain="hardware">硬件</button><button data-domain="software">软件</button></div>');
  document.querySelector('.nav-footer').insertAdjacentHTML('beforeend','<div id="save-status"></div>');
  document.body.insertAdjacentHTML('beforeend',`<aside id="knowledge-preview" role="dialog" aria-label="知识悬停预览" hidden></aside><div id="bookmark-dialog" class="bookmark-modal" hidden role="dialog" aria-modal="true" aria-labelledby="bookmark-title"><section class="bookmark-window"><header class="bookmark-top"><div><span class="eyebrow">MY KNOWLEDGE</span><h2 id="bookmark-title">我的知识收藏</h2></div><button id="bookmark-close" aria-label="关闭收藏">×</button></header><div class="bookmark-toolbar"><input id="bookmark-search" type="search" aria-label="搜索收藏" placeholder="搜索知识点、产品或备注"><button id="bookmark-export">导出 JSON</button><button id="bookmark-import">导入合并</button><input id="bookmark-file" type="file" accept="application/json,.json" hidden></div><div id="bookmark-status" class="bookmark-notice"></div><div id="bookmark-items"></div><footer><span id="bookmark-summary"></span><p>直接使用file://打开时，持久化规则随浏览器而异。跨设备迁移请导出再导入；不承诺自动同步。</p></footer></section></div>`);
 }
 setup();
 document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.save){try{resultMessage(store.toggle(JSON.parse(b.dataset.save)));}catch(err){toast(err.message);}return;}
  if(b.dataset.domain){domain=b.dataset.domain;if(domain==='software'){ex.state.open.add('software');SW_ROOTS.forEach(k=>ex.state.open.add(k));selectResource('software');}else if(domain==='hardware')selectResource('cluster');renderNav();return;}
  if(b.dataset.bookmarkJump){const v=store.snapshot().items.find(x=>x.key===b.dataset.bookmarkJump);if(v)jumpBookmark(v);return;}
  if(b.dataset.removeBookmark){store.remove(b.dataset.removeBookmark);renderLibrary();return;}
  if(b.dataset.saveNote){const key=b.dataset.saveNote;const el=[...Q('bookmark-items').querySelectorAll('[data-note]')].find(t=>t.dataset.note===key);try{store.updateNote(key,el.value);toast(store.snapshot().mode==='persistent'?'备注已保存到当前浏览器':'备注仅保留在本页面，请导出');}catch(err){toast(err.message);}return;}
  if(b.id==='open-library')openLibrary();if(b.id==='bookmark-close')closeLibrary();if(b.id==='bookmark-export')downloadBookmarks();if(b.id==='bookmark-import')Q('bookmark-file').click();if(b.id==='preview-close')hidePreview();
  if(b.dataset.resource||b.dataset.mode)hidePreview();
 });
 Q('bookmark-search').addEventListener('input',renderLibrary);
 Q('bookmark-file').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>AtlasBookmarks.MAX_BYTES)throw Error('文件超过2MiB限制');const r=store.importJSON(await file.text());renderLibrary();toast(`导入${r.added}项；重复${r.duplicates}项；无效${r.rejected}项`);}catch(err){toast('未导入：'+err.message);}e.target.value='';});
 Q('bookmark-dialog').addEventListener('click',e=>{if(e.target===Q('bookmark-dialog'))closeLibrary();});
 document.addEventListener('pointerover',e=>{if(e.pointerType==='touch')return;if(e.target.closest('#knowledge-preview')){clearTimeout(hoverTimer);return;}const el=e.target.closest('[data-preview],[data-go],.tree-select[data-resource],abbr[data-term],.part-links [data-resource]');if(!el)return;clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>showPreview(el),320);});
 document.addEventListener('pointerout',e=>{if(e.relatedTarget?.closest?.('#knowledge-preview'))return;if(e.target.closest('#knowledge-preview')||e.target.closest('[data-preview],[data-go],.tree-select,abbr,.part-links')){clearTimeout(hoverTimer);hoverTimer=setTimeout(hidePreview,220);}});
 document.addEventListener('focusin',e=>{const el=e.target.closest('[data-preview],[data-go],.tree-select,abbr[data-term]');if(el){clearTimeout(hoverTimer);hoverTimer=setTimeout(()=>showPreview(el),280);}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'){hidePreview();if(libraryOpen)closeLibrary();}if(libraryOpen&&e.key==='Tab'){const els=[...Q('bookmark-dialog').querySelectorAll('button,input,textarea')].filter(n=>!n.hidden&&n.offsetParent!==null);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
 store.subscribe(()=>{updateSaveButtons();});
 window.addEventListener('storage',()=>{if(libraryOpen)renderLibrary();});
 function fitSoftware(){if(!SW_INDEX[current]||Q('wire-panel').hidden)return;const area=Q('wire-scroll'),canvas=Q('wire-canvas');const width=Math.max(760,area.clientWidth-28);canvas.style.width=Math.round(width*ex.state.scale)+'px';}
 const swResize=new ResizeObserver(()=>requestAnimationFrame(fitSoftware));swResize.observe(Q('wire-scroll'));const swDiagramWatch=new MutationObserver(()=>requestAnimationFrame(fitSoftware));swDiagramWatch.observe(Q('wire-canvas'),{childList:true});
 const initial=new URLSearchParams(ATLAS_INITIAL_HASH.slice(1)),id=initial.get('resource')||'software';if(SW_INDEX[id])domain='software';selectResource(RI[id]?id:'software',{profile,tab,keepMode:initial.get('view')==='3d'});
 window.__atlasSelect=selectResource;window.__knowledge={store,openLibrary,closeLibrary,showPreview,hidePreview,version:'3.0.0',modules:SOFTWARE_MODULES,SW_INDEX};
})();
