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
}

/**
 * Create cache headers for API responses
 *
 * @example
 * // Cache for 1 hour in CDN, 5 minutes in browser
 * const headers = getCacheHeaders({ maxAge: 300, sMaxAge: 3600 });
 */
export function getCacheHeaders(config: CacheConfig = {}): Record<string, string> {
  const { maxAge = 60, sMaxAge = 3600, staleWhileRevalidate = 86400 } = config;

  return {
    'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  };
}

/**
 * Get recommended cache settings for different data types
 */
export const CACHE_PRESETS = {
  // User profile - changes infrequently
  userProfile: {
    maxAge: 300, // 5 minutes
    sMaxAge: 3600, // 1 hour
    staleWhileRevalidate: 86400, // 1 day
    tags: ['user-profile'],
  },

  // Themes - changes on user action
  userThemes: {
    maxAge: 60, // 1 minute
    sMaxAge: 300, // 5 minutes
    staleWhileRevalidate: 3600, // 1 hour
    tags: ['user-themes'],
  },

  // Study sessions - real-time data
  studySession: {
    maxAge: 0, // No browser cache
    sMaxAge: 30, // 30 seconds server cache
    staleWhileRevalidate: 300, // 5 minutes
    tags: ['study-session'],
  },

  // Cards - frequently updated
  cards: {
    maxAge: 0,
    sMaxAge: 60, // 1 minute
    staleWhileRevalidate: 600, // 10 minutes
    tags: ['cards'],
  },

  // Public data - can be cached aggressively
  publicContent: {
    maxAge: 3600, // 1 hour
    sMaxAge: 86400, // 1 day
    staleWhileRevalidate: 604800, // 1 week
  },
} as const;
