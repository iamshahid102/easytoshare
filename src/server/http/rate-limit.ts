import { config } from "@/server/config";
import { ApiError } from "@/server/errors";

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * Per-room fixed-window limiter, the in-app replacement for the Express
 * `express-rate-limit` middleware. State is process-local, which is the right
 * scope for a single-instance deployment; a Redis counter is the scale-out
 * extension point (see the realtime hub for the same pattern).
 */
const globalForLimiter = globalThis as typeof globalThis & {
  __airforshareRateLimit?: Map<string, Bucket>;
};

const buckets = (globalForLimiter.__airforshareRateLimit ??= new Map<string, Bucket>());

export function enforceRateLimit(key: string): void {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + config.rateLimitWindowMs };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  // Opportunistic cleanup so the map cannot grow without bound.
  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  if (bucket.count > config.rateLimitMax) {
    throw ApiError.tooManyRequests("Too many requests, slow down");
  }
}
