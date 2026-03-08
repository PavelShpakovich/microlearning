import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { env } from '@/lib/env';
import { getStripe } from '@/lib/stripe';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('Stripe-Signature') as string;

  let event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET || '');
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Webhook Error: ${message}`);
    return new NextResponse(`Webhook Error: ${message}`, { status: 400 });
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const subscriptionId = typeof session.subscription === 'string' ? session.subscription : null;
      const customerId = typeof session.customer === 'string' ? session.customer : null;
      const userId = session.metadata?.supabase_user_id;
      const planId = session.metadata?.plan_id;

      if (userId && planId) {
        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            plan_id: planId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: customerId,
            status: 'active',
          })
          .eq('user_id', userId);
      }
      break;
    }
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = invoice.parent?.subscription_details?.subscription as string;
      if (!subscriptionId) break;

      const { data: userSub } = await supabaseAdmin
        .from('user_subscriptions')
        .select('user_id, plan_id')
        .eq('stripe_subscription_id', subscriptionId)
        .single();

      if (userSub?.user_id) {
        // Stripe Invoice has period_end and period_start based on the line items or invoice itself
        const periodEnd = invoice.lines.data[0]?.period?.end || invoice.period_end;
        const periodStart = invoice.lines.data[0]?.period?.start || invoice.period_start;

        await supabaseAdmin
          .from('user_subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(periodEnd * 1000).toISOString(),
            current_period_start: new Date(periodStart * 1000).toISOString(),
          })
          .eq('user_id', userSub.user_id);

        // Reset card usage
        const { data: plan } = await supabaseAdmin
          .from('subscription_plans')
          .select('cards_per_month')
          .eq('id', userSub.plan_id)
          .single();

        if (plan) {
          await supabaseAdmin
            .from('user_usage')
            .update({
              cards_generated: 0,
              total_limit: plan.cards_per_month,
              reset_date: new Date(periodEnd * 1000).toISOString(),
            })
            .eq('user_id', userSub.user_id);
        }
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      // Revert user to free tier
      await supabaseAdmin
        .from('user_subscriptions')
        .update({
          plan_id: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
        })
        .eq('stripe_subscription_id', subscriptionId);
      break;
    }
  }

  return new NextResponse('Webhook processed', { status: 200 });
}
