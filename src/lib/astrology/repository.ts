import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';
import type { ChartComputationResult } from '@/lib/astrology/types';
import type { ChartCreateInput } from '@/lib/astrology/chart-schema';
import { NotFoundError } from '@/lib/errors';

const db = supabaseAdmin;

export async function createChartRecord(userId: string, input: ChartCreateInput) {
  const { data, error } = await db
    .from('charts')
    .insert({
      user_id: userId,
      label: input.label,
      subject_type: input.subjectType,
      person_name: input.personName,
      birth_date: input.birthDate,
      birth_time: input.birthTime ?? null,
      birth_time_known: input.birthTimeKnown,
      timezone: input.timezone ?? null,
      city: input.city,
      country: input.country,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      house_system: input.houseSystem,
      source: 'manual',
      status: 'pending',
      notes: input.notes ?? null,
    })
    .select('*')
    .single();

  if (error || !data) {
    throw error ?? new Error('Failed to create chart');
  }

  return data;
}

export async function markOnboardingComplete(userId: string) {
  const now = new Date().toISOString();
  const { error } = await db
    .from('profiles')
    .update({ onboarding_completed_at: now, birth_data_consent_at: now, updated_at: now })
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

export async function markChartFailed(chartId: string) {
  const { error } = await db.from('charts').update({ status: 'error' }).eq('id', chartId);

  if (error) {
    throw error;
  }
}

export async function getChartWithBirthData(chartId: string, userId: string) {
  const { data: chart, error } = await db
    .from('charts')
    .select('*')
    .eq('id', chartId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!chart) throw new NotFoundError({ message: 'Chart not found' });

  return chart;
}

export async function deleteChartSnapshots(chartId: string) {
  const { data: existingSnapshots, error: snapshotsError } = await db
    .from('chart_snapshots')
    .select('id')
    .eq('chart_id', chartId);

  if (snapshotsError) throw snapshotsError;

  if (!existingSnapshots || existingSnapshots.length === 0) {
    return;
  }

  const snapshotIds = existingSnapshots.map((snapshot) => snapshot.id);

  const { error: aspectsError } = await db
    .from('chart_aspects')
    .delete()
    .in('chart_snapshot_id', snapshotIds);
  if (aspectsError) throw aspectsError;

  const { error: positionsError } = await db
    .from('chart_positions')
    .delete()
    .in('chart_snapshot_id', snapshotIds);
  if (positionsError) throw positionsError;

  const { error: deleteError } = await db.from('chart_snapshots').delete().eq('chart_id', chartId);
  if (deleteError) throw deleteError;
}

export async function saveChartSnapshot(chartId: string, result: ChartComputationResult) {
  const { data: latestSnapshot } = await db
    .from('chart_snapshots')
    .select('snapshot_version')
    .eq('chart_id', chartId)
    .order('snapshot_version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const snapshotVersion = (latestSnapshot?.snapshot_version ?? 0) + 1;

  const { data: snapshot, error: snapshotError } = await db
    .from('chart_snapshots')
    .insert({
      chart_id: chartId,
      snapshot_version: snapshotVersion,
      calculation_provider: result.provider,
      raw_input_json: {},
      computed_chart_json: result.computedChart as Json,
      warnings_json: result.warnings,
    })
    .select('id, snapshot_version')
    .single();

  if (snapshotError || !snapshot) {
    throw snapshotError ?? new Error('Failed to create chart snapshot');
  }

  if (result.positions.length > 0) {
    const { error } = await db.from('chart_positions').insert(
      result.positions.map((position) => ({
        chart_snapshot_id: snapshot.id,
        body_key: position.bodyKey,
        sign_key: position.signKey,
        house_number: position.houseNumber ?? null,
        degree_decimal: position.degreeDecimal,
        retrograde: position.retrograde,
      })),
    );

    if (error) throw error;
  }

  if (result.aspects.length > 0) {
    const { error } = await db.from('chart_aspects').insert(
      result.aspects.map((aspect) => ({
        chart_snapshot_id: snapshot.id,
        body_a: aspect.bodyA,
        body_b: aspect.bodyB,
        aspect_key: aspect.aspectKey,
        orb_decimal: aspect.orbDecimal,
        applying: aspect.applying ?? null,
      })),
    );

    if (error) throw error;
  }

  const { error: updateError } = await db
    .from('charts')
    .update({ status: 'ready' })
    .eq('id', chartId);

  if (updateError) throw updateError;

  return snapshot;
}
