import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('streak_count, display_name, telegram_id, last_study_date')
    .eq('id', user.id)
    .single();

  if (error ?? !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json(profile);
});
