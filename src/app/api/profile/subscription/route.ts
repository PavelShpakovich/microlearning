import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { areSubscriptionsEnabled, isWebpayEnabled } from '@/lib/feature-flags';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSubscriptionStatusResponse } from '@/lib/billing/subscription-status';
import { getWebpayMissingConfig, isWebpayConfigured } from '@/lib/billing/webpay';

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();
  return NextResponse.json(await getSubscriptionStatusResponse(user.id));
});

export const DELETE = withApiHandler(async () => {
  const { user } = await requireAuth();

  if (!areSubscriptionsEnabled()) {
    throw new ValidationError({ message: 'Subscriptions are currently unavailable' });
  }

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, billing_provider, status, auto_renew')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription || subscription.status !== 'active') {
    throw new ValidationError({ message: 'No active subscription to cancel' });
  }

  if (subscription.billing_provider !== 'webpay') {
    throw new ValidationError({ message: 'Only WEBPAY subscriptions can be managed here' });
  }

  if (!isWebpayEnabled() || !isWebpayConfigured()) {
    throw new ValidationError({
      message: `WEBPAY billing is not ready: ${getWebpayMissingConfig().join(', ') || 'disabled'}`,
    });
  }

  throw new ValidationError({ message: 'WEBPAY cancellation is not configured yet' });
});

export const PATCH = withApiHandler(async () => {
  const { user } = await requireAuth();

  if (!areSubscriptionsEnabled()) {
    throw new ValidationError({ message: 'Subscriptions are currently unavailable' });
  }

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('id, billing_provider, auto_renew, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!subscription || subscription.auto_renew) {
    throw new ValidationError({ message: 'No paused subscription to resume' });
  }

  if (subscription.current_period_end && new Date(subscription.current_period_end) < new Date()) {
    throw new ValidationError({ message: 'Subscription has already expired' });
  }

  if (subscription.billing_provider !== 'webpay') {
    throw new ValidationError({ message: 'Only WEBPAY subscriptions can be managed here' });
  }

  if (!isWebpayEnabled() || !isWebpayConfigured()) {
    throw new ValidationError({
      message: `WEBPAY billing is not ready: ${getWebpayMissingConfig().join(', ') || 'disabled'}`,
    });
  }

  throw new ValidationError({ message: 'WEBPAY renewal resume is not configured yet' });
});
