import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin;
const uuidSchema = z.string().uuid();

export const GET = withApiHandler(async (_req, ctx) => {
  const { user } = await requireAuth();
  const routeContext = ctx as { params?: Promise<{ readingId: string }> } | undefined;
  const readingId = routeContext?.params ? (await routeContext.params).readingId : undefined;

  if (!readingId) throw new NotFoundError({ message: 'Reading not found' });
  if (!uuidSchema.safeParse(readingId).success)
    throw new ValidationError({ message: 'Invalid reading ID' });

  const { data: reading } = await db
    .from('readings')
    .select('id, status')
    .eq('id', readingId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!reading) throw new NotFoundError({ message: 'Reading not found' });

  return NextResponse.json({ status: reading.status });
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
