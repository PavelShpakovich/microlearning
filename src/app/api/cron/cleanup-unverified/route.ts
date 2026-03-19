import { type NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { env } from '@/lib/env';
import { logger } from '@/lib/logger';
import { isTelegramStubEmail } from '@/lib/auth/user-accounts';

/**
 * GET /api/cron/cleanup-unverified
 *
 * Called daily by Vercel Cron. Deletes auth users whose email was never
 * confirmed within 24 hours of signup. Cascade deletes remove all associated
 * data (profiles, cards, sessions, etc.).
 *
 * Secured with Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const secret = env.CRON_SECRET;
  if (!secret) {
    logger.error('CRON_SECRET is not configured — rejecting request');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const auth = req.headers.get('authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  let page = 1;
  let deletedCount = 0;
  let errorCount = 0;

  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });

    if (error) {
      logger.error({ error }, 'Cron cleanup-unverified: failed to list users');
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
    }

    const users = data?.users ?? [];

    const stale = users.filter(
      (u) => !u.email_confirmed_at && u.created_at < cutoff && !isTelegramStubEmail(u.email),
    );

    for (const u of stale) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(u.id);
      if (deleteError) {
        logger.error(
          { error: deleteError, userId: u.id },
          'Cron cleanup-unverified: delete failed',
        );
        errorCount++;
      } else {
        deletedCount++;
      }
    }

    if (users.length < 1000) break;
    page++;
  }

  logger.info({ deletedCount, errorCount }, 'Cron cleanup-unverified: complete');

  return NextResponse.json({ success: true, deletedCount, errorCount });
}
