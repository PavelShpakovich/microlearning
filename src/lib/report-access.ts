import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ReadingType } from '@/lib/astrology/types';

const db = supabaseAdmin;

export const REPORT_PRODUCT_IDS = {
  extendedNatalReport: 'extended_natal_report',
  compatibilityReport: 'compatibility_report_purchase',
  forecastReport: 'forecast_report_purchase',
  followUpPack: 'follow_up_pack',
} as const;

const FREE_CORE_READING_TYPES: ReadingType[] = ['natal_overview'];

const PURCHASED_READING_PRODUCT_BY_TYPE: Partial<Record<ReadingType, string>> = {
  personality: REPORT_PRODUCT_IDS.extendedNatalReport,
  love: REPORT_PRODUCT_IDS.extendedNatalReport,
  career: REPORT_PRODUCT_IDS.extendedNatalReport,
  strengths: REPORT_PRODUCT_IDS.extendedNatalReport,
  transit: REPORT_PRODUCT_IDS.extendedNatalReport,
  compatibility: REPORT_PRODUCT_IDS.compatibilityReport,
};

export interface ReadingAccessDecision {
  accessBasis: 'free_core' | 'purchase_required' | 'entitled_purchase';
  productId: string | null;
  entitlementId: string | null;
}

export function requiresPaidReadingAccess(readingType: ReadingType): boolean {
  return !FREE_CORE_READING_TYPES.includes(readingType);
}

export function getProductIdForReadingType(readingType: ReadingType): string | null {
  return PURCHASED_READING_PRODUCT_BY_TYPE[readingType] ?? null;
}

export async function getReadingAccessDecision(
  userId: string,
  readingType: ReadingType,
): Promise<ReadingAccessDecision> {
  if (!requiresPaidReadingAccess(readingType)) {
    return {
      accessBasis: 'free_core',
      productId: null,
      entitlementId: null,
    };
  }

  const productId = getProductIdForReadingType(readingType);

  if (!productId) {
    return {
      accessBasis: 'purchase_required',
      productId: null,
      entitlementId: null,
    };
  }

  const nowIso = new Date().toISOString();
  const { data: entitlement } = await db
    .from('report_entitlements')
    .select('id')
    .eq('user_id', userId)
    .eq('entity_type', 'reading')
    .eq('product_id', productId)
    .eq('reading_type', readingType)
    .in('status', ['reserved', 'active'])
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!entitlement) {
    return {
      accessBasis: 'purchase_required',
      productId,
      entitlementId: null,
    };
  }

  return {
    accessBasis: 'entitled_purchase',
    productId,
    entitlementId: entitlement.id,
  };
}
