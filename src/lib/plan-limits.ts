/**
 * Plan limits service - fetches plan details from database
 * Single source of truth for plan configuration
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface PlanLimits {
  cardsPerMonth: number;
  maxThemes: number;
  communityThemes: number;
}

// Simple in-memory cache with TTL (5 minutes)
let planCache: Map<string, { data: PlanLimits; timestamp: number }> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Default fallback limits when plan not found in database
 */
const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  free: { cardsPerMonth: 50, maxThemes: 3, communityThemes: 0 },
  basic: { cardsPerMonth: 300, maxThemes: 10, communityThemes: 5 },
  pro: { cardsPerMonth: 2000, maxThemes: 50, communityThemes: 10 },
  max: { cardsPerMonth: 5000, maxThemes: 999, communityThemes: 50 },
};

export async function getPlanLimits(planId: string): Promise<PlanLimits> {
  // Check cache first
  if (planCache && planCache.has(planId)) {
    const cached = planCache.get(planId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  // Fetch from database - try new column first, fall back if it doesn't exist
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('cards_per_month, max_themes')
    .eq('id', planId)
    .maybeSingle();

  if (error || !data) {
    // Fallback to hardcoded defaults
    return DEFAULT_LIMITS[planId] ?? DEFAULT_LIMITS['free'];
  }

  const limits: PlanLimits = {
    cardsPerMonth: data.cards_per_month ?? 50,
    maxThemes: data.max_themes ?? 999, // NULL in DB means unlimited
    communityThemes: DEFAULT_LIMITS[planId]?.communityThemes ?? 0, // Fallback until migration runs
  };

  // Update cache
  if (!planCache) {
    planCache = new Map();
  }
  planCache.set(planId, { data: limits, timestamp: Date.now() });

  return limits;
}

/**
 * Invalidate plan cache (useful after plan updates)
 */
export function invalidatePlanCache(planId?: string): void {
  if (!planCache) return;

  if (planId) {
    planCache.delete(planId);
  } else {
    planCache.clear();
  }
}
