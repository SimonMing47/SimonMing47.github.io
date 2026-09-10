import { LANE_WIDTH, randomSource } from './engine.js';

const vertexSource = `#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in mat4 aModel;
layout(location=6) in vec4 aColor;
uniform mat4 uViewProjection;
uniform vec3 uCamera;
out vec3 vColor;
out float vFog;
void main(){
  vec4 world = aModel * vec4(aPosition,1.0);
  mat3 m = mat3(aModel);
  vec3 n = normalize(m * (aNormal / vec3(dot(m[0],m[0]),dot(m[1],m[1]),dot(m[2],m[2]))));
  float sun = max(dot(n,normalize(vec3(-0.55,0.85,0.45))),0.0);
  float rim = max(dot(n,normalize(vec3(0.8,0.15,-0.5))),0.0);
  vec3 light = vec3(0.51,0.60,0.68) + vec3(0.65,0.53,0.37)*sun + vec3(0.04,0.13,0.15)*rim;
  vColor = mix(aColor.rgb * light,aColor.rgb,aColor.a);
  vFog = smoothstep(48.0,185.0,distance(uCamera,world.xyz));
  gl_Position = uViewProjection * world;
}`;
const fragmentSource = `#version 300 es
precision mediump float;
in vec3 vColor;
in float vFog;
out vec4 outColor;
void main(){outColor=vec4(mix(vColor,vec3(0.56,0.65,0.66),vFog),1.0);}`;

