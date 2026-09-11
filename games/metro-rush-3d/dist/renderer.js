import { multiply, transform } from './math.js';
export { multiply, transform } from './math.js';
import { RunnerCharacter } from './character.js';
import { roundedBoxGeometry, smoothSphereGeometry, torsoGeometry } from './character-geometry.js';
import { LANE_WIDTH, randomSource, BONUSES, pickupPose, TRACK } from './engine.js';

const vertexSource = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in mat4 aModel;
layout(location=6) in vec4 aColor;
uniform mat4 uViewProjection;
uniform vec3 uCamera;
uniform vec2 uTunnelBounds;
out vec3 vColor;
out float vFog;
void main(){
  vec4 world = aModel * vec4(aPosition,1.0);
  mat3 m = mat3(aModel);
  vec3 n = normalize(m * (aNormal / vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]))));
  float sun = max(dot(n,normalize(vec3(-0.55,0.85,0.45))),0.0);
  float rim = max(dot(n,normalize(vec3(0.8,0.15,-0.5))),0.0);
  vec3 light = vec3(0.51,0.60,0.68) + vec3(0.65,0.53,0.37)*sun + vec3(0.04,0.13,0.15)*rim;
  float tunnel = smoothstep(uTunnelBounds.x-4.0,uTunnelBounds.x+4.0,world.z)*(1.0-smoothstep(uTunnelBounds.y-4.0,uTunnelBounds.y+4.0,world.z));
  light = mix(light,vec3(0.39,0.48,0.57)+vec3(0.18,0.13,0.06)*max(n.y,0.0),tunnel);
  vColor = mix(aColor.rgb * light,aColor.rgb,aColor.a);
  vFog = smoothstep(58.0,205.0,distance(uCamera,world.xyz));
  gl_Position = uViewProjection * world;
}`;
const fragmentSource = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vFog;
out vec4 outColor;
uniform float uTunnelBlend;
void main(){outColor=vec4(mix(vColor,mix(vec3(0.61,0.72,0.79),vec3(0.075,0.14,0.21),uTunnelBlend),vFog),1.0);}`;

