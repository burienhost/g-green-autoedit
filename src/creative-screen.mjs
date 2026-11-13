// Explainable, conservative photographic screening. Creative intent cannot be inferred from pixels.
export function screenPhoto(e={}){
 if(!e.analyzed)return {status:'review',flags:['Image analysis unavailable'],context:[]};
 const flags=[],context=[];
 const regions=Array.isArray(e.regions)?e.regions:[];
 const luma=regions.filter(c=>Array.isArray(c)&&c.length===3).map(c=>.2126*c[0]+.7152*c[1]+.0722*c[2]);
 const darkRegions=luma.filter(x=>x<45).length,brightRegions=luma.filter(x=>x>210).length;
 const localizedDark=luma.length>0&&darkRegions>0&&darkRegions<luma.length*.75;
 const localizedBright=luma.length>0&&brightRegions>0&&brightRegions<luma.length*.75;
 if(e.meanLuma<35)flags.push('Low-key exposure: check subject visibility');
 if(e.meanLuma>220)flags.push('High-key exposure: check highlight detail');
 if(e.shadowClipFraction>.35)flags.push('Large shadow areas: check intentional silhouette versus lost detail');
 if(e.highlightClipFraction>.35)flags.push('Large bright areas: check lighting intent versus lost detail');
 if(e.contrastStdDev<12)flags.push('Low overall contrast: check atmosphere versus haze');
 if(e.detailEnergy<8)flags.push('Low measured detail: check focus and intentional blur');
 if(localizedDark)context.push('Mixed dark and lit regions; preserve creative low-key scenes');
 if(localizedBright)context.push('Mixed bright and shaded regions; preserve backlit scenes');
 if(e.subjects?.available){
  const subjects=e.subjects.subjects;
  const shadowed=subjects.filter(x=>x.meanLuma<55||x.shadowFraction>.3).length;
  const clipped=subjects.filter(x=>x.meanLuma>215||x.highlightFraction>.3).length;
  if(shadowed)flags.push(shadowed+' detected face region(s) appear dark; inspect subject visibility');
  if(clipped)flags.push(clipped+' detected face region(s) appear bright; inspect facial highlight detail');
  if(!shadowed&&!clipped)context.push('Detected face regions have no obvious exposure warning at preview resolution');
 }else if(e.faces?.available&&e.faces.count>0)context.push('Faces detected but local subject exposure unavailable; inspect manually');
 return {status:flags.length?'review':'keep',flags,context,confidence:flags.length?0:.35,automaticExclusion:false};
}
