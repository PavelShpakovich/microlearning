import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { recalculateChart } from '@/lib/astrology/chart-service';

const uuidSchema = z.string().uuid();

/**
 * POST /api/charts/[chartId]/recalculate
 *
 * Re-runs the astrology engine against the stored birth data and creates
 * a fresh chart snapshot (positions + aspects). The old snapshot is deleted
 * so the latest one always has the correct data.
 */
export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ chartId: string }> } | undefined;
  const chartId = routeContext?.params ? (await routeContext.params).chartId : undefined;

  if (!chartId || !uuidSchema.safeParse(chartId).success) {
    throw new ValidationError({ message: 'Invalid chart ID' });
  }
  const result = await recalculateChart(chartId, user.id);

  return NextResponse.json({
    ok: true,
    ...result,
  });
});
