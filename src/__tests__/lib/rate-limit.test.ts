import { checkRateLimit, rateLimitHeaders, getClientIp } from '@/lib/rate-limit';

// Use a unique key prefix per test to avoid cross-test contamination
// (the rate-limiter uses a module-level Map)
let keySeq = 0;
function uniqueKey(prefix: string) {
  return `test-${prefix}-${++keySeq}-${Date.now()}`;
}

// ── checkRateLimit ────────────────────────────────────────────────────────────

describe('checkRateLimit', () => {
  it('allows the first request', () => {
    const result = checkRateLimit(uniqueKey('first'), 3, 60_000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('decrements remaining on each allowed request', () => {
    const key = uniqueKey('decrement');
    checkRateLimit(key, 3, 60_000); // 1st
    const second = checkRateLimit(key, 3, 60_000); // 2nd
    expect(second.remaining).toBe(1);
  });

  it('blocks when limit is exceeded', () => {
    const key = uniqueKey('block');
    checkRateLimit(key, 2, 60_000); // 1
    checkRateLimit(key, 2, 60_000); // 2 — at limit
    const blocked = checkRateLimit(key, 2, 60_000); // 3 — over
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it('returns a future resetAt timestamp', () => {
    const before = Date.now();
    const result = checkRateLimit(uniqueKey('ts'), 5, 10_000);
    expect(result.resetAt).toBeGreaterThan(before);
    expect(result.resetAt).toBeLessThanOrEqual(before + 11_000);
  });

  it('resets the window after expiry (windowMs elapsed)', async () => {
    const key = uniqueKey('reset');
    // Exhaust limit with a 1ms window
    checkRateLimit(key, 1, 1);
    checkRateLimit(key, 1, 1); // blocked

    // Wait for window to expire
    await new Promise((r) => setTimeout(r, 10));

    const after = checkRateLimit(key, 1, 60_000);
    expect(after.allowed).toBe(true);
  });

  it('different keys are independent buckets', () => {
    const key1 = uniqueKey('kA');
    const key2 = uniqueKey('kB');

    // Exhaust key1
    checkRateLimit(key1, 1, 60_000);
    checkRateLimit(key1, 1, 60_000); // blocked

    // key2 should still be free
    const result = checkRateLimit(key2, 1, 60_000);
    expect(result.allowed).toBe(true);
  });
});

// ── rateLimitHeaders ──────────────────────────────────────────────────────────

describe('rateLimitHeaders', () => {
  it('includes X-RateLimit-Remaining for allowed requests', () => {
    const headers = rateLimitHeaders({ allowed: true, remaining: 4, resetAt: Date.now() + 5000 });
    expect(headers['X-RateLimit-Remaining']).toBe('4');
    expect(headers['Retry-After']).toBeUndefined();
  });

  it('includes Retry-After for blocked requests', () => {
    const headers = rateLimitHeaders({
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + 3500,
    });
    expect(headers['X-RateLimit-Remaining']).toBe('0');
    const retryAfter = parseInt(headers['Retry-After'] ?? '0', 10);
    expect(retryAfter).toBeGreaterThanOrEqual(3);
    expect(retryAfter).toBeLessThanOrEqual(5);
  });
});

// ── getClientIp ───────────────────────────────────────────────────────────────
// Note: getClientIp is tested with a simple mock since jsdom does not provide
// the global `Request` API.

type HeadersDict = Record<string, string | null>;

function makeReqMock(headersDict: HeadersDict) {
  return {
    headers: {
      get: (name: string): string | null => headersDict[name] ?? null,
    },
  } as unknown as Request;
}

describe('getClientIp', () => {
  it('returns the first IP from x-forwarded-for', () => {
    const req = makeReqMock({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8', 'x-real-ip': null });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('falls back to x-real-ip', () => {
    const req = makeReqMock({ 'x-forwarded-for': null, 'x-real-ip': '10.0.0.1' });
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('returns "unknown" when no IP header is present', () => {
    const req = makeReqMock({ 'x-forwarded-for': null, 'x-real-ip': null });
    expect(getClientIp(req)).toBe('unknown');
  });
});
