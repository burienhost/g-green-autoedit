// Regional appearance changes are only a warning of distinct moments, not face/expression recognition.
export function regionSignature(rgba,width,height,cols=4,rows=4){
 if(!rgba||rgba.length!==width*height*4||width<cols||height<rows)throw new RangeError('Invalid pixels');
 const cells=[];
 for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
  const x0=Math.floor(gx*width/cols),x1=Math.floor((gx+1)*width/cols);
  const y0=Math.floor(gy*height/rows),y1=Math.floor((gy+1)*height/rows);
  let rr=0,gg=0,bb=0,n=0;
  for(let y=y0;y<y1;y+=Math.max(1,Math.floor((y1-y0)/8)))for(let x=x0;x<x1;x+=Math.max(1,Math.floor((x1-x0)/8))){
   const k=(y*width+x)*4;rr+=rgba[k];gg+=rgba[k+1];bb+=rgba[k+2];n++;
  }
  cells.push([Math.round(rr/n),Math.round(gg/n),Math.round(bb/n)]);
 }
 return cells;
}
export function regionalChange(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length)return {available:false};
 let sum=0,max=0,changed=0;
 for(let i=0;i<a.length;i++){
  if(!Array.isArray(a[i])||!Array.isArray(b[i])||a[i].length!==3||b[i].length!==3)return {available:false};
  const d=(Math.abs(a[i][0]-b[i][0])+Math.abs(a[i][1]-b[i][1])+Math.abs(a[i][2]-b[i][2]))/(3*255);
  if(!Number.isFinite(d))return {available:false};
  sum+=d;max=Math.max(max,d);if(d>.16)changed++;
 }
 const average=sum/a.length;
 return {available:true,average:+average.toFixed(4),maximum:+max.toFixed(4),changedCells:changed,distinctMomentWarning:max>.22||changed>=Math.max(2,Math.ceil(a.length*.25)),reason:'Regional appearance change may indicate a different moment or subject; inspect manually'};
}
