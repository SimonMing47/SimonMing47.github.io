import { LANE_WIDTH, TRACK, clamp } from './engine.js';

const TAU=Math.PI*2;
const mix=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const damp=(a,b,rate,dt)=>mix(a,b,1-Math.exp(-rate*dt));
const blend=(a,b,t)=>a.map((v,i)=>mix(v,b[i],t));

// Contact and swing occupy different portions of the stride. A planted sole moves
// with the track; the returning foot clears the ground and rolls into heel strike.
export function stride(cycle,speed){
  const phase=((cycle%1)+1)%1;
  const cadence=clamp(1.65+speed*.025,1.8,2.7);
  const reach=clamp(.34+speed*.003,.36,.46);
  const stance=clamp(2*reach*cadence/Math.max(speed,1),.035,.55);
  if(phase<stance){const u=phase/stance;return {z:mix(-reach,reach,u),lift:0,pitch:mix(.16,-.35,smooth((u-.55)/.45)),contact:true};}
  const u=(phase-stance)/(1-stance);
  return {z:mix(reach,-reach,smooth(u)),lift:Math.sin(Math.PI*u)*.29,pitch:mix(-.35,.16,smooth(u)),contact:false};
}

// Two-bone IK keeps the knee articulated while the ankle follows its contact.
// The pole controls the bend direction, including a distinct low sliding pose.
export function solveLimb(root,target,upper,lower,pole=[0,0,-1]){
  const delta=target.map((v,i)=>v-root[i]),raw=Math.hypot(...delta),distance=clamp(raw,Math.abs(upper-lower)+.001,upper+lower-.001),axis=delta.map(v=>v/(raw||1));
  if(raw<.001)axis.splice(0,3,0,-1,0);
  const dot=pole.reduce((s,v,i)=>s+v*axis[i],0);let bend=pole.map((v,i)=>v-dot*axis[i]);
  let size=Math.hypot(...bend);if(size<.001){const seed=Math.abs(axis[0])<.9?[1,0,0]:[0,1,0],projection=seed.reduce((s,v,i)=>s+v*axis[i],0);bend=seed.map((v,i)=>v-projection*axis[i]);size=Math.hypot(...bend);}bend=bend.map(v=>v/size);
  const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
  return {knee:root.map((v,i)=>v+axis[i]*along+bend[i]*height),ankle:root.map((v,i)=>v+axis[i]*distance)};
}

export function footSurface(e,x,z){
  if(!e.grounded)return {height:0,pitch:0,valid:false};
  const support=e.obstacles.find(o=>o.id===e.supportId&&!o.broken);
  // Feet near a ramp/train seam use the adjacent support, never the roof below a
  // runner on the ground. Detached feet are handled by the swing/air animation.
  const candidates=support?[support,...e.obstacles.filter(o=>o!==support)]:[];
  for(const o of candidates){
    if(!['train','ramp'].includes(o.type)||o.broken||Math.abs(x-o.lane*LANE_WIDTH)>TRACK.roofHalfWidth||Math.abs(o.ahead+z)>o.halfLength+.025)continue;
    const height=e.surfaceHeight(o,o.ahead+z);
    if(Math.abs(height-e.y)>.32)continue;
    return {height:height-e.y,pitch:o.type==='ramp'?Math.atan2(o.to-o.from,o.halfLength*2):0,valid:true};
  }
  return {height:0,pitch:0,valid:!e.supportId&&e.y<.03};
}

