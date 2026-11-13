import test from 'node:test';
import assert from 'node:assert/strict';
import {hydrateLegacy,syncLegacy,legacyFilter,legacyBulk,legacyUndo,legacyRecalculate} from '../src/legacy-culling-adapter.mjs';
test('all 240 uncalibrated legacy photos remain review-safe while selected',()=>{
 const old=Array.from({length:240},(_,i)=>({keep:true,manualKeep:false,metrics:i<103?null:{sharp:20},defects:[]}));
 const rows=hydrateLegacy(old);
 assert.equal(legacyFilter(rows,'review').length,240);
 assert.equal(legacyFilter(rows,'selected').length,240);
});
test('bulk override and undo survive recalculation',()=>{
 const old=[{keep:true,manualKeep:false,metrics:null,defects:[]},{keep:true,manualKeep:false,metrics:{sharp:20},defects:[]}];
 const initial=hydrateLegacy(old);
 const changed=legacyBulk(initial,[0,1],false);
 const recalculated=legacyRecalculate(changed.rows,'aggressive');
 assert.deepEqual(recalculated.map(x=>x.selected),[false,false]);
 assert.deepEqual(legacyUndo(recalculated,changed.transaction).map(x=>x.selected),[true,true]);
 assert.deepEqual(syncLegacy(old,changed.rows).map(x=>x.manualKeep),[true,true]);
});
test('legacy heuristic never fabricates exclusion confidence',()=>{
 const rows=hydrateLegacy([{keep:true,metrics:{sharp:0},defects:['possible softness']}],'aggressive');
 assert.equal(rows[0].recommendation.status,'review');
 assert.equal(legacyFilter(rows,'excluded').length,0);
});
test('adapter rejects out of sync state',()=>assert.throws(()=>syncLegacy([],hydrateLegacy([{keep:true,metrics:null}]))));
