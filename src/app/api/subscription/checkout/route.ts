import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError, AppError } from '@/lib/errors';
import { env } from '@/lib/env';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

const upgradePlanSchema = z.object({
  planId: z.enum(['free', 'basic', 'pro', 'max']),
});

function getStripePriceId(planId: string): string | undefined {
  switch (planId) {
    case 'basic':
      return env.STRIPE_PRICE_BASIC;
    case 'pro':
      return env.STRIPE_PRICE_PRO;
    case 'max':
      return env.STRIPE_PRICE_MAX;
    default:
      return undefined;
  }
}

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const body = upgradePlanSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { planId } = body.data;

  if (planId === 'free') {
    throw new ValidationError({ message: 'Cannot checkout a free plan.' });
  }

  const priceId = getStripePriceId(planId);
  if (!priceId) {
    throw new AppError('INTERNAL_ERROR', {
      message: 'Stripe price integration missing for this tier.',
      context: { planId },
    });
  }

  const supabaseEmail = (user as { email?: string }).email;
  let userEmail = supabaseEmail;
  if (!userEmail) {
    const { data: adminUser } = await supabaseAdmin.auth.admin.getUserById(user.id);
    userEmail = adminUser?.user?.email;
  }

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', user.id)
    .single();

  let customerId = subscription?.stripe_customer_id;

  if (!customerId && userEmail) {
    // Create new customer
    const customer = await getStripe().customers.create({
      email: userEmail,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    // We will save this ID back when webhook returns the checkout,
    // but saving it here directly prevents duplicates if user drops checkout
    await supabaseAdmin
      .from('user_subscriptions')
      .update({ stripe_customer_id: customerId })
      .eq('user_id', user.id);
  }

  const sessionParams: object = customerId
    ? { customer: customerId }
    : { customer_email: userEmail || undefined };

  const session = await getStripe().checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    ...sessionParams,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    metadata: {
      supabase_user_id: user.id,
      plan_id: planId,
    },
    success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/settings?checkout=canceled`,
  });

  return NextResponse.json({ url: session.url });
});
