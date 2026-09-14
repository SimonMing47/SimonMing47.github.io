import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerEngine, PHYSICS, DIFFICULTIES, BONUSES } from '../dist/engine.js';
import { multiply, transform } from '../dist/renderer.js';
function emptyGame(mode='classic',seed=47){const e=new RunnerEngine(seed,mode);e.start();e.obstacles=[];e.pickups=[];e.tunnels=[];e.courses=[];e.nextRow=1e9;return e;}
function advance(e,seconds){for(let i=0;i<Math.round(seconds*120);i++)e.step(1/120);}
function obstacle(e,type,ahead=0,lane=0){e.obstacles=[{id:999,type,ahead,lane,halfLength:type==='train'?4.4:.65}];}

test('three difficulties have different speed, scoring, supplies and maximum speeds',()=>{
  const games=Object.keys(DIFFICULTIES).map(key=>emptyGame(key));
  assert.deepEqual(games.map(e=>e.speed),[14,18,23]);assert.deepEqual(games.map(e=>e.multiplier),[1,1.5,2]);assert.deepEqual(games.map(e=>e.boardCharges),[2,1,1]);
  for(const e of games){advance(e,600);assert.ok(e.speed>e.config.maxSpeed*.85&&e.speed<e.config.maxSpeed*1.42);assert.ok(e.stage>5);}
  assert.throws(()=>new RunnerEngine(1,'missing'),/Unknown difficulty/);
});
test('lane inputs are clamped and movement interpolates to the rail',()=>{const e=emptyGame();for(let i=0;i<6;i++)e.action('left');advance(e,.5);assert.equal(e.lane,-1);assert.ok(Math.abs(e.x+2.7)<.002);for(let i=0;i<6;i++)e.action('right');advance(e,.5);assert.equal(e.lane,1);assert.ok(Math.abs(e.x-2.7)<.002);});
test('normal jump is ballistic, cannot double jump, and lands',()=>{const e=emptyGame();assert.ok(e.action('jump'));advance(e,.16);assert.equal(e.action('jump'),false);advance(e,.24);assert.ok(e.y>2.2&&e.y<2.4);advance(e,.5);assert.equal(e.y,0);assert.equal(e.vy,0);});
test('barriers kill standing runners and allow a correctly timed jump',()=>{const a=emptyGame();obstacle(a,'barrier');a.step(1/120);assert.equal(a.mode,'over');const b=emptyGame();obstacle(b,'barrier',8);b.action('jump');advance(b,.7);assert.equal(b.mode,'running');});
test('gates require sliding; ordinary jumping cannot clear a train',()=>{const a=emptyGame();obstacle(a,'gate');a.step(1/120);assert.equal(a.mode,'over');const b=emptyGame();b.action('slide');obstacle(b,'gate');advance(b,.15);assert.equal(b.mode,'running');const c=emptyGame();c.action('jump');advance(c,.35);obstacle(c,'train');c.step(1/120);assert.equal(c.mode,'over');});
test('train sides remain collidable while the runner passes their length',()=>{const e=emptyGame();e.lane=1;e.x=2.7;obstacle(e,'train');advance(e,.1);assert.equal(e.mode,'running');e.x=0;e.lane=0;e.step(1/120);assert.equal(e.mode,'over');});
test('super sneakers clear train height and expiry does not cancel a jump',()=>{
  const e=emptyGame();e.collectBonus('sneakers');e.sneakers=.1;e.action('jump');advance(e,.4);assert.equal(e.sneakers,0);assert.ok(e.y>3.1);obstacle(e,'train');e.step(1/120);assert.equal(e.mode,'running');e.obstacles=[];advance(e,1);assert.equal(e.y,0);
});
test('board activation consumes one charge and protects one crash with grace',()=>{
  const e=emptyGame();assert.ok(e.action('board'));assert.equal(e.boardCharges,0);assert.equal(e.action('board'),false);obstacle(e,'train');e.step(1/120);assert.equal(e.mode,'running');assert.equal(e.savedCrashes,1);assert.equal(e.board,0);assert.ok(e.obstacles[0].broken);obstacle(e,'gate');advance(e,.3);assert.equal(e.mode,'running');e.obstacles=[];advance(e,1.5);obstacle(e,'train');e.step(1/120);assert.equal(e.mode,'over');
});
test('board pickups cap inventory and convert overflow to coins',()=>{const e=emptyGame();for(let i=0;i<3;i++)e.collectBonus('board');assert.equal(e.boardCharges,3);assert.equal(e.coins,20);assert.equal(e.bonusCoins,20);});
test('flight bypasses obstacles, suspends board timer, and lands with protection',()=>{
  const e=emptyGame();e.action('board');const board=e.board;e.collectBonus('jetpack');e.jetpack=.3;obstacle(e,'train');advance(e,.2);assert.equal(e.mode,'running');assert.equal(e.board,board);assert.ok(e.y>3.5);assert.equal(e.action('jump'),false);assert.equal(e.action('slide'),false);advance(e,.11);assert.ok(e.landing);assert.equal(e.jetpack,0);e.obstacles=[];advance(e,1);assert.equal(e.y,0);assert.equal(e.landing,false);assert.ok(e.invulnerable>0);obstacle(e,'train');e.step(1/120);assert.equal(e.mode,'running');assert.equal(e.savedCrashes,0);
});
test('flight generates aerial coins and collects them at flight altitude',()=>{
  const e=emptyGame();e.collectBonus('jetpack');advance(e,.6);assert.ok(e.pickups.some(p=>p.air&&p.y>5));e.pickups=[{...e.item('coin',0,.3,6.1),air:true}];e.nextAirCoin=1e9;e.step(1/120);assert.equal(e.coins,1);
});
test('pause freezes physics, bonus timers, combo and score; resume continues',()=>{
  const e=emptyGame();e.collectBonus('magnet');e.collectBonus('double');e.collectBonus('sneakers');e.combo=25;e.comboTimer=2;e.action('board');advance(e,.2);e.pause();const before=e.snapshot();advance(e,4);assert.deepEqual(e.snapshot(),before);assert.equal(e.action('left'),false);e.resume();advance(e,.5);assert.ok(e.distance>before.distance);
});
test('different bonuses coexist and repeated pickups refresh without stacking',()=>{
  const e=emptyGame();e.collectBonus('magnet');e.collectBonus('double');advance(e,2);e.collectBonus('magnet');assert.equal(e.magnet,BONUSES.magnet.duration);assert.ok(e.double>9.9&&e.double<10.1);e.collectBonus('double');assert.equal(e.multiplier,3);assert.equal(e.double,12);
});
test('magnet visibly moves coins across lanes and only scores on arrival',()=>{
  const e=emptyGame();e.collectBonus('magnet');e.drainEvents();e.pickups=[e.item('coin',-1,7),e.item('coin',1,7)];
  advance(e,.1);assert.equal(e.coins,0);assert.ok(e.pickups.every(p=>p.flight&&Math.abs(p.x)<2.7&&p.ahead>0&&p.trail.length>0));assert.equal(e.drainEvents().filter(x=>x.type==='coin').length,0);
  advance(e,.3);assert.equal(e.coins,2);assert.equal(e.pickups.length,0);const events=e.drainEvents().filter(x=>x.type==='coin');assert.equal(events.length,2);assert.ok(events.every(x=>x.x===e.x&&x.ahead===0&&x.magnetic));advance(e,.5);assert.equal(e.coins,2);
});
test('ordinary pickup waits for physical contact and sweeps high-speed crossings',()=>{
  const e=emptyGame();e.pickups=[e.item('coin',0,.95)];e.step(1/120);assert.equal(e.coins,0);assert.ok(e.pickups[0].ahead>.7);
  advance(e,.04);assert.equal(e.coins,1);
  const fast=emptyGame('expert');fast.distance=1e5;fast.pickups=[fast.item('coin',0,1.01)];fast.step(.05);assert.equal(fast.coins,1);assert.equal(fast.pickups.length,0);
});
test('coin sweep uses lane and height at contact, not the later end-of-frame pose',()=>{
  const e=emptyGame('expert');e.distance=1e5;e.x=-1.4;e.lane=0;e.pickups=[e.item('coin',0,.45)];e.step(.05);assert.equal(e.coins,0);
  const jump=emptyGame();jump.y=2;jump.pickups=[jump.item('coin',0,.35,.95)];jump.step(1/120);assert.equal(jump.coins,0);
  const slide=emptyGame();slide.action('slide');slide.pickups=[slide.item('coin',0,1,.95),slide.item('coin',0,1,1.8)];slide.step(1/120);assert.equal(slide.coins,1);
});
test('magnet expiry finishes already attracted coins, and pause freezes their path',()=>{
  const e=emptyGame();e.magnet=.04;e.pickups=[e.item('coin',1,7),e.item('coin',-1,15),e.item('coin',-1,7,6.1)];e.step(1/120);assert.ok(e.pickups[0].flight);assert.ok(!e.pickups[1].flight&&!e.pickups[2].flight);
  e.pause();const frozen=JSON.stringify(e.pickups);advance(e,1);assert.equal(JSON.stringify(e.pickups),frozen);assert.equal(e.coins,0);e.resume();advance(e,.4);assert.equal(e.magnet,0);assert.equal(e.coins,1);assert.ok(e.pickups.every(p=>!p.flight));
});
test('double score applies only to newly earned points and preserves its ledger',()=>{
  const e=emptyGame('casual');advance(e,1);const initial=e.points;e.collectBonus('double');const before=e.distance;advance(e,1);assert.ok(Math.abs(e.points-initial-(e.distance-before)*2)<1e-6);e.double=0;const points=e.points,distance=e.distance;advance(e,1);assert.ok(Math.abs(e.points-points-(e.distance-distance))<1e-6);assert.ok(Math.abs(e.points-Object.values(e.stats).slice(0,3).reduce((a,b)=>a+b,0))<1e-6);
});
test('20/40 coin combos change multiplier, decay, and multiply with difficulty and x2',()=>{
  const e=emptyGame('expert');e.collectBonus('magnet');e.pickups=Array.from({length:20},()=>e.item('coin',0,.2));e.step(1/120);assert.equal(e.combo,20);assert.equal(e.multiplier,3);e.collectBonus('double');assert.equal(e.multiplier,6);e.pickups=Array.from({length:20},()=>e.item('coin',0,.2));e.step(1/120);assert.equal(e.multiplier,8);advance(e,2.3);assert.equal(e.combo,0);assert.equal(e.maxCombo,40);assert.equal(e.multiplier,4);
});
test('mission bonuses are paid once, separately from multiplier scoring',()=>{
  const e=emptyGame();e.coins=50;e.stats.collectedCoins=50;e.distance=800;e.bonusCount=3;e.updateMissions();assert.equal(e.stats.bonusPoints,1900);e.updateMissions();assert.equal(e.stats.bonusPoints,1900);assert.equal(e.missionsCompleted,3);assert.equal(e.missionRound,2);assert.ok(e.missions.every(m=>!m.done));
});
test('mystery rewards are deterministic, nonrecursive and count one collected item',()=>{
  for(let seed=0;seed<30;seed++){const a=emptyGame('classic',seed),b=emptyGame('classic',seed);a.collectBonus('mystery');b.collectBonus('mystery');assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.bonusCount,1);assert.ok(a.coins>=25||a.boardCharges>1||['magnet','double','sneakers','jetpack'].some(k=>a[k]>0));}
});
test('generated ground rows and elevated courses preserve reachable routes and recovery space',()=>{
  for(const mode of Object.keys(DIFFICULTIES))for(let seed=0;seed<20;seed++){
    const e=emptyGame(mode,seed);e.rows=0;e.nextRow=0;let priorRoute=0,last=-Infinity;const seen=new Set(),actions=new Set();let courses=0,mixed=0;
    for(let section=0;section<30;section++){
      e.distance=section*160;e.populate();const rows=new Map();for(const o of e.obstacles){if(!rows.has(o.row))rows.set(o.row,[]);rows.get(o.row).push(o);}
      for(const [row,items] of rows){
        if(seen.has(row))continue;seen.add(row);const pos=items[0].rowWorld,{routeLane,required}=items[0];assert.ok(Math.abs(routeLane-priorRoute)<=1);priorRoute=routeLane;
        if(Number.isFinite(last)){assert.ok(pos-last>=e.rowGap(last)-.001);}
        if(items[0].course){const c=e.courses.find(c=>c.row===row);assert.ok(c);assert.equal(items.filter(o=>o.type==='ramp').length,2);assert.ok(items.some(o=>o.type==='gap'));if(!items[0].eventId)assert.ok(items.some(o=>o.approachSpeed));else assert.ok(!items.some(o=>o.lane===0));assert.ok(items.filter(o=>o.y>3).every(o=>o.lane===c.lane));last=c.end;courses++;continue;}
        if(required){actions.add(required);assert.equal(items.length,3);assert.equal(items.find(o=>o.lane===routeLane).type,required==='jump'?'barrier':'gate');if(items.some(o=>o.type==='train'))mixed++;}
        else{assert.ok(items.length>=1&&items.length<=2);assert.ok(!items.some(o=>o.lane===routeLane));}
        last=pos;
      }
      for(const o of e.obstacles)o.ahead-=160;for(const p of e.pickups)p.ahead-=160;e.obstacles=e.obstacles.filter(o=>o.ahead+o.halfLength>-16);e.pickups=e.pickups.filter(p=>p.ahead>-8);
    }
    assert.deepEqual([...actions].sort(),['jump','slide']);assert.ok(courses>1);if(mode!=='casual')assert.ok(mixed>0);
  }
});
test('three-lane action rows cannot be bypassed by standing or weaving through lane gaps',()=>{
  for(const type of ['barrier','gate'])for(const x of [-2.7,-1.35,0,1.35,2.7])for(const dt of [1/120,.05]){
    const e=emptyGame('expert');e.distance=1e5;e.x=x;e.lane=x<0?-1:1;
    e.obstacles=[-1,0,1].map(lane=>({id:lane+3,type,ahead:1.01,lane,halfLength:.65}));
    for(let i=0;i<20&&e.mode==='running';i++)e.step(dt);
    assert.equal(e.mode,'over',`${type}, x=${x}, dt=${dt}`);
  }
});
test('all action layouts accept correct moves and reject the opposite action',()=>{
  for(const type of ['barrier','gate'])for(const mixed of [false,true])for(const correct of [false,true])for(const dt of [1/120,.05]){
    const e=emptyGame('expert');e.distance=1e5;e.speed=42;
    e.obstacles=[-1,0,1].map(lane=>({id:lane+3,type:mixed&&lane===-1?'train':type,lane,ahead:42*.4,halfLength:mixed&&lane===-1?4.4:.65}));
    e.action((type==='barrier')===correct?'jump':'slide');
    for(let i=0;i<Math.ceil(.8/dt)&&e.mode==='running';i++)e.step(dt);
    assert.equal(e.mode,correct?'running':'over',`${type}, mixed=${mixed}, correct=${correct}, dt=${dt}`);
  }
});
test('generated routes can be completed with timed jumps and slides, including speed caps and super jumps',()=>{
  for(const mode of Object.keys(DIFFICULTIES))for(const dt of [1/120,.05])for(const superJump of [false,true])for(let seed=1;seed<=3;seed++){
    const e=emptyGame(mode,seed);e.distance=1e5;e.nextRow=e.distance+70;e.rows=0;e.nextSafeLane=0;e.populate();const acted=new Set(),start=e.distance;
    if(superJump)e.sneakers=1e5;
    while(e.distance-start<2200&&e.mode==='running'){
      e.pickups=[];
      const course=e.courses.filter(c=>c.end>e.distance).sort((a,b)=>a.start-b.start)[0];
      const ground=e.obstacles.filter(o=>!o.course&&o.ahead+o.halfLength>-.5).sort((a,b)=>a.rowWorld-b.rowWorld)[0];
      let lane;
      if(course&&(!ground||course.start<ground.rowWorld)){
        lane=course.lane;
        for(const [name,world,action,lead] of [['barrier',course.jumpAt,'jump',.4],['gap',course.firstRoof[1],'jump',.30],['gate',course.slideAt,'slide',.4]]){
          const key=`course-${course.row}-${name}`;
          if(world>=e.distance&&world-e.distance<=e.speed*lead&&!acted.has(key)){assert.ok(e.action(action),`${mode} course ${name}, y=${e.y}, grounded=${e.grounded}`);acted.add(key);}
        }
      }else if(ground){lane=ground.routeLane;if(ground.required&&ground.rowWorld-e.distance<=e.speed*.4&&!acted.has(ground.row)){assert.ok(e.action(ground.required),`${mode} ${ground.required} rejected`);acted.add(ground.row);}}
      if(lane!==undefined&&e.lane!==lane)e.action(e.lane<lane?'right':'left');
      e.step(dt);
    }
    assert.equal(e.mode,'running',`${mode}, dt=${dt}, super=${superJump}, seed=${seed}, distance=${e.distance-start}, reason=${e.reason}`);
    assert.ok(acted.size>=8);
  }
});
test('bonus bag exposes all six pickup types before repeating',()=>{const e=emptyGame();e.bonusBag=[];const six=Array.from({length:6},()=>e.nextBonus());assert.equal(new Set(six).size,6);assert.deepEqual([...six].sort(),Object.keys(BONUSES).sort());});
test('long play keeps object counts bounded and restart clears all bonus state',()=>{
  const e=emptyGame();e.nextRow=30;e.invulnerable=1e6;for(let i=0;i<12000;i++)e.step(1/120);assert.equal(e.mode,'running');assert.ok(e.distance>2000);assert.ok(e.obstacles.length<35);assert.ok(e.pickups.length<240);assert.ok(e.tunnels.length<3);
  for(const type of Object.keys(BONUSES))e.collectBonus(type);e.reset(47,'expert');assert.equal(e.mode,'menu');assert.equal(e.coins,0);assert.equal(e.combo,0);assert.equal(e.bonusCount,0);for(const k of ['magnet','double','sneakers','jetpack','board'])assert.equal(e[k],0);assert.equal(e.boardCharges,1);
});
test('3D hierarchy preserves translation, rotation and scale',()=>{const m=multiply(transform(3,4,5),transform(0,2,0,2,3,4));assert.deepEqual([m[12],m[13],m[14]],[3,6,5]);assert.deepEqual([m[0],m[5],m[10]],[2,3,4]);const r=multiply(transform(0,0,0,1,1,1,0,Math.PI/2),transform(0,0,-2));assert.ok(Math.abs(r[12]+2)<1e-6);assert.ok(Math.abs(r[14])<1e-6);});

