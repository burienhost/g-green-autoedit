// Phase 01 bridge for the legacy culling rows. No DOM or billing dependencies.
import {recommend,filterRows,setSelection,undo,recalculate} from './culling-state.mjs';
export function evidenceFromLegacy(row){
 const m=row.metrics,issues=row.defects||[];
 if(!m)return {analyzed:false};
 // Legacy 192px measurements are not calibrated to support confident exclusions.
 // In particular, similarity is never proof of a duplicate.
 return {analyzed:true,quality:issues.length?'uncertain':'strong',severeDefect:false,defectConfidence:0,unique:false};
}
export function hydrateLegacy(rows,mode='balanced'){
 return rows.map((row,index)=>({...row,id:index,evidence:evidenceFromLegacy(row),recommendation:recommend(evidenceFromLegacy(row),mode),selected:!!row.keep,override:row.manualKeep?(row.keep?'include':'exclude'):null}));
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
