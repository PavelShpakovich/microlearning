import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';

export const runtime = 'nodejs';

export const GET = withApiHandler(async (req: Request, ctx?: unknown) => {
  const { user, supabase } = await requireAuth();
  const { chartId } = await (ctx as { params: Promise<{ chartId: string }> }).params;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.max(1, Number(url.searchParams.get('pageSize') ?? '5'));

  const start = (page - 1) * pageSize;
  const end = page * pageSize - 1;

  const res = await supabase
    .from('readings')
    .select('id, title, reading_type, status, created_at, summary', { count: 'exact' })
    .eq('chart_id', chartId)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(start, end);

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 });
  }

  const readings = res.data ?? [];
  const total = typeof res.count === 'number' ? res.count : readings.length;

  return NextResponse.json({ readings, page, pageSize, total });
});
