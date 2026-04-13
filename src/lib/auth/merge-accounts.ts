/**
 * Merges a temporary account into the main account for the astrology product.
 *
 * Re-owned directly:
 *   charts, readings, follow_up_threads, compatibility_reports, forecasts,
 *   generation_logs
 *
 * Merged with conflict handling:
 *   usage_counters     — sum the current period counters
 *   user_preferences   — keep the most complete preference set
 *   account_identities — move non-telegram identities
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const db = supabaseAdmin as any;

export async function mergeAccounts(fromUserId: string, toUserId: string): Promise<void> {
  logger.info({ fromUserId, toUserId }, 'merge-accounts: starting');

  // ── 1. Simple re-owner tables ────────────────────────────────────────────
  for (const table of [
    'charts',
    'readings',
    'follow_up_threads',
    'compatibility_reports',
    'forecasts',
    'generation_logs',
  ] as const) {
    const { error } = await db.from(table).update({ user_id: toUserId }).eq('user_id', fromUserId);
    if (error) {
      logger.warn({ error, table, fromUserId, toUserId }, 'merge-accounts: re-owner failed');
    }
  }

  // ── 2. usage_counters — unique(user_id, period_start): sum product usage ─
  const { data: fromUsages } = await db
    .from('usage_counters')
    .select('*')
    .eq('user_id', fromUserId);

  if (fromUsages?.length) {
    for (const fu of fromUsages) {
      const { data: toUsage } = await db
        .from('usage_counters')
        .select(
          'id, charts_created, readings_generated, follow_up_messages_used, compatibility_reports_used, forecasts_generated',
        )
        .eq('user_id', toUserId)
        .eq('period_start', fu.period_start)
        .maybeSingle();

      if (toUsage) {
        await db
          .from('usage_counters')
          .update({
            charts_created: (toUsage.charts_created ?? 0) + (fu.charts_created ?? 0),
            readings_generated: (toUsage.readings_generated ?? 0) + (fu.readings_generated ?? 0),
            follow_up_messages_used:
              (toUsage.follow_up_messages_used ?? 0) + (fu.follow_up_messages_used ?? 0),
            compatibility_reports_used:
              (toUsage.compatibility_reports_used ?? 0) + (fu.compatibility_reports_used ?? 0),
            forecasts_generated: (toUsage.forecasts_generated ?? 0) + (fu.forecasts_generated ?? 0),
          })
          .eq('id', toUsage.id);
        await db.from('usage_counters').delete().eq('id', fu.id);
      } else {
        await db.from('usage_counters').update({ user_id: toUserId }).eq('id', fu.id);
      }
    }
  }

  // ── 3. user_preferences — unique(user_id), keep the most complete record ─
  const [{ data: fromPreferences }, { data: toPreferences }] = await Promise.all([
    db.from('user_preferences').select('*').eq('user_id', fromUserId).maybeSingle(),
    db.from('user_preferences').select('*').eq('user_id', toUserId).maybeSingle(),
  ]);

  if (fromPreferences) {
    if (!toPreferences) {
      await db.from('user_preferences').update({ user_id: toUserId }).eq('user_id', fromUserId);
    } else {
      await db
        .from('user_preferences')
        .update({
          tone_style: toPreferences.tone_style ?? fromPreferences.tone_style,
          content_focus_love:
            toPreferences.content_focus_love || fromPreferences.content_focus_love,
          content_focus_career:
            toPreferences.content_focus_career || fromPreferences.content_focus_career,
          content_focus_growth:
            toPreferences.content_focus_growth || fromPreferences.content_focus_growth,
          allow_spiritual_tone:
            toPreferences.allow_spiritual_tone || fromPreferences.allow_spiritual_tone,
        })
        .eq('user_id', toUserId);

      await db.from('user_preferences').delete().eq('user_id', fromUserId);
    }
  }

  // ── 4. account_identities — move non-telegram identities ────────────────
  await db
    .from('account_identities')
    .update({ user_id: toUserId })
    .eq('user_id', fromUserId)
    .neq('provider', 'telegram');

  // ── 5. Merge profile flags ───────────────────────────────────────────────
  const { data: fromProfile } = await db
    .from('profiles')
    .select(
      'is_admin, display_name, locale, timezone, birth_data_consent_at, onboarding_completed_at, marketing_opt_in',
    )
    .eq('id', fromUserId)
    .maybeSingle();

  const { data: toProfile } = await db
    .from('profiles')
    .select(
      'is_admin, display_name, locale, timezone, birth_data_consent_at, onboarding_completed_at, marketing_opt_in',
    )
    .eq('id', toUserId)
    .maybeSingle();

  if (fromProfile && toProfile) {
    const mergedIsAdmin = fromProfile.is_admin || toProfile.is_admin;

    // Use the stub's display_name if the web account's looks auto-generated
    const toName = (toProfile.display_name as string) ?? '';
    const fromName = (fromProfile.display_name as string) ?? '';
    const webLooksAutoGenerated = !toName || toName.includes('@') || /^[0-9a-f]{8}$/i.test(toName);
    const mergedDisplayName = webLooksAutoGenerated && fromName ? fromName : toName;

    const { error: profileErr } = await db
      .from('profiles')
      .update({
        is_admin: mergedIsAdmin,
        display_name: mergedDisplayName || null,
        locale: toProfile.locale ?? fromProfile.locale ?? 'en',
        timezone: toProfile.timezone ?? fromProfile.timezone ?? null,
        birth_data_consent_at:
          toProfile.birth_data_consent_at ?? fromProfile.birth_data_consent_at ?? null,
        onboarding_completed_at:
          toProfile.onboarding_completed_at ?? fromProfile.onboarding_completed_at ?? null,
        marketing_opt_in: Boolean(toProfile.marketing_opt_in || fromProfile.marketing_opt_in),
      })
      .eq('id', toUserId);

    if (profileErr) {
      logger.warn({ profileErr, toUserId }, 'merge-accounts: profile merge failed');
    }
  }

  // ── 6. Delete the stub auth user (cascades remaining data) ───────────────
  const { error: deleteErr } = await supabaseAdmin.auth.admin.deleteUser(fromUserId);
  if (deleteErr) {
    logger.warn({ deleteErr, fromUserId }, 'merge-accounts: failed to delete stub auth user');
  }

  logger.info({ fromUserId, toUserId }, 'merge-accounts: complete');
}
