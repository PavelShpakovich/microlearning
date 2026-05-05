import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { generateDailyForecast } from '@/lib/forecasts/service';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

export const maxDuration = 300;

const uuidSchema = z.string().uuid();

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ forecastId: string }> } | undefined;
  const forecastId = routeContext?.params ? (await routeContext.params).forecastId : undefined;

  if (!forecastId) throw new NotFoundError({ message: 'Forecast not found' });
  if (!uuidSchema.safeParse(forecastId).success)
    throw new ValidationError({ message: 'Invalid forecast ID' });

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('timezone')
    .eq('id', user.id)
    .maybeSingle();

  const userId = user.id;
  const timezone = profile?.timezone;
  after(async () => {
    try {
      await generateDailyForecast(forecastId, userId, timezone);
    } catch (err) {
      logger.error({ err, forecastId }, 'forecasts: background generation failed');
    }
  });

  return NextResponse.json({ ok: true });
});
