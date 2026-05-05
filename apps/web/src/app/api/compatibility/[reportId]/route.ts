import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { computeHarmonyScore, type HarmonyPositionRow } from '@/lib/compatibility/service';
import { logger } from '@/lib/logger';

const db = supabaseAdmin;
const uuidSchema = z.string().uuid();

/** If a report stays in "generating" longer than this, mark it as error. */
const STUCK_GENERATING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ reportId: string }> } | undefined;
  const reportId = routeContext?.params ? (await routeContext.params).reportId : undefined;

  if (!reportId) throw new NotFoundError({ message: 'Report not found' });
  if (!uuidSchema.safeParse(reportId).success)
    throw new ValidationError({ message: 'Invalid report ID' });

  const { data: report } = await db
    .from('compatibility_reports')
    .select('*')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Report not found' });

  // Auto-recover stuck reports: if "generating" for too long, mark as error.
  if (report.status === 'generating') {
    const elapsed = Date.now() - new Date(report.created_at).getTime();
    if (elapsed > STUCK_GENERATING_THRESHOLD_MS) {
      logger.warn({ reportId, elapsed }, 'compatibility: auto-recovering stuck generating report');
      await db.from('compatibility_reports').update({ status: 'error' }).eq('id', reportId);
      report.status = 'error';
    }
  }

  // Attach person names and compute harmony score
  const [{ data: primaryChart }, { data: secondaryChart }] = await Promise.all([
    db.from('charts').select('id, person_name').eq('id', report.primary_chart_id).maybeSingle(),
    db.from('charts').select('id, person_name').eq('id', report.secondary_chart_id).maybeSingle(),
  ]);

  let harmonyScore: number | null = null;
  if (report.status === 'ready') {
    const compatibilityType =
      ((report as Record<string, unknown>).compatibility_type as
        | 'romantic'
        | 'friendship'
        | 'business'
        | 'family'
        | undefined) ?? 'romantic';
    const [primarySnapRes, secondarySnapRes] = await Promise.all([
      db
        .from('chart_snapshots')
        .select('id')
        .eq('chart_id', report.primary_chart_id)
        .order('snapshot_version', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db
        .from('chart_snapshots')
        .select('id')
        .eq('chart_id', report.secondary_chart_id)
        .order('snapshot_version', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const [primRes, secRes] = await Promise.all([
      primarySnapRes.data?.id
        ? db
            .from('chart_positions')
            .select('body_key, degree_decimal')
            .eq('chart_snapshot_id', primarySnapRes.data.id)
        : { data: [] as HarmonyPositionRow[] },
      secondarySnapRes.data?.id
        ? db
            .from('chart_positions')
            .select('body_key, degree_decimal')
            .eq('chart_snapshot_id', secondarySnapRes.data.id)
        : { data: [] as HarmonyPositionRow[] },
    ]);
    harmonyScore = computeHarmonyScore(
      (primRes.data ?? []) as HarmonyPositionRow[],
      (secRes.data ?? []) as HarmonyPositionRow[],
      compatibilityType,
    );
  }

  return NextResponse.json({
    report: {
      ...report,
      primary_person_name: primaryChart?.person_name ?? null,
      secondary_person_name: secondaryChart?.person_name ?? null,
      harmony_score: harmonyScore,
    },
  });
});

export const DELETE = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ reportId: string }> } | undefined;
  const reportId = routeContext?.params ? (await routeContext.params).reportId : undefined;

  if (!reportId) throw new NotFoundError({ message: 'Report not found' });
  if (!uuidSchema.safeParse(reportId).success)
    throw new ValidationError({ message: 'Invalid report ID' });

  const { data: report } = await db
    .from('compatibility_reports')
    .select('id')
    .eq('id', reportId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!report) throw new NotFoundError({ message: 'Report not found' });

  await db.from('compatibility_reports').delete().eq('id', reportId).eq('user_id', user.id);

  return NextResponse.json({ ok: true });
});
