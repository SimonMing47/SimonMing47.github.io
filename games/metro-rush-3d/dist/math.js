export function multiply(a,b){
  const out = new Float32Array(16);
  for(let c=0;c<4;c++) for(let r=0;r<4;r++) out[c*4+r]=a[r]*b[c*4]+a[4+r]*b[c*4+1]+a[8+r]*b[c*4+2]+a[12+r]*b[c*4+3];
  return out;
}
export function transform(x=0,y=0,z=0,sx=1,sy=1,sz=1,rx=0,ry=0,rz=0){
  const a=Math.cos(rx),b=Math.sin(rx),c=Math.cos(ry),d=Math.sin(ry),e=Math.cos(rz),f=Math.sin(rz);
  return new Float32Array([c*e*sx,c*f*sx,-d*sx,0,(b*d*e-a*f)*sy,(b*d*f+a*e)*sy,b*c*sy,0,(a*d*e+b*f)*sz,(a*d*f-b*e)*sz,a*c*sz,0,x,y,z,1]);
}
