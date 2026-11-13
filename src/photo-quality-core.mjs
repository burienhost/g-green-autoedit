// Browser-local advisory measurements; never infer exclusion from uncalibrated signals.
export function measureRGBA(data,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<3||height<3||!data||data.length!==width*height*4)throw new RangeError('Invalid RGBA image');
 const n=width*height,luma=new Float32Array(n);let sum=0,sum2=0,bright=0,dark=0;
 for(let i=0;i<n;i++){const j=i*4,y=.2126*data[j]+.7152*data[j+1]+.0722*data[j+2];luma[i]=y;sum+=y;sum2+=y*y;if(y>=250)bright++;if(y<=5)dark++;}
 let lapSum=0,lapSq=0,count=0;
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){const i=y*width+x,v=4*luma[i]-luma[i-1]-luma[i+1]-luma[i-width]-luma[i+width];lapSum+=v;lapSq+=v*v;count++;}
 const mean=sum/n,lapMean=lapSum/count;
 return {analyzed:true,width,height,meanLuma:+mean.toFixed(2),contrastStdDev:+Math.sqrt(Math.max(0,sum2/n-mean*mean)).toFixed(2),highlightClipFraction:+(bright/n).toFixed(4),shadowClipFraction:+(dark/n).toFixed(4),detailEnergy:+Math.max(0,lapSq/count-lapMean*lapMean).toFixed(2),quality:'uncertain',severeDefect:false,defectConfidence:0,unique:false,source:'local-pixel-screening-v1'};
}
export function reviewFallback(reason='Analysis unavailable'){return {analyzed:false,reason,quality:'uncertain',severeDefect:false,defectConfidence:0};}
