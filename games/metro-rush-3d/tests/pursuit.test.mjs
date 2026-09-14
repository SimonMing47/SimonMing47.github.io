import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerEngine, DIFFICULTIES, TRACK } from '../dist/engine.js';
import { INTRO_DURATION, PURSUIT_RULES } from '../dist/pursuit.js';
function empty(mode='classic'){const e=new RunnerEngine(31,mode);e.start({skipIntro:true});e.obstacles=[];e.pickups=[];e.tunnels=[];e.courses=[];e.encounters=[];e.nextRow=1e9;return e;}
function advance(e,seconds,dt=1/120){for(let time=0;time<seconds-1e-9;time+=dt)e.step(Math.min(dt,seconds-time));}
function obstacle(e,type='train',extra={}){const o={id:++e.id,type,lane:0,ahead:0,halfLength:type==='train'?45:.65,height:TRACK.roofHeight,row:123,...extra};e.obstacles.push(o);return o;}

test('opening plays discovery and launches once; skip reaches the same untouched route',()=>{
  const a=new RunnerEngine(31),b=new RunnerEngine(31);a.start();b.start();const route=JSON.stringify(a.obstacles);a.magnet=10;
  advance(a,2.3);assert.equal(a.mode,'intro');assert.equal(a.distance,0);assert.equal(a.magnet,10);assert.equal(JSON.stringify(a.obstacles),route);assert.equal(a.action('jump'),false);
  const events=a.drainEvents();assert.equal(events.filter(e=>e.type==='discovered').length,1);a.pause();const snapshot=a.snapshot();advance(a,3);assert.deepEqual(a.snapshot(),snapshot);assert.equal(a.skipIntro(),false);a.resume();
  while(a.mode==='intro')a.step(1/120);assert.equal(a.mode,'running');assert.equal(a.drainEvents().filter(e=>e.type==='launch').length,1);assert.equal(b.skipIntro(),true);assert.equal(b.skipIntro(),false);assert.deepEqual(a.obstacles,b.obstacles);assert.equal(a.distance,0);assert.equal(a.introTime,b.introTime);
});

test('first train, incoming train, ramp, barrier and gate collision survives with a visible chase state',()=>{
  for(const mode of Object.keys(DIFFICULTIES))for(const dt of [1/120,.05])for(const type of ['train','incoming','ramp','barrier','gate']){
    const e=empty(mode),o=obstacle(e,type==='incoming'?'train':type,type==='incoming'?{approachSpeed:18}:type==='ramp'?{from:0,to:3.3,halfLength:10}:{});
    e.step(dt);assert.equal(e.mode,'running',`${mode} ${type}`);assert.ok(e.recovery);assert.equal(e.pursuit.hits,1);assert.ok(e.pursuit.danger);assert.ok(e.pursuit.gap<2);assert.equal(e.accidents,1);assert.equal(o.broken,undefined);
    const before={distance:e.distance,time:e.time,ahead:o.ahead};advance(e,.5,dt);assert.equal(e.distance,before.distance);assert.equal(e.time,before.time);assert.equal(o.ahead,before.ahead);
    advance(e,.1,dt);assert.equal(e.recovery,null);assert.ok(e.grounded);assert.ok(!e.obstacles.some(b=>b.type==='train'&&!b.accidentIgnored&&b.lane===e.lane&&Math.abs(b.ahead)<b.halfLength&&e.y<b.height));
  }
});

test('one long carriage or overlapping row cannot charge several hits; the next accident captures',()=>{
  const e=empty();const original=obstacle(e);obstacle(e,'barrier',{id:++e.id});e.step(.05);assert.equal(e.accidents,1);advance(e,.7);assert.ok(e.obstacles.includes(original));assert.equal(e.pursuit.hits,1);
  advance(e,1.2);e.obstacles=[];obstacle(e,'gate',{lane:e.lane,row:456});e.step(.05);assert.equal(e.mode,'caught');assert.equal(e.pursuit.hits,2);assert.equal(e.drainEvents().filter(v=>v.type==='caught').length,1);
  const distance=e.distance;e.pause();advance(e,2);assert.equal(e.caughtTime,0);assert.equal(e.mode,'paused');e.resume();advance(e,1.06);assert.equal(e.mode,'over');assert.equal(e.distance,distance);assert.equal(e.drainEvents().filter(v=>v.type==='crash').length,1);advance(e,2);assert.equal(e.drainEvents().length,0);
});

test('clean running and actual clean actions restore forgiveness at difficulty-specific rates',()=>{
  for(const mode of Object.keys(DIFFICULTIES)){
    const e=empty(mode);obstacle(e,'barrier');e.step(.05);advance(e,.56);e.obstacles=[];
    advance(e,PURSUIT_RULES[mode].recoverSeconds+.05);assert.equal(e.pursuit.danger,false);assert.equal(e.pursuit.recoveries,1);
    obstacle(e,'gate',{lane:e.lane,row:999});e.step(.05);assert.equal(e.mode,'running');assert.equal(e.pursuit.hits,2);assert.ok(e.recovery);
  }
  const e=empty();e.pursuit.pressure=58;e.action('jump');obstacle(e,'barrier',{ahead:e.speed*.4});advance(e,.8);assert.equal(e.accidents,0);assert.equal(e.stats.cleanJumps,1);assert.equal(e.pursuit.danger,false);
});