function perspective(fov,aspect,near,far){const f=1/Math.tan(fov/2),n=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*n,-1,0,0,2*far*near*n,0]);}
function lookAt(eye,at){
  const normalize=v=>{const n=Math.hypot(...v);return v.map(x=>x/n);};
  const z=normalize(eye.map((v,i)=>v-at[i]));const x=normalize([z[2],0,-z[0]]);
  const y=[z[1]*x[2]-z[2]*x[1],z[2]*x[0]-z[0]*x[2],z[0]*x[1]-z[1]*x[0]];
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);
}
function cubeGeometry(){
  const data=[];
  const faces=[[[0,0,1],[[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]]],[[0,0,-1],[[1,-1,-1],[-1,-1,-1],[-1,1,-1],[1,1,-1]]],[[1,0,0],[[1,-1,1],[1,-1,-1],[1,1,-1],[1,1,1]]],[[-1,0,0],[[-1,-1,-1],[-1,-1,1],[-1,1,1],[-1,1,-1]]],[[0,1,0],[[-1,1,1],[1,1,1],[1,1,-1],[-1,1,-1]]],[[0,-1,0],[[-1,-1,-1],[1,-1,-1],[1,-1,1],[-1,-1,1]]]];
  for(const [n,v] of faces)for(const i of [0,1,2,0,2,3])data.push(...v[i].map(c=>c*.5),...n);
  return new Float32Array(data);
}
function cylinderGeometry(sides=16){
  const out=[];const v=(x,y,z,n)=>out.push(x,y,z,...n);
  for(let i=0;i<sides;i++){
    const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;
    const x=Math.cos(a)*.5,y=Math.sin(a)*.5,X=Math.cos(b)*.5,Y=Math.sin(b)*.5;
    for(const z of [-.5,.5]){const n=[0,0,Math.sign(z)];if(z>0){v(0,0,z,n);v(x,y,z,n);v(X,Y,z,n);}else{v(0,0,z,n);v(X,Y,z,n);v(x,y,z,n);}}
    const n=[Math.cos((a+b)/2),Math.sin((a+b)/2),0];
    for(const p of [[x,y,.5],[x,y,-.5],[X,Y,-.5],[x,y,.5],[X,Y,-.5],[X,Y,.5]])v(...p,n);
  }return new Float32Array(out);
}
function sphereGeometry(){
  const out=[],point=(u,v)=>[Math.cos(u)*Math.sin(v)*.5,Math.cos(v)*.5,Math.sin(u)*Math.sin(v)*.5];
  for(let j=0;j<8;j++)for(let i=0;i<12;i++){
    const a=point(i/12*Math.PI*2,j/8*Math.PI),b=point((i+1)/12*Math.PI*2,j/8*Math.PI),c=point((i+1)/12*Math.PI*2,(j+1)/8*Math.PI),d=point(i/12*Math.PI*2,(j+1)/8*Math.PI);
    for(const p of [a,b,c,a,c,d])out.push(...p,...p.map(x=>x*2));
  }return new Float32Array(out);
}
const colorCache=new Map();
function color(hex,glow=0){if(!colorCache.has(hex))colorCache.set(hex,[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255]);return [...colorCache.get(hex),glow];}
class Batch {
  constructor(gl,vertices,max=14000){
    this.gl=gl;this.count=0;this.max=max;this.data=new Float32Array(this.max*20);this.vertices=vertices.length/6;
    this.vao=gl.createVertexArray();gl.bindVertexArray(this.vao);
    this.vertexBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.vertexBuffer);gl.bufferData(gl.ARRAY_BUFFER,vertices,gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,24,0);
    gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,24,12);
    this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,this.data.byteLength,gl.DYNAMIC_DRAW);
    for(let i=0;i<4;i++){gl.enableVertexAttribArray(2+i);gl.vertexAttribPointer(2+i,4,gl.FLOAT,false,80,i*16);gl.vertexAttribDivisor(2+i,1);}
    gl.enableVertexAttribArray(6);gl.vertexAttribPointer(6,4,gl.FLOAT,false,80,64);gl.vertexAttribDivisor(6,1);gl.bindVertexArray(null);
  }
  add(matrix,c){if(this.count>=this.max)return;this.data.set(matrix,this.count*20);this.data.set(c,this.count*20+16);this.count++;}
  draw(){const gl=this.gl;if(!this.count)return;gl.bindVertexArray(this.vao);gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferSubData(gl.ARRAY_BUFFER,0,this.data.subarray(0,this.count*20));gl.drawArraysInstanced(gl.TRIANGLES,0,this.vertices,this.count);}
  dispose(){this.gl.deleteBuffer(this.buffer);this.gl.deleteBuffer(this.vertexBuffer);this.gl.deleteVertexArray(this.vao);}
}
export class WorldRenderer {
  constructor(canvas){
    this.canvas=canvas;const gl=canvas.getContext('webgl2',{antialias:true,alpha:true,powerPreference:'high-performance'});
    if(!gl)throw new Error('请使用支持 WebGL 2 的浏览器，并启用硬件加速。');
    this.gl=gl;this.program=gl.createProgram();
    for(const [type,source] of [[gl.VERTEX_SHADER,vertexSource],[gl.FRAGMENT_SHADER,fragmentSource]]){
      const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error('3D 场景初始化失败：'+gl.getShaderInfoLog(shader));
      gl.attachShader(this.program,shader);gl.deleteShader(shader);
    }
    gl.linkProgram(this.program);if(!gl.getProgramParameter(this.program,gl.LINK_STATUS))throw new Error('3D 场景着色器连接失败。');
    gl.enable(gl.DEPTH_TEST);gl.enable(gl.CULL_FACE);gl.clearColor(0,0,0,0);
    this.cubes=new Batch(gl,cubeGeometry());this.cylinders=new Batch(gl,cylinderGeometry());this.spheres=new Batch(gl,sphereGeometry());
    this.characterBatches={rounded:new Batch(gl,roundedBoxGeometry(),256),smooth:new Batch(gl,smoothSphereGeometry(),256),torso:new Batch(gl,torsoGeometry(),8)};
    this.character=new RunnerCharacter();
    this.viewUniform=gl.getUniformLocation(this.program,'uViewProjection');this.eyeUniform=gl.getUniformLocation(this.program,'uCamera');
    this.tunnelBoundsUniform=gl.getUniformLocation(this.program,'uTunnelBounds');this.tunnelBlendUniform=gl.getUniformLocation(this.program,'uTunnelBlend');
    this.camX=0;this.camHeight=0;this.demoDistance=0;this.particles=[];this.visualTime=0;this.shake=0;this.reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const random=randomSource(47);this.buildings=[];
    for(let i=0;i<40;i++)this.buildings.push({side:i%2?1:-1,x:11+random()*16,z:-i*5.9,h:9+random()*24,w:3+random()*5,d:4+random()*5,tone:['#51727e','#426377','#66858a','#779397','#496c78'][i%5],lit:random()>.45});
  }
  box(x,y,z,w,h,d,c,rx=0,ry=0,rz=0,glow=0,parent=null){const m=transform(x,y,z,w,h,d,rx,ry,rz);this.cubes.add(parent?multiply(parent,m):m,color(c,glow));}
  cylinder(x,y,z,w,h,d,c,rx=0,ry=0,rz=0,glow=0,parent=null){const m=transform(x,y,z,w,h,d,rx,ry,rz);this.cylinders.add(parent?multiply(parent,m):m,color(c,glow));}
  sphere(x,y,z,w,h,d,c,glow=0,parent=null){const m=transform(x,y,z,w,h,d);this.spheres.add(parent?multiply(parent,m):m,color(c,glow));}
  resize(){const ratio=Math.min(devicePixelRatio||1,1.75);const w=Math.max(1,Math.round(this.canvas.clientWidth*ratio)),h=Math.max(1,Math.round(this.canvas.clientHeight*ratio));if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}
  train(x,z,tone='#319c9d',length=8.8,roofRoute=false){
    const parent=transform(x,0,z,1,1,length/8.8);
    const box=(X,Y,Z,w,h,d,c,rx=0,ry=0,rz=0,glow=0)=>this.box(X-x,Y,Z-z,w,h,d,c,rx,ry,rz,glow,parent);
    const cylinder=(X,Y,Z,w,h,d,c,rx=0,ry=0,rz=0,glow=0)=>this.cylinder(X-x,Y,Z-z,w,h,d,c,rx,ry,rz,glow,parent);
    box(x,.35,z,2.2,.55,8.7,'#243c4a');
    box(x,1.73,z,2.22,2.35,8.4,tone);
    box(x,2.96,z,2.12,.2,8.1,'#dce1d5');
    box(x,1.05,z,2.24,.16,8.41,'#efc567');
    box(x,2.15,z+4.23,1.82,.85,.045,'#173c4b');
    box(x,2.14,z+4.27,.04,.86,.055,'#859d9d');
    box(x,1.19,z+4.255,1.55,.12,.08,'#eee9d3');
    box(x,2.76,z+4.24,.67,.14,.065,'#ffd15a',0,0,0,.8);
    box(x, .65,z+4.25,1.7,.2,.22,'#1f3c47');
    for(const side of [-1,1]){
      box(x+side*.77,1.42,z+4.26,.28,.21,.055,'#fff0ae',0,0,0,1);
      for(let i=-3;i<=3;i+=1.3)box(x+side*1.13,2.16,z+i,.025,.87,.9,'#1c4655');
      for(const p of [-2.85,2.85])cylinder(x+side*1.0,.38,z+p,.59,.59,.19,'#172731',0,Math.PI/2);
      box(x+side*1.14,1.7,z,.03,1.96,1.25,'#c1d3ca');
      box(x+side*1.17,2.14,z,.03,.78,.93,'#325a67');
      box(x+side*1.19,1.69,z,.025,1.94,.035,'#3d737a');
    }
    box(x,3.22,z,2.18,.16,8.8,'#bacac4');
    if(!roofRoute)box(x,3.25,z-1.8,1.18,.08,1.8,'#7e9599');
  }
  obstacle(o){
    if(o.broken)return;
    const x=o.lane*LANE_WIDTH,z=2.5-o.ahead;
    if(o.type==='gap')return;
    if(o.type==='ramp')return this.ramp(o);
    if(o.type==='train'){
      const count=Math.max(1,Math.ceil(o.halfLength*2/8.8)),length=o.halfLength*2/count;
      for(let i=0;i<count;i++)this.train(x,z+o.halfLength-length*(i+.5),o.approachSpeed?'#d67651':o.roofRoute?'#378e9d':o.row%3===1?'#dd9868':'#728cac',length,o.roofRoute);
      if(o.approachSpeed){
        const front=z+o.halfLength;
        for(const side of [-1,1]){this.box(x+side*.78,1.46,front+.08,.32,.22,.05,'#fff5bb',0,0,0,1);this.box(x+side*.9,2.76,front+.04,.12,.12,.05,Math.sin(this.visualTime*8)>0?'#ff6045':'#e7a37a',0,0,0,1);}
        for(let i=0;i<3;i++)this.box(x,.07,front+1+i*1.9,1.4+i*.35,.014,.7,'#d8b96b',0,0,0,.65-i*.1);
      }
      return;
    }
    const base=o.y||0;
    const box=(X,Y,Z,...args)=>this.box(X,Y+base,Z,...args);
    if(o.type==='barrier'){
      box(x,.57,z,2,.85,.7,'#dc7350');box(x,1.04,z,2.13,.12,.85,'#ffdf8c');
      for(let i=-2;i<=2;i++)box(x+i*.4,.58,z+.361,.17,.64,.025,'#fce6b7',0,0,-.38);
      if(o.required==='jump'){box(x,1.63,z,.095,.52,.085,'#fff1ba',0,0,0,1);for(const side of [-1,1])box(x+side*.13,1.77,z,.08,.35,.085,'#fff1ba',0,0,side*.72,1);}
      for(const s of [-1,1]){box(x+s*.85,.12,z,.22,.24,1,'#243d49');box(x+s*.84,1.17,z,.13,.16,.14,'#ffd674',0,0,0,1);}
    }else{
      for(const s of [-1,1]){box(x+s*1.01,1.48,z,.14,2.96,.3,'#d69d5c');box(x+s*1.01,.15,z,.45,.3,.65,'#274955');}
      box(x,2.22,z,2.2,1.87,.32,'#dd8654');
      box(x,1.32,z+.18,2.2,.15,.06,'#ffdfa4');
      for(let i=-2;i<=2;i++)box(x+i*.41,2.19,z+.18,.2,1.55,.02,'#f4bd6e',0,0,-.2);
      box(x,2.25,z+.22,.66,.62,.04,'#fff0c1');box(x,2.37,z+.25,.12,.26,.03,'#6b4c37');
      box(x-.09,2.20,z+.25,.1,.24,.03,'#6b4c37',0,0,-.7);box(x+.09,2.20,z+.25,.1,.24,.03,'#6b4c37',0,0,.7);
    }
  }
  characterPart(kind,matrix,c,glow=0){this.characterBatches[kind].add(matrix,color(c,glow));}
  resetCharacter(){this.character.reset();}
  handleEvent(event){this.character.handleEvent(event);}
  player(e,t,menu,dt){
    const pose=this.character.draw(this,e,dt,this.reduceMotion);
    const flying=e.jetpack>0||e.landing;
    if(e.board>0&&!flying){
      const board=transform(e.x,e.y+.12/Math.cos(pose.boardPitch),2.5,1,1,1,pose.boardPitch);
      this.box(0,0,0,.8,.1,1.38,'#7760cb',0,0,0,.25,board);
      this.cylinder(0,0,-.64,.8,.44,.1,'#987aff',Math.PI/2,0,0,.4,board);
      this.cylinder(0,0,.64,.8,.44,.1,'#987aff',Math.PI/2,0,0,.4,board);
      for(const s of [-1,1])this.box(s*.3,-.04,0,.055,.07,1.2,'#9beaff',0,0,0,1,board);
      for(let i=0;i<4;i++)this.box(e.x,e.y+.06,3.5+i*.55,.14/(i+1),.025,.34,'#bba7ff',0,0,0,1);
    }
    if(e.magnet>0){
      const target=pickupPose(e),pulse=this.reduceMotion?0:Math.sin(t*5)*.08;
      // A readable magnetic field, an equipped magnet and orbiting sparks persist.
      for(let ring=0;ring<2;ring++)for(let i=0;i<32;i++){
        const a=i*Math.PI/16+(this.reduceMotion?0:t*(ring?-.8:.8)),r=1.02+ring*.29+pulse;
        this.box(e.x+Math.sin(a)*r,e.y+.1+ring*.15,2.5+Math.cos(a)*r,.045,.04,.26,ring?'#f58fcb':'#ffe0f2',0,a,0,1);
      }
      for(let i=0;i<6;i++){const a=t*2+i*Math.PI/3;this.sphere(e.x+Math.cos(a)*.9,target.y+Math.sin(a*2)*.35,2.5+Math.sin(a)*.85,.11,.11,.11,'#ffaad6',1);}
      const magnetY=e.y+.36+(1-pose.low)*1.26;
      for(const side of [-1,1]){this.box(e.x+.56+side*.10,magnetY,2.6,.085,.27,.085,'#f783ba',0,0,0,.8);this.box(e.x+.56+side*.10,magnetY+.10,2.6,.09,.08,.09,'#fff0fa',0,0,0,1);}
      this.box(e.x+.56,magnetY-.13,2.6,.285,.085,.085,'#f783ba',0,0,0,.8);
    }
    if(e.invulnerable>0){for(const s of [-1,1])this.box(e.x+s*.6,e.y+1,2.5,.028,1.6,.025,'#d2efff',0,0,0,1);}
    const shadow=1-Math.min((e.y-e.floorHeight)/6,.3);this.cylinder(menu?0:e.x,(menu?0:e.floorHeight)+.01,2.55,.95*shadow,1.1*shadow,.008,'#21363d',Math.PI/2,0,0,.2);
  }
  bonus(p,t){
    const x=p.lane*LANE_WIDTH,z=2.5-p.ahead,y=p.y;
    const parent=transform(x,y,z,1,1,1,0,Math.sin(t*1.3+p.id)*.45);
    const c=BONUSES[p.type].color;
    // Distinct solid silhouettes make pickups legible before their UI labels appear.
    if(p.type==='magnet'){
      for(const s of [-1,1]){this.box(s*.24,0,0,.18,.65,.19,c,0,0,0,.5,parent);this.box(s*.24,.25,0,.19,.2,.2,'#e9faff',0,0,0,.7,parent);}this.box(0,-.28,0,.66,.19,.19,c,0,0,0,.5,parent);
    }else if(p.type==='double'){
      this.cylinder(0,0,0,.55,.55,.22,c,0,0,0,.7,parent);
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2;this.box(Math.sin(a)*.26,Math.cos(a)*.26,0,.2,.44,.17,c,0,0,-a,.7,parent);}
      this.box(-.075,0,.14,.055,.24,.025,'#fffce4',0,0,.55,1,parent);this.box(-.075,0,.14,.055,.24,.025,'#fffce4',0,0,-.55,1,parent);this.box(.12,0,.14,.055,.22,.025,'#fffce4',0,0,0,1,parent);
    }else if(p.type==='sneakers'){
      for(const s of [-1,1]){this.box(s*.2,-.08,0,.27,.25,.57,c,0,0,s*.12,.45,parent);this.box(s*.2,.13,.15,.25,.32,.24,c,0,0,0,.4,parent);this.box(s*.2,-.22,0,.29,.055,.61,'#f2fff1',0,0,0,.8,parent);}
    }else if(p.type==='jetpack'){
      this.box(0,0,0,.42,.66,.31,'#6195e7',0,0,0,.35,parent);for(const s of [-1,1]){this.cylinder(s*.25,0,0,.22,.22,.62,c,Math.PI/2,0,0,.45,parent);this.box(s*.25,-.4,0,.11,.18+Math.sin(t*21)*.06,.11,'#e5faff',0,0,0,1,parent);}
    }else if(p.type==='board'){
      this.box(0,0,0,.32,1.08,.15,c,0,0,-.38,.5,parent);this.cylinder(-.19,.49,0,.33,.35,.15,c,0,0,0,.5,parent);this.cylinder(.19,-.49,0,.33,.35,.15,c,0,0,0,.5,parent);this.box(0,0,.085,.05,.73,.025,'#e1f8ff',0,0,-.38,1,parent);
    }else{
      this.box(0,0,0,.58,.56,.54,c,0,0,0,.35,parent);this.box(0,.31,0,.66,.12,.62,'#ffe49c',0,0,0,.6,parent);this.box(0,0,.278,.11,.58,.018,'#fff2cc',0,0,0,.8,parent);this.box(0,.385,0,.19,.1,.45,'#ffefb4',0,0,.25,.6,parent);
    }
    this.cylinder(x,.035,z,.72,.72,.015,c,Math.PI/2,0,0,.45);
  }
  ramp(o){
    const length=o.halfLength*2,rise=o.to-o.from,angle=Math.atan2(rise,length),deck=Math.hypot(length,rise);
    const x=o.lane*LANE_WIDTH,z=2.5-o.ahead,mid=(o.from+o.to)/2,parent=transform(x,mid,z,1,1,1,angle);
    this.box(0,-.08,0,2.16,.16,deck,'#658c92',0,0,0,0,parent);
    for(const side of [-1,1])this.box(side*1.01,.025,0,.095,.07,deck,'#ffdc81',0,0,0,.5,parent);
    for(let i=1;i<7;i++){
      const along=deck*(.5-i/7);
      for(const side of [-1,1])this.box(side*.21,.025,along,.07,.025,.62,'#e0f4ed',0,side*.7,0,.65,parent);
      const h=o.from+rise*i/7,worldZ=z+length*(.5-i/7);
      for(const side of [-1,1])if(h>.3)this.box(x+side*.86,h/2-.09,worldZ,.12,h-.18,.15,'#314c59');
    }
  }
  tunnelSection(section,distance){
    const near=2.5-(section.start-distance),far=2.5-(section.end-distance);
    const z1=Math.min(near,21),z2=Math.max(far,-210);if(z1<z2)return;
    const mid=(z1+z2)/2,length=z1-z2;
    for(const side of [-1,1]){
      this.box(side*5.93,1.6,mid,.66,3.2,length,'#52676e');
      this.box(side*5.58,1.03,mid,.055,.13,length,'#71bbc0',0,0,0,.55);
      this.box(side*5.59,.36,mid,.05,.16,length,'#d2ad63');
    }
    for(let i=0;i<13;i++){const a=i*Math.PI/12;this.box(Math.cos(a)*TRACK.tunnelArchRadius,TRACK.tunnelArchBase+Math.sin(a)*TRACK.tunnelArchRadius,mid,1.62,.6,length,'#435862',0,0,a+Math.PI/2);}
    for(let world=section.start;world<=section.end;world+=16){
      const z=2.5-world+distance;if(z>21||z<-210)continue;
      for(let i=0;i<13;i++){const a=i*Math.PI/12;this.box(Math.cos(a)*5.63,3.2+Math.sin(a)*5.63,z,1.58,.15,.22,'#8e998f',0,0,a+Math.PI/2);}
      for(const side of [-1,1]){this.box(side*5.48,3.8,z,.18,1.4,.28,'#2a434d');this.box(side*5.34,3.8,z,.055,.87,.17,'#ffe4a9',0,0,0,1);this.box(side*4.92,.06,z,.55,.018,1.8,'#ac9563',0,0,0,.7);}
    }
    for(const portal of [near,far]){
      if(portal>30||portal<-210)continue;
      for(const side of [-1,1]){
        this.box(side*6,1.6,portal,1.1,3.2,1.2,'#8c9182');
        this.sphere(side*10,5.8,portal-9,8,13,24,'#6c7e74');this.sphere(side*8.8,4.5,portal-1,5.2,9.2,8,'#79857a');
      }
      for(let i=0;i<15;i++){const a=i*Math.PI/14;this.box(Math.cos(a)*6,3.2+Math.sin(a)*6,portal,1.42,1.05,1.2,i%2?'#9da18b':'#8c9586',0,0,a+Math.PI/2);}
      this.sphere(0,13.5,portal-7,22,8.4,22,'#697d70');this.box(0,7.8,portal+.66,2.1,.57,.13,'#233f4a');
      for(const side of [-1,1])this.box(side*.63,7.8,portal+.75,.12,.27,.04,'#ffcf78',0,0,side*.7,1);
    }
  }
  scenery(distance,t,tunnels=[]){
    const underground=z=>tunnels.some(s=>distance+2.5-z>=s.start&&distance+2.5-z<=s.end);

    this.box(0,-.6,-86,110,1,240,'#55727b');
    this.box(0,-.23,-85,8.8,.45,240,'#425b65');
    for(const lane of [-1,0,1]){
      const x=lane*LANE_WIDTH;this.box(x,-.012,-85,2.25,.04,240,'#4b656a');
      for(const s of [-1,1]){this.box(x+s*.78,.055,-85,.1,.13,240,'#acb8b3');this.box(x+s*.78,.012,-85,.19,.075,240,'#34464c');}
      for(let i=0;i<107;i++){const z=17-i*1.9+(distance%1.9);this.box(x,-.015,z,2.12,.12,.25,'#7f8278');}
    }
    for(const s of [-1,1]){
      this.box(s*6.07,.18,-85,3.25,.47,240,'#abb5ae');
      this.box(s*4.62,.44,-85,.17,.045,240,'#efbd53');
      this.box(s*7.84,.59,-85,.23,1.18,240,'#617d83');
      this.box(s*7.84,1.23,-85,.27,.1,240,'#a5b6ae');
      for(let i=0;i<40;i++){const z=18-i*5+(distance%5);this.box(s*4.87,.445,z,.09,.022,2.5,'#e4d29c');}
      for(let i=0;i<12;i++){
        const z=15-i*19+(distance%19);if(underground(z))continue;
        this.box(s*6.7,2.95,z,.16,5.5,.2,'#456674');
        this.box(s*6.04,5.67,z,1.5,.13,.22,'#b6c9c3');
        this.box(s*5.88,5.59,z,.93,.035,.19,'#fff0bf',0,0,0,1);
        this.box(s*7.8,1.88,z,.17,1.1,.12,'#345a68');
        if(i%2===0){this.box(s*6.6,.77,z-4,1.45,.2,2.8,'#476c72');this.box(s*7.16,1.08,z-4,.19,.7,2.8,'#537c81');for(const a of [-1,1])this.box(s*6.6,.53,z-4+a,.95,.48,.18,'#345967');}
      }
    }
    // Repeated station canopies frame the track without lines crossing the roofs.
    for(let i=0;i<6;i++){
      const z=12-i*43+(distance%43);if(underground(z))continue;
      for(const s of [-1,1]){
        this.box(s*7.0,3.85,z,.42,7.0,.44,'#54737e');
        this.box(s*7.0,.88,z,.65,1.05,.7,'#6f8b92');
        this.box(s*5.62,6.87,z,3.7,.17,15.6,'#577b87');
        this.box(s*4.36,6.91,z,.09,.12,15.6,'#efc770',0,0,0,.65);
      }
      this.box(0,7.25,z,14.7,.32,.4,'#7b949a');
      this.box(0,6.95,z,.09,.46,.2,'#527582');
      this.box(0,6.76,z,2.2,.07,.18,'#314e5b');
      this.box(-6.3,4.68,z-3.4,1.65,.79,.13,'#244956');
      this.box(-6.3,4.73,z-3.32,1.18,.1,.02,'#edca78',0,0,0,.3);
      this.box(-6.3,4.48,z-3.32,.6,.04,.02,'#d5e2d3');
      this.box(6.3,4.68,z-3.4,1.65,.79,.13,'#244956');
      this.box(6.3,4.73,z-3.32,1.18,.1,.02,'#edca78',0,0,0,.3);
    }
    for(const b of this.buildings){
      const z=((b.z+distance*.52+250)%250)-230,x=b.x*b.side;
      this.box(x,b.h/2-1,z,b.w,b.h,b.d,b.tone);
      this.box(x,b.h-.83,z,b.w+.12,.2,b.d+.12,'#91a6a7');
      if(b.h>23)this.box(x,b.h+.4,z,b.w*.48,1.3,b.d*.4,'#647e89');
      for(let row=0;row<Math.floor(b.h/3);row++)for(let c=0;c<3;c++){
        const lit=(row+c)%4===0&&b.lit;
        this.box(x+(c-1)*b.w*.27,1+row*2.8,z+b.d/2+.013,b.w*.13,1.2,.024,lit?'#ebbf81':'#315b6c',0,0,0,lit?.45:0);
      }
    }
    this.cylinder(30,36,-165,22,22,.6,'#ffd49c',0,0,0,1);
    // Distant bridge and skyline complete the depth beyond the station.
    this.box(0,10,-150,85,1.2,5,'#738e92');
    for(const x of [-24,-13,13,24])this.box(x,4.5,-150,1.8,10,4,'#6d898f');
  }
  burst(p){for(let i=0;i<7;i++)this.particles.push({x:p.x??p.lane*LANE_WIDTH,y:p.y,z:2.5-p.ahead,vx:(Math.random()-.5)*3,vy:1.5+Math.random()*2,vz:2+Math.random()*2,life:.45,color:p.magnetic?'#ffc1e6':'#ffe29a'});if(this.particles.length>100)this.particles.splice(0,this.particles.length-100);}
  render(e,dt){
    const menu=e.mode==='menu';const moving=e.mode==='running'||menu;
    if(moving)this.visualTime+=dt;const t=this.visualTime;
    if(menu&&!this.reduceMotion)this.demoDistance+=dt*3.3;
    const distance=menu?this.demoDistance:e.distance;
    this.resize();this.cubes.count=0;this.cylinders.count=0;this.spheres.count=0;
    for(const batch of Object.values(this.characterBatches))batch.count=0;
    this.scenery(distance,t,menu?[{start:60+distance,end:150+distance}]:e.tunnels);
    if(!menu)for(const section of e.tunnels)this.tunnelSection(section,distance);
    if(menu){
      this.train(-2.7,-15,'#2c999b');
      this.obstacle({type:'train',lane:0,ahead:53,halfLength:19,roofRoute:true,row:3});
      this.ramp({type:'ramp',lane:0,ahead:27,halfLength:7,from:0,to:TRACK.roofHeight});
      this.tunnelSection({start:60,end:150},0);
      for(let i=0;i<14;i++){const ahead=6+i*3,h=Math.max(0,Math.min(1,(ahead-20)/14))*TRACK.roofHeight;this.cylinder(0,h+.95,2.5-ahead,.55,.55,.13,'#ffd458',0,t+i*.3,0,.65);}
    }else{
      for(const o of e.obstacles)if(o.ahead-o.halfLength<180)this.obstacle(o);
      for(const p of e.pickups){
        const x=p.x??p.lane*LANE_WIDTH,z=2.5-p.ahead,y=p.y;
        if(p.type==='coin'){
          if(p.flight)for(let i=0;i<p.trail.length;i++){const point=p.trail[i],size=.04+i*.01;this.sphere(point.x,point.y,2.5-point.ahead,size,size,size,i%2?'#ffc2e2':'#ffe6a0',1);}
          const parent=transform(x,y,z,1,1,1,0,t*2.6+p.id*.3);
          this.cylinder(0,0,0,.58,.58,.12,'#f5c654',0,0,0,.65,parent);
          this.cylinder(0,0,.067,.39,.39,.025,'#ffe49a',0,0,0,.8,parent);
          this.box(0,0,.084,.055,.21,.013,'#d9972e',0,0,0,.4,parent);
        }else this.bonus(p,t);
      }
    }
    this.player(e,t,menu,dt);
    for(const p of this.particles){if(moving){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=8*dt;p.z+=p.vz*dt;}const s=Math.max(.001,p.life*.15);this.box(p.x,p.y,p.z,s,s,s,p.color,t,t,0,1);}
    this.particles=this.particles.filter(p=>p.life>0);
    const mobile=this.canvas.clientWidth<760;
    const targetX=menu?(mobile?-2.1:-3.0):e.x*.18;
    this.camX+=(targetX-this.camX)*(1-Math.exp(-3*dt));
    this.shake=Math.max(0,this.shake-dt*3);
    const shake=this.reduceMotion?0:Math.sin(t*72)*this.shake*.08;
    const flight=e.jetpack>0||e.landing;
    const desiredHeight=menu?0:Math.max(e.floorHeight,e.y*(flight?.9:.65));this.camHeight+=(desiredHeight-this.camHeight)*(1-Math.exp(-5*dt));
    const eye=[this.camX+shake,menu?(mobile?3.4:4.3):Math.min(e.environment==='tunnel'?8.3:20,5.2+this.camHeight*.9),menu?(mobile?8.2:10):11.6];
    const at=[menu?(mobile?1.2:1.1):this.camX*.7,menu?(mobile?-.7:.8):1.1+this.camHeight*.8,-21];
    const vp=multiply(perspective((mobile?66:57)*Math.PI/180,this.canvas.width/this.canvas.height,.1,300),lookAt(eye,at));
    const gl=this.gl;const tunnel=menu?{start:60+distance,end:150+distance}:e.tunnels.find(s=>s.end>distance-15&&s.start<distance+210);
    gl.useProgram(this.program);gl.uniform2fv(this.tunnelBoundsUniform,tunnel?[2.5-tunnel.end+distance,2.5-tunnel.start+distance]:[-10000,-9999]);gl.uniform1f(this.tunnelBlendUniform,menu?0:e.tunnelBlend);
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.viewUniform,false,vp);gl.uniform3fv(this.eyeUniform,eye);this.cubes.draw();this.cylinders.draw();this.spheres.draw();for(const batch of Object.values(this.characterBatches))batch.draw();gl.bindVertexArray(null);
  }
  dispose(){this.cubes.dispose();this.cylinders.dispose();this.spheres.dispose();for(const batch of Object.values(this.characterBatches))batch.dispose();this.gl.deleteProgram(this.program);}
}
