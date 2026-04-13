/**
 * Cache utilities for Next.js
 * Provides functions to set appropriate cache headers and manage data caching
 */

export interface CacheConfig {
  maxAge?: number; // Browser cache (Cache-Control: max-age)
  sMaxAge?: number; // CDN/Server cache (Cache-Control: s-maxage)
  staleWhileRevalidate?: number; // Stale-while-revalidate duration
  revalidate?: number; // Next.js ISR revalidate time
  tags?: readonly string[]; // Revalidation tags for on-demand revalidation
  /** When true, emits `private` instead of `public` — prevents CDN caching of user-specific data */
  private?: boolean;
}

/**
 * Create cache headers for API responses
 *
 * @example
 * // Cache for 1 hour in CDN, 5 minutes in browser
 * const headers = getCacheHeaders({ maxAge: 300, sMaxAge: 3600 });
 */
export function getCacheHeaders(config: CacheConfig = {}): Record<string, string> {
  const {
    maxAge = 60,
    sMaxAge = 3600,
    staleWhileRevalidate = 86400,
    private: isPrivate = false,
  } = config;
  const scope = isPrivate ? 'private' : 'public';
  const sMaxAgePart = isPrivate
    ? ''
    : `, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`;

  return {
    'Cache-Control': `${scope}, max-age=${maxAge}${sMaxAgePart}`,
  };
}

/**
 * Get recommended cache settings for different data types
 */
export const CACHE_PRESETS = {
  // User profile - changes infrequently, user-specific → never CDN-cached
  userProfile: {
    private: true,
    maxAge: 300, // 5 minutes
    tags: ['user-profile'],
  },

  // Charts - changes on user action, user-specific → never CDN-cached
  userCharts: {
    private: true,
    maxAge: 60, // 1 minute
    tags: ['user-charts'],
  },

  // Reading threads - user-specific and potentially updated frequently
  readingThreads: {
    private: true,
    maxAge: 0,
    tags: ['reading-threads'],
  },

  // Readings - user-specific and updated after generation/retry flows
  readings: {
    private: true,
    maxAge: 0,
    tags: ['readings'],
  },

  // Public data - can be cached aggressively
  publicContent: {
    maxAge: 3600, // 1 hour
    sMaxAge: 86400, // 1 day
    staleWhileRevalidate: 604800, // 1 week
  },
} as const;
