import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlan, progress, checkpoint, runBatches } from '../src/culling-worker-core.mjs';
test('240 photos are partitioned into bounded 12-photo batches', () => {
  const plan = createPlan(240);
  assert.equal(plan.length, 20);
  assert.deepEqual(plan[0], { start: 0, end: 12 });
  assert.deepEqual(plan.at(-1), { start: 228, end: 240 });
});
test('partial batch does not overrun', () => assert.deepEqual(createPlan(13, 12).at(-1), { start: 12, end: 13 }));
test('zero photos completes at 100 percent', () => assert.deepEqual(progress(0, 0), { completed: 0, total: 0, percent: 100 }));
test('rejects unbounded and invalid plans', () => { assert.throws(() => createPlan(2, 0)); assert.throws(() => createPlan(2, 129)); assert.throws(() => createPlan(-1)); });
test('scheduler processes each image exactly once and reports progress', async () => {
  const seen = [], updates = [];
  const result = await runBatches({ total: 25, batchSize: 12, analyze: async i => { seen.push(i); return { index: i }; }, onProgress: p => updates.push(p.completed) });
  assert.equal(result.status, 'complete');
  assert.deepEqual(seen, Array.from({ length: 25 }, (_, i) => i));
  assert.deepEqual(updates, [12, 24, 25]);
});
test('failed analysis is retained as review-safe evidence', async () => {
  const result = await runBatches({ total: 3, analyze: async i => { if (i === 1) throw Error('Decode failed'); return { analyzed: true }; } });
  assert.equal(result.errors.length, 1);
  assert.deepEqual(result.results[1], { analyzed: false, reason: 'Analysis unavailable' });
  assert.equal(result.completed, 3);
});
test('cancellation stops before the next batch', async () => {
  const controller = new AbortController();
  const result = await runBatches({ total: 30, batchSize: 10, signal: controller.signal, analyze: async i => { if (i === 9) controller.abort(); return i; } });
  assert.equal(result.status, 'cancelled');
  assert.equal(result.completed, 10);
});
test('checkpoint contains resumable position without photo bytes', () => {
  assert.deepEqual(checkpoint('job-1', 12, 240), { version: 1, jobId: 'job-1', completed: 12, total: 240, percent: 5, errors: [] });
});
