import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const db = supabaseAdmin;

/**
 * POST /api/admin/reset-all-usage
 * Resets monthly usage counters for ALL users in the current month period.
 * Admin-only.
 */
export const POST = withApiHandler(async () => {
  await requireAdmin();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { error } = await db
    .from('usage_counters')
    .update({
      readings_generated: 0,
      charts_created: 0,
      follow_up_messages_used: 0,
      forecasts_generated: 0,
      compatibility_reports_used: 0,
      updated_at: new Date().toISOString(),
    })
    .gte('period_start', monthStart);

  if (error) {
    logger.error({ error }, 'Failed to reset all usage counters');
    return NextResponse.json({ error: 'Не удалось сбросить счётчики' }, { status: 500 });
  }

  logger.info('All usage counters reset by admin');
  return NextResponse.json({ success: true });
});
