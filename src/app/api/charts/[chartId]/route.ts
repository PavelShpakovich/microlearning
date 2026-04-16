import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { HOUSE_SYSTEMS, CHART_SUBJECT_TYPES } from '@/lib/astrology/constants';
import { recalculateChart } from '@/lib/astrology/chart-service';
import { clearDailyForecastsForChart } from '@/lib/forecasts/service';

const db = supabaseAdmin;

const uuidSchema = z.string().uuid();

function normalizeBirthTime(value: string): string {
  return value.slice(0, 5);
}

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ chartId: string }> } | undefined;
  const chartId = routeContext?.params ? (await routeContext.params).chartId : undefined;

  if (!chartId) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  if (!uuidSchema.safeParse(chartId).success) {
    throw new ValidationError({ message: 'Invalid chart ID format' });
  }

  const [{ data: chart }, { data: snapshots }] = await Promise.all([
    db.from('charts').select('*').eq('id', chartId).eq('user_id', user.id).maybeSingle(),
    db
      .from('chart_snapshots')
      .select('*')
      .eq('chart_id', chartId)
      .order('snapshot_version', { ascending: false }),
  ]);

  if (!chart) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  const snapshotIds = (snapshots ?? []).map((snapshot) => snapshot.id);
  const [{ data: positions }, { data: aspects }] = await Promise.all([
    snapshotIds.length > 0
      ? db.from('chart_positions').select('*').in('chart_snapshot_id', snapshotIds)
      : Promise.resolve({ data: [] }),
    snapshotIds.length > 0
      ? db.from('chart_aspects').select('*').in('chart_snapshot_id', snapshotIds)
      : Promise.resolve({ data: [] }),
  ]);

  return NextResponse.json({
    chart,
    snapshots: snapshots ?? [],
    positions: positions ?? [],
    aspects: aspects ?? [],
  });
});

const chartPatchSchema = z.object({
  label: z.string().min(1).max(120).optional(),
  personName: z.string().min(1).max(120).optional(),
  subjectType: z.enum(CHART_SUBJECT_TYPES).optional(),
  birthDate: z.string().date().optional(),
  birthTime: z
    .string()
    .regex(/^\d{2}:\d{2}(?::\d{2})?$/)
    .transform(normalizeBirthTime)
    .nullable()
    .optional(),
  birthTimeKnown: z.boolean().optional(),
  city: z.string().min(1).max(120).optional(),
  country: z.string().min(1).max(120).optional(),
  timezone: z.string().max(60).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  houseSystem: z.enum(HOUSE_SYSTEMS).optional(),
  notes: z.string().max(500).nullable().optional(),
});

export const PATCH = withApiHandler(async (req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ chartId: string }> } | undefined;
  const chartId = routeContext?.params ? (await routeContext.params).chartId : undefined;

  if (!chartId) throw new NotFoundError({ message: 'Chart not found' });
  if (!uuidSchema.safeParse(chartId).success)
    throw new ValidationError({ message: 'Invalid chart ID' });

  const json = await req.json();
  const parsed = chartPatchSchema.safeParse(json);
  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues.map((i) => i.message).join(', '),
    });
  }

  // Verify ownership
  const { data: chart } = await db
    .from('charts')
    .select('*')
    .eq('id', chartId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!chart) throw new NotFoundError({ message: 'Chart not found' });

  const updates: Record<string, unknown> = {};
  const d = parsed.data;
  if (d.label !== undefined) updates.label = d.label;
  if (d.personName !== undefined) updates.person_name = d.personName;
  if (d.subjectType !== undefined) updates.subject_type = d.subjectType;
  if (d.birthDate !== undefined) updates.birth_date = d.birthDate;
  if (d.birthTime !== undefined) updates.birth_time = d.birthTime;
  if (d.birthTimeKnown !== undefined) updates.birth_time_known = d.birthTimeKnown;
  if (d.city !== undefined) updates.city = d.city;
  if (d.country !== undefined) updates.country = d.country;
  if (d.timezone !== undefined) updates.timezone = d.timezone;
  if (d.latitude !== undefined) updates.latitude = d.latitude;
  if (d.longitude !== undefined) updates.longitude = d.longitude;
  if (d.houseSystem !== undefined) updates.house_system = d.houseSystem;
  if (d.notes !== undefined) updates.notes = d.notes;

  const astrologyInputsChanged =
    (d.birthDate !== undefined && d.birthDate !== chart.birth_date) ||
    (d.birthTime !== undefined && (d.birthTime ?? null) !== (chart.birth_time ?? null)) ||
    (d.birthTimeKnown !== undefined && d.birthTimeKnown !== chart.birth_time_known) ||
    (d.city !== undefined && d.city !== chart.city) ||
    (d.country !== undefined && d.country !== chart.country) ||
    (d.timezone !== undefined && (d.timezone ?? null) !== (chart.timezone ?? null)) ||
    (d.latitude !== undefined && (d.latitude ?? null) !== (chart.latitude ?? null)) ||
    (d.longitude !== undefined && (d.longitude ?? null) !== (chart.longitude ?? null)) ||
    (d.houseSystem !== undefined && d.houseSystem !== chart.house_system);

  const subjectTypeChanged = d.subjectType !== undefined && d.subjectType !== chart.subject_type;
  const shouldRecalculate = astrologyInputsChanged;

  const { data: updated, error } = await db
    .from('charts')
    .update(updates)
    .eq('id', chartId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error || !updated) throw error ?? new Error('Failed to update chart');

  const affectsSelfForecast =
    (astrologyInputsChanged || subjectTypeChanged) &&
    (chart.subject_type === 'self' || updated.subject_type === 'self');

  let recalcResult:
    | {
        snapshot: { id: string; snapshot_version: number };
        positionCount: number;
        aspectCount: number;
        warnings: unknown;
      }
    | undefined;

  if (shouldRecalculate) {
    recalcResult = await recalculateChart(chartId, user.id);
  }

  if (affectsSelfForecast) {
    await clearDailyForecastsForChart(chartId, user.id);
  }

  return NextResponse.json({
    chart: updated,
    recalculated: shouldRecalculate,
    forecastInvalidated: affectsSelfForecast,
    snapshot: recalcResult?.snapshot,
  });
});

export const DELETE = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ chartId: string }> } | undefined;
  const chartId = routeContext?.params ? (await routeContext.params).chartId : undefined;

  if (!chartId) throw new NotFoundError({ message: 'Chart not found' });
  if (!uuidSchema.safeParse(chartId).success)
    throw new ValidationError({ message: 'Invalid chart ID' });

  const { data: chart } = await db
    .from('charts')
    .select('id')
    .eq('id', chartId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!chart) throw new NotFoundError({ message: 'Chart not found' });

  await db.from('charts').delete().eq('id', chartId).eq('user_id', user.id);

  return NextResponse.json({ ok: true });
});
