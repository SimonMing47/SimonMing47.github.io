import test from 'node:test';
import assert from 'node:assert/strict';
import {RunnerEngine,TRACK,tunnelClearance} from '../dist/engine.js';
function empty(mode='classic'){const e=new RunnerEngine(91,mode);e.start();e.obstacles=[];e.pickups=[];e.courses=[];e.tunnels=[];e.nextRow=1e9;return e;}
function tick(e,seconds,dt=1/120){for(let t=0;t<seconds-1e-9&&e.mode==='running';t+=dt)e.step(dt);}
function ramp(e,ahead,length,from,to){const o={...e.item('ramp',0,ahead,0),halfLength:length/2,from,to};e.obstacles.push(o);return o;}
function train(e,ahead,length=20,lane=0,speed=0){const o={...e.item('train',lane,ahead,0),halfLength:length/2,height:TRACK.roofHeight,approachSpeed:speed};e.obstacles.push(o);return o;}
test('runner walks up a ramp, stays on the roof, and walks down without jumping',()=>{
  for(const dt of [1/120,.05]){
    const e=empty();ramp(e,17,14,0,3.3);train(e,34,20);ramp(e,51,14,3.3,0);let roof=false,up=false,down=false;
    while(e.distance<66&&e.mode==='running'){e.step(dt);roof||=e.surface==='roof';up||=e.surface==='uphill';down||=e.surface==='downhill';assert.equal(e.vy,0);}
    assert.equal(e.mode,'running');assert.ok(roof&&up&&down);assert.equal(e.y,0);assert.ok(e.grounded);
  }
});
test('roofs support landing, another jump and sliding; moving off a roof falls to ground',()=>{
  const e=empty();train(e,0,80);e.y=4.4;e.vy=-2;e.grounded=false;tick(e,.4);assert.equal(e.y,3.3);assert.equal(e.surface,'roof');assert.ok(e.action('jump'));tick(e,.9);assert.equal(e.surface,'roof');assert.ok(e.action('slide'));assert.ok(e.slide>0);e.action('right');tick(e,1);assert.equal(e.mode,'running');assert.equal(e.y,0);assert.equal(e.surface,'ground');
});
test('ground-side entry cannot teleport onto a high ramp or through a train',()=>{
  for(const type of ['ramp','train']){
    const e=empty();e.x=2.7;e.lane=1;if(type==='ramp')ramp(e,0,20,0,3.3);else train(e,0,40);e.action('left');tick(e,.3);assert.equal(e.mode,'over');assert.ok(e.y<.2);
  }
});
test('a car gap requires a jump; its far roof catches the landing',()=>{
  for(const jump of [false,true]){
    const e=empty();train(e,-5,30);train(e,34.2,40);e.y=3.3;e.floorHeight=3.3;e.surface='roof';
    while(e.distance<34&&e.mode==='running'){if(jump&&e.distance>=4&&!e.didJump){e.didJump=true;assert.ok(e.action('jump'));}e.step(1/120);}
    assert.equal(e.mode,jump?'running':'over');if(jump)assert.equal(e.surface,'roof');
  }
});
test('rooftop coins require rooftop contact and queued sliding starts on landing',()=>{
  const e=empty();train(e,0,70);e.y=3.3;e.floorHeight=3.3;e.surface='roof';e.pickups=[e.item('coin',0,.4,4.25),e.item('coin',0,.4,.95)];tick(e,.05);assert.equal(e.coins,1);e.action('jump');tick(e,.16);e.action('slide');tick(e,.4);assert.equal(e.surface,'roof');assert.ok(e.slide>0);assert.equal(e.slideQueued,false);
});
test('oncoming trains use combined closing speed, freeze on pause and collide at maximum speed',()=>{
  const e=empty('expert');e.distance=1e5;const o=train(e,60,26.4,1,18);e.step(.05);assert.ok(Math.abs(o.ahead-57)<1e-6);e.pause();const snapshot=o.ahead;tick(e,1);assert.equal(o.ahead,snapshot);e.resume();e.x=2.7;e.lane=1;tick(e,1);assert.equal(e.mode,'over');assert.equal(e.reason,'oncoming');
  const fast=empty('expert');fast.distance=1e5;train(fast,2,1,0,30);fast.step(.05);assert.equal(fast.mode,'over');
});
test('long train bodies persist until their tail passes and remain collidable',()=>{
  const e=empty();const o=train(e,-20,70,1);e.step(.05);assert.ok(e.obstacles.includes(o));e.x=2.7;e.lane=1;e.step(.05);assert.equal(e.mode,'over');
});
test('tunnels change environment and limit high jumps without blocking roof-level running or flight',()=>{
  const e=empty();e.tunnels=[{start:0,end:150,ceiling:8.8}];train(e,0,200);e.y=3.3;e.floorHeight=3.3;e.surface='roof';e.sneakers=10;e.action('jump');tick(e,.65);assert.equal(e.mode,'running');assert.equal(e.environment,'tunnel');assert.ok(e.y<=6.75);assert.ok(e.drainEvents().some(x=>x.type==='jump'&&x.ceilingLimited));e.collectBonus('jetpack');tick(e,1);assert.equal(e.mode,'running');assert.ok(e.y<6);e.jetpack=.01;tick(e,1.2);assert.equal(e.y,3.3);assert.ok(e.invulnerable>0);
});

test('moving-roof landing checks contact time before the train arrives or its tail departs',()=>{
  const late=empty('expert');late.distance=1e5;late.y=3.4;late.vy=-16;late.grounded=false;train(late,15,26.4,0,18);late.step(.05);assert.equal(late.mode,'over');
  const tail=empty('expert');tail.distance=1e5;tail.y=3.4;tail.vy=-16;tail.grounded=false;train(tail,-12,26.4,0,18);tail.step(.05);assert.equal(tail.mode,'running');assert.ok(tail.y>3.25);assert.equal(tail.grounded,false);
});
test('queued slide takes effect at touchdown before a later same-frame rooftop gate',()=>{
  const e=empty('expert');e.distance=1e5;e.y=3.4;e.vy=-16;e.grounded=false;e.slideQueued=true;train(e,0,160);e.obstacles.push({...e.item('gate',0,2,3.3),halfLength:.65});e.step(.05);assert.equal(e.mode,'running');assert.ok(e.slide>0);assert.equal(e.surface,'roof');
});
test('tunnel clearance follows the arch across all three lanes',()=>{
  for(const lane of [-1,0,1]){const e=empty();e.x=lane*2.7;e.lane=lane;e.y=8;e.vy=2;e.grounded=false;e.tunnels=[{start:0,end:100,ceiling:8.8}];e.step(1/120);assert.ok(e.y+2.05<=tunnelClearance(e.x)+1e-8);assert.equal(e.mode,'running');}
  assert.ok(tunnelClearance(2.7)<tunnelClearance(0));assert.ok(tunnelClearance(2.7)>7.35);
});
