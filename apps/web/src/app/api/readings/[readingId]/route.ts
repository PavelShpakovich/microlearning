import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { refundReferenceDebitIfEligible } from '@/lib/credits/service';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

const db = supabaseAdmin;
const uuidSchema = z.string().uuid();

/** If a reading stays in "generating" longer than this, mark it as error. */
const STUCK_GENERATING_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  const { data: reading } = await db
    .from('readings')
    .select(
      'id, chart_id, reading_type, title, summary, status, error_message, created_at, rendered_content_json',
    )
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) throw new NotFoundError({ message: 'Reading not found' });

  // Auto-recover stuck readings: if "generating" for too long, the serverless
  // function was likely killed by infrastructure timeout without reaching the
  // catch block, leaving the row in a zombie state.
  if (reading.status === 'generating') {
    const elapsed = Date.now() - new Date(reading.created_at).getTime();
    if (elapsed > STUCK_GENERATING_THRESHOLD_MS) {
      logger.warn({ readingId, elapsed }, 'readings: auto-recovering stuck generating reading');
      try {
        await refundReferenceDebitIfEligible(
          user.id,
          'reading',
          readingId,
          'reading_debit',
          'refund_llm_failure',
        );
      } catch (refundErr) {
        logger.error(
          { err: refundErr, readingId },
          'readings: failed to refund credits during stuck recovery',
        );
      }
      await db
        .from('readings')
        .update({
          status: 'error',
          error_message: 'Generation timed out — the server did not finish in time. Please retry.',
        })
        .eq('id', readingId);
      reading.status = 'error';
      reading.error_message =
        'Generation timed out — the server did not finish in time. Please retry.';
    }
  }

  const { data: sections } = await db
    .from('reading_sections')
    .select('id, section_key, title, content, sort_order')
    .eq('reading_id', readingId)
    .order('sort_order', { ascending: true });

  return NextResponse.json({
    status: reading.status, // backward compat for web status poller
    reading: {
      ...reading,
      reading_sections: sections ?? [],
    },
  });
});

export const DELETE = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  const { data: reading } = await db
    .from('readings')
    .select('id')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) throw new NotFoundError({ message: 'Reading not found' });

  await db.from('readings').delete().eq('id', readingId).eq('user_id', user.id);

  return NextResponse.json({ ok: true });
});
