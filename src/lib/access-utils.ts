import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUsagePolicy } from '@/lib/usage-policy';

/**
 * Workspace access helpers for the current non-subscription product model.
 */

const db = supabaseAdmin;

export interface WorkspaceAccessStatus {
  accessMode: 'direct';
  chartsLimit: number;
  chartsCreated: number;
  chartsRemaining: number;
  hasPaidAccess: boolean;
  canCreateCharts: boolean;
  usage: {
    chartsCreated: number;
    chartsLimit: number;
    chartsRemaining: number;
  };
  policy: {
    chartsPerPeriod: number;
    savedChartsLimit: number | null;
  };
}

export async function getWorkspaceAccessStatus(userId: string): Promise<WorkspaceAccessStatus> {
  const now = new Date();
  const policy = await getUsagePolicy();

  const { data: usage } = await db
    .from('usage_counters')
    .select('charts_created')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  const chartsCreated = usage?.charts_created ?? 0;
  const chartsRemaining = Math.max(0, policy.chartsPerPeriod - chartsCreated);

  return {
    accessMode: 'direct',
    chartsLimit: policy.chartsPerPeriod,
    chartsCreated,
    chartsRemaining,
    hasPaidAccess: false,
    canCreateCharts: chartsRemaining > 0,
    usage: {
      chartsCreated,
      chartsLimit: policy.chartsPerPeriod,
      chartsRemaining,
    },
    policy: {
      chartsPerPeriod: policy.chartsPerPeriod,
      savedChartsLimit: policy.savedChartsLimit,
    },
  };
}

export async function getUserAccessPolicy(userId: string): Promise<{
  accessMode: 'direct';
  chartsLimit: number;
  savedChartsLimit: number | null;
}> {
  void userId;
  const policy = await getUsagePolicy();

  return {
    accessMode: 'direct',
    chartsLimit: policy.chartsPerPeriod,
    savedChartsLimit: policy.savedChartsLimit,
  };
}

export async function getUserUsage(
  userId: string,
): Promise<{ chartsCreated: number; chartsLimit: number; chartsRemaining: number }> {
  const policy = await getUsagePolicy();
  const now = new Date();

  const { data: usage } = await db
    .from('usage_counters')
    .select('charts_created')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  const chartsCreated = usage?.charts_created ?? 0;
  return {
    chartsCreated,
    chartsLimit: policy.chartsPerPeriod,
    chartsRemaining: Math.max(0, policy.chartsPerPeriod - chartsCreated),
  };
}

export async function resetUsage(userId: string): Promise<void> {
  await db.from('usage_counters').delete().eq('user_id', userId);
}

export { getUsagePolicy } from '@/lib/usage-policy';

export async function incrementChartCount(userId: string, count: number): Promise<void> {
  const now = new Date();

  const { data: existingUsage, error: fetchError } = await db
    .from('usage_counters')
    .select('id, charts_created')
    .eq('user_id', userId)
    .lte('period_start', now.toISOString())
    .gte('period_end', now.toISOString())
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  if (existingUsage) {
    const newCount = (existingUsage.charts_created ?? 0) + count;
    const { error: updateError } = await db
      .from('usage_counters')
      .update({ charts_created: newCount })
      .eq('id', existingUsage.id);

    if (updateError) throw updateError;
    return;
  }

  const periodStart = new Date();
  periodStart.setDate(1);
  periodStart.setHours(0, 0, 0, 0);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { error: insertError } = await db.from('usage_counters').insert({
    user_id: userId,
    charts_created: count,
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
  });

  if (insertError && insertError.code !== '23505') {
    throw insertError;
  }
}
