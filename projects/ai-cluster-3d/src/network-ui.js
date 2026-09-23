/* Product evidence and local bookmarks share the same resource/profile state. */
(() => {
 const oldPanel=renderPanel,oldSelect=selectResource,oldNav=renderNav;
 const relevant=new Set(['cluster','superpod','rack','server','board','npu','hccs','busdevice','busport','nic','probe']);
 const parts=['position','mechanism','example'];
 const large=document.createElement('button');large.id='network-large';large.textContent='展开大图';document.querySelector('.wire-tools').appendChild(large);
 document.addEventListener('click',e=>{if(e.target.closest('#network-large')){const d=window.__atlasExplorer.diagram();openModal('help');document.getElementById('modal-card').classList.remove('narrow');document.getElementById('modal-card').classList.add('network-large');document.getElementById('modal-title').textContent=d.title;document.getElementById('modal-subtitle').textContent=d.heading;document.getElementById('modal-body').innerHTML=AtlasTopology.svg(d,current)+sourceLinks(d.sources);}else if(e.target.closest('#modal-close'))document.getElementById('modal-card').classList.remove('network-large');else if(e.target.closest('#modal [data-go]')){closeModal();document.getElementById('modal-card').classList.remove('network-large');}});
 function save(section){const value={kind:'section',id:current,section,profile},yes=__knowledge.store.has(value);return `<button class="save-point ${yes?'saved':''}" data-save="${esc(JSON.stringify(value))}" aria-pressed="${yes}">${yes?'★ 已收藏':'☆ 收藏'}</button>`;}
 function repaint(){
  const labels={A2:['A2','风冷服务器'],A3:['A3','HiAM / HCCS'],A5:['A5 / 950','X–Y–Z互联'],'A5-850':['A5 / 850','5808交换式'],'950':['Atlas 950','1024处理器实例'],NV:['NVIDIA','DGX GB200']};
  document.getElementById('profile-tabs').innerHTML=['A2','A3','A5','A5-850','950','NV'].map(k=>{const v=labels[k];return `<button data-profile="${k}" class="${profile===k?'selected':''}" aria-pressed="${profile===k}"><strong>${v[0]}</strong><small>${v[1]}</small></button>`;}).join('');
  for(const el of document.querySelectorAll('.profile-message.unverified,.product-reading.unverified,.scene-note.unverified'))el.classList.remove('unverified');
  if(NETWORK_REVIEW[profile]){
   const name=PROFILES[profile].title;
   if(!SW_INDEX[current])document.getElementById('profile-message').innerHTML='<span>'+esc(name)+'</span><span>官方型号/拓扑证据；坐标非施工接线</span>';
   document.getElementById('scope-chip').textContent=SW_INDEX[current]?'软件逻辑 / 受版本约束':'已核实拓扑 / 几何位置示意';
   for(const el of document.querySelectorAll('#breadcrumb [data-resource="superpod"],#locator-path [data-resource="superpod"],.tree-select[data-resource="superpod"] .tree-title'))el.textContent=name;
   if(current==='superpod'){document.getElementById('scene-title').textContent=name;document.getElementById('detail-title').textContent=name;}
  }
 }
 renderNav=function(){oldNav();if(document.getElementById('profile-tabs'))repaint();};
 renderPanel=function(){
  oldPanel();const item=NETWORK_REVIEW[profile];if(!item||!relevant.has(current))return;
  if(['resource','protocol','compare'].includes(tab)){
   const box=document.createElement('div');box.className='network-evidence';
   box.innerHTML=`<div class="section-head">已核实的产品组网 · ${esc(item.title)}</div><p class="lead-note">型号关联、拓扑关系与实际端口布线是三种不同证据。</p>`+item.paragraphs.map((v,i)=>`<section class="knowledge-section" id="point-${parts[i]}"><header><h3>${['本实例的资源层级','连接如何跨越边界','编号、版本与适用范围'][i]}</h3>${save(parts[i])}</header><p>${esc(v)}</p></section>`).join('')+`<section class="knowledge-section analogy" id="point-analogy"><header><h3>用比喻理解</h3>${save('analogy')}</header><p>${esc(item.analogy)}</p></section>`+sourceLinks(item.sources)+`<div class="part-links topology-links"><button data-topology="${esc(item.diagram)}">查看本实例组网 ↗</button><button data-topology="net-levels">A5 Rank路径分支 ↗</button><button data-profile="A5-850">切换850/850E实例 ↗</button></div>`;
   document.getElementById('detail-content').prepend(box);
  }
 };
 selectResource=function(id,options={}){oldSelect(id,options);repaint();window.__atlasState={...window.__atlasState,version:'3.1.0',networkEvidence:NETWORK_UPSTREAM};};
 document.addEventListener('click',e=>{const b=e.target.closest('[data-topology]');if(!b)return;const x=window.__atlasExplorer;x.state.diagram=b.dataset.topology;document.getElementById('diagram-picker').value=b.dataset.topology;x.setMode('wire');});
 window.__atlasSelect=selectResource;
 selectResource(current,{profile,tab,fault:activeFault,autoDiagram:false});
})();
