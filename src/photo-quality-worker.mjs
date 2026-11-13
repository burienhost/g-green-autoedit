import {measureRGBA,reviewFallback} from './photo-quality-core.mjs';
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
  const evidence=measureRGBA(ctx.getImageData(0,0,width,height).data,width,height);
  self.postMessage({type:'photo-result',jobId,index,evidence});
 }catch(e){self.postMessage({type:'photo-result',jobId,index,evidence:reviewFallback(String(e?.message||e))});}
 finally{bitmap?.close();}
};