export class CharacterAnimator {
  constructor(){this.reset();}
  reset(){this.clock=0;this.phase=0;this.turn=0;this.air=0;this.flight=0;this.board=0;this.recovery=0;this.wasSliding=false;this.slideAge=0;this.landAge=10;this.jumpAge=10;this.crashAge=-1;this.stumbleAge=10;this.pose=null;}
  handleEvent(event){
    if(event.type==='land'||event.type==='landing')this.landAge=0;
    if(event.type==='jump'){this.jumpAge=0;this.recovery=0;}
    if(event.type==='crash')this.crashAge=0;
    if(event.type==='stumble')this.stumbleAge=0;
  }
  update(e,dt,reduceMotion=false){
    if(e.mode==='paused'&&this.pose)return this.pose;
    const intro=e.mode==='intro',menu=e.mode==='menu'||intro&&e.introTime<3.3,active=['running','intro','caught'].includes(e.mode)||menu,delta=active?Math.min(dt,.1):this.crashAge>=0&&this.crashAge<.4?Math.min(dt,.05):0;
    this.clock+=delta;this.landAge+=delta;this.jumpAge+=delta;this.stumbleAge+=delta;if(this.crashAge>=0)this.crashAge+=delta;
    const sliding=e.slide>0,flight=e.jetpack>0||e.landing;
    if(sliding){this.slideAge=this.wasSliding?this.slideAge+delta:0;this.recovery=1;}
    else{this.slideAge=0;this.recovery=Math.max(0,this.recovery-delta/(!e.grounded?.08:.19));}
    this.wasSliding=sliding;
    this.turn=damp(this.turn,menu?0:clamp((e.lane*LANE_WIDTH-e.x)*.17,-.31,.31),15,delta);
    this.air=damp(this.air,!menu&&!e.grounded&&!flight?1:0,20,delta);
    this.flight=damp(this.flight,flight?1:0,9,delta);
    this.board=damp(this.board,e.board>0&&!flight?1:0,12,delta);
    const speed=menu?0:e.speed,cadence=clamp(1.65+speed*.025,1.8,2.7);
    if(active&&e.mode!=='caught'&&!menu&&!sliding&&e.grounded&&this.board<.5)this.phase=(this.phase+delta*cadence)%1;
    const wave=Math.sin(this.phase*TAU),bob=menu?(reduceMotion?0:Math.sin(this.clock*2)*.009):-Math.cos(this.phase*TAU*2)*.025;
    const landing=this.landAge<.24?Math.sin(this.landAge/.24*Math.PI)*.10:0;
    const low=sliding?1:smooth(this.recovery),board=this.board*(1-low),flying=this.flight*(1-low);
    const boardPitch=footSurface(e,e.x,0).pitch;
    const boardBase=e.board>0&&!flight?.17/Math.cos(boardPitch):0;
    const hipY=mix(.825+bob-landing,.275,low)-board*.15+flying*.03;
    const pitch=mix(-.08-this.air*.09,1.43,low)+flying*.17;
    const pose={state:menu?'idle':sliding?'slide':flight?'flight':e.grounded?this.landAge<.24?'land':e.board>0?'board':this.recovery>0?'recover':'run':e.vy>2?'rise':e.vy< -2?'fall':'apex',
      hip:[this.turn*.08,hipY,low*.08],pitch,yaw:menu?Math.sin(this.clock*.5)*.045:this.turn*.55+wave*.026*(1-low)*(1-this.air),roll:-this.turn*(1-low)*.5,
      headPitch:-pitch*mix(.62,1,low),headYaw:menu?-.16:this.turn*.7,low,landing,feet:[],arms:[],time:this.clock,air:this.air,boardPitch};
    for(const side of [-1,1]){
      const step=stride(this.phase+(side>0?.5:0),speed),idle=[side*.175,.105,-.035];
      let target=menu?idle:[side*.175,.105+step.lift+boardBase,step.z];
      let footPitch=menu?0:step.pitch;
      const tuck=clamp(e.vy/12,-1,1),apex=1-clamp(Math.abs(e.vy)/3,0,1);
      const airFoot=[side*.18,.13+Math.max(0,tuck)*.22+apex*.10+(e.slideQueued?.08:0),.12+Math.max(0,tuck)*.16+side*.08];
      target=blend(target,airFoot,this.air);footPitch=mix(footPitch,-.23,this.air);
      target=blend(target,[side*.235,.105+boardBase,side*.28],board);footPitch=mix(footPitch,0,board);
      target=blend(target,[side*.22,.20,.32+side*.07],flying);footPitch=mix(footPitch,-.35,flying);
      const extension=smooth(this.slideAge/.1),slideFoot=[side*.20,.105+boardBase,boardBase?-.39-side*.11:-.58-extension*(side>0?.13:.04)];
      target=blend(target,slideFoot,low);footPitch=mix(footPitch,.08,low);
      const surface=boardBase?{height:-Math.tan(boardPitch)*target[2],pitch:boardPitch,valid:true}:footSurface(e,(menu?0:e.x)+target[0],target[2]);
      if(e.grounded&&!menu&&!flight){target[1]+=surface.height*(1-this.air);footPitch+=surface.pitch*(1-this.air);}
      if(e.grounded&&!surface.valid&&!menu)target[1]+=.055;
      pose.feet.push({side,target,pitch:footPitch,contact:menu||e.grounded&&surface.valid&&(sliding||this.board>.5||step.contact),surface});
      // Opposite arm/leg swing, with independently bent elbows and loose wrists.
      const swing=Math.sin((this.phase+(side>0?.5:0))*TAU),shoulder=[side*.335,.565,0];
      let elbow=[side*.40,.29,swing*.17],hand=[side*.34,.15,swing*.24-.18];
      if(menu){elbow=[side*.4,.28,.025];hand=[side*.35,.015,-.055];}
      elbow=blend(elbow,[side*.43,.39,-.13],this.air);hand=blend(hand,[side*.43,.56,-.30],this.air);
      elbow=blend(elbow,[side*.53,.34,.03],Math.max(board,flying));hand=blend(hand,[side*.64,.25,-.12],Math.max(board,flying));
      // Compact hands alongside the torso keep the full slide inside the gate.
      elbow=blend(elbow,[side*.40,.33,-.12],low);hand=blend(hand,[side*.40,.09,-.21],low);
      pose.arms.push({side,shoulder,elbow,hand,wrist:wave*.08*(1-low)});
    }
    if(intro&&e.introTime<3.3){
      const painting=e.introTime<2.2,t=e.introTime;pose.state=painting?'spray':'startled';pose.yaw=painting?Math.sin(t*3)*.03:-smooth((t-2.4)/.8)*.25;pose.headYaw=painting?-.1:-smooth((t-2.2)/.55)*1.3;
      const arm=pose.arms.find(a=>a.side===1);arm.elbow=[.40,.54,-.27];arm.hand=painting?[.23,.80+Math.sin(t*5)*.12,-.60]:[.32,.27,-.25];arm.wrist=painting?Math.sin(t*5)*.10:0;
    }else if(intro)pose.state='launch';
    if(this.stumbleAge<.72&&!intro&&low<1){const hit=Math.sin(Math.min(1,this.stumbleAge/.72)*Math.PI)*(1-low);pose.state='stumble';pose.pitch+=hit*.24;pose.hip[1]-=hit*.13;pose.headYaw=-hit*.7;pose.roll+=Math.sin(this.stumbleAge*13)*hit*.1;for(const arm of pose.arms){arm.elbow[0]*=1+hit*.3;arm.hand[2]-=hit*.22;}}
    if(e.mode==='caught'||e.mode==='over'){
      pose.state=e.actorRole==='guard'?'catch':'caught';const t=smooth((e.caughtTime??1)/.7);pose.pitch+=t*.19;pose.hip[1]-=t*.12;pose.headPitch=-.25;
      for(const foot of pose.feet){foot.target=blend(foot.target,[foot.side*.21,.105+boardBase+foot.surface.height,-.025],t);foot.pitch=mix(foot.pitch,foot.surface.pitch,t);foot.contact=t>.8;}
      for(const arm of pose.arms){arm.elbow=[arm.side*.40,.32,-.12];arm.hand=e.actorRole==='guard'?[arm.side*.25,.45,-.72]:[arm.side*.29,.01,-.12];}
    }
    if(this.crashAge>=0&&e.mode!=='over'){const hit=smooth(this.crashAge/.28);pose.pitch+=hit*.28*(1-low);pose.hip[1]-=hit*.13*(1-low);pose.headPitch-=hit*.2;}
    this.pose=pose;return pose;
  }
}
