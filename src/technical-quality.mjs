// Phase 1: explainable technical quality screening from existing local pixel evidence.
// These are screening decisions, not calibrated probabilities of an unusable photograph.
// A single low-key, high-key, minimalist or motion-blurred frame may be intentional.
export function assessTechnicalQuality(e={}){
 if(!e.analyzed||!['meanLuma','contrastStdDev','detailEnergy','highlightClipFraction','shadowClipFraction'].every(k=>Number.isFinite(e[k])))
  return {status:'review',severity:'unknown',flags:['Image measurements unavailable'],summary:'Technical quality could not be assessed',score:null};
 const flags=[],severe=[];
 const clippedHigh=e.highlightClipFraction>=.85;
 const clippedLow=e.shadowClipFraction>=.85;
 const flat=e.contrastStdDev<7;
 const noDetail=e.detailEnergy<3;
 if(clippedHigh)severe.push('Almost entirely clipped highlights');
 if(clippedLow)severe.push('Almost entirely clipped shadows');
 if(noDetail&&flat)severe.push('Very little visible image detail or tonal separation');
 if(e.meanLuma<35&&!clippedLow)flags.push('Very dark overall exposure');
 if(e.meanLuma>220&&!clippedHigh)flags.push('Very bright overall exposure');
 if(e.highlightClipFraction>.35&&!clippedHigh)flags.push('Large clipped highlight areas');
 if(e.shadowClipFraction>.35&&!clippedLow)flags.push('Large clipped shadow areas');
 if(e.detailEnergy<8&&!noDetail)flags.push('Low measured fine detail');
 if(e.contrastStdDev<12&&!flat)flags.push('Low overall contrast');
 // Technical scores are comparative, not a calibrated probability or aesthetic grade.
 const detail=Math.min(1,Math.log1p(Math.max(0,e.detailEnergy))/Math.log1p(20000));
 const contrast=Math.min(1,Math.max(0,e.contrastStdDev)/75);
 const clipping=Math.min(1,Math.max(0,e.highlightClipFraction+e.shadowClipFraction));
 const score=+Math.max(0,Math.min(100,100*(.6*detail+.4*contrast-.35*clipping))).toFixed(1);
 const issues=[...severe,...flags];
 return {status:issues.length?'review':'keep',severity:severe.length?'strong-warning':flags.length?'warning':'none',
  flags:issues,summary:severe.length?'Possible severe technical issue — inspect before excluding':flags.length?'Technical quality needs photographer review':'No obvious technical defect detected',
  score,automaticExclusion:false};
}
