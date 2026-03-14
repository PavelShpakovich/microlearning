import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { auth } from '@/auth';
import { ValidationError, AppError, AuthError } from '@/lib/errors';
import { getCacheHeaders, CACHE_PRESETS } from '@/lib/cache-utils';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTelegramIdForUser } from '@/lib/auth/account-identities';

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
});

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();
  const session = await auth();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, telegram_id')
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
      })
      .select('display_name, telegram_id')
      .single();

    if (createError ?? !createdProfile) {
      // 23503 = foreign_key_violation: the user.id is not in auth.users.
      // Happens when a stale NextAuth JWT references a deleted/missing auth user.
      // Return 401 so the client forces re-authentication instead of a raw 500.
      if ((createError as { code?: string } | null)?.code === '23503') {
        throw new AuthError({
          message: 'Session expired — please sign in again',
          cause: createError,
        });
      }
      throw createError ?? new Error('Failed to create profile');
    }

    const response = NextResponse.json(createdProfile);

    // Add cache headers
    Object.entries(getCacheHeaders(CACHE_PRESETS.userProfile)).forEach(([key, value]) =>
      response.headers.set(key, value),
    );

    return response;
  }

  const telegramId = await getTelegramIdForUser(user.id);
  const response = NextResponse.json({
    ...profile,
    telegram_id: telegramId ?? profile.telegram_id,
  });

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

  const { displayName } = body.data;

  const updateData: {
    id: string;
    display_name?: string;
  } = {
    id: user.id,
  };
  if (displayName) updateData.display_name = displayName;

  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .upsert(updateData, { onConflict: 'id' })
    .select('display_name, telegram_id')
    .single();

  if (error ?? !updatedProfile) {
    throw error ?? new Error('Failed to update profile');
  }

  return NextResponse.json(updatedProfile);
});

export const DELETE = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Delete user from Supabase Auth
  // Because of ON DELETE CASCADE, this will wipe out their rows in
  // profiles, themes, cards, user_usage, user_subscriptions, etc.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    console.error('Supabase admin deleteUser error:', deleteError);
    throw new AppError('INTERNAL_ERROR', { message: 'Failed to delete account from database.' });
  }

  return NextResponse.json({ success: true });
});
