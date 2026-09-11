import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerEngine } from '../dist/engine.js';
import { CharacterAnimator, footSurface, stride, solveLimb } from '../dist/animation.js';
import { RunnerCharacter } from '../dist/character.js';
import { roundedBoxGeometry, smoothSphereGeometry, torsoGeometry } from '../dist/character-geometry.js';

const geometry={rounded:roundedBoxGeometry(),smooth:smoothSphereGeometry(),torso:torsoGeometry()};
function run(){const e=new RunnerEngine(47);e.start();return e;}
function collect(character,e,dt=1/60){
  const parts=[];character.draw({characterPart(kind,matrix,color){assert.ok([...matrix].every(Number.isFinite));parts.push({kind,matrix,color});}},e,dt);return parts;
}
function bounds(parts,slope=0){
  let min=Infinity,max=-Infinity;
  for(const {kind,matrix:m} of parts){const vertices=geometry[kind];for(let i=0;i<vertices.length;i+=6){const [x,y,z]=vertices.subarray(i,i+3),Y=m[1]*x+m[5]*y+m[9]*z+m[13],Z=m[2]*x+m[6]*y+m[10]*z+m[14]-2.5;
    min=Math.min(min,Y+slope*Z);max=Math.max(max,Y+slope*Z);
  }}return {min,max};
}

test('full character meshes fit standing and sliding collision heights, including board and recovery',()=>{
  for(const board of [0,8])for(const speed of [14,23,42]){
    const e=run();e.board=board;e.speed=speed;const c=new RunnerCharacter();
    for(let frame=0;frame<60;frame++){
      e.slide=frame>=15&&frame<40?.8:0;
      const meshes=collect(c,e),b=frame%5===0||frame===15||frame===40?bounds(meshes):null;
      if(b){assert.ok(b.max<=(e.slide>0?.72:2.05)+1e-5,JSON.stringify({board,speed,frame,...b}));assert.ok(b.min>=-.008,JSON.stringify({board,speed,frame,...b}));}
      assert.ok(meshes.length<256);
    }
  }
});

test('pause freezes articulated pose; reset clears slide, landing, crash and turning state',()=>{
  const e=run(),a=new CharacterAnimator();e.lane=1;a.handleEvent({type:'land'});e.slide=.8;
  const pose=a.update(e,.02);e.mode='paused';assert.equal(a.update(e,2),pose);
  e.mode='running';e.slide=0;assert.notDeepEqual(a.update(e,.02),pose);
  a.handleEvent({type:'crash'});a.reset();assert.equal(a.crashAge,-1);assert.equal(a.recovery,0);assert.equal(a.turn,0);assert.equal(a.pose,null);
});

test('jump, apex, fall and landing produce distinct poses while leaving physics untouched',()=>{
  const e=run(),a=new CharacterAnimator();e.grounded=false;e.y=2;
  const targets=[];for(const vy of [10,0,-10]){e.vy=vy;for(let i=0;i<12;i++)a.update(e,1/60);targets.push(a.pose.feet[0].target[1]);assert.equal(e.y,2);assert.equal(e.vy,vy);}
  assert.ok(targets[0]>targets[1]&&targets[1]>targets[2]);
  e.grounded=true;e.y=0;e.vy=0;a.handleEvent({type:'land'});const land=a.update(e,.1);assert.equal(land.state,'land');assert.ok(land.landing>.08);
  for(let i=0;i<20;i++)a.update(e,1/60);assert.equal(a.pose.state,'run');assert.equal(a.pose.landing,0);
});

test('planted stride speed matches track speed at each difficulty',()=>{
  for(const speed of [14,18,23,34,42]){const cadence=Math.max(1.8,Math.min(2.7,1.65+speed*.025)),a=stride(.002,speed),b=stride(.002+cadence*.00001,speed);assert.ok(a.contact&&b.contact);assert.ok(Math.abs((b.z-a.z)/.00001-speed)<1e-6);}
});

test('feet sample individual ramp contacts and do not invent a support across a roof edge',()=>{
  const e=run();e.y=1.65;e.floorHeight=1.65;e.supportId=10;e.obstacles=[{id:10,type:'ramp',lane:0,ahead:0,halfLength:7,from:0,to:3.3}];
  assert.ok(footSurface(e,0,-.3).height>0);assert.ok(footSurface(e,0,.3).height<0);
  assert.equal(footSurface(e,1.2,0).valid,false);
  e.obstacles=[{id:10,type:'train',lane:0,ahead:7,halfLength:7,height:3.3}];e.y=e.floorHeight=3.3;
  assert.equal(footSurface(e,0,.2).valid,false);assert.equal(footSurface(e,0,-.2).valid,true);
});

test('board feet share its slope and stay above its deck in normal and sliding poses',()=>{
  for(const direction of [-1,1])for(const sliding of [false,true]){
    const e=run();e.board=8;e.slide=sliding?.8:0;e.y=e.floorHeight=1.65;e.supportId=10;e.obstacles=[{id:10,type:'ramp',lane:0,ahead:0,halfLength:7,from:direction>0?0:3.3,to:direction>0?3.3:0}];
    const c=new RunnerCharacter();let parts;for(let i=0;i<35;i++)parts=collect(c,e);
    const pose=c.animator.pose,slope=Math.tan(pose.boardPitch),shoeParts=parts.filter(p=>p.color==='#243d4d'&&Math.abs(Math.hypot(p.matrix[4],p.matrix[5],p.matrix[6])-.022)<1e-5);
    const sole=bounds(shoeParts,slope),deck=e.y+.17/Math.cos(pose.boardPitch);
    assert.equal(shoeParts.length,2);assert.ok(sole.min>=deck-.008,JSON.stringify({direction,sliding,sole,deck}));assert.ok(sole.min<deck+.07);
    for(const foot of pose.feet)assert.ok(foot.contact);
  }
});

test('IK keeps bone lengths finite even at a coincident or unreachable ankle target',()=>{
  for(const target of [[0,0,0],[0,-.7,.3],[0,10,0],[0,0,10]]){const root=[0,0,0],ik=solveLimb(root,target,.45,.445);assert.ok([...ik.knee,...ik.ankle].every(Number.isFinite));assert.ok(Math.abs(Math.hypot(...ik.knee)-.45)<1e-7);assert.ok(Math.abs(Math.hypot(...ik.ankle.map((v,i)=>v-ik.knee[i]))-.445)<1e-7);}
});
