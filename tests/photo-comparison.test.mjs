import test from 'node:test';import assert from 'node:assert/strict';import {compareTechnicalSignals,makeComparisonPairs} from '../src/photo-comparison.mjs';
const sample={analyzed:true,meanLuma:110,contrastStdDev:30,highlightClipFraction:.01,shadowClipFraction:.03,detailEnergy:150};
test('identical measurements are not proof of duplicate',()=>{const r=compareTechnicalSignals(sample,sample);assert.equal(r.comparable,true);assert.equal(r.duplicate,false);assert.equal(r.automaticExclusion,false);});
test('missing evidence produces safe comparison result',()=>assert.equal(compareTechnicalSignals(sample,null).comparable,false));
test('brightness difference is calculated correctly',()=>assert.equal(compareTechnicalSignals(sample,{...sample,meanLuma:130}).brightnessDelta,20));
test('pairs only compare matching preexisting groups',()=>{const rows=[{id:0,group:1,localEvidence:sample},{id:1,group:1,localEvidence:sample},{id:2,group:2,localEvidence:sample}];const r=makeComparisonPairs(rows);assert.equal(r.pairs.length,1);assert.deepEqual([r.pairs[0].a,r.pairs[0].b],[0,1]);});
test('pair count is bounded for large groups',()=>{const rows=Array.from({length:100},(_,id)=>({id,group:1,localEvidence:sample}));const r=makeComparisonPairs(rows,10);assert.equal(r.pairs.length,10);assert.equal(r.truncated,true);});
