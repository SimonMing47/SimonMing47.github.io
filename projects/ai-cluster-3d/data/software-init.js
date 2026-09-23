// Software data bootstrap. Rows retain full prose while avoiding repeated schema boilerplate.
const ATLAS_INITIAL_HASH = typeof location !== 'undefined' ? location.hash : '';
const SOFTWARE_MODULES = [];
const SOFTWARE_LAYERS = ['软件架构','节点使能','运行时与编译','容器与隔离','编排与调度','训练与通信','推理与服务','可观测性与平台'];
// Row columns: id, title, English name, parent, diagram, hardware carriers, sources,
// lead, position, mechanism, example, boundary, analogy, terms, comparison, interfaces.
function defineSoftware(layer,rows){
 for(const row of rows){
  if(row.length!==16)throw Error('Invalid software content row: '+row[0]);
  const [id,title,en,parent,diagram,carrier,sources,lead,position,mechanism,example,boundary,analogy,terms,compare,interfaces]=row;
  SOFTWARE_MODULES.push({id,title,en,parent,layer,diagram,carrier,sources,lead,
   sections:[{key:'position',title:'位置、组成与责任',text:position,sources},
    {key:'mechanism',title:'一次工作如何完成',text:mechanism,sources},
    {key:'example',title:'例子与工程推导',text:example,sources:[],reasoning:true}],
   boundary,analogy,terms,compare,interfaces});
 }
}
