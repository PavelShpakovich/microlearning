import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { readingCreateSchema } from '@/lib/readings/reading-request-schema';
import { createReadingDraft } from '@/lib/readings/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

const db = supabaseAdmin as any;

export const GET = withApiHandler(async () => {
  const { user } = await requireAuth();

  const { data, error } = await db
    .from('readings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return NextResponse.json({ readings: data ?? [] });
});

export const POST = withApiHandler(async (req) => {
  const { user } = await requireAuth();
  const json = await req.json();
  const parsed = readingCreateSchema.safeParse(json);

  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const reading = await createReadingDraft(user.id, parsed.data);
  return NextResponse.json({ reading }, { status: 201 });
});
