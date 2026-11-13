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
  // Variance of a local luminance Laplacian: texture indicator, NOT a validated focus score.
  // Ignore borders and tiny detections where a 256px preview cannot support an assessment.
  let edgeSum=0,edgeSq=0,edgeN=0;
  if(x1-x0>=16&&y1-y0>=16){
   const lum=(x,y)=>{const k=(y*width+x)*4;return .2126*rgba[k]+.7152*rgba[k+1]+.0722*rgba[k+2]};
   for(let y=y0+1;y<y1-1;y+=stride)for(let x=x0+1;x<x1-1;x+=stride){
    const lap=4*lum(x,y)-lum(x-1,y)-lum(x+1,y)-lum(x,y-1)-lum(x,y+1);
    edgeSum+=lap;edgeSq+=lap*lap;edgeN++;
   }
  }
  const detailEnergy=edgeN>=32?+(Math.max(0,edgeSq/edgeN-(edgeSum/edgeN)**2)).toFixed(2):null;
  if(n)subjects.push({meanLuma:+(sum/n).toFixed(1),shadowFraction:+(dark/n).toFixed(3),highlightFraction:+(bright/n).toFixed(3),detailEnergy,box});
 }
 return {available:subjects.length>0,subjects,reason:'Face-area exposure and preview texture only; not validated focus, eye sharpness, expression or identity'};
}
