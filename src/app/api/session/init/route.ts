import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';

const bodySchema = z.object({
  themeId: z.string().uuid(),
});

export const POST = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const body = bodySchema.safeParse(await req.json());
  if (!body.success) {
    throw new ValidationError({
      message: body.error.issues.map((issue) => issue.message).join(', '),
    });
  }

  const { themeId } = body.data;

  // Return existing session if one already exists for this user+theme today
  const today = new Date().toISOString().split('T')[0];
  const { data: existingSession } = await supabase
    .from('sessions')
    .select('id')
    .eq('user_id', user.id)
    .eq('theme_id', themeId)
    .gte('created_at', `${today}T00:00:00.000Z`)
    .maybeSingle();

  if (existingSession) {
    return NextResponse.json({ sessionId: existingSession.id });
  }

  // Update streak if this is the first session of the day
  // Note: This requires the 0003_add_streak_tracking migration to be applied
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_study_date, streak_count')
      .eq('id', user.id)
      .single();

    if (profile) {
      const profileData = profile as unknown as { last_study_date: string | null; streak_count: number };
      const lastStudyDate = profileData.last_study_date ? new Date(profileData.last_study_date) : null;
      const today_obj = new Date(today);
      today_obj.setUTCHours(0, 0, 0, 0);
      
      let newStreak = profileData.streak_count || 0;
      
      if (!lastStudyDate) {
        // First time studying
        newStreak = 1;
      } else {
        const lastDate = new Date(lastStudyDate);
        lastDate.setUTCHours(0, 0, 0, 0);
        const daysDiff = Math.floor((today_obj.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === 0) {
          // Already studied today, keep streak
          newStreak = profileData.streak_count || 1;
        } else if (daysDiff === 1) {
          // Studied yesterday, increment streak
          newStreak = (profileData.streak_count || 0) + 1;
        } else {
          // Gap in streak, reset to 1
          newStreak = 1;
        }
      }
      
      // Update profile with new streak and today's date
      await supabase
        .from('profiles')
        .update({ streak_count: newStreak, last_study_date: today } as any)
        .eq('id', user.id);
    }
  } catch {
    // Silently ignore if streak columns don't exist yet (migration not applied)
    // The feature will work once migration is applied
  }

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({ user_id: user.id, theme_id: themeId })
    .select('id')
    .single();

  if (error ?? !session) {
    throw new Error('Failed to create session');
  }

  return NextResponse.json({ sessionId: session.id }, { status: 201 });
});
