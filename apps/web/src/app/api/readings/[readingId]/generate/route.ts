import { NextResponse, after } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { generateReadingContent } from '@/lib/readings/service';
import { logger } from '@/lib/logger';

// Keep generous duration for the background work triggered by after()
export const maxDuration = 300;

const uuidSchema = z.string().uuid();

export const POST = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  // Fire-and-forget: respond immediately, run generation in background.
  // This decouples the pipeline from the HTTP request lifecycle.
  const userId = user.id;
  after(async () => {
    try {
      await generateReadingContent(readingId, userId);
    } catch (err) {
      logger.error({ err, readingId }, 'readings: background generation failed');
    }
  });

  return NextResponse.json({ ok: true });
});
