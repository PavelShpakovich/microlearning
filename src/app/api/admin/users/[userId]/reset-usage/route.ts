import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { resetUsage } from '@/lib/subscription-utils';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/users/[userId]/reset-usage
 * Admin endpoint to reset a user's chart and reading usage for the current period.
 */
export const POST = withApiHandler(async (_req: Request, ctx?: unknown) => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { user } = adminCheck;

  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { userId } = (await params) || {};

  if (!userId || typeof userId !== 'string') {
    throw new ValidationError({ message: 'userId is required' });
  }

  try {
    await resetUsage(userId);

    logger.info({ adminId: user.id, userId }, 'Admin reset user usage counters');

    return NextResponse.json({
      success: true,
      message: 'Использование успешно сброшено',
      userId,
    });
  } catch (error) {
    logger.error({ error, userId, adminId: user.id }, 'Failed to reset user usage');
    return NextResponse.json({ error: 'Не удалось сбросить использование' }, { status: 500 });
  }
});
