/** Deterministic gameplay. x is lateral; ahead is metres in front of the runner. */
export const LANE_WIDTH = 2.7;
export const PHYSICS = Object.freeze({ gravity: 28, jumpVelocity: 11.4, superJumpVelocity: 16.2, slideDuration: .8, startSpeed: 18, maxSpeed: 34 });
export const DIFFICULTIES = Object.freeze({
  casual: Object.freeze({ name:'休闲', english:'CHILL', startSpeed:14, maxSpeed:24, acceleration:.004, gap:44, minGap:34, multiplier:1, firstRow:70, stageLength:500, bonusScale:1.25, boards:2, comboWindow:3.2, hint:'宽松轨道，轻松练习', color:'#60efd2' }),
  classic: Object.freeze({ name:'经典', english:'FLOW', startSpeed:18, maxSpeed:34, acceleration:.006, gap:36, minGap:28, multiplier:1.5, firstRow:60, stageLength:600, bonusScale:1, boards:1, comboWindow:2.7, hint:'交错障碍，畅快连招', color:'#ffc85a' }),
  expert: Object.freeze({ name:'极限', english:'RUSH', startSpeed:23, maxSpeed:42, acceleration:.008, gap:31, minGap:26, multiplier:2, firstRow:56, stageLength:500, bonusScale:.85, boards:1, comboWindow:2.2, hint:'高速密集，挑战反应', color:'#f595bf' })
});
export const BONUSES = Object.freeze({
  magnet: { name:'金币磁铁', short:'磁铁', glyph:'U', color:'#f17cb0', duration:10, description:'附近三条轨道的金币会沿光迹飞向你，接触后计入金币。' },
  double: { name:'双倍积分', short:'双倍', glyph:'×2', color:'#ffd35f', duration:12, description:'期间获得的跑酷积分翻倍，挑战固定奖励除外。' },
  sneakers: { name:'超级跳跃', short:'弹跳', glyph:'↑↑', color:'#92ed76', duration:10, description:'跳得更高，可跃过列车；落地前仍需留意障碍。' },
  jetpack: { name:'喷气背包', short:'飞行', glyph:'↑', color:'#6ccfff', duration:7, description:'自动升空避开障碍，左右移动收集空中金币。' },
  board: { name:'护航滑板', short:'滑板', glyph:'▱', color:'#b699ff', duration:15, description:'拾取补充 1 块。按 B 或双击屏幕使用，抵挡一次碰撞。' },
  mystery: { name:'神秘礼盒', short:'礼盒', glyph:'?', color:'#ffad6e', duration:0, description:'随机获得金币、道具或一块护航滑板。' }
});
export const STAGES = ['热身起跑','穿梭街区','疾速换线','高能追逐','极限冲刺'];
// Shared collision/render coordinates. Coin centres touch the runner at this depth.
export const PICKUP_DEPTH = .32;
export function pickupPose(e){return {x:e.x,y:e.y+(e.slide>0?.62:1.05),ahead:e.slide>0?.75:0};}
// Intersect a moving point with an interval, returning the remaining time window.
function sweepRange(a,b,lo,hi,window=[0,1]){
  if(Math.abs(b-a)<1e-9)return a>=lo&&a<=hi?window:null;
  const u=(lo-a)/(b-a),v=(hi-a)/(b-a);
  const start=Math.max(window[0],Math.min(u,v)),end=Math.min(window[1],Math.max(u,v));
  return start<=end?[start,end]:null;
}
function poseWindows(slide,dt){
  const split=Math.min(1,Math.max(0,slide/dt));
  return [...(split>0?[{window:[0,split],sliding:true}]:[]),...(split<1?[{window:[split,1],sliding:false}]:[])];
}
export const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
export function randomSource(seed=Date.now()) { let s=seed>>>0; return ()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;}; }
export class RunnerEngine {
  constructor(seed,difficulty='classic') { this.reset(seed,difficulty); }
  reset(seed=Date.now(),difficulty=this.difficulty||'classic') {
    if(!Object.hasOwn(DIFFICULTIES,difficulty)) throw new Error('Unknown difficulty');
    this.difficulty=difficulty;this.config=DIFFICULTIES[difficulty];this.random=randomSource(seed);this.seed=seed;this.mode='menu';
    this.distance=0;this.time=0;this.speed=this.config.startSpeed;this.stage=1;this.stageProgress=0;
    this.lane=0;this.x=0;this.y=0;this.vy=0;this.slide=0;this.coins=0;this.score=0;this.points=0;
    this.magnet=0;this.double=0;this.sneakers=0;this.jetpack=0;this.board=0;this.invulnerable=0;this.landing=false;
    this.boardCharges=this.config.boards;this.boardsUsed=0;this.savedCrashes=0;
    this.combo=0;this.maxCombo=0;this.comboTimer=0;this.bonusCount=0;this.bonusCoins=0;
    this.stats={ coinPoints:0,distancePoints:0,bonusPoints:0,nearMisses:0 };
    this.obstacles=[];this.pickups=[];this.events=[];this.rows=0;this.id=0;this.reason='';this.nextSafeLane=0;
    this.nextRow=this.config.firstRow;this.lastMilestone=0;this.nextAirCoin=0;this.bonusBag=[];
    this.missions=[{id:'coins',name:'收集 50 枚金币',target:50,progress:0,reward:500,done:false},{id:'distance',name:'跑过 800 米',target:800,progress:0,reward:800,done:false},{id:'bonus',name:'拾取 3 个道具',target:3,progress:0,reward:600,done:false}];
    for(let p=10;p<this.config.firstRow-17;p+=3)this.pickups.push(this.item('coin',0,p));
    this.populate();
  }
  item(type,lane,ahead,y=.95) { return {id:++this.id,type,lane,ahead,y}; }
  start(){if(this.mode!=='menu')return false;this.mode='running';return true;}
  pause(){if(this.mode!=='running')return false;this.mode='paused';return true;}
  resume(){if(this.mode!=='paused')return false;this.mode='running';return true;}
  get comboMultiplier(){return this.combo>=40?2:this.combo>=20?1.5:1;}
  get multiplier(){return this.config.multiplier*this.comboMultiplier*(this.double>0?2:1);}
  action(action){
    if(this.mode!=='running')return false;
    if(action==='left'||action==='right'){
      const lane=clamp(this.lane+(action==='left'?-1:1),-1,1);if(lane===this.lane)return false;
      this.lane=lane;this.events.push({type:'move'});return true;
    }
    if(action==='board'){
      if(this.board>0||this.boardCharges<=0||this.jetpack>0||this.landing)return false;
      this.boardCharges--;this.board=BONUSES.board.duration*this.config.bonusScale;this.boardsUsed++;
      this.events.push({type:'board',duration:this.board});return true;
    }
    if(action==='jump'&&this.y<.02&&this.vy<=0&&this.jetpack<=0&&!this.landing){
      this.slide=0;this.vy=this.sneakers>0?PHYSICS.superJumpVelocity:PHYSICS.jumpVelocity;
      this.events.push({type:'jump'});return true;
    }
    if(action==='slide'&&this.jetpack<=0&&!this.landing){
      if(this.y>.02){this.vy=Math.min(this.vy,-16);this.events.push({type:'drop'});}
      else{this.slide=PHYSICS.slideDuration;this.events.push({type:'slide'});}return true;
    }return false;
  }
  nextBonus(){
    if(!this.bonusBag.length){this.bonusBag=Object.keys(BONUSES);for(let i=this.bonusBag.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[this.bonusBag[i],this.bonusBag[j]]=[this.bonusBag[j],this.bonusBag[i]];}}
    return this.bonusBag.pop();
  }
  populate(){
    while(this.nextRow-this.distance<180){
      const row=this.rows++,world=this.nextRow,ahead=world-this.distance;
      const stage=Math.min(5,1+Math.floor(world/this.config.stageLength));
      // Safe corridors move at most one lane between rows, including at the speed cap.
      const choices=[-1,0,1].filter(l=>Math.abs(l-this.nextSafeLane)<=1);
      const safe=row===0?-1:choices[Math.floor(this.random()*choices.length)];
      const recipes={casual:['open','open','jump','open','slide','open'],classic:['open','jump','open','slide','jumpMix','open','slideMix','open'],expert:['open','jump','slide','open','jumpMix','slideMix']};
      const recipe=recipes[this.difficulty][row%recipes[this.difficulty].length];
      const required=recipe.startsWith('jump')?'jump':recipe.startsWith('slide')?'slide':null;
      const lanes=[-1,0,1].filter(l=>required||l!==safe);
      const light=this.difficulty==='casual'&&(row<4||this.random()<.58);
      if(light&&!required)lanes.splice(Math.floor(this.random()*2),1);
      for(let n=0;n<lanes.length;n++){
        const lane=lanes[n];let type;
        if(required)type=recipe.endsWith('Mix')&&lane===lanes.find(l=>l!==safe)?'train':required==='jump'?'barrier':'gate';
        else if(row===0)type=lane===0?'barrier':'train';
        else if(this.difficulty==='casual'&&row<3)type='barrier';
        else {const patterns=[['train','barrier'],['gate','barrier'],['barrier','barrier'],['train','gate'],['gate','gate'],['train','train']];type=patterns[(row+stage-1)%patterns.length][n];}
        this.obstacles.push({...this.item(type,lane,ahead,0),halfLength:type==='train'?4.4:.65,row,required,routeLane:safe,passed:false,broken:false});
        if(type==='barrier'&&lane!==safe&&row%2===0)for(let i=-2;i<=2;i++)this.pickups.push(this.item('coin',lane,ahead+i*2,1.3+(2-Math.abs(i))*.62));
      }
      const coinCount=row%6===4?13:9;const spacing=row%6===4?1.7:2.5;
      for(let i=0;i<coinCount;i++)this.pickups.push(this.item('coin',safe,ahead+(i-(coinCount-1)/2)*spacing,required==='jump'? .95+Math.max(0,1-Math.abs(i-(coinCount-1)/2)/3)*1.8:.95));
      if(row%2===0)this.pickups.push(this.item(this.nextBonus(),safe,ahead-15,1.15));
      this.nextSafeLane=safe;
      const estimatedSpeed=Math.min(this.config.maxSpeed,this.config.startSpeed+world*this.config.acceleration);
      const gap=Math.max(this.config.minGap,this.config.gap-(stage-1)*2,estimatedSpeed*1.4+9.4);
      this.nextRow+=gap+this.random()*6;
    }
  }
  addPoints(amount,bucket,multiply=true){const points=amount*(multiply?this.multiplier:1);this.points+=points;this.stats[bucket]+=points;this.score=Math.floor(this.points+1e-7);}
  collectBonus(type,fromMystery=false){
    if(!Object.hasOwn(BONUSES,type))return false;
    if(!fromMystery)this.bonusCount++;
    if(type==='mystery'){
      const reward=Math.floor(this.random()*4);
      if(reward<2){const coins=reward===0?25:50;this.coins+=coins;this.bonusCoins+=coins;this.addPoints(coins*10,'bonusPoints');this.events.push({type:'mystery',message:`礼盒奖励 +${coins} 金币`});}
      else{const bonus=reward===2?'board':['magnet','double','sneakers','jetpack'][Math.floor(this.random()*4)];this.collectBonus(bonus,true);this.events.push({type:'mystery',message:`礼盒奖励 · ${BONUSES[bonus].name}`});}
    }else if(type==='board'){
      if(this.boardCharges<3){this.boardCharges++;this.events.push({type:'boardPickup'});}
      else{this.coins+=20;this.bonusCoins+=20;this.addPoints(200,'bonusPoints');this.events.push({type:'mystery',message:'滑板已满 · 转为 20 金币'});}
    }else{
      // Same-type pickup refreshes duration; different types may coexist.
      this[type]=BONUSES[type].duration*this.config.bonusScale;
      if(type==='jetpack'){this.vy=0;this.slide=0;this.landing=false;this.nextAirCoin=this.distance+7;this.pickups=this.pickups.filter(p=>!p.air);}
      this.events.push({type,duration:this[type]});
    }return true;
  }
  updateMissions(){
    for(const m of this.missions){m.progress=Math.min(m.target,m.id==='coins'?this.coins:m.id==='distance'?Math.floor(this.distance):this.bonusCount);
      if(!m.done&&m.progress>=m.target){m.done=true;this.addPoints(m.reward,'bonusPoints',false);this.events.push({type:'mission',message:`${m.name} · +${m.reward} 分`});}
    }
  }
  step(dt){
    if(this.mode!=='running')return;dt=clamp(dt,0,.05);if(!dt)return;
    const previous={x:this.x,y:this.y,slide:this.slide,invulnerable:this.invulnerable,board:this.board},magnetWas=this.magnet;
    const poses=poseWindows(previous.slide,dt);
    this.time+=dt;this.speed=Math.min(this.config.maxSpeed,this.config.startSpeed+this.distance*this.config.acceleration);
    const move=this.speed*dt;this.distance+=move;this.addPoints(move,'distancePoints');
    this.x+=(this.lane*LANE_WIDTH-this.x)*(1-Math.exp(-19*dt));
    this.slide=Math.max(0,this.slide-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
    this.comboTimer=Math.max(0,this.comboTimer-dt);if(this.comboTimer===0)this.combo=0;
    // Flight suspends the board timer, so a stored shield is not wasted in the air.
    for(const type of ['magnet','double','sneakers','jetpack','board']){
      if(type==='board'&&this.jetpack>0)continue;
      const was=this[type];this[type]=Math.max(0,was-dt);
      if(type==='jetpack'&&was>0&&this[type]===0){this.landing=true;this.vy=0;this.events.push({type:'landing'});}
    }
    if(this.jetpack>0){
      this.y+=(5.3-this.y)*(1-Math.exp(-8*dt));this.vy=0;
      while(this.nextAirCoin<this.distance+100){const ahead=this.nextAirCoin-this.distance;
        if(this.nextAirCoin<this.distance+this.jetpack*this.speed-10){const lane=Math.floor(this.nextAirCoin/24)%3-1;this.pickups.push({...this.item('coin',lane,ahead,6.1),air:true});}
        this.nextAirCoin+=2.5;
      }
    }else if(this.y>0||this.vy>0){
      this.vy-=PHYSICS.gravity*dt;this.y+=this.vy*dt;
      if(this.y<=0){this.y=0;this.vy=0;if(this.landing){this.invulnerable=Math.max(this.invulnerable,1.35);this.landing=false;}this.events.push({type:'land'});}
    }
    // All objects move before collision handling, including on the final frame of a run.
    for(const o of this.obstacles)o.ahead-=move;
    for(const p of this.pickups)if(!p.flight)p.ahead-=move;
    for(const o of this.obstacles){
      if(o.broken)continue;
      const dx=Math.abs(this.x-o.lane*LANE_WIDTH);
      let contact=sweepRange(o.ahead+move,o.ahead,-o.halfLength-.3,o.halfLength+.3);
      if(contact)contact=sweepRange(previous.x-o.lane*LANE_WIDTH,this.x-o.lane*LANE_WIDTH,-1.39,1.39,contact);
      let collision=null;
      if(contact)for(const pose of poses){
        const window=[Math.max(contact[0],pose.window[0],previous.invulnerable/dt),Math.min(contact[1],pose.window[1])];
        if(window[0]>window[1])continue;
        const hit=sweepRange(previous.y,this.y,o.type==='gate'?1.22-(pose.sliding?.72:2.05):-100,o.type==='train'?3.13:o.type==='barrier'?.99:3.16,window);
        if(hit){collision=hit;break;}
      }
      const newProtection=this.invulnerable>Math.max(0,previous.invulnerable-dt);
      if(collision&&this.jetpack<=0&&!this.landing&&!newProtection){
        if(this.board>0||previous.board>collision[0]*dt){this.board=0;this.invulnerable=1.4;o.broken=true;this.savedCrashes++;this.combo=0;this.events.push({type:'shieldBreak'});}
        else{this.mode='over';this.reason=o.type;this.events.push({type:'crash'});break;}
      }
      if(!o.passed&&o.ahead<-o.halfLength-.4){
        o.passed=true;
        if(dx<.8&&this.jetpack<=0&&!this.landing&&this.invulnerable<=0){this.stats.nearMisses++;this.addPoints(30,'bonusPoints');this.events.push({type:'dodge'});}
      }
    }
    let magnetActivatedAt=null;
    if(this.mode==='running')for(const p of this.pickups){
      if(p.collected)continue;
      const target=pickupPose(this);
      let contact=false,contactTime=0;
      if(p.flight){
        // Attraction survives magnet expiry, but freezes with the simulation on pause.
        const f=p.flight;f.age=Math.min(f.duration,f.age+dt);
        const u=f.age/f.duration,ease=u*u*(3-2*u);
        p.trail.push({x:p.x,y:p.y,ahead:p.ahead});if(p.trail.length>9)p.trail.shift();
        p.x=f.x+(target.x-f.x)*ease;p.y=f.y+(target.y-f.y)*ease+Math.sin(u*Math.PI)*.3;
        p.ahead=f.ahead+(target.ahead-f.ahead)*ease;
        contact=u>=1;
      }else{
        // Swept contact prevents skipped coins at high speed without collecting ahead.
        for(const pose of poses){
          const offset=pose.sliding?.75:0;
          let hit=sweepRange(p.ahead+move-offset,p.ahead-offset,-PICKUP_DEPTH,PICKUP_DEPTH,pose.window);
          if(hit)hit=sweepRange(previous.x-p.lane*LANE_WIDTH,this.x-p.lane*LANE_WIDTH,-.58,.58,hit);
          if(hit)hit=sweepRange(p.y-previous.y,p.y-this.y,-.25,pose.sliding?1.05:2.1,hit);
          if(hit){contact=true;contactTime=hit[0];break;}
        }

      }
      if(contact){
        p.collected=true;
        if(p.type==='coin'){
          this.coins++;this.combo++;this.maxCombo=Math.max(this.combo,this.maxCombo);this.comboTimer=this.config.comboWindow;
          this.addPoints(10,'coinPoints');this.events.push({type:'coin',lane:p.lane,x:this.x,y:p.flight?target.y:p.y,ahead:target.ahead,magnetic:!!p.flight});
          if(this.combo===20||this.combo===40)this.events.push({type:'combo',combo:this.combo});
        }else{const before=this.magnet;this.collectBonus(p.type);if(this.magnet>before)magnetActivatedAt=magnetActivatedAt===null?contactTime:Math.min(magnetActivatedAt,contactTime);}
      }
    }
    // Resolve attraction after all pickups, independent of array order. Only coins
    // inside the field while it was active can enter a flight, including activation.
    const magnetWindows=[];
    if(magnetWas>0)magnetWindows.push([0,Math.min(1,magnetWas/dt)]);
    if(magnetActivatedAt!==null)magnetWindows.push([magnetActivatedAt,1]);
    if(this.mode==='running'&&magnetWindows.length)for(const p of this.pickups){
      if(p.collected||p.flight||p.type!=='coin')continue;
      const target=pickupPose(this);
      if(Math.abs(p.y-target.y)>=3.2||!magnetWindows.some(window=>sweepRange(p.ahead+move,p.ahead,-.5,9,window)))continue;
      p.x=p.lane*LANE_WIDTH;
      p.flight={x:p.x,y:p.y,ahead:p.ahead,age:0,duration:clamp(Math.hypot(p.x-target.x,p.y-target.y,p.ahead-target.ahead)/30,.18,.36)};
      p.trail=[];
    }
    this.obstacles=this.obstacles.filter(o=>o.ahead>-16);this.pickups=this.pickups.filter(p=>(p.flight||p.ahead>-8)&&!p.collected);
    const stage=Math.min(5,1+Math.floor(this.distance/this.config.stageLength));
    if(stage>this.stage){this.stage=stage;this.events.push({type:'stage',stage});}
    this.stageProgress=this.stage===5?1:(this.distance%this.config.stageLength)/this.config.stageLength;
    if(this.mode==='running')this.updateMissions();
    this.score=Math.floor(this.points+1e-7);this.populate();
  }
  drainEvents(){const e=this.events;this.events=[];return e;}
  snapshot(){return {state:this.mode,difficulty:this.difficulty,stage:this.stage,distance:Math.floor(this.distance),score:this.score,coins:this.coins,lane:this.lane,jumping:this.y>.02,sliding:this.slide>0,combo:this.combo,multiplier:this.multiplier,boardCharges:this.boardCharges,bonuses:Object.fromEntries(['magnet','double','sneakers','jetpack','board'].map(t=>[t,+this[t].toFixed(1)])),speed:Math.round(this.speed*3.6)};}
}
