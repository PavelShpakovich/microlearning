import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { clearDailyForecastContent } from '@/lib/forecasts/service';
import { checkRateLimit, rateLimitHeaders } from '@/lib/rate-limit';

const uuidSchema = z.string().uuid();

// Allow max 5 regenerations per user per hour
const REGEN_LIMIT = 5;
const REGEN_WINDOW_MS = 60 * 60 * 1000;

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();

  const rl = checkRateLimit(`forecast-regen:${user.id}`, REGEN_LIMIT, REGEN_WINDOW_MS);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Too many regeneration requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const routeContext = ctx as { params?: Promise<{ forecastId: string }> } | undefined;
  const forecastId = routeContext?.params ? (await routeContext.params).forecastId : undefined;

  if (!forecastId) throw new NotFoundError({ message: 'Forecast not found' });
  if (!uuidSchema.safeParse(forecastId).success)
    throw new ValidationError({ message: 'Invalid forecast ID' });

  await clearDailyForecastContent(forecastId, user.id);

  return NextResponse.json({ ok: true });
});
