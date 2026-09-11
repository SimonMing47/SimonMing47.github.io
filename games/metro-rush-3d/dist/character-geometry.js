// Reusable smooth meshes for the articulated runner. World meshes stay lightweight.
const normalize=v=>{const n=Math.hypot(...v)||1;return v.map(x=>x/n);};
function triangle(out,a,b,c){
  const u=b.p.map((v,i)=>v-a.p[i]),v=c.p.map((v,i)=>v-a.p[i]);
  const cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];
  if(cross.reduce((sum,x,i)=>sum+x*(a.n[i]+b.n[i]+c.n[i]),0)<0)[b,c]=[c,b];
  for(const point of [a,b,c])out.push(...point.p,...point.n);
}
export function roundedBoxGeometry(radius=.17){
  const out=[],edge=.5-radius,grid=[-.5,-.5+radius*.25,-.5+radius*.6,-edge,0,edge,.5-radius*.6,.5-radius*.25,.5];
  for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){
    const point=(u,v)=>{const raw=[0,0,0];raw[axis]=sign*.5;raw[(axis+1)%3]=u;raw[(axis+2)%3]=v;const core=raw.map(x=>Math.max(-edge,Math.min(edge,x))),n=normalize(raw.map((x,i)=>x-core[i]));return {p:core.map((x,i)=>x+n[i]*radius),n};};
    for(let j=0;j<grid.length-1;j++)for(let i=0;i<grid.length-1;i++){
      const a=point(grid[i],grid[j]),b=point(grid[i+1],grid[j]),c=point(grid[i+1],grid[j+1]),d=point(grid[i],grid[j+1]);triangle(out,a,b,c);triangle(out,a,c,d);
    }
  }return new Float32Array(out);
}
export function smoothSphereGeometry(sides=24,rings=16){
  const out=[],point=(u,v)=>{const n=[Math.cos(u)*Math.sin(v),Math.cos(v),Math.sin(u)*Math.sin(v)];return {p:n.map(x=>x*.5),n};};
  for(let j=0;j<rings;j++)for(let i=0;i<sides;i++){
    const a=point(i/sides*Math.PI*2,j/rings*Math.PI),b=point((i+1)/sides*Math.PI*2,j/rings*Math.PI),c=point((i+1)/sides*Math.PI*2,(j+1)/rings*Math.PI),d=point(i/sides*Math.PI*2,(j+1)/rings*Math.PI);triangle(out,a,b,c);triangle(out,a,c,d);
  }return new Float32Array(out);
}
export function torsoGeometry(){
  const out=[],profile=[[-.5,.40,.35],[-.45,.45,.40],[-.30,.47,.43],[0,.50,.46],[.27,.53,.45],[.41,.49,.39],[.50,.31,.31]],sides=24;
  const point=(j,i)=>{const [y,rx,rz]=profile[j],a=i/sides*Math.PI*2,lo=profile[Math.max(0,j-1)],hi=profile[Math.min(profile.length-1,j+1)],dy=hi[0]-lo[0],dx=(hi[1]-lo[1])/dy,dz=(hi[2]-lo[2])/dy;return {p:[rx*Math.cos(a),y,rz*Math.sin(a)],n:normalize([rz*Math.cos(a),-(dx*rz*Math.cos(a)**2+dz*rx*Math.sin(a)**2),rx*Math.sin(a)])};};
  for(let j=0;j<profile.length-1;j++)for(let i=0;i<sides;i++){const a=point(j,i),b=point(j,i+1),c=point(j+1,i+1),d=point(j+1,i);triangle(out,a,b,c);triangle(out,a,c,d);}
  for(const j of [0,profile.length-1])for(let i=0;i<sides;i++){const n=[0,j===0?-1:1,0],a={p:[0,profile[j][0],0],n},b={...point(j,i),n},c={...point(j,i+1),n};triangle(out,a,b,c);}
  return new Float32Array(out);
}
