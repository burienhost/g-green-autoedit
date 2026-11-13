// Advisory ranking only. A visual match is never proof that two photos capture the same moment.
export function technicalScore(e){
 if(!e?.analyzed)return {available:false,score:null,reason:'No image measurements'};
 const keys=['detailEnergy','contrastStdDev','highlightClipFraction','shadowClipFraction'];
 if(keys.some(k=>!Number.isFinite(e[k])))return {available:false,score:null,reason:'Incomplete image measurements'};
 const detail=Math.log1p(Math.max(0,e.detailEnergy))/Math.log1p(20000);
 const contrast=Math.min(1,Math.max(0,e.contrastStdDev)/75);
 const clipping=Math.min(1,Math.max(0,e.highlightClipFraction+e.shadowClipFraction));
 const score=Math.max(0,Math.min(100,100*(.6*Math.min(1,detail)+.4*contrast-.35*clipping)));
 return {available:true,score:+score.toFixed(1),reason:'Relative technical detail, contrast and clipping only; not composition, expression or moment'};
}
export function rankCandidatePair(a,b){
 const left=technicalScore(a),right=technicalScore(b);
 if(!left.available||!right.available)return {ranked:false,preferred:null,left,right,reason:'Both images require measurable evidence'};
 const gap=Math.abs(left.score-right.score);
 // Even large technical gaps must never cause automated exclusion.
 return {ranked:true,preferred:gap<8?null:(left.score>right.score?'a':'b'),left,right,gap:+gap.toFixed(1),automaticExclusion:false,reason:gap<8?'Technical scores too close to distinguish':'Technical preference only; photographer must verify the moment'};
}
