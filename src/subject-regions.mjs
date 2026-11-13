// Localized face-region exposure measurements; no identity, emotion or biometric storage.
// Uses the same reduced-resolution RGBA pixels already decoded by the analysis worker.
export function subjectRegions(rgba,width,height,faces,maxFaces=12){
 if(!rgba||rgba.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||width<3||height<3||!faces?.available||!Array.isArray(faces.boxes))return {available:false,subjects:[]};
 const subjects=[];
 for(const box of faces.boxes.slice(0,maxFaces)){
  if(!box||![box.x,box.y,box.w,box.h].every(Number.isFinite))continue;
  const x0=Math.max(0,Math.floor(box.x*width)),y0=Math.max(0,Math.floor(box.y*height));
  const x1=Math.min(width,Math.ceil((box.x+box.w)*width)),y1=Math.min(height,Math.ceil((box.y+box.h)*height));
  if(x1-x0<3||y1-y0<3)continue;
  let sum=0,dark=0,bright=0,n=0;
  const stride=Math.max(1,Math.floor(Math.max(x1-x0,y1-y0)/64));
  for(let y=y0;y<y1;y+=stride)for(let x=x0;x<x1;x+=stride){
   const i=(y*width+x)*4,v=.2126*rgba[i]+.7152*rgba[i+1]+.0722*rgba[i+2];
   sum+=v;if(v<12)dark++;if(v>245)bright++;n++;
  }
  if(n)subjects.push({meanLuma:+(sum/n).toFixed(1),shadowFraction:+(dark/n).toFixed(3),highlightFraction:+(bright/n).toFixed(3),box});
 }
 return {available:subjects.length>0,subjects,reason:'Face-area exposure only; not focus, expression, identity or aesthetic quality'};
}