test('slide and protection expiry are evaluated at the actual swept contact time',()=>{
  for(const field of ['slide','invulnerable']){
    const e=emptyGame('expert');e.distance=1e5;e[field]=.007;obstacle(e,'gate',-.9);e.step(1/120);assert.equal(e.mode,'running',field);
  }
  const late=emptyGame('expert');late.distance=1e5;late.slide=.001;obstacle(late,'gate',1.1);late.step(1/120);assert.equal(late.mode,'over');
  const board=emptyGame('expert');board.distance=1e5;board.board=.007;board.invulnerable=.001;obstacle(board,'barrier',1.1);board.obstacles.push({...board.obstacles[0],id:1000});board.step(1/120);assert.equal(board.mode,'running');assert.equal(board.savedCrashes,1);
  const coin=emptyGame('expert');coin.distance=1e5;coin.slide=.007;coin.pickups=[coin.item('coin',0,1,1.8)];coin.step(1/120);assert.equal(coin.coins,0);
});

test('magnet activation catches nearby coins in either pickup array order',()=>{
  for(const reverse of [false,true]){
    const e=emptyGame('expert');e.distance=1e5;const magnet=e.item('magnet',0,.2),coin=e.item('coin',1,-.2);e.pickups=reverse?[coin,magnet]:[magnet,coin];
    e.step(1/120);assert.ok(e.magnet>0);assert.ok(coin.flight);assert.equal(e.coins,0);advance(e,.4);assert.equal(e.coins,1);
  }
});
