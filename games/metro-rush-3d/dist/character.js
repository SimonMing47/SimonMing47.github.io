import { multiply, transform } from './math.js';
import { CharacterAnimator, solveLimb } from './animation.js';

const palette={skin:'#e7b18b',skinLight:'#f1c49e',skinShade:'#c88767',hair:'#302d30',ink:'#243d4d',jacket:'#34a8a5',jacketLight:'#5dc4b8',jacketShade:'#238184',rib:'#236e75',pants:'#294c64',pantsShade:'#203d54',stitch:'#587a88',cream:'#eee7d1',gold:'#f3be54',pack:'#d98b43',packLight:'#efad59'};

// Bone frames are rigid. Nonuniform sizing is applied only to leaf meshes, so
// normals stay correct and the joints never squash or shear during transitions.
function boneFrame(a,b){
  const d=b.map((v,i)=>v-a[i]),length=Math.hypot(...d),y=d.map(v=>v/(length||1));
  let x=[y[1],-y[0],0],n=Math.hypot(...x);if(n<.001){x=[1,0,0];n=1;}x=x.map(v=>v/n);
  const z=[x[1]*y[2]-x[2]*y[1],x[2]*y[0]-x[0]*y[2],x[0]*y[1]-x[1]*y[0]];
  return {matrix:new Float32Array([...x,0,...y,0,...z,0,...a.map((v,i)=>(v+b[i])*.5),1]),length};
}

