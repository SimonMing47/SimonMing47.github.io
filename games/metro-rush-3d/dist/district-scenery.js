import { DISTRICTS, ROUTE_EVENTS } from './director.js';

const hash=(n,s=0)=>{const v=Math.sin(n*127.1+s*311.7)*43758.5453;return v-Math.floor(v);};
// Landmarks are tied to world chunks, not a short scrolling scenery loop.
export function districtScenery(r,e,distance,time,menu=false){
  const typeAt=world=>menu?'station':e.director.districtAt(Math.max(0,world)).type;
  const first=Math.floor((distance-25)/22),last=Math.ceil((distance+215)/22);
  for(let chunk=first;chunk<=last;chunk++){
    const world=chunk*22,z=2.5-world+distance,type=typeAt(world),theme=DISTRICTS[type],seed=chunk+(e.seed%1000),v=hash(seed);
    const floor=type==='canyon'?-8:type==='harbor'?-1.1:-.45;
    r.box(0,floor-.3,z,110,.5,22.1,theme.ground);
    if(type!=='station')for(const side of [-1,1]){
      r.box(side*5.7,.14,z,2.7,.39,22.1,theme.deck);
      r.box(side*7.25,.67,z,.12,.95,22.1,type==='neon'?'#543e78':'#506f76');
      r.box(side*7.25,1.18,z,.19,.10,22.1,type==='neon'?'#bb80d6':'#c2c8b6');
    }
    if(type==='harbor'){
      for(const side of [-1,1]){
        const x=side*(12+v*3),tone=['#307b9b','#c17548','#e6b751','#538d81'][Math.floor(hash(seed,2)*4)];
        for(let stack=0;stack<2+Math.floor(v*2);stack++){
          r.box(x,1+stack*2.5,z,4.5,2.35,10,tone);
          for(let stripe=0;stripe<7;stripe++)r.box(x-side*2.27,1+stack*2.5,z-4+stripe*1.3,.035,2.1,.075,'#294e65');
          r.box(x,2.22+stack*2.5,z,4.6,.09,10.1,'#8da4a6');
        }
        for(let j=0;j<4;j++)r.box(side*(21+j*4),-.81,z+Math.sin(time*.8+j+chunk)*.12,2.5,.018,.07,'#74bed0',0,0,0,.25);
      }
      if(chunk%3===0){
        for(const side of [-1,1]){r.box(side*19,7,z,.7,14,.8,'#e5ac52');r.box(side*19,7,z-7,.7,14,.8,'#ca9248');}
        r.box(0,14.1,z,40,.65,1.1,'#edbb64');r.box(0,14.1,z-7,40,.65,1.1,'#edbb64');
        r.box(9,12.9,z-3.5,2.6,1.65,3,'#456b82');r.box(9,10.2,z-3.5,.07,4,.07,'#314b60');r.box(9,8.35,z-3.5,3.2,.2,1.2,'#f4c97b');
      }
      if(chunk%4===1){r.box(-31,.6,z,8,2,16,'#355c71');r.box(-31,2.2,z-3,5,2,5,'#d4d9ce');r.box(-31,3.4,z-3,5.5,.3,5.6,'#688f9c');}
    }else if(type==='garden'){
      for(const side of [-1,1])for(let tree=0;tree<4;tree++){
        const x=side*(10+tree*4+hash(seed,tree)*2),tz=z-8+tree*5,height=5+hash(seed,tree+8)*6;
        r.box(x,height*.4,tz,.4,height*.8,.42,'#786653');
        r.sphere(x,height*.67,tz,3.6+v,height*.62,3.6,['#467866','#619373','#77a47a'][tree%3]);
        r.sphere(x+side*.9,height*.86,tz-.5,2.7,3.1,2.8,'#8ab387');
      }
      if(chunk%3===0){
        for(const side of [-1,1]){r.box(side*5.8,5.4,z,.29,10.8,.34,'#a67955');r.box(side*5.8,10.8,z,.85,.18,1.15,'#d8b980');}
        r.box(0,11.3,z,13,.35,.9,'#517d68');r.box(0,11.59,z,13.5,.18,1.2,'#aac398');
      }
      for(const side of [-1,1])for(let shrub=0;shrub<3;shrub++)r.sphere(side*(8.1+v),.5,z+shrub*5,1.6,1.15,2.2,'#79aa83');
    }else if(type==='canyon'){
      for(const side of [-1,1]){
        const height=12+v*15,x=side*(16+hash(seed,1)*7);
        r.sphere(x,height*.3-4,z,12,height,18,'#a46e50');r.sphere(x+side*6,height*.42,z-4,11,height*.75,14,'#bd845b');
        for(let layer=0;layer<4;layer++)r.box(x+side*2,layer*3-1,z,10-layer*.7,.4,13-layer,'#d89c69');
        r.box(side*5,-4,z,.85,8,1.1,'#796b62');r.box(side*5,-3,z,.35,5,8,'#948372',-.6);
      }
      if(chunk%3===1){for(const side of [-1,1])r.box(side*8.2,5.9,z,.8,11.8,1.2,'#be875e');r.box(0,11.8,z,17,.85,1.5,'#d59c6b');}
      for(let cloud=0;cloud<2;cloud++)r.sphere(24+cloud*7,19+cloud*3,z-30,12,2,5,'#e3b088');
    }else if(type==='neon'){
      for(const side of [-1,1]){
        const x=side*(10.5+v),height=10+v*17;
        r.box(x,height/2,z,5,height,12,'#34425f');r.box(x,height,z,5.3,.22,12.3,'#596082');
        for(let row=0;row<6;row++)for(let col=0;col<4;col++)r.box(x-side*2.54,2+row*2.5,z-4.5+col*2.7,.04,.8,.8,(row+col+chunk)%3===0?'#deab80':'#637cbb',0,0,0,.65);
        const pink=(chunk+side)%2===0,c=pink?'#df8ebc':'#74cbd7';
        r.box(side*7.8,4.3,z,1.25,3.8,.35,'#243850');r.box(side*7.13,4.3,z,.055,3.4,.28,c,0,0,0,.9);
        for(let symbol=0;symbol<4;symbol++){r.box(side*7.77,3.2+symbol*.68,z+.2,.65,.095,.035,c,0,0,0,1);r.box(side*7.77,3.2+symbol*.68,z+.2,.095,.38,.035,c,0,0,0,1);}
        r.box(side*9.2,2.6,z+5,4.1,.16,3.3,c,.15);r.box(side*9.2,.7,z+5,3,1.25,2.2,'#9d675f');
        r.box(side*5.1,.36,z,.10,.025,7.5,c,0,0,0,.65);
      }
      if(chunk%2===0)for(let lamp=-2;lamp<=2;lamp++){const x=lamp*2.8;r.sphere(x,11.3+Math.abs(lamp)*.08,z, .48,.61,.48,'#f0b680',.75);r.box(x,11.75,z,.025,.32,.025,'#c6817f');}
    }
  }
}

