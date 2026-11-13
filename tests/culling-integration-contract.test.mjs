import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
import {hydrateLegacy,syncLegacy,legacyBulk,legacyUndo,legacyRecalculate} from '../src/legacy-culling-adapter.mjs';
import {rankCandidatePair} from '../src/photo-ranking.mjs';
import {candidatePairs} from '../src/scene-candidates.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const page=readFileSync(resolve(root,'index.html'),'utf8');
test('development page wires local worker into culling scan',()=>{
 assert.match(page,/new Worker\('\.\/src\/photo-quality-worker\.mjs'/);
 assert.match(page,/Promise\.all\(batch\.map\(\(p,slot\)=>cullLocalQuality\(p,slot\)/);
 assert.match(page,/await cullRefreshSimilarityCandidates\(\)/);
});
test('candidate review has navigation and ranking integration',()=>{
 assert.match(page,/function cullOpenCandidate\(index\)/);
 assert.match(page,/cullCandidateRanking\(a,b,index\)/);
 assert.match(page,/cullCandidateNext\.onclick/);
});
test('winner selection is one undo transaction and restores both overrides',()=>{
 const originals=[{keep:true,manualKeep:false,metrics:null},{keep:true,manualKeep:false,metrics:null}];
 const rows=hydrateLegacy(originals);
 const first=legacyBulk(rows,[0],true);
 const second=legacyBulk(first.rows,[1],false);
 const tx=[...first.transaction,...second.transaction];
 const restored=legacyUndo(second.rows,tx);
 assert.deepEqual(restored.map(r=>[r.selected,r.override]),[[true,null],[true,null]]);
 const synced=syncLegacy(originals,restored);
 assert.deepEqual(synced.map(r=>[r.keep,r.manualKeep]),[[true,false],[true,false]]);
});
test('recalculating never changes photographer selection',()=>{
 const rows=hydrateLegacy([{keep:false,manualKeep:true,metrics:null},{keep:true,manualKeep:false,metrics:null}]);
 const after=legacyRecalculate(rows,'aggressive');
 assert.deepEqual(after.map(r=>[r.selected,r.override]),rows.map(r=>[r.selected,r.override]));
});
test('technical ranking never authorizes exclusion of visually similar images',()=>{
 const evidence={analyzed:true,detailEnergy:400,contrastStdDev:30,highlightClipFraction:0,shadowClipFraction:0};
 const grid=Array(64).fill(50);
 const result=candidatePairs([{id:0,grid},{id:1,grid}]);
 assert.equal(result.pairs[0].automaticExclusion,false);
 assert.equal(rankCandidatePair(evidence,{...evidence,detailEnergy:9000}).automaticExclusion,false);
});
