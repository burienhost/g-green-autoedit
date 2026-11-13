// Bounded source-image crops around visually distinctive regions.
// These are attention candidates, NOT verified subjects, eyes or focus targets.
import {measureRGBA} from './photo-quality-core.mjs';
export function attentionCropDetail(bitmap,attention,{side=256,maxCandidates=3}={}){
 if(!bitmap?.width||!bitmap?.height||!attention?.available||!Array.isArray(attention.candidates)||typeof OffscreenCanvas==='undefined')return {available:false,regions:[]};
 const regions=[],canvas=new OffscreenCanvas(side,side),ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)return {available:false,regions:[]};
 for(const candidate of attention.candidates.slice(0,maxCandidates)){
  if(!Number.isFinite(candidate.x)||!Number.isFinite(candidate.y))continue;
  // Crop 1/4 of the image width/height, bounded to the source.
  const sw=Math.max(1,Math.min(bitmap.width,Math.round(bitmap.width*.25)));
  const sh=Math.max(1,Math.min(bitmap.height,Math.round(bitmap.height*.25)));
  const sx=Math.max(0,Math.min(bitmap.width-sw,Math.round(candidate.x*bitmap.width-sw/2)));
  const sy=Math.max(0,Math.min(bitmap.height-sh,Math.round(candidate.y*bitmap.height-sh/2)));
  if(sw<32||sh<32){regions.push({assessable:false,reason:'Source crop too small'});continue;}
  try{
   ctx.clearRect(0,0,side,side);
   const scale=Math.min(1,side/sw,side/sh),w=Math.max(3,Math.floor(sw*scale)),h=Math.max(3,Math.floor(sh*scale));
   ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,w,h);
   const m=measureRGBA(ctx.getImageData(0,0,w,h).data,w,h);
   regions.push({assessable:true,x:candidate.x,y:candidate.y,sourceWidth:sw,sourceHeight:sh,detailEnergy:m.detailEnergy,contrastStdDev:m.contrastStdDev,meanLuma:m.meanLuma,reason:'Source-region texture and exposure only; subject and focus unknown'});
  }catch(e){regions.push({assessable:false,reason:'Crop analysis unavailable'});}
 }
 return {available:regions.some(r=>r.assessable),regions,reason:'Bounded local source crops; no image pixels uploaded or retained'};
}
