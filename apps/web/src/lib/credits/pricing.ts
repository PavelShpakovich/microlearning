import 'server-only';

import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  DEFAULT_READING_CREDIT_COST,
  DEFAULT_COMPATIBILITY_CREDIT_COST,
  DEFAULT_FORECAST_PACK_CREDIT_COST,
  DEFAULT_CHAT_PACK_CREDIT_COST,
} from '@/lib/usage-policy';
import { logger } from '@/lib/logger';

const db = supabaseAdmin;

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductKind =
  | 'natal_report'
  | 'compatibility_report'
  | 'forecast_report'
  | 'follow_up_pack';

export type CreditCosts = Record<ProductKind, number>;
export type FreeProducts = Set<ProductKind>;

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceminor: number | null;
  currency: string;
  appleProductId: string;
  googleProductId: string;
  active: boolean;
  sortOrder: number;
}

// ─── In-memory cache with TTL ───────────────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const CACHE_TTL_MS = 60_000; // 60 seconds
// Product costs can change from the admin panel and should propagate quickly
// across warmed server instances used by store, unlock, and access checks.
const CREDIT_COSTS_CACHE_TTL_MS = 10_000; // 10 seconds
// Free-product flag can change any time via the admin panel.
// Short TTL ensures all server instances see the change quickly.
const FREE_PRODUCTS_CACHE_TTL_MS = 10_000; // 10 seconds
const PRODUCT_PRICING_CACHE_TTL_MS = 10_000; // 10 seconds
// Pack visibility can also change via the admin panel and should appear in
// the store almost immediately across warmed server instances.
const CREDIT_PACKS_CACHE_TTL_MS = 5_000; // 5 seconds

let creditCostsCache: CacheEntry<CreditCosts> | null = null;
let freeProductsCache: CacheEntry<FreeProducts> | null = null;
let productPricingCache: CacheEntry<Record<ProductKind, { cost: number; isFree: boolean }>> | null =
  null;
let creditPacksCache: CacheEntry<CreditPack[]> | null = null;

export function invalidatePricingCache(): void {
  creditCostsCache = null;
  freeProductsCache = null;
  productPricingCache = null;
  creditPacksCache = null;
}

// ─── Default costs (fallback if DB query fails) ─────────────────────────────

const FALLBACK_COSTS: CreditCosts = {
  natal_report: DEFAULT_READING_CREDIT_COST,
  compatibility_report: DEFAULT_COMPATIBILITY_CREDIT_COST,
  forecast_report: DEFAULT_FORECAST_PACK_CREDIT_COST,
  follow_up_pack: DEFAULT_CHAT_PACK_CREDIT_COST,
};

// ─── Credit costs from DB ───────────────────────────────────────────────────

export async function getCreditCosts(): Promise<CreditCosts> {
  if (creditCostsCache && Date.now() < creditCostsCache.expiresAt) {
    return creditCostsCache.data;
  }

  try {
    const { data: rawData, error } = await db
      .from('report_products')
      .select('kind, credit_cost')
      .not('credit_cost', 'is', null);

    if (error) throw error;

    const costs = { ...FALLBACK_COSTS };
    for (const row of rawData ?? []) {
      if (row.kind in costs) {
        costs[row.kind as ProductKind] = row.credit_cost!;
      }
    }

    creditCostsCache = { data: costs, expiresAt: Date.now() + CREDIT_COSTS_CACHE_TTL_MS };
    return costs;
  } catch (err) {
    logger.error({ error: err }, 'Failed to load credit costs from DB, using fallback');
    return FALLBACK_COSTS;
  }
}

export async function getFreeProducts(): Promise<FreeProducts> {
  if (freeProductsCache && Date.now() < freeProductsCache.expiresAt) {
    return freeProductsCache.data;
  }

  try {
    // Use an RPC function so this query never depends on PostgREST's column
    // schema cache knowing about the `free` column.  PostgREST executes RPC
    // bodies as raw SQL, so even a stale schema cache won't break this call.
    const { data, error } = await db.rpc('get_free_product_kinds');

    if (error) throw error;

    const free = new Set<ProductKind>();
    for (const kind of (data as string[]) ?? []) {
      if (kind in FALLBACK_COSTS) free.add(kind as ProductKind);
    }

    freeProductsCache = { data: free, expiresAt: Date.now() + FREE_PRODUCTS_CACHE_TTL_MS };
    return free;
  } catch (err) {
    logger.error({ error: err }, 'Failed to load free products from DB');
    return new Set();
  }
}

/** Single call to get both cost and free status for a product. */
export async function getProductPricing(
  kind: ProductKind,
): Promise<{ cost: number; isFree: boolean }> {
  if (productPricingCache && Date.now() < productPricingCache.expiresAt) {
    return productPricingCache.data[kind];
  }

  try {
    const { data, error } = await db.from('report_products').select('kind, credit_cost, free');

    if (error) throw error;

    const pricing = Object.fromEntries(
      Object.entries(FALLBACK_COSTS).map(([productKind, cost]) => [
        productKind,
        { cost, isFree: false },
      ]),
    ) as Record<ProductKind, { cost: number; isFree: boolean }>;

    for (const row of data ?? []) {
      if (row.kind in pricing) {
        pricing[row.kind as ProductKind] = {
          cost: row.credit_cost ?? FALLBACK_COSTS[row.kind as ProductKind],
          isFree: row.free ?? false,
        };
      }
    }

    productPricingCache = {
      data: pricing,
      expiresAt: Date.now() + PRODUCT_PRICING_CACHE_TTL_MS,
    };

    return pricing[kind];
  } catch (err) {
    logger.error({ error: err, kind }, 'Failed to load product pricing from DB');
    return { cost: FALLBACK_COSTS[kind], isFree: false };
  }
}

// ─── Credit packs from DB ───────────────────────────────────────────────────

export async function getCreditPacks(): Promise<CreditPack[]> {
  if (creditPacksCache && Date.now() < creditPacksCache.expiresAt) {
    return creditPacksCache.data;
  }

  try {
    const { data, error } = await db
      .from('credit_packs')
      .select(
        'id, name, credits, price_minor, currency, apple_product_id, google_product_id, active, sort_order',
      )
      .eq('active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const packs: CreditPack[] = (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      credits: row.credits,
      priceminor: row.price_minor,
      currency: row.currency,
      appleProductId: row.apple_product_id,
      googleProductId: row.google_product_id,
      active: row.active,
      sortOrder: row.sort_order,
    }));

    creditPacksCache = { data: packs, expiresAt: Date.now() + CREDIT_PACKS_CACHE_TTL_MS };
    return packs;
  } catch (err) {
    logger.error({ error: err }, 'Failed to load credit packs from DB');
    return [];
  }
}

// ─── All credit packs (including inactive) — for admin ──────────────────────

export async function getAllCreditPacks(): Promise<CreditPack[]> {
  try {
    const { data, error } = await db
      .from('credit_packs')
      .select(
        'id, name, credits, price_minor, currency, apple_product_id, google_product_id, active, sort_order',
      )
      .order('sort_order', { ascending: true });

    if (error) throw error;

    return (data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      credits: row.credits,
      priceminor: row.price_minor,
      currency: row.currency,
      appleProductId: row.apple_product_id,
      googleProductId: row.google_product_id,
      active: row.active,
      sortOrder: row.sort_order,
    }));
  } catch (err) {
    logger.error({ error: err }, 'Failed to load all credit packs from DB');
    return [];
  }
}
