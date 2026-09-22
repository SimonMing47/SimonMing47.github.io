/** Offline regression tests. Run with Node.js 18+; no package installation. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '..');
const ctx = vm.createContext({console});
for (const file of ['data/resources.js','data/faults.js','data/profiles.js','data/sources.js','data/groups.js','data/guide.js','src/engine.js','src/models.js','src/models-v2.js','src/topology.js']) {
  vm.runInContext(fs.readFileSync(path.join(ROOT,file),'utf8'),ctx,{filename:file});
}
const result = vm.runInContext(`(() => {
 const errors=[],ids=new Set(RESOURCES.map(r=>r.id));
 const check=(ok,message)=>{if(!ok)errors.push(message);};
 check(ids.size===47,'resource count');check(FAULTS.length===95,'fault count');
 check(new Set(READING_PATH).size===47 && READING_PATH.every(id=>ids.has(id)),'reading path');
 for(const r of RESOURCES){check(DEEP_GUIDE[r.id]?.length===3,r.id+': detailed paragraphs');let seen=new Set(),p=r;while(p){check(!seen.has(p.id),r.id+': parent cycle');if(seen.has(p.id))break;seen.add(p.id);p=RESOURCES.find(x=>x.id===p.parent);}for(const key of r.sources)check(!!SOURCES[key],r.id+': source '+key);}
 for(const f of FAULTS){check(f.resources.every(id=>ids.has(id)),f.id+': resource');for(const k of ['generation','recovery','method','updated','generationRule','recoveryRule'])check(!(k in f),f.id+': private configuration '+k);}
 let models=0,diagrams=0,largest=0,diagramNodeIssues=[];
 for(const p of Object.keys(PROFILES)){
  for(const r of RESOURCES){const s=createModel(r,p);models++;check(s.parts.length>0,p+'/'+r.id+': empty');check(s.vertices.length%13===0,p+'/'+r.id+': stride');check(s.vertices.every(Number.isFinite),p+'/'+r.id+': nonfinite');check(s.parts.every(x=>!x.resource||ids.has(x.resource)),p+'/'+r.id+': unknown resource');largest=Math.max(largest,s.parts.length);}
  for(const kind of Object.keys(AtlasTopology.titles)){
   const d=AtlasTopology.make(kind,p);diagrams++;check(d.nodes.length>0,p+'/'+kind+': empty diagram');for(const k of d.sources)check(!!SOURCES[k],p+'/'+kind+': source '+k);
   for(const n of d.nodes){check(ids.has(n.res),kind+': missing target');check(n.x>=0&&n.y>=0&&n.x+n.w<=d.width&&n.y+n.h<=d.height,p+'/'+kind+': node bounds '+n.id);}
   for(let i=0;i<d.nodes.length;i++)for(let j=i+1;j<d.nodes.length;j++){const a=d.nodes[i],b=d.nodes[j];check(!(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y),p+'/'+kind+': overlapping nodes '+a.id+'/'+b.id);}
  }
 }
 const sA2=createModel(RESOURCES.find(r=>r.id==='server'),'A2'),sNV=createModel(RESOURCES.find(r=>r.id==='server'),'NV');
 check(sA2.parts.filter(x=>x.resource==='cpu').length===4,'A2 four CPUs');
 check(sA2.parts.filter(x=>x.name?.startsWith('DDR4插槽')).length===32,'A2 32 DIMM slots');
 check(sA2.parts.filter(x=>x.resource==='psu').length===4,'A2 4 power modules');
 check(sNV.parts.filter(x=>x.resource==='cpu').length===2,'NV two CPUs per tray');
 check(sNV.parts.filter(x=>x.resource==='npu').length===4,'NV four GPUs per tray');
 for(const p of ['A3','950']){const s=createModel(RESOURCES.find(r=>r.id==='superpod'),p);check(s.parts.filter(x=>x.name?.match(/^C[0-9]+ /)&&x.size[1]===.14).length===PROFILES[p].racks,p+' compute cabinets');check(s.parts.filter(x=>x.name?.match(/^B[0-9]+ /)&&x.size[1]===.14).length===4,p+' bus cabinets');}
 check(PROFILES.A5.racks===0&&PROFILES.A5.busracks===0,'A5 must not fabricate counts');
 return {errors,resources:RESOURCES.length,faults:FAULTS.length,detailedParagraphs:Object.values(DEEP_GUIDE).reduce((n,p)=>n+p.length,0),sources:Object.keys(SOURCES).length,models,diagrams,largestModelParts:largest};
})()`, ctx, {timeout:30000});
assert.deepEqual(Array.from(result.errors),[]);
console.log(JSON.stringify(result,null,2));