export function multiply(a,b){
  const out = new Float32Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++) out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return out;
}
export function transform(x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
  const a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
  return new Float32Array([c*e*sx,c*f*sx,-d*sx,0,(b*d*e-a*f)*sy,(b*d*f+a*e)*sy,b*c*sy,0,(a*d*e+b*f)*sz,(a*d*f-b*e)*sz,a*c*sz,0,x,y,z,1]);
}
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
const colorCache=new Map();
function color(hex,glow=0){if(!colorCache.has(hex))colorCache.set(hex,[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255]);return [...colorCache.get(hex),glow];}
class Batch {
  constructor(gl,vertices){
    this.gl=gl;this.count=0;this.max=14000;this.data=new Float32Array(this.max*20);this.vertices=vertices.length/6;
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
    this.cubes=new Batch(gl,cubeGeometry());this.cylinders=new Batch(gl,cylinderGeometry());
    this.viewUniform=gl.getUniformLocation(this.program,'uViewProjection');this.eyeUniform=gl.getUniformLocation(this.program,'uCamera');
    this.camX=0;this.demoDistance=0;this.particles=[];this.visualTime=0;this.shake=0;this.reduceMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    const random=randomSource(47);this.buildings=[];
    for(let i=0;i<40;i++)this.buildings.push({side:i%2?1:-1,x:11+random()*16,z:-i*5.9,h:9+random()*24,w:3+random()*5,d:4+random()*5,tone:['#51727e','#426377','#66858a','#779397','#496c78'][i%5],lit:random()>.45});
  }
  box(x,y,z,w,h,d,c,rx=0,ry=0,rz=0,glow=0,parent=null){const m=transform(x,y,z,w,h,d,rx,ry,rz);this.cubes.add(parent?multiply(parent,m):m,color(c,glow));}
  cylinder(x,y,z,w,h,d,c,rx=0,ry=0,rz=0,glow=0,parent=null){const m=transform(x,y,z,w,h,d,rx,ry,rz);this.cylinders.add(parent?multiply(parent,m):m,color(c,glow));}
  resize(){const ratio=Math.min(devicePixelRatio||1,1.75);const w=Math.max(1,Math.round(this.canvas.clientWidth*ratio)),h=Math.max(1,Math.round(this.canvas.clientHeight*ratio));if(w!==this.canvas.width||h!==this.canvas.height){this.canvas.width=w;this.canvas.height=h;}this.gl.viewport(0,0,w,h);}
  train(x,z,tone='#319c9d'){
    this.box(x,.35,z,2.2,.55,8.7,'#243c4a');
    this.box(x,1.73,z,2.22,2.35,8.4,tone);
    this.box(x,2.96,z,2.12,.2,8.1,'#dce1d5');
    this.box(x,1.05,z,2.24,.16,8.41,'#efc567');
    this.box(x,2.15,z+4.23,1.82,.85,.045,'#173c4b');
    this.box(x,2.14,z+4.27,.04,.86,.055,'#859d9d');
    this.box(x,1.19,z+4.255,1.55,.12,.08,'#eee9d3');
    this.box(x,2.76,z+4.24,.67,.14,.065,'#ffd15a',0,0,0,.8);
    this.box(x, .65,z+4.25,1.7,.2,.22,'#1f3c47');
    for(const side of [-1,1]){
      this.box(x+side*.77,1.42,z+4.26,.28,.21,.055,'#fff0ae',0,0,0,1);
      for(let i=-3;i<=3;i+=1.3)this.box(x+side*1.13,2.16,z+i,.025,.87,.9,'#1c4655');
      for(const p of [-2.85,2.85])this.cylinder(x+side*1.0,.38,z+p,.59,.59,.19,'#172731',0,Math.PI/2);
      this.box(x+side*1.14,1.7,z,.03,1.96,1.25,'#c1d3ca');
      this.box(x+side*1.17,2.14,z,.03,.78,.93,'#325a67');
      this.box(x+side*1.19,1.69,z,.025,1.94,.035,'#3d737a');
    }
    this.box(x,3.16,z-1.8,1.18,.23,1.8,'#648187');
  }
  obstacle(o){
    const x=o.lane*LANE_WIDTH,z=2.5-o.ahead;
    if(o.type==='train')return this.train(x,z,o.row%3===0?'#359c9b':o.row%3===1?'#dd9868':'#728cac');
    if(o.type==='barrier'){
      this.box(x,.57,z,2,.85,.7,'#dc7350');this.box(x,1.04,z,2.13,.12,.85,'#ffdf8c');
      for(let i=-2;i<=2;i++)this.box(x+i*.4,.58,z+.361,.17,.64,.025,'#fce6b7',0,0,-.38);
      for(const s of [-1,1]){this.box(x+s*.85,.12,z,.22,.24,1,'#243d49');this.box(x+s*.84,1.17,z,.13,.16,.14,'#ffd674',0,0,0,1);}
    }else{
      for(const s of [-1,1]){this.box(x+s*1.01,1.48,z,.14,2.96,.3,'#d69d5c');this.box(x+s*1.01,.15,z,.45,.3,.65,'#274955');}
      this.box(x,2.22,z,2.2,1.87,.32,'#dd8654');
      this.box(x,1.32,z+.18,2.2,.15,.06,'#ffdfa4');
      for(let i=-2;i<=2;i++)this.box(x+i*.41,2.19,z+.18,.2,1.55,.02,'#f4bd6e',0,0,-.2);
      this.box(x,2.25,z+.22,.66,.62,.04,'#fff0c1');this.box(x,2.37,z+.25,.12,.26,.03,'#6b4c37');
      this.box(x-.09,2.20,z+.25,.1,.24,.03,'#6b4c37',0,0,-.7);this.box(x+.09,2.20,z+.25,.1,.24,.03,'#6b4c37',0,0,.7);
    }
  }
  player(e,t,menu){
    const run=e.mode==='running',phase=e.distance*1.05;
    const bouncing=run&&e.y===0&&e.slide===0?Math.abs(Math.sin(phase))*.065:Math.sin(t*2)*.022;
    const crouch=e.slide>0;const lean=(e.lane*LANE_WIDTH-e.x)*-.15;
    const base=transform(menu?1.2:e.x,e.y+bouncing,2.5,1,1,1,crouch?-1.06:0,menu?-.2:0,crouch?0:lean);
    const local=(x,y,z,w,h,d,c,rx=0,ry=0,rz=0)=>this.box(x,y,z,w,h,d,c,rx,ry,rz,0,base);
    // The articulated runner is built in 3D, including cap, headphones and a backpack.
    const waist=crouch?.61:1.02;
    local(0,waist+.35,0,.67,.76,.44,'#35aaa9');
    local(0,waist-.07,0,.57,.23,.38,'#234659');
    local(0,waist+.58,.251,.53,.14,.07,'#e5dcc7');
    local(0,waist+.26,.35,.48,.55,.26,'#e5984a');
    local(0,waist+.26,.496,.3,.12,.07,'#ffcb69');
    local(-.21,waist+.48,.31,.055,.6,.08,'#263f4e');local(.21,waist+.48,.31,.055,.6,.08,'#263f4e');
    local(0,waist+.91,0,.43,.46,.43,'#e8b388');
    local(0,waist+1.15,.015,.48,.16,.5,'#efb449');
    local(0,waist+1.09,-.22,.49,.055,.38,'#edb13f');
    local(0,waist+.97,.223,.28,.18,.04,'#3b322e');
    for(const side of [-1,1]){
      local(side*.249,waist+.89,.015,.085,.23,.18,'#edbc59');
      const swing=run?Math.sin(phase+ (side===1?Math.PI:0))*.75:Math.sin(t*1.7)*.04;
      const hip=multiply(base,transform(side*.17,waist-.12,0,1,1,1,crouch?-.85:e.y>.15?side*.32:swing));
      this.box(0,-.24,0,.235,.49,.29,'#274c62',0,0,0,0,hip);
      const knee=multiply(hip,transform(0,-.45,0,1,1,1,crouch?1.7:e.y>.15?.6:Math.max(0,-swing)*.9));
      this.box(0,-.2,0,.215,.4,.25,'#203d51',0,0,0,0,knee);
      this.box(0,-.38,-.085,.28,.17,.47,'#f2c75c',0,0,0,0,knee);
      this.box(0,-.48,-.085,.29,.055,.48,'#f2ead4',0,0,0,0,knee);
      const shoulder=multiply(base,transform(side*.44,waist+.58,0,1,1,1,crouch?-1.5:-swing*.85,0,side*-.1));
      this.box(0,-.18,0,.21,.4,.24,'#31a19f',0,0,0,0,shoulder);
      const elbow=multiply(shoulder,transform(0,-.36,0,1,1,1,-.7));
      this.box(0,-.13,0,.19,.29,.22,'#37aba7',0,0,0,0,elbow);
      this.box(0,-.32,0,.19,.17,.21,'#e8b388',0,0,0,0,elbow);
    }
    const shadow=1-Math.min(e.y/6,.3);this.cylinder(menu?1.2:e.x,.01,2.55,.95*shadow,1.1*shadow,.008,'#21363d',Math.PI/2,0,0,.2);
  }
  scenery(distance,t){
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
        const z=15-i*19+(distance%19);
        this.box(s*6.7,2.95,z,.16,5.5,.2,'#456674');
        this.box(s*6.04,5.67,z,1.5,.13,.22,'#b6c9c3');
        this.box(s*5.88,5.59,z,.93,.035,.19,'#fff0bf',0,0,0,1);
        this.box(s*7.8,1.88,z,.17,1.1,.12,'#345a68');
        if(i%2===0){this.box(s*6.6,.77,z-4,1.45,.2,2.8,'#476c72');this.box(s*7.16,1.08,z-4,.19,.7,2.8,'#537c81');for(const a of [-1,1])this.box(s*6.6,.53,z-4+a,.95,.48,.18,'#345967');}
      }
    }
    // A repeated canopy and catenary frame make the track read as a metro station.
    for(let i=0;i<6;i++){
      const z=12-i*43+(distance%43);
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
    for(const x of [-2.7,0,2.7])this.box(x,7.56,-85,.024,.024,240,'#344b59');
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
    this.cylinder(20,31,-190,21,21,.6,'#ffdcb2',0,0,0,1);
    // Distant bridge and skyline complete the depth beyond the station.
    this.box(0,10,-150,85,1.2,5,'#738e92');
    for(const x of [-24,-13,13,24])this.box(x,4.5,-150,1.8,10,4,'#6d898f');
  }
  burst(p){for(let i=0;i<5;i++)this.particles.push({x:p.lane*LANE_WIDTH,y:p.y,z:2.5-p.ahead,vx:(Math.random()-.5)*3,vy:1.5+Math.random()*2,vz:2+Math.random()*2,life:.45});if(this.particles.length>100)this.particles.splice(0,this.particles.length-100);}
  render(e,dt){
    const menu=e.mode==='menu';const moving=e.mode==='running'||menu;
    if(moving)this.visualTime+=dt;const t=this.visualTime;
    if(menu&&!this.reduceMotion)this.demoDistance+=dt*3.3;
    const distance=menu?this.demoDistance:e.distance;
    this.resize();this.cubes.count=0;this.cylinders.count=0;
    this.scenery(distance,t);
    if(menu){
      this.train(-2.7,-15,'#2c999b');this.train(2.7,-39,'#e1a16f');
      this.obstacle({type:'barrier',lane:0,ahead:39,row:0});
      for(let i=0;i<10;i++)this.cylinder(0,1+Math.sin(t*2+i*.4)*.08,-5-i*2.8,.55,.55,.13,'#ffd458',0,t+i*.3,0,.65);
    }else{
      for(const o of e.obstacles)if(o.ahead<170)this.obstacle(o);
      for(const p of e.pickups){
        const x=p.lane*LANE_WIDTH,z=2.5-p.ahead,y=p.y+Math.sin(t*3+p.id)*.1;
        if(p.type==='coin'){
          const parent=transform(x,y,z,1,1,1,0,t*2.6+p.id*.3);
          this.cylinder(0,0,0,.58,.58,.12,'#f5c654',0,0,0,.65,parent);
          this.cylinder(0,0,.067,.39,.39,.025,'#ffe49a',0,0,0,.8,parent);
          this.box(0,0,.084,.055,.21,.013,'#d9972e',0,0,0,.4,parent);
        }else{
          const parent=transform(x,y,z,1,1,1,0,t*2,0);
          this.box(-.23,0,0,.17,.67,.18,'#e7715b',0,0,0,.45,parent);this.box(.23,0,0,.17,.67,.18,'#e7715b',0,0,0,.45,parent);this.box(0,-.27,0,.6,.17,.18,'#e7715b',0,0,0,.45,parent);
          this.box(-.23,.23,0,.18,.21,.19,'#d3f5eb',0,0,0,.6,parent);this.box(.23,.23,0,.18,.21,.19,'#d3f5eb',0,0,0,.6,parent);
        }
      }
    }
    this.player(e,t,menu);
    for(const p of this.particles){if(moving){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy-=8*dt;p.z+=p.vz*dt;}const s=Math.max(.001,p.life*.15);this.box(p.x,p.y,p.z,s,s,s,'#ffe29a',t,t,0,1);}
    this.particles=this.particles.filter(p=>p.life>0);
    const mobile=this.canvas.clientWidth<760;
    const targetX=menu?(mobile?-.8:-3.3):e.x*.18;
    this.camX+=(targetX-this.camX)*(1-Math.exp(-3*dt));
    this.shake=Math.max(0,this.shake-dt*3);
    const shake=this.reduceMotion?0:Math.sin(t*72)*this.shake*.08;
    const eye=[this.camX+shake,menu?5.3:5.2+(this.reduceMotion?0:e.y*.12),menu?12.5:11.6];
    const at=[menu?(mobile?2.8:3):this.camX*.7,1.1,-21];
    const vp=multiply(perspective((mobile?66:57)*Math.PI/180,this.canvas.width/this.canvas.height,.1,300),lookAt(eye,at));
    const gl=this.gl;gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.viewUniform,false,vp);gl.uniform3fv(this.eyeUniform,eye);this.cubes.draw();this.cylinders.draw();gl.bindVertexArray(null);
  }
  dispose(){this.cubes.dispose();this.cylinders.dispose();this.gl.deleteProgram(this.program);}
}
