// Bounded higher-resolution face crops for photographer review, not biometric recognition.
// Only compact numeric measurements leave this function; no crop pixels are retained.
import {measureRGBA} from './photo-quality-core.mjs';
export function faceCropDetail(bitmap,faces,{maxFaces=6,side=384}={}){
 if(!faces?.available||!Array.isArray(faces.boxes)||!bitmap?.width||!bitmap?.height||typeof OffscreenCanvas==='undefined')return {available:false,regions:[]};
 const regions=[];
 const canvas=new OffscreenCanvas(side,side),ctx=canvas.getContext('2d',{willReadFrequently:true});
 if(!ctx)return {available:false,regions:[]};
 for(const box of faces.boxes.slice(0,maxFaces)){
  if(!box||![box.x,box.y,box.w,box.h].every(Number.isFinite))continue;
  const sx=Math.max(0,Math.floor(box.x*bitmap.width)),sy=Math.max(0,Math.floor(box.y*bitmap.height));
  const sw=Math.min(bitmap.width-sx,Math.ceil(box.w*bitmap.width)),sh=Math.min(bitmap.height-sy,Math.ceil(box.h*bitmap.height));
  if(sw<48||sh<48||sw*sh<2304){regions.push({assessable:false,reason:'Detected region too small in source image'});continue;}
  try{
   ctx.clearRect(0,0,side,side);
   // Fit source crop without stretching its aspect ratio.
   const scale=Math.min(side/sw,side/sh,1),dw=Math.max(3,Math.floor(sw*scale)),dh=Math.max(3,Math.floor(sh*scale));
   ctx.drawImage(bitmap,sx,sy,sw,sh,0,0,dw,dh);
   const rgba=ctx.getImageData(0,0,dw,dh).data;
   const m=measureRGBA(rgba,dw,dh);
   regions.push({assessable:true,sourceWidth:sw,sourceHeight:sh,detailEnergy:m.detailEnergy,contrastStdDev:m.contrastStdDev,meanLuma:m.meanLuma,reason:'Higher-resolution face crop texture; not eye focus or expression detection'});
  }catch(e){regions.push({assessable:false,reason:'Crop measurement unavailable'});}
 }
 return {available:regions.some(r=>r.assessable),regions,reason:'Local source-resolution face crops; no images transmitted or retained'};
}
