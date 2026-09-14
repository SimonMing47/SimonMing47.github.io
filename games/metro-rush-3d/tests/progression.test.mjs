import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerEngine, DIFFICULTIES } from '../dist/engine.js';
import { speedProfile } from '../dist/director.js';
function empty(mode='classic',seed=31){const e=new RunnerEngine(seed,mode);e.start({skipIntro:true});e.obstacles=[];e.pickups=[];e.tunnels=[];e.courses=[];e.encounters=[];e.nextRow=1e9;return e;}

test('speed keeps changing beyond the old cap with smooth, bounded and seed-varied cycles',()=>{
  for(const config of Object.values(DIFFICULTIES))for(const seed of [1,31,47]){
    let low=Infinity,high=0,maxAcceleration=0;
    for(let distance=100000;distance<103000;distance+=.5){const a=speedProfile(distance,config,seed),b=speedProfile(distance+.5,config,seed);low=Math.min(low,a.speed);high=Math.max(high,a.speed);maxAcceleration=Math.max(maxAcceleration,Math.abs(b.speed-a.speed)/(.5/a.speed));assert.ok(a.speed<config.maxSpeed*1.42);}
    assert.ok(high-low>config.maxSpeed*.35);assert.ok(high>config.maxSpeed*1.25);assert.ok(maxAcceleration<7);
  }
  assert.notDeepEqual([4700,5200,5600,5900].map(d=>speedProfile(d,DIFFICULTIES.classic,31).speed),[4700,5200,5600,5900].map(d=>speedProfile(d,DIFFICULTIES.classic,47).speed));
  const e=empty();e.distance=25000;e.step(.05);const before=JSON.stringify(e.snapshot());e.pause();e.step(2);assert.equal(e.distance,25000+e.speed*.05);e.resume();assert.equal(JSON.stringify(e.snapshot()),before);
});

test('rolling contracts use new actions and pickups, pay once, and continue after the first chapter',()=>{
  const e=empty();e.coins=1000;e.updateMissions();assert.equal(e.missions[0].progress,0,'gift coins cannot satisfy collection');
  e.stats.collectedCoins=50;e.distance=800;e.bonusCount=3;e.updateMissions();assert.equal(e.missionsCompleted,3);assert.equal(e.missionRound,2);assert.ok(e.missions.every(m=>m.progress===0));
  for(let round=2;round<9;round++){
    const missions=e.missions,points=e.points;for(const m of missions){const value=m.baseline+m.target;if(m.id==='coins')e.stats.collectedCoins=value;else if(m.id==='distance')e.distance=value;else if(m.id==='events')e.eventStats.completed=value;else e.stats[m.id]=value;}
    e.updateMissions();assert.equal(e.points-points,missions.reduce((n,m)=>n+m.reward,0));assert.equal(e.missionRound,round+1);
    const settled=e.points;e.updateMissions();assert.equal(e.points,settled);assert.ok(e.missions.every(m=>m.progress===0));
  }
});

test('clean action contracts ignore empty jumps, flight and shield collisions',()=>{
  const e=empty();e.action('jump');for(let i=0;i<150;i++)e.step(1/120);assert.equal(e.stats.cleanJumps,0);
  e.obstacles=[{id:900,type:'barrier',lane:0,ahead:2,halfLength:.65}];e.board=1;while(e.obstacles.length&&e.distance<80)e.step(.05);assert.equal(e.savedCrashes,1);assert.equal(e.stats.cleanJumps,0);
  e.invulnerable=0;e.collectBonus('jetpack');e.obstacles=[{id:901,type:'gate',lane:0,ahead:2,halfLength:.65}];for(let i=0;i<60;i++)e.step(1/120);assert.equal(e.stats.cleanSlides,0);
});
