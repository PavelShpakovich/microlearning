import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { ensureSupabaseIdentityLink } from '@/lib/auth/account-identities';
import { findAuthUserByEmail, isTelegramStubEmail } from '@/lib/auth/user-accounts';
import { sendVerificationEmail } from '@/lib/email/send-verification';

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const email = body.data.email.trim().toLowerCase();
  const password = body.data.password;

  const currentUser = await supabaseAdmin.auth.admin.getUserById(user.id);
  const currentEmail = currentUser.data.user?.email ?? null;

  if (currentEmail && !isTelegramStubEmail(currentEmail) && currentEmail.toLowerCase() !== email) {
    throw new ValidationError({ message: 'Web access is already configured for this account' });
  }

  const existingUser = await findAuthUserByEmail(email);
  if (existingUser && existingUser.id !== user.id) {
    throw new ValidationError({ message: 'An account with this email already exists' });
  }

  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    email,
    password,
    email_confirm: false,
    user_metadata: {
      source: 'telegram+web',
    },
  });

  if (error) {
    throw new ValidationError({ message: error.message });
  }

  await ensureSupabaseIdentityLink(user.id, email);

  await sendVerificationEmail({ email, password });

  return NextResponse.json({ success: true, needsVerification: true });
});
