// Browser-independent spatial detail distribution. This is not subject or focus detection.
export function spatialDetail(rgba,width,height,cols=3,rows=3){
 if(!rgba||rgba.length!==width*height*4||!Number.isInteger(width)||!Number.isInteger(height)||width<cols*8||height<rows*8) return {available:false,cells:[]};
 const lum=(x,y)=>{const k=(y*width+x)*4;return .2126*rgba[k]+.7152*rgba[k+1]+.0722*rgba[k+2]};
 const cells=[];
 for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
  const x0=Math.floor(gx*width/cols),x1=Math.floor((gx+1)*width/cols);
  const y0=Math.floor(gy*height/rows),y1=Math.floor((gy+1)*height/rows);
  let sum=0,sq=0,n=0;
  const step=Math.max(1,Math.floor(Math.max(x1-x0,y1-y0)/64));
  for(let y=y0+1;y<y1-1;y+=step)for(let x=x0+1;x<x1-1;x+=step){
   const v=4*lum(x,y)-lum(x-1,y)-lum(x+1,y)-lum(x,y-1)-lum(x,y+1);
   sum+=v;sq+=v*v;n++;
  }
  cells.push(n>=16?+(Math.max(0,sq/n-(sum/n)**2)).toFixed(2):null);
 }
 const valid=cells.filter(Number.isFinite);
 if(valid.length!==cols*rows)return {available:false,cells};
 const center=cells[Math.floor(rows/2)*cols+Math.floor(cols/2)];
 const periphery=cells.filter((_,i)=>i!==Math.floor(rows/2)*cols+Math.floor(cols/2));
 const strongest=Math.max(...cells);
 const centerLowRelative=strongest>=100&&center<strongest*.08&&center<25;
 return {available:true,cols,rows,cells,center,peripheryMean:+(periphery.reduce((a,b)=>a+b,0)/periphery.length).toFixed(2),strongest,centerLowRelative,reason:'Spatial texture map only; center is not necessarily the subject'};
}
