import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { chartCreateSchema } from '@/lib/astrology/chart-schema';
import { createChart } from '@/lib/astrology/chart-service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  const { data, error } = await db
    .from('charts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return NextResponse.json({ charts: data ?? [] });
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();
  const json = await req.json();
  const parsed = chartCreateSchema.safeParse(json);

  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const result = await createChart(user.id, parsed.data);

  return NextResponse.json(
    {
      chart: result.chart,
      snapshot: result.snapshot,
    },
    { status: 201 },
  );
});
