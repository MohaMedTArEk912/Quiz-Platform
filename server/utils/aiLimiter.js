import Bottleneck from 'bottleneck';

/**
 * PRODUCTION-GRADE RATE LIMITER FOR GEMINI API
 * 
 * Purpose: Prevent HTTP 429 errors by enforcing strict client-side rate limiting
 * Architecture: Traffic cop that queues and throttles all AI generation requests
 * 
 * Example Limits (adjust per model):
 * - gemini-3-flash: 5 RPM, 250K TPM
 * - gemini-2.5-flash-lite: 10 RPM, 250K TPM
 * - gemini-2.5-flash: 5 RPM, 250K TPM
 *
 * Conservative Strategy:
 * - Enforce ~12-second minimum gap between requests (≈5 req/min)
 * - Process only 1 concurrent request to prevent token usage spikes
 * - Automatic exponential backoff on failures
 * - Intelligent retry with progressive delays (1s, 2s, 4s)
 */

const limiter = new Bottleneck({
  // Enforce minimum ~12 seconds between requests
  // This targets ≈5 RPM to align with stricter limits
  minTime: 12000,
  
  // Allow only 1 concurrent request at a time
  // Prevents token usage spikes that could trigger quota limits
  maxConcurrent: 1,
  
  // Reservoir settings (optional, for even stricter control)
  reservoir: 5, // Maximum 5 tokens per minute
  reservoirRefreshAmount: 5, // Refill to 5
  reservoirRefreshInterval: 60 * 1000, // Every 60 seconds
  
  // Prevent starvation - ensure high-priority jobs get processed
  highWater: 10, // If queue exceeds 10, start rejecting low-priority jobs
  strategy: Bottleneck.strategy.LEAK, // Drop oldest jobs when queue is full
});

// Event: When a job fails
limiter.on('failed', async (error, jobInfo) => {
  const id = jobInfo.options.id || 'unknown';
  console.warn(`[AI Limiter] Job ${id} failed: ${error.message?.split('\n')[0]}`);
  
  // Handle 429 (Rate Limit) errors with exponential backoff
  if (error.status === 429 || error.message?.includes('429')) {
    const retryCount = jobInfo.retryCount || 0;
    
    // Retry up to 3 times with exponential backoff
    if (retryCount < 3) {
      const delay = 1000 * Math.pow(2, retryCount); // 1s, 2s, 4s
      console.log(`[AI Limiter] 🔄 Scheduling retry ${retryCount + 1}/3 in ${delay/1000}s`);
      return delay;
    }
    
    console.error(`[AI Limiter] ❌ Job ${id} exhausted retries (3 attempts)`);
  }
  
  // Don't retry other errors (404, 403, etc.)
  return null;
});

// Event: Before a retry happens
limiter.on('retry', (error, jobInfo) => {
  const id = jobInfo.options.id || 'unknown';
  console.log(`[AI Limiter] ⏳ Retrying job ${id}...`);
});

// Event: When a job is queued (waiting)
limiter.on('queued', (info) => {
  const queueSize = limiter.counts().RECEIVED - limiter.counts().DONE;
  if (queueSize > 1) {
    console.log(`[AI Limiter] 📋 Jobs in queue: ${queueSize}`);
  }
});

// Event: When queue is empty
limiter.on('idle', () => {
  console.log(`[AI Limiter] ✅ All jobs processed, limiter idle`);
});

// Event: When queue reaches high water mark
limiter.on('depleted', () => {
  console.warn(`[AI Limiter] ⚠️  Reservoir depleted! Waiting for refill...`);
});

/**
 * Get current limiter statistics
 * Useful for monitoring and debugging
 */
export function getLimiterStats() {
  const counts = limiter.counts();
  return {
    executing: counts.EXECUTING,
    queued: counts.QUEUED,
    received: counts.RECEIVED,
    done: counts.DONE,
    failed: counts.FAILED,
  };
}

/**
 * Schedule a high-priority job
 * Use for critical operations that should jump the queue
 */
export function scheduleHighPriority(jobId, fn) {
  return limiter.schedule({ priority: 9, id: jobId }, fn);
}

/**
 * Schedule a normal priority job
 * Use for standard AI generation requests
 */
export function scheduleNormal(jobId, fn) {
  return limiter.schedule({ priority: 5, id: jobId }, fn);
}

/**
 * Schedule a low priority job
 * Use for background tasks, non-urgent generations
 */
export function scheduleLowPriority(jobId, fn) {
  return limiter.schedule({ priority: 1, id: jobId }, fn);
}

// Default export
export default limiter;
