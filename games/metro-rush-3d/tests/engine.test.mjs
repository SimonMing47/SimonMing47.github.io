import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerEngine, PHYSICS } from '../dist/engine.js';
import { multiply, transform } from '../dist/renderer.js';

function emptyGame() { const e = new RunnerEngine(47); e.start(); e.obstacles = []; e.pickups = []; e.nextRow = 1e9; return e; }
function advance(e, seconds) { for (let i = 0; i < Math.round(seconds * 120); i++) e.step(1 / 120); }
function obstacle(e, type, ahead = 0) { e.obstacles = [{ id: 1, type, ahead, lane: 0, halfLength: type === 'train' ? 4.4 : .65 }]; }

test('lane changes stay on the three rails and interpolate to target', () => {
  const e = emptyGame(); for (let i=0;i<8;i++) e.action('left'); advance(e,.5);
  assert.equal(e.lane,-1); assert.ok(Math.abs(e.x+2.7)<.002);
  for (let i=0;i<8;i++) e.action('right'); advance(e,.5);
  assert.equal(e.lane,1); assert.ok(Math.abs(e.x-2.7)<.002);
});
test('jump is ballistic, cannot double jump, and lands', () => {
  const e=emptyGame(); assert.ok(e.action('jump')); advance(e,.16); assert.equal(e.action('jump'),false);
  advance(e,.24); assert.ok(e.y>2.2&&e.y<2.4); advance(e,.5); assert.equal(e.y,0); assert.equal(e.vy,0);
});
test('barriers kill a standing player and permit a correctly timed jump', () => {
  const standing=emptyGame(); obstacle(standing,'barrier'); standing.step(1/120); assert.equal(standing.mode,'over');
  const jumping=emptyGame(); obstacle(jumping,'barrier',8); jumping.action('jump'); advance(jumping,.6); assert.equal(jumping.mode,'running');
});
test('overhead gates require a slide, jumping does not bypass a train', () => {
  const standing=emptyGame(); obstacle(standing,'gate'); standing.step(1/120); assert.equal(standing.mode,'over');
  const sliding=emptyGame(); sliding.action('slide'); obstacle(sliding,'gate'); advance(sliding,.15); assert.equal(sliding.mode,'running');
  const train=emptyGame(); train.action('jump'); advance(train,.35); obstacle(train,'train'); train.step(1/120); assert.equal(train.mode,'over');
});
test('other lanes are safe and train sides stay collidable for their length', () => {
  const e=emptyGame(); e.lane=1;e.x=2.7; obstacle(e,'train'); advance(e,.1);assert.equal(e.mode,'running');
  e.x=0;e.lane=0;e.step(1/120);assert.equal(e.mode,'over');
});
test('pause freezes distance, actions and powerups; resume continues', () => {
  const e=emptyGame();e.magnet=5;advance(e,1);e.pause(); const before=e.snapshot(); advance(e,2);
  assert.deepEqual(e.snapshot(),before);assert.equal(e.action('left'),false); e.resume();advance(e,.5);assert.ok(e.distance>before.distance);
});
test('coin scoring is once-only; magnet reaches neighbouring lanes and expires', () => {
  const e=emptyGame();e.pickups=[e.item('coin',0,.3)];advance(e,.1);assert.equal(e.coins,1);advance(e,.1);assert.equal(e.coins,1);
  e.pickups=[e.item('magnet',0,.3)];advance(e,.1);assert.ok(e.magnet>7.8);
  e.pickups=[e.item('coin',-1,7),e.item('coin',1,7)];advance(e,.1);assert.equal(e.coins,3);
  advance(e,8);assert.equal(e.magnet,0);assert.equal(e.score,Math.floor(e.distance)+30);
});
test('seeded rows have exactly one free lane and sufficient reaction time across 100 seeds', () => {
  for(let seed=1;seed<=100;seed++){
    const e=new RunnerEngine(seed);e.distance=10000;e.populate();
    const rows=new Map();for(const o of e.obstacles){if(!rows.has(o.row))rows.set(o.row,[]);rows.get(o.row).push(o);}
    let prev=-Infinity;
    for(const row of rows.values()){
      assert.equal(row.length,2);assert.equal(new Set(row.map(o=>o.lane)).size,2);
      // Newly populated rows use one coordinate frame; the initial rows are ignored here.
      if(row[0].row>5){assert.ok(row[0].ahead-prev>=32-1e-6);prev=row[0].ahead;}
    }
  }
});
test('long runs cap speed and retain bounded active objects', () => {
  const e=emptyGame();advance(e,600);assert.equal(e.speed,PHYSICS.maxSpeed);
  const g=new RunnerEngine(123);g.start();for(let i=0;i<12000;i++){
    // Move beyond encountered objects to exercise endless generation without collisions.
    g.obstacles=g.obstacles.filter(o=>o.ahead>8);g.step(1/120);
  }
  assert.ok(g.obstacles.length<20);assert.ok(g.pickups.length<160);
});
test('restarting clears transient state and deterministic seeds reproduce the course', () => {
  const a=new RunnerEngine(12),b=new RunnerEngine(12);assert.deepEqual(a.obstacles,b.obstacles);
  a.start();a.coins=99;a.magnet=4;a.y=2;a.reset(12);assert.equal(a.mode,'menu');assert.equal(a.coins,0);assert.equal(a.magnet,0);assert.equal(a.y,0);assert.deepEqual(a.obstacles,b.obstacles);
});
test('3D transform hierarchy preserves translation, rotation, and scale', () => {
  const a=transform(3,4,5),b=transform(0,2,0,2,3,4);const m=multiply(a,b);
  assert.deepEqual([m[12],m[13],m[14]],[3,6,5]);assert.deepEqual([m[0],m[5],m[10]],[2,3,4]);
  const rotated=multiply(transform(0,0,0,1,1,1,0,Math.PI/2),transform(0,0,-2));assert.ok(Math.abs(rotated[12]+2)<1e-6);assert.ok(Math.abs(rotated[14])<1e-6);
});
