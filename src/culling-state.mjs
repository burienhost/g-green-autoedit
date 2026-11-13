// SNAPIC Phase 01: standalone, unintegrated recommendation and selection engine.
export const RECOMMENDATIONS = Object.freeze(['keep','review','exclude']);
export function recommend(evidence = {}, mode = 'balanced') {
 const {analyzed=false,unique=false,severeDefect=false,defectConfidence=0,quality=null,burstInferior=false,burstConfidence=0}=evidence;
 if(!analyzed)return {status:'review',reason:'Analysis unavailable',confidence:0};
 if(unique)return {status:'review',reason:'Unique moment requires photographer review',confidence:1};
 const limits={conservative:.97,balanced:.92,aggressive:.85},limit=limits[mode]??limits.balanced;
 if(severeDefect&&defectConfidence>=limit)return {status:'exclude',reason:'High-confidence technical defect',confidence:defectConfidence};
 if(burstInferior&&burstConfidence>=limit)return {status:'exclude',reason:'Lower-ranked confirmed burst alternative',confidence:burstConfidence};
 if(quality==='strong'&&!severeDefect&&!burstInferior)return {status:'keep',reason:'Strong technical evidence',confidence:.8};
 if(quality==='screened'&&!severeDefect&&!burstInferior)return {status:'keep',reason:'No obvious issue in preliminary technical screen; photographer verification advised',confidence:.35};
 return {status:'review',reason:'Insufficient evidence for a decisive recommendation',confidence:Math.max(defectConfidence,burstConfidence)};
}
export function makeRow(id,evidence={}){return {id,evidence,recommendation:recommend(evidence),selected:true,override:null};}
export function setSelection(rows,ids,selected){
 const chosen=new Set(ids),changes=[];
 const next=rows.map(row=>{if(!chosen.has(row.id))return row;changes.push({id:row.id,before:{selected:row.selected,override:row.override},after:{selected,override:selected?'include':'exclude'}});return {...row,selected,override:selected?'include':'exclude'};});
 return {rows:next,transaction:changes};
}
export function undo(rows,transaction){const prior=new Map(transaction.map(x=>[x.id,x.before]));return rows.map(row=>prior.has(row.id)?{...row,...prior.get(row.id)}:row);}
export function redo(rows,transaction){const after=new Map(transaction.map(x=>[x.id,x.after]));return rows.map(row=>after.has(row.id)?{...row,...after.get(row.id)}:row);}
export function recalculate(rows,mode){return rows.map(row=>({...row,recommendation:recommend(row.evidence,mode)}));}
export function filterRows(rows,view='all'){
 const match={all:()=>true,keep:r=>r.recommendation.status==='keep',review:r=>r.recommendation.status==='review',exclude:r=>r.recommendation.status==='exclude',selected:r=>r.selected,unselected:r=>!r.selected}[view];
 if(!match)throw new Error('Unknown filter: '+view);return rows.filter(match);
}
export function editorSelection(rows){return rows.filter(r=>r.selected).map(r=>r.id);}
