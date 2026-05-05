import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { auth } from '@/auth';
import { ValidationError, AppError, AuthError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { getCacheHeaders, CACHE_PRESETS } from '@/lib/cache-utils';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { supabaseAdmin } from '@/lib/supabase/admin';

const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  timezone: z.string().trim().max(80).optional(),
  locale: z.enum(['ru', 'en']).optional(),
  onboardingCompleted: z.boolean().optional(),
});

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();
  const session = await auth();

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, timezone, onboarding_completed_at, birth_data_consent_at')
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
      .select('display_name')
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

    const response = NextResponse.json({
      ...createdProfile,
    });

    // Add cache headers
    Object.entries(getCacheHeaders(CACHE_PRESETS.userProfile)).forEach(([key, value]) =>
      response.headers.set(key, value),
    );

    return response;
  }

  const response = NextResponse.json({
    ...profile,
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

  const { displayName, timezone, locale, onboardingCompleted } = body.data;

  const updateData = {
    id: user.id,
    ...(displayName !== undefined && { display_name: displayName }),
    ...(timezone !== undefined && { timezone }),
    ...(locale !== undefined && { locale }),
    ...(onboardingCompleted === true && { onboarding_completed_at: new Date().toISOString() }),
  };

  const { data: updatedProfile, error } = await supabase
    .from('profiles')
    .upsert(updateData, { onConflict: 'id' })
    .select('display_name, timezone')
    .single();

  if (error ?? !updatedProfile) {
    throw error ?? new Error('Failed to update profile');
  }

  return NextResponse.json({
    ...updatedProfile,
  });
});

export const DELETE = withApiHandler(async () => {
  const { user } = await requireAuth();

  // Delete user from Supabase Auth.
  // Because of ON DELETE CASCADE, this removes workspace rows such as
  // profiles, charts, readings, follow-up threads, and usage counters.
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    logger.error({ err: deleteError }, 'profile: failed to delete user from auth');
    throw new AppError('INTERNAL_ERROR', { message: 'Failed to delete account from database.' });
  }

  return NextResponse.json({ success: true });
});
