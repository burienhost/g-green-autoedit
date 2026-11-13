import test from 'node:test';import assert from 'node:assert/strict';import {measureRGBA,reviewFallback} from '../src/photo-quality-core.mjs';
function image(w,h,fn){const a=new Uint8ClampedArray(w*h*4);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4,v=fn(x,y);a.set([v,v,v,255],i);}return a;}
test('black scene remains review-safe',()=>{const r=measureRGBA(image(8,8,()=>0),8,8);assert.equal(r.shadowClipFraction,1);assert.equal(r.severeDefect,false);});
test('white scene reports highlights without excluding',()=>{const r=measureRGBA(image(8,8,()=>255),8,8);assert.equal(r.highlightClipFraction,1);assert.equal(r.defectConfidence,0);});
test('uniform gray has no detail energy',()=>assert.equal(measureRGBA(image(8,8,()=>120),8,8).detailEnergy,0));
test('checkerboard contains measurable detail',()=>assert.ok(measureRGBA(image(12,12,(x,y)=>(x+y)%2?255:0),12,12).detailEnergy>0));
test('invalid RGBA dimensions rejected',()=>assert.throws(()=>measureRGBA(new Uint8Array(4),8,8)));
test('decode failures default to review',()=>assert.equal(reviewFallback('decode failed').analyzed,false));
