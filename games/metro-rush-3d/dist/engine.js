import { RouteDirector, DISTRICTS, ROUTE_EVENTS, travelTime, speedProfile } from './director.js';
import { Pursuit, INTRO_DURATION, PURSUIT_RULES, EXIT_NAMES } from './pursuit.js';
export { DISTRICTS, ROUTE_EVENTS } from './director.js';
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
  smoke: { name:'迷彩喷雾', short:'烟雾', glyph:'≈', color:'#c4b0ee', duration:3, description:'立即降低追逐压力，身后留下烟雾；不能抵挡障碍，也不代替跳跃和滑铲。' },
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
    this.difficulty=difficulty;this.config=DIFFICULTIES[difficulty];this.random=randomSource(seed);this.seed=seed;this.rewardRandom=randomSource(seed^0x761ed);this.bonusRandom=randomSource(seed^0x923da);this.director=new RouteDirector(seed,difficulty);this.mode='menu';
    this.distance=0;this.time=0;this.speed=this.config.startSpeed;this.stage=1;this.stageProgress=0;
    this.introTime=0;this.caughtTime=0;this.pausedFrom=null;this.recovery=null;this.pursuit=new Pursuit(difficulty);this.accidents=0;
    this.story={leg:1,completed:0,name:EXIT_NAMES[0],target:PURSUIT_RULES[difficulty].exitDistance,scheduled:false};
    this.lane=0;this.x=0;this.y=0;this.vy=0;this.slide=0;this.slideQueued=false;this.grounded=true;this.floorHeight=0;this.supportId=null;this.surface='ground';this.coins=0;this.score=0;this.points=0;
    this.magnet=0;this.double=0;this.sneakers=0;this.jetpack=0;this.board=0;this.smoke=0;this.invulnerable=0;this.landing=false;
    this.boardCharges=this.config.boards;this.boardsUsed=0;this.savedCrashes=0;
    this.combo=0;this.maxCombo=0;this.comboTimer=0;this.bonusCount=0;this.bonusCoins=0;
    this.stats={ coinPoints:0,distancePoints:0,bonusPoints:0,nearMisses:0,cleanJumps:0,cleanSlides:0,collectedCoins:0 };
    this.missionRound=1;this.missionsCompleted=0;this.speedPhase='warmup';this.peakSpeed=this.speed;
    this.obstacles=[];this.pickups=[];this.tunnels=[];this.courses=[];this.environment='city';this.tunnelBlend=0;this.events=[];this.rows=0;this.id=0;this.reason='';this.nextSafeLane=0;
    this.encounters=[];this.lastEncounter=null;this.eventStats={completed:0,attempted:0,streak:0,bestStreak:0};this.scene='station';this.director.ensureDistricts(0);
    this.nextRow=this.config.firstRow;this.lastMilestone=0;this.nextAirCoin=0;this.bonusBag=[];
    this.missions=[{id:'coins',name:'收集 50 枚金币',target:50,progress:0,reward:500,done:false},{id:'distance',name:'跑过 800 米',target:800,progress:0,reward:800,done:false},{id:'bonus',name:'拾取 3 个道具',target:3,progress:0,reward:600,done:false}];
    for(let p=10;p<this.config.firstRow-17;p+=3)this.pickups.push(this.item('coin',0,p));
    this.populate();
  }
  item(type,lane,ahead,y=.95) { return {id:++this.id,type,lane,ahead,y}; }
  start({skipIntro=false}={}){if(this.mode!=='menu')return false;this.mode=skipIntro?'running':'intro';this.introTime=skipIntro?INTRO_DURATION:0;return true;}
  skipIntro(){if(this.mode!=='intro')return false;this.introTime=INTRO_DURATION;this.mode='running';this.events.push({type:'launch'});return true;}
  pause(){if(!['intro','running','caught'].includes(this.mode))return false;this.pausedFrom=this.mode;this.mode='paused';return true;}
  resume(){if(this.mode!=='paused')return false;this.mode=this.pausedFrom||'running';this.pausedFrom=null;return true;}
  continueRun(){if(this.mode!=='escaped')return false;this.mode='running';this.story.leg++;this.story.name=EXIT_NAMES[(this.story.leg-1)%EXIT_NAMES.length];this.story.target=this.distance+PURSUIT_RULES[this.difficulty].exitDistance;this.story.scheduled=false;this.pursuit.pressure=18;this.events.push({type:'nextLeg'});return true;}
  get comboMultiplier(){return this.combo>=40?2:this.combo>=20?1.5:1;}
  get multiplier(){return this.config.multiplier*this.comboMultiplier*(this.double>0?2:1);}
  action(action){
    if(this.mode!=='running'||this.recovery)return false;
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
      this.slide=0;this.slideQueued=false;this.grounded=false;const velocity=this.sneakers>0?PHYSICS.superJumpVelocity:PHYSICS.jumpVelocity;this.vy=velocity;
      const tunnel=this.tunnels.find(t=>this.distance>=t.start&&this.distance<=t.end);
      if(tunnel){const room=Math.max(.1,Math.min(tunnel.ceiling,tunnelClearance(this.x))-2.05-this.y-.06);this.vy=Math.min(this.vy,Math.sqrt(2*PHYSICS.gravity*room));}
      this.events.push({type:'jump',ceilingLimited:this.vy<velocity});return true;
    }
    if(action==='slide'&&this.jetpack<=0&&!this.landing){
      if(!this.grounded||Math.abs(this.y-this.floorHeight)>.05){this.slideQueued=true;this.vy=Math.min(this.vy,-16);this.events.push({type:'drop'});}
      else{this.slide=PHYSICS.slideDuration;this.events.push({type:'slide'});}return true;
    }return false;
  }
  nextBonus(){
    if(!this.bonusBag.length){this.bonusBag=Object.keys(BONUSES);for(let i=this.bonusBag.length-1;i>0;i--){const j=Math.floor(this.bonusRandom()*(i+1));[this.bonusBag[i],this.bonusBag[j]]=[this.bonusBag[j],this.bonusBag[i]];}}
    return this.bonusBag.pop();
  }
  speedAt(world){return speedProfile(world,this.config,this.seed).speed;}
  get paceView(){return speedProfile(this.distance,this.config,this.seed);}
  speedBounds(world,length=120){let lo=Infinity,hi=0;for(let p=world;p<=world+length+8;p+=8){const v=this.speedAt(p);lo=Math.min(lo,v);hi=Math.max(hi,v);}return {min:lo*.99,max:hi*1.01};}
  afterSeconds(world,seconds){const sign=Math.sign(seconds);for(let t=0;t<Math.abs(seconds);){const step=Math.min(1/60,Math.abs(seconds)-t),dt=step*sign;world+=this.speedAt(world+this.speedAt(world)*dt/2)*dt;t+=step;}return world;}
  rowGap(world){return Math.max(this.config.minGap,this.config.gap-(Math.min(5,1+Math.floor(world/this.config.stageLength))-1)*2,this.speedBounds(world).max*1.4+9.4);}
  chooseLane(from=this.nextSafeLane){return this.director.choose([-1,0,1].filter(l=>Math.abs(l-from)<=1));}
  incomingAhead(world,approachSpeed,halfLength){return halfLength+world-this.distance+approachSpeed*travelTime(this.distance,world,this.config,this.seed);}
  populate(){
    this.director.ensureDistricts(this.distance);
    while(this.nextRow-this.distance<Math.max(180,this.config.maxSpeed*1.42*5.2)){
      const world=this.nextRow,row=this.rows,stage=Math.min(5,1+Math.floor(world/this.config.stageLength));
      if(!this.story.scheduled&&world>=this.story.target){this.buildEncounter(world,'breakout');continue;}
      if(row>=this.director.nextEventRow){this.buildEncounter(world);continue;}
      const safe=row===0?-1:this.chooseLane();
      if(row>=this.director.nextCourseRow&&this.director.recoveryRows===0){
        this.rows++;const end=this.buildElevatedCourse(world,safe,row,this.speedAt(world));
        this.nextSafeLane=safe;this.nextRow=end+Math.max(this.rowGap(end),this.speedAt(end)*1.6+12);
        this.director.nextCourseRow=this.rows+this.director.integer(7,11);continue;
      }
      const plan=this.director.recipe(row,stage);this.rows++;
      this.buildGroundRow(world,safe,row,plan.recipe,{pace:plan.pace});
      this.nextSafeLane=safe;this.nextRow=world+this.rowGap(world)*plan.spacing+this.director.random()*7;
    }
  }
  buildGroundRow(world,safe,row,recipe,{pace='flow',eventId=null,convoy=false,level=1,closedLane=null}={}){
    const ahead=world-this.distance,required=recipe.startsWith('jump')?'jump':recipe.startsWith('slide')?'slide':null;
    const lanes=[-1,0,1].filter(l=>required||l!==safe);
    if(!required&&!convoy&&(pace==='recovery'||this.difficulty==='casual'&&this.director.random()<.5))lanes.splice(this.director.integer(0,1),1);
    const patterns=[['train','barrier'],['gate','barrier'],['barrier','barrier'],['train','gate'],['gate','gate'],['train','train']],pattern=this.director.choose(patterns);
    const blocked=closedLane??(recipe.endsWith('Mix')?this.director.choose(lanes.filter(l=>l!==safe)):null);
    for(let n=0;n<lanes.length;n++){
      const lane=lanes[n];let type=convoy?'train':required?lane===blocked?'train':required==='jump'?'barrier':'gate':row===0?lane===0?'barrier':'train':pattern[n];
      if(pace==='recovery')type=this.director.choose(['barrier','gate']);
      const construction=closedLane===lane,approaching=type==='train'&&!construction&&(convoy||row>4&&this.director.random()<.32);
      const approachSpeed=approaching?{casual:9,classic:13,expert:18}[this.difficulty]+(convoy?(level-1)*2:0):0,halfLength=type==='train'?(approaching?13.2:this.director.choose([4.4,6.6,8.8])):.65;
      this.obstacles.push({...this.item(type,lane,approaching?this.incomingAhead(world,approachSpeed,halfLength):ahead,0),height:type==='train'?TRACK.roofHeight:undefined,approachSpeed,halfLength,row,rowWorld:world,required,routeLane:safe,pace,eventId,construction,passed:false,broken:false});
    }
    const count=pace==='recovery'?15:9,spacing=pace==='recovery'?1.7:2.5;
    for(let i=0;i<count;i++)this.pickups.push({...this.item('coin',safe,ahead+(i-(count-1)/2)*spacing,required==='jump'?.95+Math.max(0,1-Math.abs(i-(count-1)/2)/3)*1.8:.95),eventId});
    if(!eventId&&(row%2===0||pace==='recovery'))this.pickups.push(this.item(pace==='recovery'?'mystery':this.nextBonus(),safe,ahead-15,1.05));
  }
  buildEncounter(start,forcedType=null){
    const type=forcedType||this.director.eventType(),meta=ROUTE_EVENTS[type],level=type==='courier'||this.difficulty==='casual'?1:this.director.integer(1,Math.min(3,1+Math.floor(start/700))),count=type==='breakout'?PURSUIT_RULES[this.difficulty].waves:type==='courier'?3:3+Number(level>1);
    const ev={id:++this.id,type,start,end:start,level,goal:type==='rooftop'?3:count,progress:0,passedRows:[],checkpoints:[],warned:false,started:false,finished:false,reward:meta.reward+level*100,coins:meta.coins};
    ev.warnAt=this.afterSeconds(start,-4);this.encounters.push(ev);
    if(type==='rooftop'){
      const lane=this.director.choose([-1,1].filter(l=>Math.abs(l-this.nextSafeLane)<=1)),row=this.rows++,end=this.buildElevatedCourse(start,lane,row,this.speedAt(start),ev.id),course=this.courses.at(-1);
      ev.roofBadges=0;ev.groundBadges=0;ev.roofLane=lane;ev.groundLane=0;
      const stamps=[this.afterSeconds(course.jumpAt,.90),this.afterSeconds(course.secondRoof[0],.85),course.secondRoof[1]-4];
      for(let i=0;i<stamps.length;i++)for(const roof of [false,true])this.pickups.push({...this.item('stamp',roof?lane:0,stamps[i]-this.distance,roof?TRACK.roofHeight+.95:.95),eventId:ev.id,stampKey:`treasure-${i}`,roof,color:roof?'#ffd56e':'#78d7ff'});
      for(let world=start;world<end;world+=3)this.pickups.push(this.item('coin',0,world-this.distance,.95));
      ev.end=end+3;this.nextSafeLane=lane;
    }else{
      let world=start,previous=this.nextSafeLane;const first=this.director.choose(['jump','slide']);
      for(let i=0;i<count;i++){
        const candidates=[-1,0,1].filter(l=>Math.abs(l-previous)===1),lane=this.director.choose(candidates);
        const escapeConvoy=type==='breakout'&&i%3===0;
        const recipe=type==='breakout'?(escapeConvoy?'open':i%3===1?'jumpMix':'slideMix'):['rhythm','works'].includes(type)?(i%2===0?first:first==='jump'?'slide':'jump')+(level===3||level>1&&i%2?'Mix':''):'open';
        const closedLane=type==='works'||type==='breakout'&&!escapeConvoy?this.director.choose([-1,0,1].filter(l=>l!==lane)):null;
        const row=this.rows++;this.buildGroundRow(world,lane,row,recipe,{pace:type==='courier'?'recovery':'challenge',eventId:ev.id,convoy:type==='convoy'||escapeConvoy,level: type==='breakout'?Math.max(2,level):level,closedLane});
        if(type==='courier')this.pickups.push({...this.item('stamp',lane,world+8-this.distance,.95),eventId:ev.id});
        if(type==='convoy'||escapeConvoy)ev.checkpoints.push({world:world+this.speedAt(world)*.75+5,passed:false,row});
        previous=lane;ev.end=world+this.speedAt(world)*.85+8;world+=this.rowGap(world)*(type==='courier'?1.15:1)+this.director.random()*6;
      }
      this.nextSafeLane=previous;
    }
    if(type==='breakout'){this.story.scheduled=true;this.story.target=ev.end;ev.exitName=this.story.name;}
    this.nextRow=ev.end+Math.max(this.rowGap(ev.end),this.speedAt(ev.end)*1.6+12);
    this.director.finishEvent(this.rows,type==='rooftop');
  }
  recordEvent(id,row=null,roof=null){
    const ev=this.encounters.find(e=>e.id===id&&!e.finished);if(!ev||ev.tainted||this.distance<ev.start||this.distance>ev.end+2)return;
    if(row!==null){if(ev.passedRows.includes(row))return;ev.passedRows.push(row);}
    if(ev.type==='rooftop'&&roof!==null){if(roof){ev.roofBadges++;ev.reward+=200;ev.coins+=10;}else ev.groundBadges++;}
    ev.progress=Math.min(ev.goal,ev.progress+1);this.events.push({type:'eventProgress',eventType:ev.type,progress:ev.progress,goal:ev.goal});
  }
  updateEncounters(){
    if(this.mode!=='running')return;
    const scene=this.director.districtAt(this.distance).type;if(scene!==this.scene){this.scene=scene;this.events.push({type:'district',scene});}
    for(const ev of this.encounters){
      if(ev.finished)continue;
      if(!ev.warned&&this.distance>=(ev.warnAt??ev.start-this.speed*4)){ev.warned=true;this.events.push({type:'eventWarning',eventType:ev.type});}
      if(!ev.started&&this.distance>=ev.start){ev.started=true;ev.damageAtStart=this.accidents;this.eventStats.attempted++;this.events.push({type:'eventStart',eventType:ev.type});}
      for(const checkpoint of ev.checkpoints)if(!checkpoint.passed&&this.distance>=checkpoint.world){checkpoint.passed=true;if(this.jetpack<=0&&!this.landing&&this.accidents===ev.damageAtStart&&this.invulnerable<=0)this.recordEvent(ev.id,checkpoint.row??null);}
      if(this.distance>ev.end+2){
        ev.finished=true;const success=!ev.tainted&&ev.progress>=ev.goal;
        if(success){this.eventStats.completed++;this.eventStats.streak++;this.eventStats.bestStreak=Math.max(this.eventStats.bestStreak,this.eventStats.streak);
          if(this.eventStats.streak%3===0){ev.streakReward=true;ev.reward+=500;ev.coins+=30;if(this.boardCharges<3)this.boardCharges++;else ev.coins+=20;}
          this.coins+=ev.coins;this.bonusCoins+=ev.coins;this.addPoints(ev.reward+ev.coins*10,'bonusPoints',false);}
        else this.eventStats.streak=0;
        this.lastEncounter={...ev,success,until:this.time+4};this.events.push({type:'eventFinish',eventType:ev.type,success,reward:ev.reward,coins:ev.coins,streakReward:ev.streakReward});
        if(ev.type==='breakout'){
          this.story.scheduled=false;
          if(success){this.story.completed++;this.pursuit.escape();this.mode='escaped';this.events.push({type:'escape',name:this.story.name});}
          else{this.story.target=ev.end+650;this.events.push({type:'exitMissed'});}
        }
      }
    }
    this.encounters=this.encounters.filter(ev=>ev.end>this.distance-35);
  }
  get encounterView(){
    const active=this.encounters.find(ev=>!ev.finished&&ev.started);if(active)return {...active,phase:'active',remaining:Math.max(0,active.end-this.distance)};
    if(this.lastEncounter&&this.lastEncounter.until>this.time)return {...this.lastEncounter,phase:'result'};
    const next=this.encounters.find(ev=>!ev.finished&&ev.warned);return next?{...next,phase:'warning',remaining:Math.max(0,next.start-this.distance)}:null;
  }
  buildElevatedCourse(start,lane,row,speed,eventId=null){
    const bounds=this.speedBounds(start,500);speed=bounds.max;
    const rampLength=Math.max(14,speed*.65)*(1+this.director.random()*.2),carLength=Math.max(42,speed*2.2)*(1+this.director.random()*.15),gapLength=Math.max(4.2,bounds.min*.2);
    const a=start+rampLength,b=a+carLength,c=b+gapLength,d=c+carLength,end=d+rampLength;
    const put=(type,world,halfLength,extra={})=>{const o={...this.item(type,lane,world-this.distance,0),halfLength,row,rowWorld:start,course:true,eventId,routeLane:lane,passed:false,broken:false,...extra};this.obstacles.push(o);return o;};
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
    this.pickups.push(this.item('mystery',lane,(eventId?end+8:d-6)-this.distance,eventId?1.05:TRACK.roofHeight+1.05));
    const incomingLane=lane===0?1:0,approachSpeed={casual:9,classic:13,expert:18}[this.difficulty];
    const encounter=a+carLength*.65,approachAhead=this.incomingAhead(encounter,approachSpeed,13.2);
    if(!eventId)put('train',this.distance+approachAhead,13.2,{lane:incomingLane,approachSpeed,height:TRACK.roofHeight});
    if(this.director.random()<.62)this.tunnels.push({id:++this.id,start:start-22,end:end+30,ceiling:TRACK.tunnelCeiling});
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
      const reward=Math.floor(this.rewardRandom()*4);
      if(reward<2){const coins=reward===0?25:50;this.coins+=coins;this.bonusCoins+=coins;this.addPoints(coins*10,'bonusPoints');this.events.push({type:'mystery',message:`礼盒奖励 +${coins} 金币`});}
      else{const bonus=reward===2?'board':['magnet','double','sneakers','jetpack'][Math.floor(this.rewardRandom()*4)];this.collectBonus(bonus,true);this.events.push({type:'mystery',message:`礼盒奖励 · ${BONUSES[bonus].name}`});}
    }else if(type==='board'){
      if(this.boardCharges<3){this.boardCharges++;this.events.push({type:'boardPickup'});}
      else{this.coins+=20;this.bonusCoins+=20;this.addPoints(200,'bonusPoints');this.events.push({type:'mystery',message:'滑板已满 · 转为 20 金币'});}
    }else{
      // Same-type pickup refreshes duration; different types may coexist.
      this[type]=BONUSES[type].duration*this.config.bonusScale;
      if(type==='smoke'){const danger=this.pursuit.danger;this.pursuit.pressure=Math.max(18,this.pursuit.pressure-42);if(danger&&!this.pursuit.danger){this.pursuit.recoveries++;this.events.push({type:'chaseClear'});}}
      if(type==='jetpack'){this.vy=0;this.grounded=false;this.slide=0;this.slideQueued=false;this.landing=false;this.nextAirCoin=this.distance+7;this.pickups=this.pickups.filter(p=>!p.air);}
      this.events.push({type,duration:this[type]});
    }return true;
  }
  missionValue(id){return id==='coins'?this.stats.collectedCoins:id==='distance'?Math.floor(this.distance):id==='bonus'?this.bonusCount:id==='events'?this.eventStats.completed:this.stats[id]||0;}
  updateMissions(){
    for(const m of this.missions){m.progress=Math.min(m.target,Math.max(0,this.missionValue(m.id)-(m.baseline||0)));
      if(!m.done&&m.progress>=m.target){m.done=true;this.missionsCompleted++;this.addPoints(m.reward,'bonusPoints',false);this.events.push({type:'mission',message:`${m.name} · +${m.reward} 分`});}
    }
    if(this.missions.every(m=>m.done)){
      this.missionRound++;const tier=Math.min(5,this.missionRound-1),pool=[['cleanJumps',3+tier,'干净跳过', '组路障'],['coins',80+tier*20,'亲自收集','枚金币'],['cleanSlides',3+tier,'干净滑过','组横杆'],['events',2,'完成','个随机事件'],['distance',700+tier*100,'继续跑过','米']];
      const offset=(this.missionRound*3+(this.seed>>>0))%pool.length;
      this.missions=Array.from({length:3},(_,i)=>{const [id,target,verb,unit]=pool[(offset+i)%pool.length];return {id,target,name:`${verb} ${target} ${unit}`,baseline:this.missionValue(id),progress:0,reward:600+tier*150,done:false};});
    }
  }
  recoverFrom(o){
    // Freeze the world for a short recoil. Trains, pickups and their ETA all stop
    // together. Resolve into clear space; a long carriage is never deleted.
    const support=this.obstacles.filter(b=>!b.broken&&['train','ramp'].includes(b.type)&&Math.abs(b.lane*LANE_WIDTH-this.x)<TRACK.roofHalfWidth&&Math.abs(b.ahead)<b.halfLength&&this.surfaceHeight(b)<=this.y+.16).sort((a,b)=>this.surfaceHeight(b)-this.surfaceHeight(a))[0];
    const floor=support?this.surfaceHeight(support):0,solid=lane=>this.obstacles.filter(b=>!b.broken&&b.lane===lane&&['train','ramp'].includes(b.type)&&b.ahead-b.halfLength<this.speed*1.1+(b.approachSpeed||0)*1.1&&b.ahead+b.halfLength>-.5&&(b.type==='ramp'||(b.height??TRACK.roofHeight)>floor+.15));
    let targetLane=support?support.lane:this.lane,targetY=floor,supportId=support?.id??null,vault=false;
    if(['train','ramp'].includes(o.type)){
      const available=[-1,0,1].filter(l=>solid(l).length===0).sort((a,b)=>Math.abs(a-this.lane)-Math.abs(b-this.lane));
      if(available.length){targetLane=available[0];targetY=0;supportId=null;}
      else if(o.type==='train'){targetLane=o.lane;targetY=o.height??TRACK.roofHeight;supportId=o.id;vault=true;}
    }
    const duration=vault?.72:.55;
    this.recovery={age:0,duration,fromX:this.x,fromY:this.y,targetLane,targetY,supportId,vault};
    for(const b of this.obstacles)if(b===o||!o.course&&!b.course&&o.row!==undefined&&b.row===o.row||this.accidentContact(b)){b.accidentIgnored=true;b.passed=true;}
    this.slide=0;this.slideQueued=false;this.vy=0;this.combo=0;this.comboTimer=0;this.invulnerable=1.1;
    this.events.push({type:'stumble',obstacle:o.type,vault});
  }
  accidentContact(o){
    if(o.broken||o.type==='gap'||Math.abs(o.ahead)>o.halfLength+.4||Math.abs(o.lane*LANE_WIDTH-this.x)>1.4)return false;
    if(o.type==='train')return this.y<(o.height??TRACK.roofHeight)-.12;
    if(o.type==='ramp')return this.y<this.surfaceHeight(o)-.16;
    const base=o.y||0;return o.type==='gate'?this.y<base+3.16&&this.y+(this.slide>0?.72:2.05)>base+1.22:this.y<base+.99;
  }
  stepRecovery(dt){
    const r=this.recovery;r.age=Math.min(r.duration,r.age+dt);const u=r.age/r.duration,s=u*u*(3-2*u);
    this.x=r.fromX+(r.targetLane*LANE_WIDTH-r.fromX)*s;this.y=r.fromY+(r.targetY-r.fromY)*s+(r.vault?1.1:.16)*Math.sin(u*Math.PI);
    if(u>=1){this.lane=r.targetLane;this.y=r.targetY;this.floorHeight=r.targetY;this.supportId=r.supportId;this.grounded=true;this.surface=r.targetY>1?'roof':'ground';this.recovery=null;this.events.push({type:'recovered'});}
  }
  impact(o,shield){
    this.accidents++;this.eventStats.streak=0;
    const encounter=this.encounters.find(e=>e.id===o.eventId&&!e.finished);if(encounter)encounter.tainted=true;
    if(shield){this.board=0;this.invulnerable=1.4;o.broken=true;this.savedCrashes++;this.combo=0;this.events.push({type:'shieldBreak'});return;}
    if(this.pursuit.hit()==='caught'){this.mode='caught';this.caughtTime=0;this.reason=o.approachSpeed?'oncoming':o.type;this.events.push({type:'caught'});}
    else this.recoverFrom(o);
  }
  step(dt){
    dt=clamp(dt,0,.05);if(!dt)return;
    if(this.mode==='intro'){const before=this.introTime;this.introTime=Math.min(INTRO_DURATION,this.introTime+dt);if(before<2.2&&this.introTime>=2.2)this.events.push({type:'discovered'});if(this.introTime>=INTRO_DURATION)this.skipIntro();return;}
    if(this.mode==='caught'){this.caughtTime=Math.min(1.05,this.caughtTime+dt);if(this.caughtTime>=1.05){this.mode='over';this.events.push({type:'crash'});}return;}
    if(this.mode!=='running')return;
    if(this.recovery){this.stepRecovery(dt);return;}
    const previous={x:this.x,y:this.y,slide:this.slide,invulnerable:this.invulnerable,board:this.board,grounded:this.grounded&&Math.abs(this.y-this.floorHeight)<.05&&this.vy<=0,supportId:this.supportId},magnetWas=this.magnet;
    let poses=poseWindows(previous.slide,dt);
    this.time+=dt;this.speed=this.speedAt(this.distance+this.speedAt(this.distance)*dt/2);
    const move=this.speed*dt;this.distance+=move;this.addPoints(move,'distancePoints');
    this.peakSpeed=Math.max(this.peakSpeed,this.speed);const pace=this.paceView;
    if(pace.phase!==this.speedPhase){this.speedPhase=pace.phase;this.events.push({type:'pace',phase:pace.phase,name:pace.name});}
    this.x+=(this.lane*LANE_WIDTH-this.x)*(1-Math.exp(-19*dt));
    this.slide=Math.max(0,this.slide-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);
    this.comboTimer=Math.max(0,this.comboTimer-dt);if(this.comboTimer===0)this.combo=0;
    // Flight suspends the board timer, so a stored shield is not wasted in the air.
    for(const type of ['magnet','double','sneakers','jetpack','board','smoke']){
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
      if(o.accidentIgnored&&this.invulnerable<=0&&!this.accidentContact(o))o.accidentIgnored=false;
      if(o.broken||o.type==='gap'||o.accidentIgnored)continue;
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
      if(contact&&!collision&&this.jetpack<=0&&!this.landing&&!newProtection&&previous.invulnerable<=0){
        const correct=o.type==='barrier'?!!sweepHeight(this.verticalPath,(o.y||0)+.99,100,contact):o.type==='gate'&&poses.some(p=>p.sliding&&Math.max(p.window[0],contact[0])<=Math.min(p.window[1],contact[1]));
        if(correct&&!o.eventClean){o.eventClean=true;o.eventDamage=this.accidents;}
      }
      if(collision&&this.jetpack<=0&&!this.landing&&!newProtection){
        this.impact(o,this.board>0||previous.board>collision[0]*dt);if(this.recovery||this.mode==='caught')break;
      }
      if(!o.passed&&o.ahead<-o.halfLength-.4){
        o.passed=true;
        if(o.type!=='ramp'&&dx<.8&&this.jetpack<=0&&!this.landing&&this.invulnerable<=0){this.stats.nearMisses++;this.addPoints(30,'bonusPoints');this.events.push({type:'dodge'});
          if(o.eventClean&&o.eventDamage===this.accidents){if(o.type==='barrier')this.stats.cleanJumps++;if(o.type==='gate')this.stats.cleanSlides++;
            if(this.pursuit.skill())this.events.push({type:'chaseClear'});
            const ev=this.encounters.find(e=>e.id===o.eventId);if(['rhythm','works','breakout'].includes(ev?.type))this.recordEvent(ev.id,o.row);}}
      }
    }
    let magnetActivatedAt=null;
    if(this.mode==='running'&&!this.recovery)for(const p of this.pickups){
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
          this.coins++;this.stats.collectedCoins++;this.combo++;this.maxCombo=Math.max(this.combo,this.maxCombo);this.comboTimer=this.config.comboWindow;
          this.addPoints(10,'coinPoints');this.events.push({type:'coin',lane:p.lane,x:this.x,y:p.flight?target.y:p.y,ahead:target.ahead,magnetic:!!p.flight});
          if(this.combo===20||this.combo===40)this.events.push({type:'combo',combo:this.combo});
        }else if(p.type==='stamp'){this.recordEvent(p.eventId,p.stampKey??null,p.roof??null);this.events.push({type:'stamp',x:this.x,y:p.y,ahead:target.ahead,lane:p.lane,color:p.color});}else{const before=this.magnet;this.collectBonus(p.type);if(this.magnet>before)magnetActivatedAt=magnetActivatedAt===null?contactTime:Math.min(magnetActivatedAt,contactTime);}
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
    const stage=1+Math.floor(this.distance/this.config.stageLength);
    if(stage>this.stage){this.stage=stage;this.events.push({type:'stage',stage});}
    this.stageProgress=(this.distance%this.config.stageLength)/this.config.stageLength;
    if(this.mode==='running'&&!this.recovery){if(this.pursuit.step(dt))this.events.push({type:'chaseClear'});this.updateEncounters();this.updateMissions();}
    this.score=Math.floor(this.points+1e-7);if(this.mode==='running')this.populate();
  }
  get routeCue(){
    if(this.jetpack>0||this.landing||this.recovery)return null;
    const cues=[];
    for(const o of this.obstacles){
      if(o.broken)continue;
      let kind=o.required,meters=o.ahead,eta=meters/this.speed;
      if(o.approachSpeed){kind='oncoming';meters=o.ahead-o.halfLength;eta=meters/(this.speed+o.approachSpeed);}
      else if(o.type==='train'||!kind)continue;
      else if(o.type==='ramp'||o.type==='gap'){meters=o.ahead-o.halfLength;eta=meters/this.speed;}
      if(o.y>2&&this.y<1.6)continue;
      if(kind==='descend'&&this.y<1.6)continue;
      if(meters>0&&eta<(kind==='climb'?2.4:kind==='oncoming'?2.2:1.8))cues.push({kind,meters,eta,lane:o.lane,mixed:this.obstacles.some(x=>x.row===o.row&&!x.course&&x.type==='train'),works:this.obstacles.some(x=>x.row===o.row&&x.construction)});
    }
    return cues.sort((a,b)=>a.eta-b.eta)[0]||null;
  }
  drainEvents(){const e=this.events;this.events=[];return e;}
  snapshot(){return {state:this.mode,introTime:+this.introTime.toFixed(2),chase:{pressure:Math.round(this.pursuit.pressure),danger:this.pursuit.danger,recoverySeconds:this.pursuit.seconds,hits:this.pursuit.hits},story:{...this.story},recovering:!!this.recovery,accidents:this.accidents,difficulty:this.difficulty,stage:this.stage,distance:Math.floor(this.distance),score:this.score,coins:this.coins,lane:this.lane,jumping:!this.grounded&&this.jetpack<=0,height:+this.y.toFixed(2),surface:this.surface,environment:this.environment,scene:this.scene,event:this.encounterView?{type:this.encounterView.type,phase:this.encounterView.phase,progress:this.encounterView.progress,goal:this.encounterView.goal}:null,eventsCompleted:this.eventStats.completed,sliding:this.slide>0,combo:this.combo,multiplier:this.multiplier,boardCharges:this.boardCharges,bonuses:Object.fromEntries(['magnet','double','sneakers','jetpack','board','smoke'].map(t=>[t,+this[t].toFixed(1)])),pace:this.paceView.phase,peakSpeed:Math.round(this.peakSpeed*3.6),missionsCompleted:this.missionsCompleted,speed:Math.round(this.speed*3.6)};}
}
