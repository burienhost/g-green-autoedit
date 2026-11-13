// Phase 01 bridge for the legacy culling rows. No DOM or billing dependencies.
import {recommend,filterRows,setSelection,undo,recalculate} from './culling-state.mjs';
export function evidenceFromLegacy(row){
 const m=row.metrics,issues=row.defects||[],local=row.localEvidence;
 if(!m&&!local?.analyzed)return {analyzed:false};
 // These are screening thresholds, not calibrated defect probabilities.
 // Flag for review; never auto-exclude from editing.
 if(local?.analyzed){
  const flags=[];
  if(local.meanLuma<35)flags.push('very dark exposure');
  if(local.meanLuma>220)flags.push('very bright exposure');
  if(local.shadowClipFraction>.35)flags.push('extensive dark clipping');
  if(local.highlightClipFraction>.35)flags.push('extensive bright clipping');
  if(local.contrastStdDev<12)flags.push('very low contrast');
  if(local.detailEnergy<8)flags.push('possible low detail');
  return {analyzed:true,quality:flags.length?'uncertain':'screened',technicalReview:flags.length>0,reviewFlags:flags,severeDefect:false,defectConfidence:0,unique:false};
 }
 return {analyzed:true,quality:'uncertain',severeDefect:false,defectConfidence:0,unique:false,technicalReview:issues.length>0,reviewFlags:issues};
}
export function hydrateLegacy(rows,mode='balanced'){
 return rows.map((row,index)=>{
  const evidence=evidenceFromLegacy(row);
  let recommendation=recommend(evidence,mode);
  if(evidence.reviewFlags?.length)recommendation={status:'review',reason:'Technical screen: '+evidence.reviewFlags.join(', '),confidence:0};
  // A technically clean photograph can still contain a different person, expression,
  // or moment. Similarity groups require a human decision, not a silent keep verdict.
  else if(row.group||row.momentReview)recommendation={status:'review',reason:row.momentReview||'Possible burst: compare subjects and moments',confidence:0};
  if(row.protectedMoment)recommendation={status:'keep',reason:'Photographer-protected unique moment',confidence:1};
  return {...row,id:index,evidence,recommendation,selected:!!row.keep,override:row.manualKeep?(row.keep?'include':'exclude'):null};
 });
}
export function syncLegacy(source,view){
 if(source.length!==view.length)throw new Error('Culling row mismatch');
 return source.map((row,index)=>({...row,keep:view[index].selected,manualKeep:view[index].override!==null,status:view[index].recommendation.status,reason:view[index].recommendation.reason}));
}
export function legacyFilter(rows,filter){
 const mapped={all:'all',keepers:'keep',review:'review',excluded:'exclude',selected:'selected',unselected:'unselected'};
 if(filter==='duplicates')return rows.filter(r=>!!r.group);
 return filterRows(rows,mapped[filter]??filter);
}
export function legacyBulk(rows,ids,selected){return setSelection(rows,ids,selected);}
export function legacyUndo(rows,transaction){return undo(rows,transaction);}
export function legacyRecalculate(rows,mode){return recalculate(rows,mode);}
