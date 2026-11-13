// Browser-only visual-attention candidates. NOT a person/object/subject detector.
// Combines local contrast with neighboring color differences; no identity or model calls.
export function attentionCandidates(regions,spatial,{cols=4,rows=4,maxCandidates=3}={}){
 if(!Array.isArray(regions)||regions.length!==cols*rows||!regions.every(c=>Array.isArray(c)&&c.length===3&&c.every(Number.isFinite)))return {available:false,candidates:[],reason:'Regional pixels unavailable'};
 const at=(x,y)=>regions[y*cols+x],scores=[];
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const rgb=at(x,y);let contrast=0,n=0;
  for(const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]){
   const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=cols||yy>=rows)continue;
   const other=at(xx,yy);
   contrast+=(Math.abs(rgb[0]-other[0])+Math.abs(rgb[1]-other[1])+Math.abs(rgb[2]-other[2]))/(3*255);n++;
  }
  const localContrast=n?contrast/n:0;
  const saturation=(Math.max(...rgb)-Math.min(...rgb))/255;
  // No center bias: off-center subjects should not be penalized.
  scores.push({x,y,score:+(.8*localContrast+.2*saturation).toFixed(4)});
 }
 scores.sort((a,b)=>b.score-a.score||a.y-b.y||a.x-b.x);
 const candidates=[];
 for(const cell of scores){
  if(cell.score<.055)break;
  if(candidates.some(c=>Math.abs(c.cellX-cell.x)+Math.abs(c.cellY-cell.y)<2))continue;
  candidates.push({cellX:cell.x,cellY:cell.y,x:+((cell.x+.5)/cols).toFixed(3),y:+((cell.y+.5)/rows).toFixed(3),score:cell.score,reason:'Visually distinctive region, not verified subject'});
  if(candidates.length>=maxCandidates)break;
 }
 return {available:true,candidates,ambiguous:candidates.length!==1||scores[0]?.score<.12,reason:'Color-contrast attention candidates; cannot identify people, objects, expressions or focus'};
}
