import {measureRGBA,reviewFallback} from './photo-quality-core.mjs';
import {perceptualGrid} from './scene-candidates.mjs';
import {regionSignature} from './moment-signals.mjs';
import {facePresence} from './face-presence.mjs';
import {subjectRegions} from './subject-regions.mjs';
import {faceCropDetail} from './face-crop-detail.mjs';
import {spatialDetail} from './spatial-detail.mjs';
const MAX_SIDE=256;
self.onmessage=async ({data})=>{
 if(!data||data.type!=='analyze-photo'||typeof data.jobId!=='string')return;
 const {jobId,index,file}=data;let bitmap;
 try{
  if(!(file instanceof Blob))throw new TypeError('Expected image File or Blob');
  bitmap=await createImageBitmap(file);
  const scale=Math.min(1,MAX_SIDE/Math.max(bitmap.width,bitmap.height));
  const width=Math.max(3,Math.round(bitmap.width*scale)),height=Math.max(3,Math.round(bitmap.height*scale));
  const canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d',{willReadFrequently:true});
  if(!ctx)throw Error('Canvas unavailable');
  ctx.drawImage(bitmap,0,0,width,height);
  const pixels=ctx.getImageData(0,0,width,height).data;
  const evidence=measureRGBA(pixels,width,height);
  evidence.grid=perceptualGrid(pixels,width,height);
  evidence.regions=regionSignature(pixels,width,height);
  evidence.spatialDetail=spatialDetail(pixels,width,height);
  // Optional subject analysis must never erase successfully measured image evidence.
  // Native face detection is not consistently implemented across browser workers.
  try{
   evidence.faces=await facePresence(bitmap);
  }catch(e){evidence.faces={available:false,reason:'Optional face analysis failed'};}
  try{
   evidence.subjects=subjectRegions(pixels,width,height,evidence.faces);
  }catch(e){evidence.subjects={available:false,subjects:[],reason:'Subject exposure unavailable'};}
  try{
   evidence.faceCropDetail=faceCropDetail(bitmap,evidence.faces);
  }catch(e){evidence.faceCropDetail={available:false,regions:[],reason:'Source crop analysis unavailable'};}
  self.postMessage({type:'photo-result',jobId,index,evidence});
 }catch(e){self.postMessage({type:'photo-result',jobId,index,evidence:reviewFallback(String(e?.message||e))});}
 finally{bitmap?.close();}
};
