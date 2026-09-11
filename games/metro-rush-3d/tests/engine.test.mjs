import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerEngine, PHYSICS, DIFFICULTIES, BONUSES } from '../dist/engine.js';
import { multiply, transform } from '../dist/renderer.js';
function emptyGame(mode='classic',seed=47){const e=new RunnerEngine(seed,mode);e.start();e.obstacles=[];e.pickups=[];e.nextRow=1e9;return e;}
function advance(e,seconds){for(let i=0;i<Math.round(seconds*120);i++)e.step(1/120);}
function obstacle(e,type,ahead=0,lane=0){e.obstacles=[{id:999,type,ahead,lane,halfLength:type==='train'?4.4:.65}];}

test('three difficulties have different speed, scoring, supplies and maximum speeds',()=>{
  const games=Object.keys(DIFFICULTIES).map(key=>emptyGame(key));
  assert.deepEqual(games.map(e=>e.speed),[14,18,23]);assert.deepEqual(games.map(e=>e.multiplier),[1,1.5,2]);assert.deepEqual(games.map(e=>e.boardCharges),[2,1,1]);
  for(const e of games){advance(e,600);assert.equal(e.speed,e.config.maxSpeed);assert.equal(e.stage,5);}
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
test('magnet collects neighbouring lanes exactly once',()=>{const e=emptyGame();e.collectBonus('magnet');e.pickups=[e.item('coin',-1,7),e.item('coin',1,7)];advance(e,.1);assert.equal(e.coins,2);advance(e,.1);assert.equal(e.coins,2);advance(e,11);assert.equal(e.magnet,0);});
test('double score applies only to newly earned points and preserves its ledger',()=>{
  const e=emptyGame('casual');advance(e,1);const initial=e.points;e.collectBonus('double');const before=e.distance;advance(e,1);assert.ok(Math.abs(e.points-initial-(e.distance-before)*2)<1e-6);e.double=0;const points=e.points,distance=e.distance;advance(e,1);assert.ok(Math.abs(e.points-points-(e.distance-distance))<1e-6);assert.ok(Math.abs(e.points-Object.values(e.stats).slice(0,3).reduce((a,b)=>a+b,0))<1e-6);
});
test('20/40 coin combos change multiplier, decay, and multiply with difficulty and x2',()=>{
  const e=emptyGame('expert');e.collectBonus('magnet');e.pickups=Array.from({length:20},()=>e.item('coin',0,3));e.step(1/120);assert.equal(e.combo,20);assert.equal(e.multiplier,3);e.collectBonus('double');assert.equal(e.multiplier,6);e.pickups=Array.from({length:20},()=>e.item('coin',0,3));e.step(1/120);assert.equal(e.multiplier,8);advance(e,2.3);assert.equal(e.combo,0);assert.equal(e.maxCombo,40);assert.equal(e.multiplier,4);
});
test('mission bonuses are paid once, separately from multiplier scoring',()=>{
  const e=emptyGame();e.coins=50;e.distance=800;e.bonusCount=3;e.updateMissions();assert.equal(e.stats.bonusPoints,1900);e.updateMissions();assert.equal(e.stats.bonusPoints,1900);assert.equal(e.missions.filter(m=>m.done).length,3);
});
test('mystery rewards are deterministic, nonrecursive and count one collected item',()=>{
  for(let seed=0;seed<30;seed++){const a=emptyGame('classic',seed),b=emptyGame('classic',seed);a.collectBonus('mystery');b.collectBonus('mystery');assert.deepEqual(a.snapshot(),b.snapshot());assert.equal(a.bonusCount,1);assert.ok(a.coins>=25||a.boardCharges>1||['magnet','double','sneakers','jetpack'].some(k=>a[k]>0));}
});
test('every difficulty generates passable corridors, adjacent lane changes and safe gaps',()=>{
  for(const mode of Object.keys(DIFFICULTIES))for(let seed=0;seed<35;seed++){
    const e=new RunnerEngine(seed,mode);e.obstacles=[];e.pickups=[];e.rows=0;e.nextRow=0;e.distance=0;
    let priorSafe=[0],last=-Infinity;
    for(let section=0;section<30;section++){
      e.distance=section*160;e.populate();const rows=new Map();for(const o of e.obstacles){if(!rows.has(o.row))rows.set(o.row,[]);rows.get(o.row).push(o);}
      for(const items of rows.values()){
        const pos=items[0].ahead+e.distance;if(pos<=last)continue;
        assert.ok(items.length>=1&&items.length<=2);const free=[-1,0,1].filter(l=>!items.some(o=>o.lane===l));assert.ok(free.length>=1);
        const reachable=free.filter(l=>priorSafe.some(previous=>Math.abs(l-previous)<=1));assert.ok(reachable.length>0);priorSafe=reachable;
        if(Number.isFinite(last))assert.ok(pos-last>=e.config.minGap-.001);last=pos;
      }
      // Keep the previously generated rows in the next relative coordinate frame.
      for(const o of e.obstacles)o.ahead-=160;for(const p of e.pickups)p.ahead-=160;e.obstacles=e.obstacles.filter(o=>o.ahead>-16);e.pickups=e.pickups.filter(p=>p.ahead>-8);
    }
  }
});
test('bonus bag exposes all six pickup types before repeating',()=>{const e=emptyGame();e.bonusBag=[];const six=Array.from({length:6},()=>e.nextBonus());assert.equal(new Set(six).size,6);assert.deepEqual([...six].sort(),Object.keys(BONUSES).sort());});
test('long play keeps object counts bounded and restart clears all bonus state',()=>{
  const e=emptyGame();e.nextRow=30;for(let i=0;i<12000;i++){e.obstacles=e.obstacles.filter(o=>o.ahead>8);e.step(1/120);}assert.ok(e.obstacles.length<22);assert.ok(e.pickups.length<180);
  for(const type of Object.keys(BONUSES))e.collectBonus(type);e.reset(47,'expert');assert.equal(e.mode,'menu');assert.equal(e.coins,0);assert.equal(e.combo,0);assert.equal(e.bonusCount,0);for(const k of ['magnet','double','sneakers','jetpack','board'])assert.equal(e[k],0);assert.equal(e.boardCharges,1);
});
test('3D hierarchy preserves translation, rotation and scale',()=>{const m=multiply(transform(3,4,5),transform(0,2,0,2,3,4));assert.deepEqual([m[12],m[13],m[14]],[3,6,5]);assert.deepEqual([m[0],m[5],m[10]],[2,3,4]);const r=multiply(transform(0,0,0,1,1,1,0,Math.PI/2),transform(0,0,-2));assert.ok(Math.abs(r[12]+2)<1e-6);assert.ok(Math.abs(r[14])<1e-6);});
