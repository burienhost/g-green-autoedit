import test from 'node:test';import assert from 'node:assert/strict';import {technicalScore,rankCandidatePair} from '../src/photo-ranking.mjs';
const base={analyzed:true,detailEnergy:3000,contrastStdDev:40,highlightClipFraction:.01,shadowClipFraction:.02};
test('no evidence cannot be ranked',()=>assert.equal(technicalScore(null).available,false));
test('score is bounded',()=>{for(const d of [0,100,1e9]){const s=technicalScore({...base,detailEnergy:d}).score;assert.ok(s>=0&&s<=100)}});
test('more clipping reduces technical score',()=>assert.ok(technicalScore(base).score>technicalScore({...base,highlightClipFraction:.7}).score));
test('higher detail raises technical score with other evidence fixed',()=>assert.ok(technicalScore({...base,detailEnergy:9000}).score>technicalScore({...base,detailEnergy:10}).score));
test('identical scores are inconclusive',()=>assert.equal(rankCandidatePair(base,base).preferred,null));
test('technical winner never automatically excludes',()=>{const r=rankCandidatePair({...base,detailEnergy:10000},{...base,detailEnergy:1});assert.equal(r.preferred,'a');assert.equal(r.automaticExclusion,false)});
test('unmeasured image blocks ranking',()=>assert.equal(rankCandidatePair(base,null).ranked,false));
