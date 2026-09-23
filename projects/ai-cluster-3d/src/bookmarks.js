/* Local-only, versioned knowledge bookmarks. No account, server or network writes. */
(function(root){
 'use strict';
 const KEY='ai-infra-atlas.bookmarks.v1',MAX_ITEMS=1200,MAX_BYTES=2*1024*1024;
 const allowedSections=new Set(['overview','position','mechanism','example','boundary','analogy','protocol','sources','compare']);
 function create(options={}){
  let storage=null,items=[],mode='persistent',warning='',listeners=new Set();
  const clock=options.clock||(()=>new Date().toISOString());
  const resources=new Set(options.resources||[]),faults=new Set(options.faults||[]),profiles=new Set(options.profiles||['A2','A3','A5','950','NV']);
  function normalize(input){
   if(!input||typeof input!=='object'||Array.isArray(input))return null;
   const kind=input.kind==='fault'?'fault':input.kind==='section'?'section':input.kind==='resource'?'resource':null;
   if(!kind||typeof input.id!=='string'||!(kind==='fault'?faults:resources).has(input.id))return null;
   const profile=profiles.has(input.profile)?input.profile:'A3';
   const section=kind==='section'&&allowedSections.has(input.section)?input.section:'overview';
   if(kind==='section'&&section==='overview')return null;
   const note=typeof input.note==='string'?input.note.slice(0,1600):'';
   const date=typeof input.created==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(input.created)&&Number.isFinite(Date.parse(input.created))?input.created:clock();
   const updated=typeof input.updated==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(input.updated)&&Number.isFinite(Date.parse(input.updated))?input.updated:date;
   return {key:[kind,input.id,section,profile].join(':'),kind,id:input.id,section,profile,note,created:date,updated};
  }
  function parse(raw){
   if(typeof raw!=='string'||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw Error('收藏文件过大或格式无效');
   const d=JSON.parse(raw);if(!d||d.version!==1||!Array.isArray(d.items)||d.items.length>MAX_ITEMS)throw Error('不支持的收藏文件格式或数量超过限制');
   const map=new Map();let rejected=0;for(const v of d.items){const n=normalize(v);if(n)map.set(n.key,n);else rejected++;}return {items:[...map.values()],rejected};
  }
  function notify(){for(const f of listeners)f(snapshot());}
  function snapshot(){return {mode,warning,items:items.map(i=>({...i})),count:items.length};}
  function load(){if(!storage||mode!=='persistent')return;try{let raw=storage.getItem(KEY);items=raw?parse(raw).items:[];}catch(e){mode='memory';warning='浏览器收藏存储不可用或内容损坏；当前更改仅保留在本页面，请导出备份。';}}
  try{storage=options.storage===undefined?root.localStorage:options.storage;if(!storage)throw Error('storage unavailable');load();}catch(e){mode='memory';warning='浏览器不允许持久化；本次收藏仅保留在页面内，请导出备份。';}
  function persist(){if(mode==='persistent')try{storage.setItem(KEY,JSON.stringify({version:1,items}));}catch(e){mode='memory';warning='收藏未能写入浏览器存储（权限或容量限制）；仅在本页面保留，请立即导出。';}notify();return snapshot();}
  function getKey(spec){const n=normalize(spec);if(!n)throw Error('知识点或收藏类型无效');return n.key;}
  function upsert(spec){const n=normalize(spec);if(!n)throw Error('知识点不存在，未保存');n.updated=clock();load();const index=items.findIndex(i=>i.key===n.key);if(index>=0)items[index]={...items[index],...n,created:items[index].created};else {if(items.length>=MAX_ITEMS)throw Error('收藏数量已达上限，请先导出整理');items.push(n);}return persist();}
  function remove(key){load();const old=items.find(i=>i.key===key);items=items.filter(i=>i.key!==key);persist();return old;}
  function toggle(spec){load();const key=getKey(spec),old=items.find(i=>i.key===key);if(old){remove(key);return false;}upsert(spec);return true;}
  function updateNote(key,note){if(typeof note!=='string'||note.length>1600)throw Error('备注最多1600个字符');load();const v=items.find(i=>i.key===key);if(!v)throw Error('该收藏已不存在');v.note=note;v.updated=clock();return persist();}
  function importJSON(raw){const parsed=parse(raw);load();const merged=new Map(items.map(i=>[i.key,i]));let added=0,duplicates=0;for(const v of parsed.items){if(merged.has(v.key)){duplicates++;continue;}merged.set(v.key,v);added++;}if(merged.size>MAX_ITEMS)throw Error('合并后收藏数量超过上限');items=[...merged.values()];persist();return {added,duplicates,rejected:parsed.rejected,mode};}
  function exportJSON(){return JSON.stringify({version:1,application:'AI Infra Atlas',exportedAt:clock(),items},null,2);}
  function sync(){if(mode==='persistent'){load();notify();}}
  const onStorage=e=>{if(e.key===KEY||e.key===null)sync();};root.addEventListener?.('storage',onStorage);
  return {snapshot,key:getKey,has:spec=>items.some(i=>i.key===getKey(spec)),toggle,upsert,remove,updateNote,importJSON,exportJSON,sync,subscribe:f=>{listeners.add(f);return()=>listeners.delete(f);},destroy:()=>{root.removeEventListener?.('storage',onStorage);listeners.clear();}};
 }
 const api={create,KEY,MAX_ITEMS,MAX_BYTES};root.AtlasBookmarks=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
