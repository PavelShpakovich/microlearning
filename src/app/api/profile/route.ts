import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { auth } from '@/auth';
import { ValidationError, AppError } from '@/lib/errors';
import { getCacheHeaders, CACHE_PRESETS } from '@/lib/cache-utils';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getStripe } from '@/lib/stripe';

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  uiLanguage: z.enum(['en', 'ru']).optional(),
});

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();
  const session = await auth();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, telegram_id, ui_language, streak_count')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    const fallbackDisplayName =
      session?.user?.name ||
      deriveDisplayNameFromEmail(session?.user?.email) ||
      (user.id ? user.id.slice(0, 8) : 'User');

    const { data: createdProfile, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        display_name: fallbackDisplayName,
        ui_language: 'en',
      })
      .select('display_name, telegram_id, ui_language, streak_count')
      .single();

    if (createError ?? !createdProfile) {
      throw createError ?? new Error('Failed to create profile');
    }

    const response = NextResponse.json(createdProfile);

    // Add cache headers
    Object.entries(getCacheHeaders(CACHE_PRESETS.userProfile)).forEach(([key, value]) =>
      response.headers.set(key, value),
    );

    return response;
  }

  const response = NextResponse.json(profile);

  // Add cache headers
  Object.entries(getCacheHeaders(CACHE_PRESETS.userProfile)).forEach(([key, value]) =>
    response.headers.set(key, value),
  );

  return response;
});

export const PATCH = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = updateProfileSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { displayName, uiLanguage } = body.data;

  const updateData: {
    id: string;
    display_name?: string;
    ui_language?: string;
  } = {
    id: user.id,
  };
  if (displayName) updateData.display_name = displayName;
  if (uiLanguage) updateData.ui_language = uiLanguage;

  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .upsert(updateData, { onConflict: 'id' })
    .select('display_name, telegram_id, ui_language, streak_count')
    .single();

  if (error ?? !updatedProfile) {
    throw error ?? new Error('Failed to update profile');
  }

  return NextResponse.json(updatedProfile);
});

export const DELETE = withApiHandler(async () => {
  const { user } = await requireAuth();

  // 1. Fetch user's subscription info to get stripe_customer_id
  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('stripe_customer_id, stripe_subscription_id')
    .eq('user_id', user.id)
    .single();

  // 2. Cancel Stripe subscription if exists
  if (subscription?.stripe_subscription_id) {
    try {
      await getStripe().subscriptions.cancel(subscription.stripe_subscription_id);
    } catch (stripeErr) {
      console.error('Failed to cancel Stripe subscription during account deletion:', stripeErr);
    }
  }

  // Optional: Delete customer from Stripe entirely
  if (subscription?.stripe_customer_id) {
    try {
      await getStripe().customers.del(subscription.stripe_customer_id);
    } catch (stripeErr) {
      console.error('Failed to delete Stripe customer:', stripeErr);
    }
  }

  // 3. Delete user from Supabase Auth
  // Because of ON DELETE CASCADE, this will wipe out their rows in
  // profiles, themes, cards, user_usage, user_subscriptions, etc.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Supabase admin deleteUser error:', deleteError);
    throw new AppError('INTERNAL_ERROR', { message: 'Failed to delete account from database.' });
  }

  return NextResponse.json({ success: true });
});
