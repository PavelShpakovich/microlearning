import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';

const upgradePlanSchema = z.object({
  planId: z.enum(['free', 'basic', 'pro', 'unlimited']),
});

/**
 * POST /api/subscription/checkout
 * Request plan upgrade
 *
 * NOTE: This is a placeholder endpoint for testing/development.
 * When payment processor is integrated, will return checkout URL.
 */
export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const body = upgradePlanSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { planId } = body.data;

  // Resolve user email — Supabase users carry it directly; NextAuth users only have id.
  const supabaseEmail = (user as { email?: string }).email;
  let userEmail = supabaseEmail;
  if (!userEmail) {
    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    userEmail = adminUser?.user?.email;
  }

  // TODO: In production:
  // 1. Create payment intent with payment processor
  // 2. Return checkout URL
  // 3. Webhook would update subscription after payment

  logger.info(
    { userId: user.id, planId, userEmail },
    'Plan upgrade requested - awaiting payment integration',
  );

  return NextResponse.json(
    {
      status: 'pending',
      message: `Payment processing is not yet available. Please contact ${env.SUPPORT_EMAIL} for upgrades.`,
      planId,
      supportEmail: env.SUPPORT_EMAIL,
    },
    { status: 202 },
  );
});