export class RunnerCharacter {
  constructor(){this.animator=new CharacterAnimator();}
  reset(){this.animator.reset();}
  handleEvent(event){this.animator.handleEvent(event);}
  draw(renderer,e,dt,reduceMotion=false){
    const pose=this.animator.update(e,dt,reduceMotion),p=palette;
    const root=transform(e.mode==='menu'?0:e.x,e.y,2.5,1,1,1,0,e.mode==='menu'?-.42:0);
    const body=multiply(root,transform(...pose.hip,1,1,1,pose.pitch,pose.yaw,pose.roll));
    const mesh=(kind,parent,x,y,z,w,h,d,c,rx=0,ry=0,rz=0,glow=0)=>renderer.characterPart(kind,multiply(parent,transform(x,y,z,w,h,d,rx,ry,rz)),c,glow);
    const soft=(...args)=>mesh('rounded',...args),sphere=(...args)=>mesh('smooth',...args);
    const segment=(parent,a,b,width,depth,c)=>{const frame=boneFrame(a,b);mesh('rounded',multiply(parent,frame.matrix),0,0,0,width,frame.length+.05,depth,c);};

    // Fitted hoodie: curved shoulder line, ribbed hem, hood, zipper and pockets.
    mesh('torso',body,0,.365,0,.63,.69,.44,p.jacket);
    soft(body,0,.065,.005,.53,.10,.38,p.rib);
    soft(body,0,-.04,.025,.48,.23,.35,p.pants);
    soft(body,0,.275,-.205,.34,.18,.035,p.jacketShade);
    for(const side of [-1,1]){
      soft(body,side*.12,.30,-.229,.015,.10,.017,p.jacketLight,0,0,side*-.34);
      segment(body,[side*.08,.58,-.205],[side*.09,.40,-.233],.018,.018,p.cream);
      soft(body,side*.09,.40,-.24,.026,.04,.022,p.ink);
      sphere(body,side*.13,.623,.065,.30,.20,.34,p.jacketShade,0,0,side*.25);
      soft(body,side*.19,.495,-.18,.055,.33,.044,p.ink,-.15,0,side*-.14);
      soft(body,side*.185,.60,.23,.06,.15,.09,p.ink,.3);
    }
    soft(body,0,.665,.085,.30,.065,.27,p.jacketLight);
    soft(body,0,.47,-.223,.018,.34,.015,p.cream);
    soft(body,0,.57,-.24,.041,.06,.021,p.gold);
    // Small sewn emblem, visible on the sleeve and rear pack at gameplay scale.
    soft(body,-.19,.47,-.212,.105,.09,.029,p.cream);
    soft(body,-.19,.47,-.23,.043,.015,.016,p.jacketShade,0,0,-.5);

    const low=pose.low,packZ=.315-low*.11,packDepth=.23-low*.10;
    soft(body,0,.355,packZ,.44,.51,packDepth,p.pack);
    soft(body,0,.53,packZ+packDepth*.43,.42,.145,.065,p.packLight);
    soft(body,0,.24,packZ+packDepth*.50,.32,.155,.045,p.packLight);
    soft(body,0,.325,packZ+packDepth*.60,.295,.015,.013,p.ink);
    soft(body,.09,.30,packZ+packDepth*.66,.018,.052,.015,p.gold,0,0,-.25);
    for(const side of [-1,1])soft(body,side*.175,.36,packZ+packDepth*.48,.018,.35,.012,'#b06d38');
    soft(body,0,.45,packZ+packDepth*.60,.15,.075,.02,p.cream);
    soft(body,0,.45,packZ+packDepth*.67,.06,.018,.008,p.jacketShade,0,0,-.45);

    // Neck and head have their own counter-rotation: the gaze stays ahead while
    // the torso leans into a turn, compresses on landing or folds into a slide.
    sphere(body,0,.715,-.015,.17,.17,.18,p.skinShade);
    const head=multiply(body,transform(0,.85,-.018,1,1,1,pose.headPitch,pose.headYaw));
    sphere(head,0,0,0,.455,.44,.415,p.skin);
    sphere(head,0,-.073,-.063,.36,.26,.31,p.skinLight);
    sphere(head,0,.10,.055,.445,.29,.34,p.hair);
    for(const side of [-1,1]){
      sphere(head,side*.215,-.005,.01,.075,.13,.09,p.skinShade);
      sphere(head,side*.212,.025,-.025,.045,.07,.04,p.skinLight);
      soft(head,side*.188,.061,-.10,.046,.17,.045,p.hair,0,0,side*.10);
      sphere(head,side*.085,.025,-.199,.09,.059,.026,p.cream);
      sphere(head,side*.086,.024,-.214,.040,.048,.018,p.ink);
      sphere(head,side*.078,.038,-.225,.012,.015,.009,'#ffffff',0,0,0,.25);
      soft(head,side*.084,.084,-.198,.10,.023,.025,p.hair,0,0,side*-.10);
      sphere(head,side*.134,-.058,-.17,.07,.035,.02,'#df9d80');
      // Headphone cushion, inset driver and contrasting outer shell.
      sphere(head,side*.241,.026,.032,.095,.20,.16,p.ink);
      sphere(head,side*.272,.028,.032,.045,.153,.12,p.gold);
      soft(head,side*.295,.028,.032,.012,.062,.057,p.cream);
    }
    sphere(head,0,-.034,-.219,.070,.093,.071,p.skinLight);
    soft(head,0,-.109,-.197,.091,.016,.020,'#9b6558');
    sphere(head,0,.187,.015,.475,.165,.45,p.gold);
    soft(head,0,.167,-.209,.44,.045,.24,p.gold,-.055);
    soft(head,0,.142,-.205,.425,.017,.22,'#c98737',-.055);
    soft(head,0,.219,-.178,.105,.065,.025,p.cream,-.2);
    soft(head,0,.222,-.195,.040,.016,.012,p.jacketShade,0,0,-.45);
    soft(head,0,.167,.226,.18,.049,.025,p.ink);
    for(const side of [-1,1])soft(head,side*.064,.167,.242,.018,.025,.008,p.gold);
    sphere(head,0,.274,.018,.053,.027,.048,'#ffd778');

    for(const arm of pose.arms){
      const {side,shoulder,elbow,hand}=arm;
      sphere(body,...shoulder,.235,.245,.26,p.jacket);
      segment(body,shoulder,elbow,.205,.225,p.jacket);
      sphere(body,...elbow,.188,.18,.198,p.jacketShade);
      segment(body,elbow,hand,.167,.185,p.jacket);
      const wrist=multiply(body,transform(...hand,1,1,1,arm.wrist,0,side*.12));
      soft(wrist,0,.015,0,.17,.075,.18,p.rib);
      sphere(wrist,0,-.065,-.007,.145,.155,.13,p.skin);
      sphere(wrist,side*-.064,-.046,-.046,.055,.094,.058,p.skinLight,0,0,side*.3);
      for(let finger=0;finger<3;finger++)soft(wrist,(finger-1)*.034,-.108,-.043,.025,.049,.036,p.skinLight,.25);
      if(side<0){soft(wrist,0,.028,-.093,.12,.05,.017,p.ink);soft(wrist,0,.028,-.106,.059,.029,.009,'#91dfe4',0,0,0,.35);}
    }

    for(const foot of pose.feet){
      const side=foot.side,hip=[pose.hip[0]+side*.163,pose.hip[1]-.06,pose.hip[2]+.015],ankle=[...foot.target];
      // Rotate around the ankle, then lift the sole just enough to keep the
      // planted shoe tangent to its support (including incline and toe-off).
      const slope=Math.tan(foot.surface.pitch),a=foot.pitch;
      const along=-Math.sin(a)+slope*Math.cos(a);
      const supportOffset=.106*(Math.cos(a)+slope*Math.sin(a))-Math.min(along*-.29,along*.19);
      ankle[1]+=Math.max(0,supportOffset-.105);
      const pole=low>.5?(e.board>0?[side, .35, 0]:[0,1,-.15]):[0,0,-1];
      const ik=solveLimb(hip,ankle,.45,.445,pole);
      segment(root,hip,ik.knee,.235,.255,p.pants);
      sphere(root,...ik.knee,.218,.20,.23,p.pantsShade);
      segment(root,ik.knee,ik.ankle,.187,.205,p.pantsShade);
      const shin=boneFrame(ik.knee,ik.ankle),cuff=multiply(root,multiply(shin.matrix,transform(0,shin.length*.42,0)));
      soft(cuff,0,0,0,.195,.072,.211,p.stitch);
      const shoe=multiply(root,transform(...ik.ankle,1,1,1,foot.pitch,side*.045));
      const shoeColor=e.sneakers>0?'#99ed78':p.gold;
      soft(shoe,0,-.061,-.057,.285,.072,.46,p.cream);
      soft(shoe,0,-.095,-.057,.278,.022,.454,p.ink);
      soft(shoe,0,.011,-.054,.267,.135,.426,shoeColor);
      sphere(shoe,0,-.001,-.164,.257,.135,.22,shoeColor);
      soft(shoe,0,.034,.10,.244,.14,.10,p.jacketShade);
      soft(shoe,0,.08,-.012,.133,.055,.23,p.cream,-.12);
      for(let lace=0;lace<3;lace++)soft(shoe,0,.108,-.085+lace*.05,.155,.013,.017,p.cream,0,0,lace%2?.08:-.08);
      for(const stripe of [-1,1])soft(shoe,side*.134,.022,-.075+stripe*.047,.012,.052,.014,p.cream,side*.2,0,.3);
      if(e.sneakers>0)soft(shoe,0,-.045,-.07,.292,.022,.42,'#d8ffc4',0,0,0,.8);
    }

    if(e.jetpack>0){
      for(const side of [-1,1]){
        soft(body,side*.25,.34,.42,.24,.62,.27,'#629fe4');
        sphere(body,side*.25,.64,.42,.23,.18,.26,'#a6d7ed');
        soft(body,side*.25,.08,.42,.22,.09,.24,p.ink);
        const flame=.26+(reduceMotion?0:Math.sin(pose.time*37+side)*.055);
        sphere(body,side*.25,-flame*.5+.02,.42,.13,flame,.13,'#b8f2ff',0,0,0,1);
        sphere(body,side*.25,-flame+.01,.42,.064,.15,.064,'#ffe5aa',0,0,0,1);
      }
    }
    return pose;
  }
}
