import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { deriveDisplayNameFromEmail } from '@/lib/auth/utils';
import { ensureSupabaseIdentityLink } from '@/lib/auth/account-identities';
import { findAuthUserByEmail } from '@/lib/auth/user-accounts';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const POST = withApiHandler(async (req) => {
  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const email = body.data.email.trim().toLowerCase();
  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    throw new ValidationError({ message: 'An account with this email already exists' });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: body.data.password,
    email_confirm: true,
    user_metadata: { source: 'web' },
  });

  if (error || !data.user) {
    throw new ValidationError({ message: error?.message || 'Failed to create account' });
  }

  await ensureSupabaseIdentityLink(data.user.id, email);

  const displayName = deriveDisplayNameFromEmail(email);
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    {
      id: data.user.id,
      display_name: displayName,
    },
    { onConflict: 'id' },
  );

  if (profileError) {
    throw profileError;
  }

  return NextResponse.json({ success: true, userId: data.user.id });
});
