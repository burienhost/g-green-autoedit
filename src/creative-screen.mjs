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
 if(e.attention?.available){
  const a=e.attention;
  if(a.candidates.length){
   const positions=a.candidates.map(c=>'('+Math.round(c.x*100)+'% across, '+Math.round(c.y*100)+'% down)').join(', ');
   context.push('Visual-attention candidates at '+positions+'; these are not verified subjects');
  }else context.push('No distinct visual-attention region found; subject location unknown');
 }
 if(e.spatialDetail?.available){
  const d=e.spatialDetail;
  if(d.centerLowRelative)context.push('Central region has much less fine detail than another region; inspect focus placement if your subject is centered');
  else context.push('Spatial detail map measured across nine image regions; subject location remains unknown');
 }
 if(e.faceCropDetail?.available){
  const crops=e.faceCropDetail.regions.filter(x=>x.assessable);
  const lowTexture=crops.filter(x=>x.detailEnergy<12&&x.contrastStdDev<28);
  if(lowTexture.length)flags.push(lowTexture.length+' higher-resolution face crop(s) show low detail and contrast; inspect at 100% before culling');
  else context.push('Higher-resolution face crops measured; focus and expression still require photographer verification');
 }
 if(e.subjects?.available){
  const subjects=e.subjects.subjects;
  const shadowed=subjects.filter(x=>x.meanLuma<55||x.shadowFraction>.3).length;
  const clipped=subjects.filter(x=>x.meanLuma>215||x.highlightFraction>.3).length;
  if(shadowed)flags.push(shadowed+' detected face region(s) appear dark; inspect subject visibility');
  if(clipped)flags.push(clipped+' detected face region(s) appear bright; inspect facial highlight detail');
  if(!shadowed&&!clipped)context.push('Detected face regions have no obvious exposure warning at preview resolution');
  // Relative texture difference prompts inspection; it does not prove the subject is out of focus.
  const assessable=subjects.filter(x=>Number.isFinite(x.detailEnergy));
  const lowRelative=assessable.filter(x=>Number.isFinite(e.detailEnergy)&&e.detailEnergy>=80&&x.detailEnergy<e.detailEnergy*.12&&x.detailEnergy<30);
  if(lowRelative.length)flags.push(lowRelative.length+' detected face region(s) have much less preview texture than the overall image; inspect subject sharpness');
  if(subjects.length&&!assessable.length)context.push('Face regions too small for meaningful preview texture comparison');
  if(assessable.length&&!lowRelative.length)context.push('Face-region texture measured; eye sharpness and focus remain unverified');
 }else if(e.faces?.available&&e.faces.count>0)context.push('Faces detected but local subject exposure unavailable; inspect manually');
 return {status:flags.length?'review':'keep',flags,context,confidence:flags.length?0:.35,automaticExclusion:false};
}
