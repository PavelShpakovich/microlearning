/**
 * Simple in-memory sliding-window rate limiter.
 *
 * Works per-process (single serverless instance). Sufficient for throttling
 * brute-force login / registration abuse. For multi-instance deployments,
 * replace with @upstash/ratelimit backed by Redis.
 */

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Prune expired entries every 5 minutes to prevent unbounded memory growth.
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (entry.resetAt < now) store.delete(key);
      }
    },
    5 * 60 * 1000,
  );
}

/**
 * Check whether `key` (e.g. `"login:<ip>"`) is within the allowed rate.
 *
 * @param key      Unique bucket key (include operation + identifier)
 * @param limit    Maximum requests allowed within `windowMs`
 * @param windowMs Sliding window duration in milliseconds
 * @returns `{ allowed: boolean; remaining: number; resetAt: number }`
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // New or expired window — start fresh
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/**
 * Extract a best-effort IP address from a Request (works on Vercel).
 */
export function getClientIp(req: Request): string {
  // Vercel forwards the real IP in x-forwarded-for
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  // Fallback — Vercel also sets this header
  return req.headers.get('x-real-ip') ?? 'unknown';
}
