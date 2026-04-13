import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export type AccountIdentityProvider = 'supabase' | 'telegram';

interface AccountIdentityRow {
  user_id: string;
  provider_user_id: string;
}

export async function resolveUserIdByTelegramId(telegramId: string): Promise<string | null> {
  const { data: identity, error } = await supabaseAdmin
    .from('account_identities')
    .select('user_id, provider_user_id')
    .eq('provider', 'telegram')
    .eq('provider_user_id', telegramId)
    .maybeSingle<AccountIdentityRow>();

  if (error) {
    logger.warn({ error, telegramId }, 'account-identities: failed to resolve telegram identity');
  }

  if (identity?.user_id) {
    return identity.user_id;
  }
  return null;
}

export async function ensureTelegramIdentityLink(
  userId: string,
  telegramId: string,
  displayName?: string | null,
): Promise<void> {
  const { data: existingIdentity, error: existingError } = await supabaseAdmin
    .from('account_identities')
    .select('user_id')
    .eq('provider', 'telegram')
    .eq('provider_user_id', telegramId)
    .maybeSingle<{ user_id: string }>();

  if (existingError) {
    throw existingError;
  }

  if (existingIdentity && existingIdentity.user_id !== userId) {
    throw new Error('Telegram identity is already linked to another account');
  }

  if (!existingIdentity) {
    const { error: insertError } = await supabaseAdmin.from('account_identities').insert({
      user_id: userId,
      provider: 'telegram',
      provider_user_id: telegramId,
      metadata: {
        display_name: displayName ?? null,
      },
    });

    if (insertError) {
      throw insertError;
    }
  }
}

export async function ensureSupabaseIdentityLink(
  userId: string,
  email?: string | null,
): Promise<void> {
  const { data: existingIdentity, error: existingError } = await supabaseAdmin
    .from('account_identities')
    .select('user_id')
    .eq('provider', 'supabase')
    .eq('provider_user_id', userId)
    .maybeSingle<{ user_id: string }>();

  if (existingError) {
    throw existingError;
  }

  if (existingIdentity && existingIdentity.user_id !== userId) {
    throw new Error('Supabase identity is already linked to another account');
  }

  if (!existingIdentity) {
    const { error: insertError } = await supabaseAdmin.from('account_identities').insert({
      user_id: userId,
      provider: 'supabase',
      provider_user_id: userId,
      provider_email: email ?? null,
      metadata: {
        source: 'auth_runtime',
      },
    });

    if (insertError) {
      throw insertError;
    }
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from('account_identities')
    .update({ provider_email: email ?? null })
    .eq('provider', 'supabase')
    .eq('provider_user_id', userId);

  if (updateError) {
    throw updateError;
  }
}

export async function getTelegramIdForUser(userId: string): Promise<string | null> {
  const { data: identity, error } = await supabaseAdmin
    .from('account_identities')
    .select('provider_user_id')
    .eq('user_id', userId)
    .eq('provider', 'telegram')
    .maybeSingle<{ provider_user_id: string }>();

  if (error) {
    logger.warn({ error, userId }, 'account-identities: failed to read telegram identity');
  }

  if (identity?.provider_user_id) {
    return identity.provider_user_id;
  }

  return null;
}