test('board absorbs a collision before chase damage; smoke clears pursuit but never grants collision immunity',()=>{
  const e=empty();e.pursuit.pressure=88;e.action('board');obstacle(e);e.step(.05);assert.equal(e.mode,'running');assert.equal(e.pursuit.hits,0);assert.equal(e.savedCrashes,1);assert.equal(e.recovery,null);assert.ok(e.pursuit.danger);
  e.collectBonus('smoke');assert.equal(e.pursuit.danger,false);assert.ok(e.smoke>0);e.obstacles=[];advance(e,1.5);obstacle(e,'gate');e.step(.05);assert.equal(e.pursuit.hits,1);assert.ok(e.recovery);
});

test('recovery freezes timers and can be paused, without teleporting onto an occupied neighbouring lane',()=>{
  const e=empty();e.magnet=9;e.double=9;obstacle(e);obstacle(e,'train',{lane:1,row:234});e.step(.05);assert.equal(e.recovery.targetLane,-1);assert.equal(e.action('left'),false);
  advance(e,.2);e.pause();const before=JSON.stringify({state:e.snapshot(),recovery:e.recovery,objects:e.obstacles});advance(e,2);assert.equal(JSON.stringify({state:e.snapshot(),recovery:e.recovery,objects:e.obstacles}),before);e.resume();advance(e,.35);assert.equal(e.lane,-1);assert.equal(e.y,0);assert.ok(e.magnet>8.94);
});

test('roof accidents retain roof support and a fully blocked recovery vaults without deleting trains',()=>{
  const e=empty();const roof=obstacle(e,'train',{row:30,roofRoute:true});e.y=e.floorHeight=3.3;e.supportId=roof.id;e.surface='roof';obstacle(e,'gate',{y:3.3,row:31});e.step(.05);advance(e,.6);assert.equal(e.mode,'running');assert.equal(e.y,3.3);assert.equal(e.supportId,roof.id);
  const closed=empty();for(const lane of [-1,0,1])obstacle(closed,'train',{lane,row:55});closed.step(.05);assert.ok(closed.recovery.vault);advance(closed,.8);assert.equal(closed.mode,'running');assert.equal(closed.y,3.3);assert.equal(closed.obstacles.filter(o=>o.type==='train').length,3);
});

test('collisions taint challenge rewards even before a long train row reaches its nominal start',()=>{
  const e=empty();e.director.eventBag=['convoy'];e.buildEncounter(100);e.nextRow=1e9;const ev=e.encounters[0],o=e.obstacles[0];e.distance=ev.start-1;e.impact(o,false);assert.equal(ev.tainted,true);e.recovery=null;ev.progress=ev.goal;e.distance=ev.end+3;e.updateEncounters();assert.equal(e.lastEncounter.success,false);assert.equal(e.eventStats.completed,0);
});

test('breakout is an explicit exit: success stops, continue preserves score, failure schedules a retry',()=>{
  const e=empty();e.buildEncounter(100,'breakout');const ev=e.encounters[0];assert.equal(e.story.scheduled,true);assert.equal(ev.goal,PURSUIT_RULES.classic.waves);
  ev.progress=ev.goal;e.distance=ev.end+3;e.updateEncounters();assert.equal(e.mode,'escaped');assert.equal(e.story.completed,1);assert.equal(e.pursuit.escapes,1);const score=e.score,distance=e.distance;advance(e,3);assert.equal(e.score,score);assert.equal(e.distance,distance);
  assert.equal(e.continueRun(),true);assert.equal(e.continueRun(),false);assert.equal(e.story.leg,2);assert.equal(e.score,score);assert.ok(e.story.target>distance+1000);
  const failed=empty();failed.buildEncounter(100,'breakout');const f=failed.encounters[0];failed.distance=f.end+3;failed.updateEncounters();assert.equal(failed.mode,'running');assert.equal(failed.story.completed,0);assert.equal(failed.story.scheduled,false);assert.ok(failed.story.target>failed.distance+600);
});

test('crossing an exit through step does not prequeue another exit before the next leg',()=>{
  const e=empty();e.buildEncounter(100,'breakout');const ev=e.encounters[0];e.obstacles=[];e.pickups=[];ev.progress=ev.goal;e.distance=ev.end+1.99;e.nextRow=ev.end+55;
  e.step(.01);assert.equal(e.mode,'escaped');assert.equal(e.encounters.filter(v=>v.type==='breakout').length,1);
  e.continueRun();e.step(.01);assert.equal(e.mode,'running');assert.equal(e.encounters.filter(v=>v.type==='breakout'&&!v.finished).length,0);assert.ok(e.story.target>e.distance+1000);
});

test('airborne rooftop stumble lands on the roof and leaves later course obstacles active',()=>{
  const e=empty(),roof=obstacle(e,'train',{halfLength:80,course:true}),gate=obstacle(e,'gate',{y:3.3,course:true}),next=obstacle(e,'barrier',{ahead:60,y:3.3,course:true});
  e.y=4.5;e.vy=3;e.grounded=false;e.floorHeight=0;e.supportId=null;e.step(.01);
  assert.ok(e.recovery);assert.equal(e.recovery.targetY,3.3);assert.equal(e.recovery.supportId,roof.id);assert.equal(roof.accidentIgnored,undefined);assert.equal(next.accidentIgnored,undefined);assert.equal(gate.accidentIgnored,true);
  advance(e,.56);assert.equal(e.y,3.3);advance(e,1.11);next.ahead=0;e.step(.01);assert.equal(e.mode,'caught');
});

test('leaving a carriage after recovery rearms it so a deliberate return counts as another accident',()=>{
  const e=empty(),train=obstacle(e,'train',{halfLength:90});e.step(.01);advance(e,.56);assert.notEqual(e.lane,0);advance(e,1.2);assert.equal(train.accidentIgnored,false);
  e.action(e.lane<0?'right':'left');advance(e,.2);assert.equal(e.mode,'caught');assert.equal(e.accidents,2);
});
