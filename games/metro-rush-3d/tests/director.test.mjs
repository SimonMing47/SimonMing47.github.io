import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerEngine, DIFFICULTIES, ROUTE_EVENTS, DISTRICTS } from '../dist/engine.js';
import { RouteDirector, travelTime } from '../dist/director.js';

function empty(mode='classic',seed=47){const e=new RunnerEngine(seed,mode);e.start();e.obstacles=[];e.pickups=[];e.tunnels=[];e.courses=[];e.encounters=[];e.lastEncounter=null;e.nextRow=1e9;return e;}
function drive(e,until,dt=1/120){
  const acted=new Set(),finished=[];
  while(e.distance<until&&e.mode==='running'){
    e.pickups=e.pickups.filter(p=>p.type==='coin'||p.type==='stamp');
    const course=e.courses.filter(c=>c.end>e.distance).sort((a,b)=>a.start-b.start)[0];
    const ground=e.obstacles.filter(o=>!o.course&&(o.rowWorld+12>e.distance||o.ahead+o.halfLength>-.5)).sort((a,b)=>a.rowWorld-b.rowWorld)[0];
    let lane;
    if(course&&(!ground||course.start<ground.rowWorld)){
      lane=course.lane;
      for(const [name,world,action,lead] of [['barrier',course.jumpAt,'jump',.4],['gap',course.firstRoof[1],'jump',.30],['gate',course.slideAt,'slide',.4]]){
        const key=`course-${course.row}-${name}`;
        if(world>=e.distance&&world-e.distance<=e.speed*lead&&!acted.has(key)){assert.ok(e.action(action),`${action} rejected at ${e.distance}`);acted.add(key);}
      }
    }else if(ground){lane=ground.routeLane;if(ground.required&&ground.rowWorld-e.distance<=e.speed*.4&&!acted.has(ground.row)){assert.ok(e.action(ground.required));acted.add(ground.row);}}
    if(lane!==undefined&&e.lane!==lane)e.action(e.lane<lane?'right':'left');
    e.step(dt);finished.push(...e.drainEvents().filter(v=>v.type==='eventFinish'));
  }
  return finished;
}

test('every event can be completed with ordinary controls at all speed caps, including super jumps',()=>{
  for(const type of Object.keys(ROUTE_EVENTS))for(const mode of Object.keys(DIFFICULTIES))for(const dt of [1/120,.05])for(const superJump of [false,true])for(const start of [0,1e5]){
    const e=empty(mode,31);e.distance=start;e.speed=e.speedAt(start);if(superJump)e.sneakers=1e5;e.director.eventBag=[type];e.buildEncounter(e.distance+60);e.nextRow=1e9;
    const ev=e.encounters[0],finished=drive(e,ev.end+4,dt);
    assert.equal(e.mode,'running',`${type} ${mode} ${dt} ${superJump} died: ${e.reason}`);
    assert.equal(ev.progress,ev.goal,`${type} ${mode} ${dt} ${superJump}: ${ev.progress}/${ev.goal}`);
    assert.equal(finished.length,1);assert.equal(finished[0].success,true);assert.equal(e.eventStats.completed,1);
  }
});

test('shuffled event bags cover every type without adjacent repeats and layouts vary by seed',()=>{
  const layouts=new Set();for(let seed=1;seed<=16;seed++){
    const d=new RouteDirector(seed,'classic'),size=Object.keys(ROUTE_EVENTS).length,types=Array.from({length:size*4},()=>d.eventType());
    for(let i=0;i<size*4;i+=size)assert.equal(new Set(types.slice(i,i+size)).size,size);
    assert.ok(types.every((t,i)=>!i||t!==types[i-1]));
    const e=empty('classic',seed);e.director.eventBag=['rhythm'];e.buildEncounter(1000);layouts.add(JSON.stringify(e.obstacles.map(o=>[o.type,o.lane,o.rowWorld])));
  }assert.ok(layouts.size>=12);
});

test('districts change geometry theme, stay contiguous and do not repeat next to each other',()=>{
  const d=new RouteDirector(47,'classic'),seen=new Set();let previous=null;
  for(let distance=0;distance<12000;distance+=300){d.ensureDistricts(distance);assert.ok(d.districts.length<=6);for(const region of d.districts){seen.add(region.type);assert.ok(DISTRICTS[region.type]);}const current=d.districtAt(distance);if(previous&&current.id!==previous.id)assert.notEqual(current.type,previous.type);previous=current;
    for(let i=1;i<d.districts.length;i++)assert.equal(d.districts[i].start,d.districts[i-1].end);
  }assert.equal(seen.size,5);
});

