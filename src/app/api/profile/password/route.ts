import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/rate-limit';

const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const PATCH = withApiHandler(async (req) => {
  const { user } = await requireAuth();

  // Rate limit: 5 password changes per user per day
  const rl = checkRateLimit(`password-change:${user.id}`, 5, 24 * 60 * 60 * 1000);
  if (!rl.allowed) {
    throw new ValidationError({ message: 'Too many password change attempts. Try again later.' });
  }

  const body = updatePasswordSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { password } = body.data;

  // Use supabaseAdmin to update the user's password directly
  const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return NextResponse.json({ success: true });
});
