// SNAPIC Phase 04: local candidate retrieval, never a definitive duplicate detector.
// A small grayscale grid is used only to propose photographer comparisons.
export function perceptualGrid(rgba,width,height,side=8){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<side||height<side||!Number.isInteger(side)||side<2||side>16||!rgba||rgba.length!==width*height*4)throw new RangeError('Invalid grid input');
 const grid=new Float32Array(side*side);
 for(let gy=0;gy<side;gy++)for(let gx=0;gx<side;gx++){
  const x=Math.min(width-1,Math.floor((gx+.5)*width/side)),y=Math.min(height-1,Math.floor((gy+.5)*height/side)),p=(y*width+x)*4;
  grid[gy*side+gx]=.2126*rgba[p]+.7152*rgba[p+1]+.0722*rgba[p+2];
 }
 return Array.from(grid);
}
export function gridDistance(a,b){
 if(!Array.isArray(a)||!Array.isArray(b)||a.length!==b.length||!a.length||a.some(x=>!Number.isFinite(x))||b.some(x=>!Number.isFinite(x)))throw new TypeError('Incompatible grids');
 // Mean-centering helps modest global exposure differences.
 const ma=a.reduce((s,v)=>s+v,0)/a.length,mb=b.reduce((s,v)=>s+v,0)/b.length;
 let sum=0;for(let i=0;i<a.length;i++)sum+=Math.abs((a[i]-ma)-(b[i]-mb));
 return sum/(a.length*255);
}
export function candidatePairs(rows,{threshold=.045,maxPairs=2000,window=30}={}){
 if(!Array.isArray(rows)||!Number.isFinite(threshold)||threshold<0||threshold>1||!Number.isSafeInteger(maxPairs)||maxPairs<0||!Number.isSafeInteger(window)||window<1)throw new TypeError('Invalid candidate settings');
 const pairs=[];let examined=0;
 for(let i=0;i<rows.length;i++){
  if(!Array.isArray(rows[i]?.grid))continue;
  for(let j=i+1;j<Math.min(rows.length,i+window+1);j++){
   if(!Array.isArray(rows[j]?.grid))continue;
   let distance;try{distance=gridDistance(rows[i].grid,rows[j].grid)}catch{continue}
   examined++;
   if(distance<=threshold){if(pairs.length>=maxPairs)return {pairs,examined,truncated:true};pairs.push({a:rows[i].id,b:rows[j].id,distance,confirmed:false,automaticExclusion:false,reason:'Visual similarity candidate; inspect subjects and moment'})}
  }
 }
 return {pairs,examined,truncated:false};
}
