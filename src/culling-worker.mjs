import { runBatches, checkpoint } from './culling-worker-core.mjs';

// Isolated execution protocol; deliberately does not transmit photo pixels or
// file bytes to a server. The initial analyzer only validates supplied evidence.
// Actual CV quality inference will be connected in a later phase.
const controllers = new Map();
self.onmessage = async ({ data }) => {
  if (!data || typeof data !== 'object') return;
  if (data.type === 'cancel') { controllers.get(data.jobId)?.abort(); return; }
  if (data.type !== 'analyze') return;
  const { jobId, evidence, batchSize = 12 } = data;
  if (typeof jobId !== 'string' || !jobId || !Array.isArray(evidence) || controllers.has(jobId)) {
    self.postMessage({ type: 'error', jobId, message: 'Invalid or duplicate job' }); return;
  }
  const controller = new AbortController();
  controllers.set(jobId, controller);
  try {
    const result = await runBatches({
      total: evidence.length, batchSize, signal: controller.signal,
      analyze: async index => {
        const item = evidence[index];
        return item && typeof item === 'object' && item.analyzed === true
          ? item : { analyzed: false, reason: 'Analysis unavailable' };
      },
      onProgress: p => self.postMessage({ type: 'progress', jobId, ...p })
    });
    self.postMessage({ type: 'result', jobId, ...result, checkpoint: checkpoint(jobId, result.completed, result.total, result.errors) });
  } catch (error) {
    self.postMessage({ type: 'error', jobId, message: String(error?.message || error) });
  } finally { controllers.delete(jobId); }
};
