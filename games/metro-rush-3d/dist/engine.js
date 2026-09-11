/** Deterministic gameplay. x is lateral; ahead is metres in front of the runner. */
export const LANE_WIDTH = 2.7;
export const TRACK = Object.freeze({ roofHeight:3.3, roofHalfWidth:1.08, tunnelCeiling:8.8, tunnelArchBase:3.2, tunnelArchRadius:5.88, tunnelSafeRadius:5.4 });
export const PHYSICS = Object.freeze({ gravity: 28, jumpVelocity: 11.4, superJumpVelocity: 16.2, slideDuration: .8, startSpeed: 18, maxSpeed: 34 });
export const DIFFICULTIES = Object.freeze({
  casual: Object.freeze({ name:'休闲', english:'CHILL', startSpeed:14, maxSpeed:24, acceleration:.004, gap:44, minGap:34, multiplier:1, firstRow:70, stageLength:500, bonusScale:1.25, boards:2, comboWindow:3.2, hint:'宽松轨道，轻松练习', color:'#60efd2' }),
  classic: Object.freeze({ name:'经典', english:'FLOW', startSpeed:18, maxSpeed:34, acceleration:.006, gap:36, minGap:28, multiplier:1.5, firstRow:60, stageLength:600, bonusScale:1, boards:1, comboWindow:2.7, hint:'交错障碍，畅快连招', color:'#ffc85a' }),
  expert: Object.freeze({ name:'极限', english:'RUSH', startSpeed:23, maxSpeed:42, acceleration:.008, gap:31, minGap:26, multiplier:2, firstRow:56, stageLength:500, bonusScale:.85, boards:1, comboWindow:2.2, hint:'高速密集，挑战反应', color:'#f595bf' })
});
export const BONUSES = Object.freeze({
  magnet: { name:'金币磁铁', short:'磁铁', glyph:'U', color:'#f17cb0', duration:10, description:'附近三条轨道的金币会沿光迹飞向你，接触后计入金币。' },
  double: { name:'双倍积分', short:'双倍', glyph:'×2', color:'#ffd35f', duration:12, description:'期间获得的跑酷积分翻倍，挑战固定奖励除外。' },
  sneakers: { name:'超级跳跃', short:'弹跳', glyph:'↑↑', color:'#92ed76', duration:10, description:'跳得更高，可落到车顶继续跑；山洞内留意洞顶高度。' },
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
function sweepHeight(path,lo,hi,window,base0=0,base1=0){
  for(const segment of path){
    const from=Math.max(window[0],segment.from),to=Math.min(window[1],segment.to);if(from>to)continue;
    const at=t=>segment.y0+(segment.y1-segment.y0)*(segment.to===segment.from?1:(t-segment.from)/(segment.to-segment.from))-(base0+(base1-base0)*t);
    const hit=sweepRange(at(from),at(to),lo,hi);if(hit)return [from+(to-from)*hit[0],from+(to-from)*hit[1]];
  }
  return null;
}
export function tunnelClearance(x){return TRACK.tunnelArchBase+Math.sqrt(Math.max(0,TRACK.tunnelSafeRadius**2-(Math.abs(x)+.45)**2));}
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
    this.lane=0;this.x=0;this.y=0;this.vy=0;this.slide=0;this.slideQueued=false;this.grounded=true;this.floorHeight=0;this.supportId=null;this.surface='ground';this.coins=0;this.score=0;this.points=0;
    this.magnet=0;this.double=0;this.sneakers=0;this.jetpack=0;this.board=0;this.invulnerable=0;this.landing=false;
    this.boardCharges=this.config.boards;this.boardsUsed=0;this.savedCrashes=0;
    this.combo=0;this.maxCombo=0;this.comboTimer=0;this.bonusCount=0;this.bonusCoins=0;
    this.stats={ coinPoints:0,distancePoints:0,bonusPoints:0,nearMisses:0 };
    this.obstacles=[];this.pickups=[];this.tunnels=[];this.courses=[];this.environment='city';this.tunnelBlend=0;this.events=[];this.rows=0;this.id=0;this.reason='';this.nextSafeLane=0;
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
    if(action==='jump'&&this.grounded&&Math.abs(this.y-this.floorHeight)<.05&&this.vy<=0&&this.jetpack<=0&&!this.landing){
      this.slide=0;this.slideQueued=false;this.grounded=false;this.vy=this.sneakers>0?PHYSICS.superJumpVelocity:PHYSICS.jumpVelocity;
      this.events.push({type:'jump'});return true;
    }
    if(action==='slide'&&this.jetpack<=0&&!this.landing){
      if(!this.grounded||Math.abs(this.y-this.floorHeight)>.05){this.slideQueued=true;this.vy=Math.min(this.vy,-16);this.events.push({type:'drop'});}
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
      const estimatedSpeed=Math.min(this.config.maxSpeed,this.config.startSpeed+world*this.config.acceleration);
      if(row%12===3){
        const end=this.buildElevatedCourse(world,safe,row,estimatedSpeed);
        this.nextSafeLane=safe;this.nextRow=end+Math.max(this.config.gap,estimatedSpeed*1.6+12);continue;
      }
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
        const approaching=type==='train'&&row>3&&row%3===1;
        const approachSpeed=approaching?{casual:9,classic:13,expert:18}[this.difficulty]:0;
        const spawnAhead=approaching?ahead*(1+approachSpeed/estimatedSpeed):ahead;
        this.obstacles.push({...this.item(type,lane,spawnAhead,0),height:type==='train'?TRACK.roofHeight:undefined,approachSpeed,halfLength:type==='train'?(approaching?13.2:4.4):.65,row,rowWorld:world,required,routeLane:safe,passed:false,broken:false});
        if(type==='barrier'&&lane!==safe&&row%2===0)for(let i=-2;i<=2;i++)this.pickups.push(this.item('coin',lane,ahead+i*2,1.3+(2-Math.abs(i))*.62));
      }
      const coinCount=row%6===4?13:9;const spacing=row%6===4?1.7:2.5;
      for(let i=0;i<coinCount;i++)this.pickups.push(this.item('coin',safe,ahead+(i-(coinCount-1)/2)*spacing,required==='jump'? .95+Math.max(0,1-Math.abs(i-(coinCount-1)/2)/3)*1.8:.95));
      if(row%2===0)this.pickups.push(this.item(this.nextBonus(),safe,ahead-15,1.15));
      this.nextSafeLane=safe;
      const gap=Math.max(this.config.minGap,this.config.gap-(stage-1)*2,estimatedSpeed*1.4+9.4);
      this.nextRow+=gap+this.random()*6;
    }
  }
  buildElevatedCourse(start,lane,row,speed){
    const rampLength=Math.max(14,speed*.65),carLength=Math.max(38,speed*1.8),gapLength=Math.max(4.2,speed*.2);
    const a=start+rampLength,b=a+carLength,c=b+gapLength,d=c+carLength,end=d+rampLength;
    const put=(type,world,halfLength,extra={})=>{const o={...this.item(type,lane,world-this.distance,0),halfLength,row,rowWorld:start,course:true,routeLane:lane,passed:false,broken:false,...extra};this.obstacles.push(o);return o;};
    const first=put('train',(a+b)/2,carLength/2,{height:TRACK.roofHeight,roofRoute:true});
    const second=put('train',(c+d)/2,carLength/2,{height:TRACK.roofHeight,roofRoute:true});
    put('ramp',start+rampLength/2,rampLength/2,{from:0,to:TRACK.roofHeight,trainId:first.id,required:'climb'});
    put('ramp',d+rampLength/2,rampLength/2,{from:TRACK.roofHeight,to:0,trainId:second.id,required:'descend'});
    put('gap',(b+c)/2,gapLength/2,{y:TRACK.roofHeight,required:'jump'});
    const jumpAt=a+carLength*.33,slideAt=c+carLength*.70;
    put('barrier',jumpAt,.65,{y:TRACK.roofHeight,required:'jump'});
    put('gate',slideAt,.65,{y:TRACK.roofHeight,required:'slide'});
    for(let world=start+2;world<end-1;world+=2.6){
      let h=world<a?(world-start)/rampLength*TRACK.roofHeight:world>d?(end-world)/rampLength*TRACK.roofHeight:TRACK.roofHeight;
      if(world>b&&world<c)h+=.9;
      const arc=Math.max(0,1-Math.abs(world-jumpAt)/(speed*.28));h+=arc*1.5;
      this.pickups.push(this.item('coin',lane,world-this.distance,h+.95));
    }
    this.pickups.push(this.item('mystery',lane,d-6-this.distance,TRACK.roofHeight+1.05));
    const incomingLane=lane===0?1:0,approachSpeed={casual:9,classic:13,expert:18}[this.difficulty];
    const encounter=a+carLength*.65,approachAhead=(encounter-this.distance)*(1+approachSpeed/speed);
    put('train',this.distance+approachAhead,13.2,{lane:incomingLane,approachSpeed,height:TRACK.roofHeight});
    this.tunnels.push({id:++this.id,start:start-22,end:end+30,ceiling:TRACK.tunnelCeiling});
    this.courses.push({row,start,end,lane,firstRoof:[a,b],secondRoof:[c,d],jumpAt,slideAt});
    return end;
  }
  surfaceHeight(o,ahead=o.ahead){
    if(o.type==='train')return o.height??TRACK.roofHeight;
    return o.from+(o.to-o.from)*clamp((o.halfLength-ahead)/(o.halfLength*2),0,1);
  }
  resolveSupport(previous,dt){
    const predicted=this.y,previousSupport=this.obstacles.find(o=>o.id===previous.supportId);
    this.grounded=false;this.supportId=null;this.floorHeight=0;this.surface='air';this.touchdownAt=null;this.landedSlideAt=null;
    this.verticalPath=[{from:0,to:1,y0:previous.y,y1:predicted}];
    let best=null,transit=null;
    for(const o of this.obstacles){
      if(o.broken||!['train','ramp'].includes(o.type))continue;
      const oldAhead=o.previousAhead??o.ahead;
      let interval=sweepRange(previous.x-o.lane*LANE_WIDTH,this.x-o.lane*LANE_WIDTH,-TRACK.roofHalfWidth,TRACK.roofHalfWidth);
      if(interval)interval=sweepRange(oldAhead,o.ahead,-o.halfLength,o.halfLength,interval);if(!interval)continue;
      const height=this.surfaceHeight(o),oldHeight=this.surfaceHeight(o,oldAhead),inside=interval[1]>=1-1e-8;
      const wasInside=interval[0]<=1e-8;
      const followsRamp=o.type==='ramp'&&previous.grounded&&((wasInside&&Math.abs(previous.y-oldHeight)<.08)||(oldAhead>o.halfLength&&Math.abs(previous.y-o.from)<.08));
      const followsRampExit=o.type==='train'&&previous.grounded&&previousSupport?.type==='ramp'&&Math.abs(previousSupport.to-height)<.03&&Math.abs((o.ahead-o.halfLength)-(previousSupport.ahead+previousSupport.halfLength))<.1;
      const levelStep=previous.grounded&&Math.abs(previous.y-height)<.08&&wasInside;
      const difference0=previous.y-oldHeight,difference1=predicted-height;
      const crossing=difference0>=-.025&&difference1<=.025&&difference0-difference1>1e-9?clamp(difference0/(difference0-difference1),0,1):null;
      const lands=crossing!==null&&crossing>=interval[0]-1e-8&&crossing<=interval[1]+1e-8;
      if(this.vy>0)continue;
      if(inside&&(followsRamp||followsRampExit||levelStep||lands)){
        const at=lands?crossing:followsRampExit?interval[0]:0;
        if(!best||height>best.height)best={o,height,oldHeight,at,follow:followsRamp||levelStep};
      }else if(o.type==='train'&&lands&&(!transit||crossing<transit.at))transit={o,height,at:crossing,exit:interval[1]};
    }
    const path=(at,height,end=1,endHeight=height)=>[{from:0,to:at,y0:previous.y,y1:height},{from:at,to:end,y0:height,y1:endHeight}].filter(s=>s.to>s.from);
    if(best){
      this.y=best.height;this.vy=0;this.grounded=true;this.floorHeight=best.height;this.supportId=best.o.id;this.surface=best.o.type==='ramp'?(best.o.to>best.o.from?'uphill':'downhill'):'roof';
      const touchHeight=best.o.type==='ramp'?best.oldHeight+(best.height-best.oldHeight)*best.at:best.height;
      this.verticalPath=best.follow?[{from:0,to:1,y0:previous.y,y1:this.y}]:path(best.at,touchHeight,1,this.y);
      if(!previous.grounded)this.touchdownAt=best.at;
    }else if(transit){
      const remaining=(1-transit.exit)*dt;this.y=transit.height-PHYSICS.gravity*remaining*remaining*.5;this.vy=-PHYSICS.gravity*remaining;
      this.verticalPath=[...path(transit.at,transit.height,transit.exit),{from:transit.exit,to:1,y0:transit.height,y1:this.y}];
      if(!previous.grounded)this.touchdownAt=transit.at;
    }else{
      const downExit=previous.grounded&&previousSupport?.type==='ramp'&&previousSupport.to===0&&previousSupport.ahead<-previousSupport.halfLength&&Math.abs(this.x-previousSupport.lane*LANE_WIDTH)<=TRACK.roofHalfWidth;
      if(this.y<=0||downExit){
        const at=downExit?clamp((previousSupport.previousAhead+previousSupport.halfLength)/(previousSupport.previousAhead-previousSupport.ahead),0,1):clamp(previous.y/(previous.y-predicted||1),0,1);
        this.y=0;this.vy=0;this.grounded=true;this.surface='ground';this.verticalPath=path(at,0);if(!previous.grounded)this.touchdownAt=at;
      }
    }
    if(this.touchdownAt!==null){
      if(this.slideQueued){this.slide=PHYSICS.slideDuration-(1-this.touchdownAt)*dt;this.slideQueued=false;this.landedSlideAt=this.touchdownAt;}
      if(this.landing){this.invulnerable=Math.max(this.invulnerable,1.35);this.landing=false;}
      this.events.push({type:'land',surface:this.surface});
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
      if(type==='jetpack'){this.vy=0;this.grounded=false;this.slide=0;this.slideQueued=false;this.landing=false;this.nextAirCoin=this.distance+7;this.pickups=this.pickups.filter(p=>!p.air);}
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
    const previous={x:this.x,y:this.y,slide:this.slide,invulnerable:this.invulnerable,board:this.board,grounded:this.grounded&&Math.abs(this.y-this.floorHeight)<.05&&this.vy<=0,supportId:this.supportId},magnetWas=this.magnet;
    let poses=poseWindows(previous.slide,dt);
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
    // Moving trains have their own closing speed; retain actual endpoints for sweeps.
    for(const o of this.obstacles){o.previousAhead=o.ahead;o.ahead-=move+(o.approachSpeed||0)*dt;}
    for(const p of this.pickups)if(!p.flight)p.ahead-=move;
    if(this.jetpack>0){
      this.grounded=false;this.supportId=null;this.surface='flight';this.y+=(5.3-this.y)*(1-Math.exp(-8*dt));this.vy=0;this.landedSlideAt=null;this.verticalPath=[{from:0,to:1,y0:previous.y,y1:this.y}];
      while(this.nextAirCoin<this.distance+100){const ahead=this.nextAirCoin-this.distance;
        if(this.nextAirCoin<this.distance+this.jetpack*this.speed-10){const lane=Math.floor(this.nextAirCoin/24)%3-1;this.pickups.push({...this.item('coin',lane,ahead,6.1),air:true});}
        this.nextAirCoin+=2.5;
      }
    }else{
      this.vy-=PHYSICS.gravity*dt;this.y+=this.vy*dt;this.resolveSupport(previous,dt);
    }
    if(this.landedSlideAt!==null){poses=poses.map(p=>({...p,window:[p.window[0],Math.min(p.window[1],this.landedSlideAt)]})).filter(p=>p.window[1]>p.window[0]);poses.push({window:[this.landedSlideAt,1],sliding:true});}
    const tunnel=this.tunnels.find(t=>this.distance>=t.start&&this.distance<=t.end);
    const environment=tunnel?'tunnel':'city';
    if(environment!==this.environment){this.environment=environment;this.events.push({type:'environment',environment});}
    this.tunnelBlend=this.tunnels.reduce((max,t)=>Math.max(max,clamp((this.distance-t.start+12)/24,0,1)*clamp((t.end-this.distance+12)/24,0,1)),0);
    if(tunnel&&this.y+2.05>Math.min(tunnel.ceiling,tunnelClearance(this.x))){this.y=Math.min(tunnel.ceiling,tunnelClearance(this.x))-2.05;this.vy=Math.min(0,this.vy);this.verticalPath=this.verticalPath.map(p=>({...p,y0:Math.min(p.y0,this.y),y1:Math.min(p.y1,this.y)}));this.events.push({type:'ceiling'});}
    for(const o of this.obstacles){
      if(o.broken||o.type==='gap')continue;
      if(o.approachSpeed&&!o.warned&&o.ahead>0&&(o.ahead-o.halfLength)/(this.speed+o.approachSpeed)<2.2){o.warned=true;this.events.push({type:'trainWarning',lane:o.lane});}
      const dx=Math.abs(this.x-o.lane*LANE_WIDTH);
      let contact=sweepRange(o.previousAhead,o.ahead,-o.halfLength-.3,o.halfLength+.3);
      if(contact)contact=sweepRange(previous.x-o.lane*LANE_WIDTH,this.x-o.lane*LANE_WIDTH,-1.39,1.39,contact);
      let collision=null;
      if(contact)for(const pose of poses){
        const window=[Math.max(contact[0],pose.window[0],previous.invulnerable/dt),Math.min(contact[1],pose.window[1])];
        if(window[0]>window[1])continue;
        const base=o.y||0;
        const hit=o.type==='ramp'
          ?sweepHeight(this.verticalPath,-100,-.16,window,this.surfaceHeight(o,o.previousAhead),this.surfaceHeight(o))
          :sweepHeight(this.verticalPath,o.type==='gate'?base+1.22-(pose.sliding?.72:2.05):-100,o.type==='train'?(o.height??TRACK.roofHeight)-.12:o.type==='barrier'?base+.99:base+3.16,window);
        if(hit){collision=hit;break;}
      }
      const newProtection=this.invulnerable>Math.max(0,previous.invulnerable-dt);
      if(collision&&this.jetpack<=0&&!this.landing&&!newProtection){
        if(this.board>0||previous.board>collision[0]*dt){this.board=0;this.invulnerable=1.4;o.broken=true;this.savedCrashes++;this.combo=0;this.events.push({type:'shieldBreak'});}
        else{this.mode='over';this.reason=o.approachSpeed?'oncoming':o.type;this.events.push({type:'crash'});break;}
      }
      if(!o.passed&&o.ahead<-o.halfLength-.4){
        o.passed=true;
        if(o.type!=='ramp'&&dx<.8&&this.jetpack<=0&&!this.landing&&this.invulnerable<=0){this.stats.nearMisses++;this.addPoints(30,'bonusPoints');this.events.push({type:'dodge'});}
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
          if(hit)hit=sweepHeight(this.verticalPath,p.y-(pose.sliding?1.05:2.1),p.y+.25,hit);
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
    this.obstacles=this.obstacles.filter(o=>o.ahead+o.halfLength>-16);this.tunnels=this.tunnels.filter(t=>t.end>this.distance-25);this.courses=this.courses.filter(c=>c.end>this.distance-25);this.pickups=this.pickups.filter(p=>(p.flight||p.ahead>-8)&&!p.collected);
    const stage=Math.min(5,1+Math.floor(this.distance/this.config.stageLength));
    if(stage>this.stage){this.stage=stage;this.events.push({type:'stage',stage});}
    this.stageProgress=this.stage===5?1:(this.distance%this.config.stageLength)/this.config.stageLength;
    if(this.mode==='running')this.updateMissions();
    this.score=Math.floor(this.points+1e-7);this.populate();
  }
  get routeCue(){
    if(this.jetpack>0||this.landing)return null;
    const cues=[];
    for(const o of this.obstacles){
      if(o.broken)continue;
      let kind=o.required,meters=o.ahead,eta=meters/this.speed;
      if(o.approachSpeed){kind='oncoming';meters=o.ahead-o.halfLength;eta=meters/(this.speed+o.approachSpeed);}
      else if(o.type==='train'||!kind)continue;
      else if(o.type==='ramp'||o.type==='gap'){meters=o.ahead-o.halfLength;eta=meters/this.speed;}
      if(o.y>2&&this.y<1.6)continue;
      if(kind==='descend'&&this.y<1.6)continue;
      if(meters>0&&eta<(kind==='climb'?2.4:kind==='oncoming'?2.2:1.8))cues.push({kind,meters,eta,lane:o.lane,mixed:this.obstacles.some(x=>x.row===o.row&&!x.course&&x.type==='train')});
    }
    return cues.sort((a,b)=>a.eta-b.eta)[0]||null;
  }
  drainEvents(){const e=this.events;this.events=[];return e;}
  snapshot(){return {state:this.mode,difficulty:this.difficulty,stage:this.stage,distance:Math.floor(this.distance),score:this.score,coins:this.coins,lane:this.lane,jumping:!this.grounded&&this.jetpack<=0,height:+this.y.toFixed(2),surface:this.surface,environment:this.environment,sliding:this.slide>0,combo:this.combo,multiplier:this.multiplier,boardCharges:this.boardCharges,bonuses:Object.fromEntries(['magnet','double','sneakers','jetpack','board'].map(t=>[t,+this[t].toFixed(1)])),speed:Math.round(this.speed*3.6)};}
}
