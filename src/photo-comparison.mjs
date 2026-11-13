// SNAPIC Phase 04: conservative, explainable image-signal comparison.
// Measurements alone cannot prove two images show the same scene.
export function compareTechnicalSignals(a,b){
 if(!a?.analyzed||!b?.analyzed)return {comparable:false,reason:'Missing technical evidence'};
 const keys=['meanLuma','contrastStdDev','highlightClipFraction','shadowClipFraction','detailEnergy'];
 if(keys.some(k=>!Number.isFinite(a[k])||!Number.isFinite(b[k])))return {comparable:false,reason:'Incomplete measurements'};
 const brightnessDelta=Math.abs(a.meanLuma-b.meanLuma);
 const contrastDelta=Math.abs(a.contrastStdDev-b.contrastStdDev);
 const clippingDelta=Math.abs(a.highlightClipFraction-b.highlightClipFraction)+Math.abs(a.shadowClipFraction-b.shadowClipFraction);
 const detailRatio=(a.detailEnergy+1)/(b.detailEnergy+1);
 return {comparable:true,brightnessDelta,contrastDelta,clippingDelta,detailRatio,
  reason:'Technical comparison only; not evidence of identical moments',
  sameScene:false,duplicate:false,automaticExclusion:false};
}
export function makeComparisonPairs(rows,maxPairs=5000){
 if(!Array.isArray(rows)||!Number.isSafeInteger(maxPairs)||maxPairs<0)throw new TypeError('Invalid comparison request');
 const pairs=[];
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){
  if(pairs.length>=maxPairs)return {pairs,truncated:true};
  if(rows[i].group==null||rows[i].group!==rows[j].group)continue;
  pairs.push({a:rows[i].id,b:rows[j].id,signals:compareTechnicalSignals(rows[i].localEvidence,rows[j].localEvidence)});
 }
 return {pairs,truncated:false};
}
