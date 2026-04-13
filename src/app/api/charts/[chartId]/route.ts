import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin as any;

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const { chartId } = (ctx ?? {}) as { chartId?: string };

  if (!chartId) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  const [{ data: chart }, { data: snapshots }, { data: positions }, { data: aspects }] =
    await Promise.all([
      db.from('charts').select('*').eq('id', chartId).eq('user_id', user.id).maybeSingle(),
      db
        .from('chart_snapshots')
        .select('*')
        .eq('chart_id', chartId)
        .order('snapshot_version', { ascending: false }),
      db
        .from('chart_positions')
        .select('*')
        .in(
          'chart_snapshot_id',
          (await db.from('chart_snapshots').select('id').eq('chart_id', chartId)).data?.map(
            (item: { id: string }) => item.id,
          ) ?? [],
        ),
      db
        .from('chart_aspects')
        .select('*')
        .in(
          'chart_snapshot_id',
          (await db.from('chart_snapshots').select('id').eq('chart_id', chartId)).data?.map(
            (item: { id: string }) => item.id,
          ) ?? [],
        ),
    ]);

  if (!chart) {
    throw new NotFoundError({ message: 'Chart not found' });
  }

  return NextResponse.json({
    chart,
    snapshots: snapshots ?? [],
    positions: positions ?? [],
    aspects: aspects ?? [],
  });
});
