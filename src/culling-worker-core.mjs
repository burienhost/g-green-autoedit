// SNAPIC Phase 02: deterministic, browser-safe batch scheduler.
// The worker owns scheduling, not billing, storage or original File deletion.
export const DEFAULT_BATCH_SIZE = 12;
export function createPlan(total, batchSize = DEFAULT_BATCH_SIZE) {
  if (!Number.isSafeInteger(total) || total < 0) throw new RangeError('Invalid photo count');
  if (!Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 128) throw new RangeError('Invalid batch size');
  const batches = [];
  for (let start = 0; start < total; start += batchSize) batches.push({ start, end: Math.min(total, start + batchSize) });
  return batches;
}
export function progress(completed, total) {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isSafeInteger(completed) || completed < 0 || completed > total) throw new RangeError('Invalid progress');
  return { completed, total, percent: total ? Math.floor(completed * 100 / total) : 100 };
}
export function checkpoint(jobId, completed, total, errors = []) {
  if (typeof jobId !== 'string' || !jobId.trim()) throw new TypeError('Job ID required');
  if (!Array.isArray(errors)) throw new TypeError('Errors must be an array');
  return { version: 1, jobId, ...progress(completed, total), errors: errors.map(e => ({ index: e.index, message: String(e.message) })) };
}
export async function runBatches({ total, batchSize = DEFAULT_BATCH_SIZE, analyze, onProgress = () => {}, signal }) {
  if (typeof analyze !== 'function') throw new TypeError('Analyzer required');
  const results = Array(total);
  const errors = [];
  let completed = 0;
  for (const { start, end } of createPlan(total, batchSize)) {
    if (signal?.aborted) return { status: 'cancelled', completed, total, results, errors };
    for (let index = start; index < end; index++) {
      if (signal?.aborted) return { status: 'cancelled', completed, total, results, errors };
      try { results[index] = await analyze(index); }
      catch (error) { errors.push({ index, message: String(error?.message || error) }); results[index] = { analyzed: false, reason: 'Analysis unavailable' }; }
      completed++;
    }
    onProgress(progress(completed, total));
    // Yield to the browser event loop between bounded batches.
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return { status: 'complete', completed, total, results, errors };
}
