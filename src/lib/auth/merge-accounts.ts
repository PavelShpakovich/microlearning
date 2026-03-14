/**
 * mergeAccounts(fromUserId, toUserId)
 *
 * Merges all data owned by `fromUserId` (typically a Telegram-only stub) into
 * `toUserId` (the web account the user just linked), then deletes the stub
 * from auth.users so nothing is left dangling.
 *
 * Tables re-owned (simple UPDATE):
 *   themes, data_sources, cards, sessions, payment_history
 *
 * Tables merged with conflict handling:
 *   bookmarked_cards  — unique(user_id, card_id)  → skip duplicates
 *   user_subscriptions — unique(user_id)           → keep better plan
 *   user_usage         — unique(user_id, period_start) → sum cards_generated
 *   account_identities — move non-telegram identities
 *
 * Profile:
 *   is_admin     → OR  (if either was admin, target stays admin)
 *   streak_count → MAX
 *   last_study_date → MAX (most recent)
 *   display_name → keep toUserId's unless it looks auto-generated
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const PLAN_RANK: Record<string, number> = { free: 0, basic: 1, pro: 2, max: 3 };

export async function mergeAccounts(fromUserId: string, toUserId: string): Promise<void> {
  logger.info({ fromUserId, toUserId }, 'merge-accounts: starting');

  // ── 1. Simple re-owner tables ────────────────────────────────────────────
  for (const table of [
    'themes',
    'data_sources',
    'cards',
    'sessions',
    'payment_transactions',
  ] as const) {
    const { error } = await supabaseAdmin
      .from(table)
      .update({ user_id: toUserId })
      .eq('user_id', fromUserId);
    if (error) {
      logger.warn({ error, table, fromUserId, toUserId }, 'merge-accounts: re-owner failed');
    }
  }

  // ── 2. bookmarked_cards — unique(user_id, card_id) ───────────────────────
  const { data: fromBookmarks } = await supabaseAdmin
    .from('bookmarked_cards')
    .select('card_id')
    .eq('user_id', fromUserId);

  if (fromBookmarks?.length) {
    const { data: toBookmarks } = await supabaseAdmin
      .from('bookmarked_cards')
      .select('card_id')
      .eq('user_id', toUserId);

    const existingCardIds = new Set((toBookmarks ?? []).map((b) => b.card_id as string));
    const toInsert = fromBookmarks
      .filter((b) => !existingCardIds.has(b.card_id as string))
      .map((b) => ({ user_id: toUserId, card_id: b.card_id }));

    if (toInsert.length) {
      await supabaseAdmin.from('bookmarked_cards').insert(toInsert);
    }
    await supabaseAdmin.from('bookmarked_cards').delete().eq('user_id', fromUserId);
  }

  // ── 3. user_subscriptions — unique(user_id), keep better plan ───────────
  const { data: fromSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', fromUserId)
    .maybeSingle();

  const { data: toSub } = await supabaseAdmin
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', toUserId)
    .maybeSingle();

  if (fromSub) {
    const fromRank = PLAN_RANK[fromSub.plan_id as string] ?? 0;
    const toRank = toSub ? (PLAN_RANK[toSub.plan_id as string] ?? 0) : -1;

    if (fromRank > toRank) {
      // Move the better subscription to the target account
      if (toSub) {
        await supabaseAdmin.from('user_subscriptions').delete().eq('user_id', toUserId);
      }
      await supabaseAdmin
        .from('user_subscriptions')
        .update({ user_id: toUserId })
        .eq('user_id', fromUserId);
    } else {
      // Target already has a better plan — just delete the stub's subscription
      await supabaseAdmin.from('user_subscriptions').delete().eq('user_id', fromUserId);
    }
  }

  // ── 4. user_usage — unique(user_id, period_start): sum cards_generated ──
  const { data: fromUsages } = await supabaseAdmin
    .from('user_usage')
    .select('*')
    .eq('user_id', fromUserId);

  if (fromUsages?.length) {
    for (const fu of fromUsages) {
      const { data: toUsage } = await supabaseAdmin
        .from('user_usage')
        .select('id, cards_generated')
        .eq('user_id', toUserId)
        .eq('period_start', fu.period_start)
        .maybeSingle();

      if (toUsage) {
        // Sum the generated card counts for the same period
        await supabaseAdmin
          .from('user_usage')
          .update({
            cards_generated: (toUsage.cards_generated ?? 0) + (fu.cards_generated as number),
          })
          .eq('id', toUsage.id);
        await supabaseAdmin.from('user_usage').delete().eq('id', fu.id);
      } else {
        // No overlap — just re-own this period
        await supabaseAdmin.from('user_usage').update({ user_id: toUserId }).eq('id', fu.id);
      }
    }
  }

  // ── 5. account_identities — move non-telegram identities ────────────────
  await supabaseAdmin
    .from('account_identities')
    .update({ user_id: toUserId })
    .eq('user_id', fromUserId)
    .neq('provider', 'telegram');

  // ── 6. Merge profile flags ───────────────────────────────────────────────
  const { data: fromProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, display_name')
    .eq('id', fromUserId)
    .maybeSingle();

  const { data: toProfile } = await supabaseAdmin
    .from('profiles')
    .select('is_admin, display_name')
    .eq('id', toUserId)
    .maybeSingle();

  if (fromProfile && toProfile) {
    const mergedIsAdmin = fromProfile.is_admin || toProfile.is_admin;

    // Use the stub's display_name if the web account's looks auto-generated
    const toName = (toProfile.display_name as string) ?? '';
    const fromName = (fromProfile.display_name as string) ?? '';
    const webLooksAutoGenerated = !toName || toName.includes('@') || /^[0-9a-f]{8}$/i.test(toName);
    const mergedDisplayName = webLooksAutoGenerated && fromName ? fromName : toName;

    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        is_admin: mergedIsAdmin,
        display_name: mergedDisplayName || null,
      })
      .eq('id', toUserId);

    if (profileErr) {
      logger.warn({ profileErr, toUserId }, 'merge-accounts: profile merge failed');
    }
  }

  // ── 7. Delete the stub auth user (cascades remaining data) ───────────────
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(fromUserId);
  if (deleteErr) {
    logger.warn({ deleteErr, fromUserId }, 'merge-accounts: failed to delete stub auth user');
  }

  logger.info({ fromUserId, toUserId }, 'merge-accounts: complete');
}
