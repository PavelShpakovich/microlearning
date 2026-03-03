import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';

const createThemeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
});

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();

  const { data: themes, error } = await supabase
    .from('themes')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return NextResponse.json({ themes });
});

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = createThemeSchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { data: theme, error } = await supabase
    .from('themes')
    .insert({ user_id: user.id, ...body.data })
    .select()
    .single();

  if (error ?? !theme) throw error ?? new Error('Failed to create theme');

  return NextResponse.json({ theme }, { status: 201 });
});
