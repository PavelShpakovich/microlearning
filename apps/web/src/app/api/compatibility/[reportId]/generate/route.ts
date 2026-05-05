import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { generateCompatibilityContent } from '@/lib/compatibility/service';
import { logger } from '@/lib/logger';

export const maxDuration = 300;

const uuidSchema = z.string().uuid();

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ reportId: string }> } | undefined;
  const reportId = routeContext?.params ? (await routeContext.params).reportId : undefined;

  if (!reportId) throw new NotFoundError({ message: 'Report not found' });
  if (!uuidSchema.safeParse(reportId).success)
    throw new ValidationError({ message: 'Invalid report ID' });

  const userId = user.id;
  after(async () => {
    try {
      await generateCompatibilityContent(reportId, userId);
    } catch (err) {
      logger.error({ err, reportId }, 'compatibility: background generation failed');
    }
  });

  return NextResponse.json({ ok: true });
});
