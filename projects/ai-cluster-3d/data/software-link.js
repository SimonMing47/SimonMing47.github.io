/* Connect software knowledge to the existing hardware graph without claiming physical containment. */
const SW_INDEX = Object.fromEntries(SOFTWARE_MODULES.map(m=>[m.id,m]));
GROUPS.push(...SOFTWARE_LAYERS);
SOFTWARE_MODULES.forEach(m=>{
 RESOURCES.push({id:m.id,title:m.title,en:m.en,group:6+m.layer,parent:m.parent,model:'software',domain:'software',lead:m.lead,paras:m.sections.map(s=>s.text),protocol:m.interfaces.length?m.interfaces:['接口与依赖见逻辑图；不是新物理协议'],compare:m.compare||'比较对象是软件职责与支持组合，不是名称一一等价。具体后端、模型和硬件支持以引用版本为准。',sources:m.sources,terms:m.terms,scope:'软件逻辑模块；3D仅显示其承载硬件'});
 DEEP_GUIDE[m.id]=m.sections.map(s=>s.text);READING_PATH.push(m.id);
 m.terms.forEach(t=>{const [a,...rest]=t.split('·');if(a&&rest.length)GUIDE_TERMS[a.trim()]=rest.join('，').trim();});
});
// These are documented software support statements, not evidence of cabinet dimensions.
PROFILES.A5.notes='MindCluster官方开发仓库已出现A5适配及切分支持信息；具体软件能力需核对发布分支。A5与公开硬件型号的映射、柜数及板位尚未在本网站核实，不复用A3/Atlas950模型冒充。';
PROFILES.A5.specs=[['公开软件证据','MindCluster开发仓库提到A5'],['发布适用性','按版本兼容矩阵'],['硬件型号与拓扑','未核实，不推断'],['网站视图','通用原理＋软件架构']];
PROFILES.A5.sources=['sw_mindcluster','catalog','ub'];
PROFILE_EXPLAIN.A5.story=PROFILES.A5.notes;
PROFILE_EXPLAIN.A5.difference='软件适配声明与硬件机柜规格属于两类证据。Atlas950是独立公开实例，不默认为A5别名。';
PROFILE_EXPLAIN.A5.scope='软件名称有官方依据；硬件映射未核实';
PROFILE_EXPLAIN.A5.facts=['sw_mindcluster','catalog'];
const SW_FAULT_LINKS={
 'node-software':['C09','C12','X22'],boot:['C09','C12','X22'],driver:['C05','C12','X22'],compat:['X22'],execution:['C12','X17','X22'],cann:['C12','X17','X22'],acl:['X17','X22'],streams:['C12','B15'], 'device-memory':['X17','C18','X16'],
 containers:['C06','X16','X22'],images:['X22'],isolation:['C06','X16'], 'device-access':['C12','X22'],partition:['X17'],orchestration:['C06','C09','C12'],kworker:['C06','C09','X16'], 'device-plugin':['C12','X22'], 'pod-network':['C26','E22','X13'], 'volume-csi':['C07','C11','X09'], placement:['E18','B12'],mindcluster:['C09','C12','B14'], 'mindcluster-components':['C09','C12'],autoscale:['X17','X16'],
 training:['C06','C26','X17'],torchnpu:['X22','C12'], 'collective-libs':['C26','B15','X18','X19'],rank:['C26','B15'],collectives:['B15','X18'], 'data-parallel':['C26','C06'], 'tensor-parallel':['B12','C26'], 'pipeline-parallel':['B12','C26'], 'expert-parallel':['B12','E18'], 'fsdp-zero':['X17','B15'], dataloader:['C07','X09','X16'],checkpoint:['C07','C11','X09'],mindspeed:['X22'],
 serving:['X17','C06'],mindie:['X22','X17'],vllm:['X22','X17'], 'kv-cache':['X17'], 'paged-cache':['X17'],batching:['X17'], 'pd-disaggregation':['B15','X18','X19'],operations:['C09','X15'],metrics:['X15'],telemetry:['C06'], 'fault-recovery':['C09','C12','C26','C07'],security:['X15','E28','E29'],ccae:['C09','C12','B14']
};
// Record verification scope; a legacy link is not silently relabelled as freshly checked.
Object.values(SOURCES).forEach(s=>{if(!s.verification){s.verification='legacy-reference';s.statusLabel='上一版参考入口 / 本轮未逐条重读';}});
['a2public','a3','a950','nvrack','nv72','cuda','aer','hccs','rdma','numa','core200'].forEach(k=>{if(SOURCES[k]){SOURCES[k].verification='primary-body';SOURCES[k].statusLabel='官方资料 / 已核读所用内容';SOURCES[k].checked='2026-09-23';}});
