import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAdmin } from '@/lib/api/auth';
import { changePlan } from '@/lib/subscription-utils';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { areSubscriptionsEnabled, isPaidInformationVisible } from '@/lib/feature-flags';

const changePlanSchema = z.object({
  planId: z.enum(['free', 'basic', 'pro', 'max']),
});

/**
 * PUT /api/admin/users/[userId]/plan
 * Admin endpoint to change a user's subscription plan
 */
export const PUT = withApiHandler(async (req: Request, ctx?: unknown) => {
  const adminCheck = await requireAdmin();
  if (adminCheck instanceof NextResponse) return adminCheck;
  const { user } = adminCheck;

  if (!areSubscriptionsEnabled() || !isPaidInformationVisible()) {
    throw new ValidationError({ message: 'Plan management is unavailable before launch' });
  }

  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { userId } = (await params) || {};

  if (!userId || typeof userId !== 'string') {
    throw new ValidationError({ message: 'userId is required' });
  }

  // Validate request body
  const body = changePlanSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { planId } = body.data;

  try {
    // Change the plan
    await changePlan(userId, planId as 'free' | 'basic' | 'pro' | 'max');

    logger.info({ adminId: user.id, userId, newPlan: planId }, 'Admin changed user plan access');

    return NextResponse.json({
      success: true,
      message: `Plan access updated to ${planId}`,
      userId,
      planId,
    });
  } catch (error) {
    logger.error({ error, userId, adminId: user.id }, 'Failed to change user plan access');
    return NextResponse.json({ error: 'Failed to update plan access' }, { status: 500 });
  }
});
