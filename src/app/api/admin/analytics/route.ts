import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const db = supabaseAdmin as any;

export interface AdminAnalytics {
  totalUsers: number;
  newUsersThisMonth: number;
  chartsCreatedThisMonth: number;
}

interface UsageCounterRow {
  charts_created: number | null;
}

/**
 * GET /api/admin/analytics
 *
 * Returns aggregated platform metrics for the astrology workspace.
 * Admin-only.
 */
export const GET = withApiHandler(async () => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Run all aggregation queries in parallel
  const [totalUsersRes, newUsersRes, chartsRes] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    db.from('usage_counters').select('charts_created').gte('period_start', monthStart),
  ]);

  const errors = [totalUsersRes.error, newUsersRes.error, chartsRes.error].filter(Boolean);

  if (errors.length > 0) {
    logger.warn({ errors }, 'Some analytics queries returned errors');
  }

  const usageRows = (chartsRes.data ?? []) as UsageCounterRow[];

  const analytics: AdminAnalytics = {
    totalUsers: totalUsersRes.count ?? 0,
    newUsersThisMonth: newUsersRes.count ?? 0,
    chartsCreatedThisMonth: usageRows.reduce((sum, row) => sum + (row.charts_created ?? 0), 0),
  };

  return NextResponse.json(analytics);
});
