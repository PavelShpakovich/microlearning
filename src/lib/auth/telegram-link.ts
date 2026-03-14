import { randomUUID } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

const TELEGRAM_LINK_PREFIX = 'link_';
const TELEGRAM_LINK_TTL_MINUTES = 15;

export function buildTelegramStartParam(token: string): string {
  return `${TELEGRAM_LINK_PREFIX}${token}`;
}

export function parseTelegramStartParam(startParam: string | null | undefined): string | null {
  if (!startParam) return null;
  if (!startParam.startsWith(TELEGRAM_LINK_PREFIX)) return null;
  return startParam.slice(TELEGRAM_LINK_PREFIX.length) || null;
}

export async function createTelegramLinkToken(userId: string): Promise<string> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + TELEGRAM_LINK_TTL_MINUTES * 60 * 1000).toISOString();

  await supabaseAdmin
    .from('telegram_link_tokens')
    .delete()
    .eq('user_id', userId)
    .is('consumed_at', null);

  const { error } = await supabaseAdmin.from('telegram_link_tokens').insert({
    token,
    user_id: userId,
    expires_at: expiresAt,
  });

  if (error) {
    throw error;
  }

  return token;
}

export async function consumeTelegramLinkToken(token: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('telegram_link_tokens')
    .select('token, user_id, expires_at, consumed_at')
    .eq('token', token)
    .maybeSingle<{
      token: string;
      user_id: string;
      expires_at: string;
      consumed_at: string | null;
    }>();

  if (error || !data) {
    return null;
  }

  if (data.consumed_at || new Date(data.expires_at).getTime() < Date.now()) {
    return null;
  }

  const { error: updateError } = await supabaseAdmin
    .from('telegram_link_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('token', token)
    .is('consumed_at', null);

  if (updateError) {
    throw updateError;
  }

  return data.user_id;
}
