import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { AppError } from '@/lib/errors';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

/**
 * POST /api/subscription/portal
 * Generates Stripe Customer Portal link
 */
export const POST = withApiHandler(async () => {
  const { user } = await requireAuth();

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  if (!subscription?.stripe_customer_id) {
    throw new AppError('NOT_FOUND', {
      message: 'No active subscription or customer found.',
    });
  }

  const portalSession = await getStripe().billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/settings`,
  });

  return NextResponse.json({ url: portalSession.url });
});