export function encounterScenery(r,e,distance,time){
  const view=e.encounterView;
  for(const ev of e.encounters){
    const z=2.5-ev.start+distance;if(z>20||z< -190)continue;
    const c=ROUTE_EVENTS[ev.type].color;
    for(const side of [-1,1]){r.box(side*4.8,4.4,z,.20,8.8,.32,'#324b60');r.box(side*4.8,2.6,z+.19,.09,3.4,.03,c,0,0,0,.8);}
    r.box(0,8.95,z,9.9,.35,.45,'#253e55');
    for(let i=0;i<ev.goal;i++)r.sphere((i-(ev.goal-1)/2)*.5,8.96,z+.25,.20,.20,.07,c,.9);
    if(ev.type==='rooftop')for(const roof of [false,true]){
      const x=(roof?ev.roofLane:ev.groundLane)*2.7,tone=roof?'#ffd56e':'#78d7ff';
      for(let arrow=0;arrow<4;arrow++)for(const side of [-1,1])r.box(x+side*.15,.08,z+4+arrow*2,.085,.025,.6,tone,0,side*.6,0,.9);
      r.box(x,5.3,z,.8,.8,.12,'#243c50');r.box(x,5.3,z+.07,.32,.32,.05,tone,0,0,Math.PI/4,.9);
    }
  }
  for(const ev of e.encounters.filter(ev=>ev.type==='breakout')){
    const z=2.5-ev.end+distance;if(z>20||z< -200)continue;
    for(const side of [-1,1]){r.box(side*4.7,4.5,z,.45,9,.65,'#324e5a');r.box(side*4.7,4.2,z+.34,.22,5.5,.06,'#9befe0',0,0,0,.8);}
    r.box(0,9.1,z,10,.5,.75,'#3e7376');
    for(let i=-3;i<=3;i++)r.box(i*1.3,.07,z,.65,.045,1.3,i%2?'#dbefdb':'#4b8e83');
    for(let i=0;i<ev.goal;i++)r.sphere((i-(ev.goal-1)/2)*.55,9.1,z+.42,.25,.25,.06,i<ev.progress?'#a6efd8':'#506779',.8);
  }
  if(!view||view.phase!=='active')return;
  const ev=e.encounters.find(x=>x.id===view.id),c=ROUTE_EVENTS[view.type].color;
  if(view.type==='convoy'||view.type==='breakout'){
    const wave=e.obstacles.filter(o=>o.eventId===view.id&&o.ahead+o.halfLength>0).sort((a,b)=>a.rowWorld-b.rowWorld)[0];
    if(wave)for(const lane of [-1,0,1]){const safe=lane===wave.routeLane;r.box(lane*2.7,3.9,-13,.55,.55,.12,safe?'#8ae8c4':'#ed9b79',0,0,0,1);}
  }
  if(view.type==='works'||view.type==='breakout')for(const o of e.obstacles.filter(o=>o.eventId===view.id&&o.construction&&o.ahead>0&&o.ahead<150))for(const side of [-1,1])for(let i=0;i<3;i++){
    const x=o.lane*2.7+side*.96,z=2.5-o.ahead+o.halfLength+2+i*2;
    r.box(x,.08,z,.36,.16,.4,'#394a51');r.cylinder(x,.32,z,.23,.23,.48,'#efab58',Math.PI/2);r.box(x,.36,z,.24,.09,.24,'#fff0c5');
  }
  // Low edge lights guide the eye without covering an obstacle or changing controls.
  const end=Math.min(150,ev.end-distance);
  for(let ahead=5;ahead<end;ahead+=7)for(const side of [-1,1])r.box(side*4.15,.17,2.5-ahead,.09,.06,2,c,0,0,0,.55);
}
