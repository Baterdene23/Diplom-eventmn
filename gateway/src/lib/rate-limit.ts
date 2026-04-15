type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetSeconds: number;
};

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function getWindowId(windowSeconds: number): number {
  return Math.floor(nowSeconds() / windowSeconds);
}

// In-memory fallback. Works per gateway instance.
const globalForRateLimit = globalThis as unknown as {
  rateLimitBuckets?: Map<string, { windowId: number; count: number }>;
};

function getBuckets(): Map<string, { windowId: number; count: number }> {
  if (!globalForRateLimit.rateLimitBuckets) {
    globalForRateLimit.rateLimitBuckets = new Map();
  }
  return globalForRateLimit.rateLimitBuckets;
}

export async function checkRateLimit(
  key: string,
  cfg: RateLimitConfig
): Promise<RateLimitResult> {
  const buckets = getBuckets();
  const windowId = getWindowId(cfg.windowSeconds);
  const bucketKey = `${key}:${windowId}`;

  const existing = buckets.get(bucketKey);
  const count = existing ? existing.count + 1 : 1;
  buckets.set(bucketKey, { windowId, count });

  // Basic cleanup to avoid unbounded growth.
  if (buckets.size > 50000) {
    const minWindowId = windowId - 2;
    buckets.forEach((v, k) => {
      if (v.windowId < minWindowId) buckets.delete(k);
    });
  }

  const allowed = count <= cfg.limit;
  const remaining = Math.max(0, cfg.limit - count);
  const resetSeconds = (windowId + 1) * cfg.windowSeconds - nowSeconds();
  return { allowed, remaining, resetSeconds };
}
