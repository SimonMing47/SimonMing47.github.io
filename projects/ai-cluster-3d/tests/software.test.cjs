/** Offline regression tests for data, graph integrity and local bookmarks. Node 18+. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,window:{},location:{hash:''}});
const files=['data/resources.js','data/faults.js','data/profiles.js','data/sources.js','data/groups.js','data/guide.js','data/software-init.js','data/software-sources.js',...Array.from({length:8},(_,i)=>`data/software-${i}.js`),'data/software-link.js','src/engine.js','src/models.js','src/models-v2.js','src/topology.js','src/software-diagrams.js'];
files.forEach(f=>vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx,{filename:f}));
const report=vm.runInContext(`(()=>{
 const errors=[],check=(yes,m)=>{if(!yes)errors.push(m)},ids=new Set(RESOURCES.map(r=>r.id)),so=Object.keys(SOURCES);
 check(ids.size===RESOURCES.length,'duplicate resource ids');check(SOFTWARE_MODULES.length===75,'software module count');check(RESOURCES.length===122,'all resources');check(FAULTS.length===95,'faults unchanged');
 for(const m of SOFTWARE_MODULES){check(!!SW_INDEX[m.id],m.id+' index');check(ids.has(m.parent),m.id+' parent');check(m.carrier.length>0&&m.carrier.every(id=>ids.has(id)&&!SW_INDEX[id]),m.id+' hardware carriers');check(m.sources.length>0&&m.sources.every(id=>SOURCES[id]?.verification==='primary-body'),m.id+' verified source');check(m.sections.length===3,m.id+' section count');check(m.lead.length>=30&&m.analogy.length>=20&&m.boundary.length>=20,m.id+' detailed concepts');check(m.sections.every(s=>s.text.length>=30&&(s.reasoning||s.sources.length>0)),m.id+' sourced sections');check(m.sections.flatMap(s=>s.sources).every(id=>SOURCES[id]),m.id+' section source');check(!!AtlasTopology.titles[m.diagram],m.id+' diagram');}
 for(const r of RESOURCES){let n=r,seen=new Set;while(n){check(!seen.has(n.id),r.id+' cycle');if(seen.has(n.id))break;seen.add(n.id);check(!n.parent||ids.has(n.parent),r.id+' broken parent');n=RESOURCES.find(x=>x.id===n.parent);}check(r.sources.every(k=>SOURCES[k]),r.id+' sources');}
 for(const f of FAULTS){check(f.resources.every(id=>ids.has(id)),f.id+' mapping');check(!['generation','recovery','method','updated','generationRule','recoveryRule'].some(k=>k in f),f.id+' private fields');}
 for(const [id,fs]of Object.entries(SW_FAULT_LINKS)){check(!!SW_INDEX[id],id+' link module');check(fs.every(f=>FAULTS.some(v=>v.id===f)),id+' unknown fault');}
 let models=0,diagrams=0,sequences=0;
 for(const p of Object.keys(PROFILES)){
  for(const r of RESOURCES){let s=createModel(r,p);models++;check(s.vertices.length>0&&s.vertices.length%13===0&&s.vertices.every(Number.isFinite),r.id+'/'+p+' vertices');check(s.parts.every(x=>!x.resource||ids.has(x.resource)),r.id+'/'+p+' parts');if(SW_INDEX[r.id])check(s.caption.includes('软件模块')&&s.caption.includes('不表示软件'),r.id+' no fake card');}
  for(const k of Object.keys(AtlasTopology.titles)){let d=AtlasTopology.make(k,p);diagrams++;check(d.sources.every(x=>SOURCES[x]),k+' sources');check(d.width>0&&d.height>0,k+' canvas');if(d.sequence){sequences++;check(d.sequence.actors.every(id=>ids.has(id)),k+' actors');check(d.sequence.steps.every(s=>s[0]<d.sequence.actors.length&&s[1]<d.sequence.actors.length),k+' steps');}else{const ns=new Set(d.nodes.map(n=>n.id));check(ns.size===d.nodes.length,k+' duplicate diagram nodes');for(let i=0;i<d.nodes.length;i++){let a=d.nodes[i];check(ids.has(a.res),k+' target');check(a.x>=0&&a.y>=0&&a.x+a.w<=d.width&&a.y+a.h<=d.height,k+' node bounds');for(let j=i+1;j<d.nodes.length;j++){let b=d.nodes[j];check(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),k+' overlapping boxes');}}check(d.edges.every(e=>ns.has(e.from)&&ns.has(e.to)),k+' edge');}check(AtlasTopology.svg(d,'software').includes('<svg'),k+' SVG');}
 }
 check(PROFILES.A5.racks===0&&PROFILES.A5.busracks===0,'no guessed A5 hardware count');check(PROFILES.A5.sources.includes('sw_mindcluster'),'A5 official software evidence');
 return {errors,softwareModules:SOFTWARE_MODULES.length,resources:RESOURCES.length,faults:FAULTS.length,newDetailedSections:SOFTWARE_MODULES.reduce((n,m)=>n+m.sections.length,0),sources:so.length,softwareSources:Object.keys(SOURCES).filter(x=>x.startsWith('sw_')).length,modelProfileCases:models,diagramProfileCases:diagrams,sequenceProfileCases:sequences};
})()`,ctx,{timeout:35000});
assert.deepEqual(Array.from(report.errors),[]);
// The parent website is type:module. Load the browser script in its own realm,
// as index.html does, rather than treating this .js asset as a CommonJS module.
const bookmarkCtx=vm.createContext({TextEncoder});
vm.runInContext(fs.readFileSync(path.join(root,'src/bookmarks.js'),'utf8'),bookmarkCtx,{filename:'bookmarks.js'});
const {create,KEY,MAX_BYTES}=bookmarkCtx.AtlasBookmarks;
assert.equal(typeof create,'function','bookmark factory must be exposed to the browser realm');
const base={resources:['cann','kv-cache','hbm'],faults:['C18'],profiles:['A2','A3','A5','NV'],clock:()=> '2026-09-23T08:00:00.000Z'};
let backing=new Map(),writes=[];const storage={getItem:k=>backing.get(k)||null,setItem:(k,v)=>{writes.push(k);backing.set(k,v);}};
let a=create({...base,storage});assert.equal(a.snapshot().mode,'persistent');
assert.equal(a.toggle({kind:'resource',id:'cann',profile:'A3'}),true);const key=a.key({kind:'resource',id:'cann',profile:'A3'});a.updateNote(key,'记录 <img src=x onerror=alert(1)> & 版本边界');
a.upsert({kind:'section',id:'kv-cache',section:'analogy',profile:'A5'});a.upsert({kind:'fault',id:'C18',profile:'A2'});
let b=create({...base,storage});assert.equal(b.snapshot().count,3);assert.equal(b.snapshot().items.find(i=>i.key===key).note,'记录 <img src=x onerror=alert(1)> & 版本边界');assert.equal(b.snapshot().items.find(i=>i.key===key).updated,'2026-09-23T08:00:00.000Z');
let backup=b.exportJSON();assert.equal(JSON.parse(backup).items.length,3);assert.equal(a.importJSON(backup).duplicates,3);assert.equal(a.snapshot().count,3);
const malicious=JSON.stringify({version:1,items:[{kind:'resource',id:'does-not-exist'},{kind:'resource',id:'hbm',profile:'A3',note:'<script>test</script>',url:'javascript:alert(1)',title:'injected'},{kind:'section',id:'cann',section:'__proto__'}]});const imported=a.importJSON(malicious);assert.equal(imported.added,1);assert.equal(imported.rejected,2);const fresh=a.snapshot().items.find(i=>i.id==='hbm');assert.equal('url' in fresh,false);assert.equal('title' in fresh,false);
assert.throws(()=>a.importJSON('{broken'));assert.throws(()=>a.importJSON(JSON.stringify({version:2,items:[]})));assert.throws(()=>a.importJSON('x'.repeat(MAX_BYTES+1)));assert.throws(()=>a.updateNote(key,'x'.repeat(1601)));
assert.equal(a.toggle({kind:'resource',id:'cann',profile:'A3'}),false);b.sync();assert.equal(b.has({kind:'resource',id:'cann',profile:'A3'}),false);assert(writes.every(k=>k===KEY));
const denied=create({...base,storage:{getItem:()=>{throw Error('SecurityError')},setItem:()=>{throw Error('SecurityError')}}});denied.toggle({kind:'resource',id:'cann'});assert.equal(denied.snapshot().count,1);assert.equal(denied.snapshot().mode,'memory');assert(denied.snapshot().warning);
const full=create({...base,storage:{getItem:()=>null,setItem:()=>{throw Error('QuotaExceededError')}}});full.toggle({kind:'resource',id:'hbm'});assert.equal(full.snapshot().mode,'memory');assert.equal(JSON.parse(full.exportJSON()).items.length,1);
const corrupt=create({...base,storage:{getItem:()=>'{broken',setItem:()=>{throw Error('must not overwrite corrupted content')}}});corrupt.toggle({kind:'resource',id:'hbm'});assert.equal(corrupt.snapshot().mode,'memory');
for(const v of [a,b,denied,full,corrupt])v.destroy();
report.bookmarks={persistenceAdapterReload:'passed',notesRoundTrip:'passed',importMerge:'passed',invalidIdsAndExecutableFields:'rejected',corruptedStorage:'memory fallback',quotaAndSecurityError:'memory fallback',writesLimitedToOwnKey:true,tests:'Node adapter tests, not browser-origin persistence'};
console.log(JSON.stringify(report,null,2));
