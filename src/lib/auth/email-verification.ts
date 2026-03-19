import 'server-only';

import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export async function issueEmailVerificationToken(input: {
  userId: string;
  email: string;
}): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS).toISOString();

  const { error } = await supabaseAdmin.from('email_verification_tokens').upsert(
    {
      user_id: input.userId,
      email: input.email,
      token_hash: tokenHash,
      expires_at: expiresAt,
      consumed_at: null,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw error;
  }

  return token;
}

export async function consumeEmailVerificationToken(token: string): Promise<{
  userId: string;
  email: string;
} | null> {
  const tokenHash = sha256(token);
  const now = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from('email_verification_tokens')
    .select('id, user_id, email, expires_at, consumed_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!row || row.consumed_at || row.expires_at <= now) {
    return null;
  }

  const { error: consumeError } = await supabaseAdmin
    .from('email_verification_tokens')
    .update({ consumed_at: now })
    .eq('id', row.id)
    .is('consumed_at', null);

  if (consumeError) {
    throw consumeError;
  }

  return {
    userId: row.user_id,
    email: row.email,
  };
}

export async function clearEmailVerificationTokensForUser(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('email_verification_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}
