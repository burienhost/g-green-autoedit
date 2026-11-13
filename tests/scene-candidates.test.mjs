import test from 'node:test';import assert from 'node:assert/strict';import {perceptualGrid,gridDistance,candidatePairs} from '../src/scene-candidates.mjs';
function frame(n,fn){const rgba=new Uint8ClampedArray(n*n*4);for(let y=0;y<n;y++)for(let x=0;x<n;x++){const p=(y*n+x)*4,v=fn(x,y);rgba.set([v,v,v,255],p);}return rgba;}
test('grid extracts image luminance',()=>{const g=perceptualGrid(frame(8,(x)=>x*20),8,8);assert.equal(g.length,64);assert.equal(g[0],0);assert.equal(g[7],140)});
test('equal visual grids have zero distance',()=>assert.equal(gridDistance([0,255],[0,255]),0));
test('exposure offset is centered',()=>assert.equal(gridDistance([10,30],[30,50]),0));
test('candidate never means confirmed duplicate',()=>{const g=Array(64).fill(50),r=candidatePairs([{id:'a',grid:g},{id:'b',grid:g}]);assert.equal(r.pairs.length,1);assert.equal(r.pairs[0].confirmed,false);assert.equal(r.pairs[0].automaticExclusion,false)});
test('search window prevents all-pairs expansion',()=>{const rows=Array.from({length:100},(_,i)=>({id:i,grid:Array(64).fill(50)}));const r=candidatePairs(rows,{window:2,maxPairs:1000});assert.ok(r.examined<=200)});
test('result count is capped',()=>{const rows=Array.from({length:20},(_,i)=>({id:i,grid:Array(64).fill(50)}));const r=candidatePairs(rows,{maxPairs:3});assert.equal(r.pairs.length,3);assert.equal(r.truncated,true)});
test('incompatible grids are rejected',()=>assert.throws(()=>gridDistance([1],[1,2])));
