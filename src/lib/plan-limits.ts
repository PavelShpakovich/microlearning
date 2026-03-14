/**
 * Plan limits service - fetches plan details from database
 * Single source of truth for plan configuration
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { areSubscriptionsEnabled } from '@/lib/feature-flags';

export interface PlanLimits {
  cardsPerMonth: number;
  maxThemes: number | null; // null = unlimited
  communityThemes: boolean;
  priceMinor: number | null;
  currency: string;
}

// Simple in-memory cache with TTL (5 minutes)
let planCache: Map<string, { data: PlanLimits; timestamp: number }> | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fallback limits used only when DB is unreachable — must match migration seed + 0016/0018
const DEFAULT_LIMITS: Record<string, PlanLimits> = {
  free: { cardsPerMonth: 50, maxThemes: 5, communityThemes: false, priceMinor: 0, currency: 'BYN' },
  basic: {
    cardsPerMonth: 300,
    maxThemes: 20,
    communityThemes: true,
    priceMinor: null,
    currency: 'BYN',
  },
  pro: {
    cardsPerMonth: 2000,
    maxThemes: null,
    communityThemes: true,
    priceMinor: null,
    currency: 'BYN',
  },
  max: {
    cardsPerMonth: 5000,
    maxThemes: null,
    communityThemes: true,
    priceMinor: null,
    currency: 'BYN',
  },
};

export async function getPlanLimits(planId: string): Promise<PlanLimits> {
  // Check cache first
  if (planCache && planCache.has(planId)) {
    const cached = planCache.get(planId)!;
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
  }

  // Fetch from database
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('cards_per_month, max_themes, community_themes, price_minor, currency')
    .eq('id', planId)
    .maybeSingle();

  if (error || !data) {
    // Fallback to hardcoded defaults (DB unreachable)
    return DEFAULT_LIMITS[planId] ?? DEFAULT_LIMITS['free'];
  }

  const limits: PlanLimits = {
    cardsPerMonth: data.cards_per_month ?? DEFAULT_LIMITS[planId]?.cardsPerMonth ?? 50,
    maxThemes: data.max_themes, // null means unlimited
    communityThemes: areSubscriptionsEnabled()
      ? (data.community_themes ?? DEFAULT_LIMITS[planId]?.communityThemes ?? false)
      : false,
    priceMinor: data.price_minor ?? DEFAULT_LIMITS[planId]?.priceMinor ?? null,
    currency: data.currency ?? DEFAULT_LIMITS[planId]?.currency ?? 'BYN',
  };

  // Update cache
  if (!planCache) {
    planCache = new Map();
  }
  planCache.set(planId, { data: limits, timestamp: Date.now() });

  return limits;
}

/**
 * Get all valid paid plan IDs from the database (excludes 'free').
 * Used for validating payment webhooks.
 */
export async function getValidPaidPlanIds(): Promise<string[]> {
  const { data } = await supabaseAdmin
    .from('subscription_plans')
    .select('id')
    .neq('id', 'free')
    .eq('is_public', true);

  if (!data || data.length === 0) {
    // Fallback to known plans if DB unreachable
    return ['basic', 'pro', 'max'];
  }

  return data.map((p) => p.id);
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
