// The route has its own random streams: opening a gift never rerolls the track.
export const DISTRICTS=Object.freeze({
  station:{name:'中央车站',tag:'CITY TERMINAL',color:'#7ee0cf',sky:[.61,.72,.79],ground:'#55727b',deck:'#abb5ae'},
  harbor:{name:'蔚蓝港区',tag:'CARGO DOCKS',color:'#67d6ff',sky:[.44,.70,.81],ground:'#287e9a',deck:'#849eaa'},
  garden:{name:'林间旧线',tag:'FOREST LINE',color:'#b9ef87',sky:[.54,.71,.64],ground:'#41685d',deck:'#8d9d80'},
  canyon:{name:'落日峡谷',tag:'CANYON EXPRESS',color:'#ffb576',sky:[.83,.57,.43],ground:'#a17053',deck:'#a88d75'},
  neon:{name:'霓虹夜市',tag:'NEON DISTRICT',color:'#ed9bdc',sky:[.14,.20,.36],ground:'#242a45',deck:'#596279'}
});
export const ROUTE_EVENTS=Object.freeze({
  courier:{name:'限段快递',short:'收集',hint:'沿蓝色路线收集徽章，留意每次换道',color:'#78d7ff',glyph:'◆',reward:500,coins:25},
  rhythm:{name:'跳滑接力',short:'连招',hint:'按提示连续跳跃和滑铲，干净通过才计数',color:'#ffc76e',glyph:'↟',reward:750,coins:30},
  convoy:{name:'晚点车潮',short:'避车',hint:'迎面列车交错进站，沿亮起的轨道穿行',color:'#ff977f',glyph:'!',reward:800,coins:35},
  rooftop:{name:'分岔夺宝',short:'冒险',hint:'蓝色地面稳拿奖励；金色车顶每枚额外 +200 分、10 金币',color:'#d2a5ff',glyph:'↗',reward:400,coins:20},
  works:{name:'施工封线',short:'施工',hint:'黄黑围挡不可穿越，选开放轨道连续跳跃、滑铲',color:'#ffd36d',glyph:'↔',reward:950,coins:40},
  breakout:{name:'封锁突围',short:'出口',hint:'车潮、封线跳跃、低杆滑铲连续交替；全程无碰撞才能抵达出口',color:'#9befe0',glyph:'↗',reward:1600,coins:70,gate:true}
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function rng(seed){let s=seed>>>0;return()=>{s+=0x6D2B79F5;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(items,random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const smooth=t=>t*t*(3-2*t);
export function speedProfile(world,config,seed=0){
  world=Math.max(0,world);
  const base=Math.min(config.maxSpeed,config.startSpeed+world*config.acceleration);
  if(world<420)return {speed:base,phase:'warmup',name:'热身渐速',next:'巡航',remaining:420-world,progress:world/420,cycle:0};
  const span=980+((seed>>>0)%4)*80,cycle=Math.floor((world-420)/span),p=((world-420)%span)/span;
  const peak=1.18+((Math.imul(cycle+1,31)^(seed>>>0))>>>0)%7*.01;
  const phases=[['cruise','巡航','提速',0,.14,1,1],['rise','提速','疾跑',.14,.38,1,peak],['rush','疾跑','回落',.38,.53,peak,peak],['ease','回落','恢复',.53,.72,peak,.86],['recover','恢复','蓄势',.72,.88,.86,.86],['ready','蓄势','巡航',.88,1,.86,1]];
  const [phase,name,next,from,to,a,b]=phases.find(v=>p<v[4])||phases.at(-1),u=(p-from)/(to-from);
  const capDistance=(config.maxSpeed-config.startSpeed)/config.acceleration;
  const mastery=1+.14*(1-Math.exp(-Math.max(0,world-capDistance)/6000));
  return {speed:base*mastery*(a+(b-a)*smooth(u)),phase,name,next,remaining:(to-p)*span,progress:u,cycle:cycle+1};
}
export function travelTime(from,to,config,seed=0){
  if(to<=from)return 0;
  // Simpson integration shares the exact speed profile used by the simulation.
  const n=Math.max(2,Math.ceil((to-from)/8/2)*2),h=(to-from)/n;
  let sum=1/speedProfile(from,config,seed).speed+1/speedProfile(to,config,seed).speed;
  for(let i=1;i<n;i++)sum+=(i%2?4:2)/speedProfile(from+i*h,config,seed).speed;
  return sum*h/3;
}
export class RouteDirector {
  constructor(seed,difficulty){
    this.random=rng(seed^0x5ab927);this.sceneRandom=rng(seed^0x39fac1);this.difficulty=difficulty;
    this.eventBag=[];this.lastEvent=null;this.nextEventRow=2+Math.floor(this.random()*2);this.nextCourseRow=7;
    this.history=[];this.pace='flow';this.paceLeft=2;this.recoveryRows=0;
    this.districts=[{id:0,type:'station',start:0,end:330}];this.sceneBag=[];this.sceneId=0;
  }
  integer(lo,hi){return lo+Math.floor(this.random()*(hi-lo+1));}
  choose(items){return items[this.integer(0,items.length-1)];}
  eventType(){
    if(!this.eventBag.length){this.eventBag=shuffle(Object.keys(ROUTE_EVENTS).filter(t=>!ROUTE_EVENTS[t].gate),this.random);if(this.eventBag.at(-1)===this.lastEvent)[this.eventBag[0],this.eventBag[this.eventBag.length-1]]=[this.eventBag.at(-1),this.eventBag[0]];}
    return this.lastEvent=this.eventBag.pop();
  }
  finishEvent(nextRow,rooftop=false){this.nextEventRow=nextRow+this.integer(3,5);this.recoveryRows=2;this.pace='recovery';this.paceLeft=2;if(rooftop)this.nextCourseRow=nextRow+this.integer(6,9);}
  recipe(row,stage){
    if(row===0)return {recipe:'open',pace:'flow',spacing:1.12};
    if(this.recoveryRows>0){this.recoveryRows--;if(!this.recoveryRows){this.pace='flow';this.paceLeft=2;}return {recipe:'open',pace:'recovery',spacing:1.34};}
    if(--this.paceLeft<=0){this.pace=this.pace==='challenge'?'flow':this.choose(['flow','challenge']);this.paceLeft=this.integer(2,4);}
    const easy=this.difficulty==='casual',hard=this.difficulty==='expert'||stage>=3;
    let pool=this.pace==='challenge'?['jump','slide','jumpMix','slideMix']:easy?['open','open','jump','slide']:['open','jump','slide','jumpMix','slideMix'];
    if(easy&&stage===1)pool=['open','jump','slide'];
    const recent=this.history.slice(-2),kind=r=>r.startsWith('jump')?'jump':r.startsWith('slide')?'slide':'open';
    if(recent.length===2&&recent[0]===recent[1])pool=pool.filter(r=>kind(r)!==recent[0]);
    const recipe=this.choose(pool);this.history.push(kind(recipe));if(this.history.length>4)this.history.shift();
    return {recipe,pace:this.pace,spacing:this.pace==='challenge'?(hard?1:1.06):1.12+this.random()*.13};
  }
  ensureDistricts(distance){
    while(this.districts.at(-1).end<distance+600){
      const previous=this.districts.at(-1);
      if(!this.sceneBag.length){this.sceneBag=shuffle(Object.keys(DISTRICTS),this.sceneRandom);if(this.sceneBag.at(-1)===previous.type)[this.sceneBag[0],this.sceneBag[this.sceneBag.length-1]]=[this.sceneBag.at(-1),this.sceneBag[0]];}
      const type=this.sceneBag.pop();if(type===previous.type)continue;
      this.districts.push({id:++this.sceneId,type,start:previous.end,end:previous.end+360+this.sceneRandom()*150});
    }
    this.districts=this.districts.filter(d=>d.end>distance-280);
  }
  districtAt(world){return this.districts.find(d=>world>=d.start&&world<d.end)||this.districts.at(-1);}
  sceneBlend(world){const current=this.districtAt(world),prior=this.districts.find(d=>d.end===current.start);return {current,previous:prior||current,mix:clamp((world-current.start)/45,0,1)};}
}
