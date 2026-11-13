import {measureRGBA,reviewFallback} from './photo-quality-core.mjs';
import {perceptualGrid} from './scene-candidates.mjs';
import {regionSignature} from './moment-signals.mjs';
import {facePresence} from './face-presence.mjs';
import {subjectRegions} from './subject-regions.mjs';
import {faceCropDetail} from './face-crop-detail.mjs';
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
  evidence.faces=await facePresence(bitmap);
  evidence.subjects=subjectRegions(pixels,width,height,evidence.faces);
  evidence.faceCropDetail=faceCropDetail(bitmap,evidence.faces);
  self.postMessage({type:'photo-result',jobId,index,evidence});
 }catch(e){self.postMessage({type:'photo-result',jobId,index,evidence:reviewFallback(String(e?.message||e))});}
 finally{bitmap?.close();}
};