test('events freeze on pause, pay rewards once, skip cleanly and reset with the run',()=>{
  const e=empty();e.director.eventBag=['courier'];e.buildEncounter(100);e.nextRow=1e9;const ev=e.encounters[0];e.distance=100;e.updateEncounters();e.pause();const before=JSON.stringify(e.encounters);e.step(.05);assert.equal(JSON.stringify(e.encounters),before);
  e.resume();ev.progress=ev.goal;e.distance=ev.end+3;const points=e.points,coins=e.coins;e.updateEncounters();assert.equal(e.points-points,ev.reward+ev.coins*10);assert.equal(e.coins-coins,ev.coins);e.updateEncounters();assert.equal(e.points-points,ev.reward+ev.coins*10);
  e.reset(3);assert.equal(e.eventStats.completed,0);assert.equal(e.lastEncounter,null);
  const missed=empty();missed.director.eventBag=['courier'];missed.buildEncounter(100);const m=missed.encounters[0];missed.distance=m.end+3;missed.updateEncounters();assert.equal(missed.points,0);assert.equal(missed.coins,0);assert.equal(missed.lastEncounter.success,false);
});

test('gift outcomes and bonus pickups cannot alter future route or district randomness',()=>{
  const a=empty('expert',8),b=empty('expert',8);for(let i=0;i<20;i++){a.collectBonus('mystery');a.nextBonus();}
  for(const e of [a,b]){e.rows=0;e.nextRow=50;e.populate();}
  assert.deepEqual(a.obstacles.map(o=>[o.type,o.lane,o.ahead,o.halfLength]),b.obstacles.map(o=>[o.type,o.lane,o.ahead,o.halfLength]));assert.deepEqual(a.director.districts,b.director.districts);
});

test('oncoming heads arrive at their announced world position through acceleration',()=>{
  for(const mode of Object.keys(DIFFICULTIES)){
    const e=empty(mode),world=170,v=13,halfLength=13.2;e.x=e.lane*2.7;e.obstacles=[{id:100,type:'train',lane:1,ahead:e.incomingAhead(world,v,halfLength),halfLength,approachSpeed:v,height:3.3}];
    assert.ok(travelTime(0,world,e.config)>0);while(e.distance<world)e.step(1/120);
    assert.ok(Math.abs(e.obstacles[0].ahead-halfLength)<.6);
  }
});

test('multi-seed long runs keep fair paths, all event types, districts and bounded queues',()=>{
  for(const mode of Object.keys(DIFFICULTIES))for(let seed=1;seed<=6;seed++){
    const e=new RunnerEngine(seed,mode);e.start();const finished=drive(e,5200,.05);
    assert.equal(e.mode,'running',`${mode} seed ${seed} at ${e.distance}: ${e.reason}`);
    assert.equal(new Set(finished.map(ev=>ev.eventType)).size,Object.keys(ROUTE_EVENTS).length);assert.ok(finished.every(ev=>ev.success),JSON.stringify({mode,seed,finished}));
    assert.ok(e.encounters.length<=3);assert.ok(e.obstacles.length<50);assert.ok(e.pickups.length<280);assert.ok(e.director.districts.length<=6);
  }
});

test('a slide that ends after the swept gate contact still earns relay progress',()=>{
  const e=empty('expert');e.distance=1e5;e.slide=.007;e.encounters=[{id:40,type:'rhythm',start:99990,end:100100,goal:1,progress:0,passedRows:[],checkpoints:[],started:true,warned:true}];
  e.obstacles=[{id:42,type:'gate',ahead:-.9,halfLength:.65,lane:0,row:20,eventId:40}];e.step(1/120);
  assert.equal(e.mode,'running');assert.equal(e.slide,0);assert.equal(e.encounters[0].progress,1);
});

test('the rooftop gift follows all badges so a jetpack reward cannot steal completion',()=>{
  const e=empty('casual',1);e.director.eventBag=['rooftop'];e.buildEncounter(40);e.nextRow=1e9;
  const ev=e.encounters[0],last=Math.max(...e.pickups.filter(p=>p.type==='stamp').map(p=>p.ahead)),gift=e.pickups.find(p=>p.type==='mystery');
  assert.ok(gift.ahead>last+10);assert.ok(gift.ahead>ev.end);assert.equal(gift.y,1.05);
});

test('slow side-lane rooftop super jumps retain the obstacle clearance window in caves',()=>{
  const e=empty('casual',1);e.director.eventBag=['rooftop'];e.buildEncounter(40);e.nextRow=1e9;e.sneakers=1e5;
  const ev=e.encounters[0];drive(e,ev.end+4);assert.equal(e.mode,'running');assert.equal(ev.progress,3);
});

test('late acceleration, deceleration and cycle boundaries preserve every event with super jumps',()=>{
  const seed=31,span=1220,base=420+span*20;
  for(const phase of [.13,.36,.52,.70,.87,.99])for(const type of Object.keys(ROUTE_EVENTS))for(const mode of Object.keys(DIFFICULTIES))for(const dt of [1/120,.05])for(const superJump of [false,true]){
    const e=empty(mode,seed);e.distance=base+span*phase;e.speed=e.speedAt(e.distance);if(superJump)e.sneakers=1e5;
    e.director.eventBag=[type];e.buildEncounter(e.distance+60);e.nextRow=1e9;const ev=e.encounters[0];
    assert.ok(Math.abs(travelTime(ev.warnAt,ev.start,e.config,seed)-4)<.003);
    const finished=drive(e,ev.end+4,dt);
    assert.equal(e.mode,'running',`${type} ${mode} phase ${phase} dt ${dt} super ${superJump}: ${e.reason} at ${e.distance}`);
    assert.equal(ev.progress,ev.goal,`${type} ${mode} phase ${phase} super ${superJump}: ${ev.progress}/${ev.goal}`);
    assert.equal(finished[0]?.success,true);
  }
});

test('oncoming train predictions match real arrival during late speed transitions',()=>{
  for(const mode of Object.keys(DIFFICULTIES))for(const phase of [.13,.36,.52,.70,.87,.99])for(const dt of [1/120,.05]){
    const e=empty(mode,31);e.distance=24820+phase*1220;const world=e.distance+250,v=22,half=13.2;
    const o={id:400,type:'train',lane:1,ahead:e.incomingAhead(world,v,half),halfLength:half,approachSpeed:v,height:3.3};e.obstacles=[o];
    let before,oldAhead;while(e.distance<world){before=e.distance;oldAhead=o.ahead;e.step(dt);}
    const u=(world-before)/(e.distance-before),head=oldAhead+(o.ahead-oldAhead)*u-half;
    assert.ok(Math.abs(head)<.025,`${mode} ${phase} ${dt} arrival error ${head}`);
  }
});

test('branch treasure offers a safe ground reward and a larger physically collected roof reward',()=>{
  for(const mode of Object.keys(DIFFICULTIES))for(const start of [0,24820+1220*.36]){
    const ground=empty(mode,31),roof=empty(mode,31);
    for(const e of [ground,roof]){e.distance=start;e.speed=e.speedAt(start);e.director.eventBag=['rooftop'];e.buildEncounter(start+60);e.nextRow=1e9;}
    const g=ground.encounters[0],r=roof.encounters[0],baseReward=g.reward;
    ground.pickups=ground.pickups.filter(p=>p.type==='stamp');while(ground.distance<g.end+4&&ground.mode==='running')ground.step(.05);
    drive(roof,r.end+4,.05);
    assert.equal(ground.mode,'running');assert.equal(g.progress,3);assert.equal(g.groundBadges,3);assert.equal(g.roofBadges,0);assert.equal(g.reward,baseReward);
    assert.equal(roof.mode,'running');assert.equal(r.progress,3);assert.equal(r.roofBadges,3);assert.equal(r.reward,baseReward+600);assert.equal(r.coins,g.coins+30);
  }
  const e=empty();e.director.eventBag=['rooftop'];e.buildEncounter(100);const ev=e.encounters[0];e.distance=101;
  e.recordEvent(ev.id,'treasure-0',true);const reward=ev.reward;e.recordEvent(ev.id,'treasure-0',false);
  assert.equal(ev.progress,1);assert.equal(ev.reward,reward);assert.equal(ev.groundBadges,0);
});

test('construction blocks are real collisions and its open lanes still require jumps or slides',()=>{
  for(const mode of Object.keys(DIFFICULTIES)){
    const e=empty(mode);e.director.eventBag=['works'];e.buildEncounter(100);e.nextRow=1e9;
    const rows=[...new Set(e.obstacles.map(o=>o.row))];for(const row of rows){const objects=e.obstacles.filter(o=>o.row===row);assert.equal(objects.length,3);assert.equal(objects.filter(o=>o.construction).length,1);assert.equal(objects.find(o=>o.construction).type,'train');assert.equal(objects.find(o=>o.construction).approachSpeed,0);}
    const first=e.obstacles[0];e.lane=first.routeLane;e.x=e.lane*2.7;while(e.mode==='running'&&e.distance<120)e.step(.05);assert.equal(e.mode,'over');
  }
});

test('three-event streak awards one supply and a miss restarts the chain',()=>{
  const e=empty();e.boardCharges=0;let before=0;
  for(let n=0;n<4;n++){
    e.director.eventBag=['courier'];e.buildEncounter(e.distance+40);const ev=e.encounters.at(-1);ev.progress=ev.goal;e.distance=ev.end+3;e.updateEncounters();
    assert.equal(!!ev.streakReward,n===2);assert.equal(e.boardCharges,n>=2?1:0);
    const coins=e.coins,points=e.points;e.updateEncounters();assert.equal(e.coins,coins);assert.equal(e.points,points);assert.ok(points>before);before=points;
  }
  e.director.eventBag=['courier'];e.buildEncounter(e.distance+40);const miss=e.encounters.at(-1);e.distance=miss.end+3;e.updateEncounters();assert.equal(e.eventStats.streak,0);
  e.reset();assert.equal(e.eventStats.streak,0);assert.equal(e.missionsCompleted,0);
});
