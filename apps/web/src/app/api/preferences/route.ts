import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { ValidationError } from '@/lib/errors';
import { TONE_STYLES } from '@/lib/astrology/constants';

const updatePreferencesSchema = z.object({
  toneStyle: z.enum(TONE_STYLES).optional(),
  contentFocusLove: z.boolean().optional(),
  contentFocusCareer: z.boolean().optional(),
  contentFocusGrowth: z.boolean().optional(),
  allowSpiritualTone: z.boolean().optional(),
});

export const GET = withApiHandler(async () => {
  const { user, supabase } = await requireAuth();

  const { data } = await supabase
    .from('user_preferences')
    .select(
      'tone_style, content_focus_love, content_focus_career, content_focus_growth, allow_spiritual_tone',
    )
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(
    data ?? {
      tone_style: 'balanced',
      content_focus_love: true,
      content_focus_career: true,
      content_focus_growth: true,
      allow_spiritual_tone: false,
    },
  );
});

export const PATCH = withApiHandler(async (req) => {
  const { user, supabase } = await requireAuth();

  const parsed = updatePreferencesSchema.safeParse(await req.json());
  if (!parsed.success) {
    throw new ValidationError({
      message: parsed.error.issues.map((i) => i.message).join(', '),
    });
  }

  const {
    toneStyle,
    contentFocusLove,
    contentFocusCareer,
    contentFocusGrowth,
    allowSpiritualTone,
  } = parsed.data;

  const updateData = {
    user_id: user.id,
    ...(toneStyle !== undefined && { tone_style: toneStyle }),
    ...(contentFocusLove !== undefined && { content_focus_love: contentFocusLove }),
    ...(contentFocusCareer !== undefined && { content_focus_career: contentFocusCareer }),
    ...(contentFocusGrowth !== undefined && { content_focus_growth: contentFocusGrowth }),
    ...(allowSpiritualTone !== undefined && { allow_spiritual_tone: allowSpiritualTone }),
  };

  const { data, error } = await supabase
    .from('user_preferences')
    .upsert(updateData, { onConflict: 'user_id' })
    .select(
      'tone_style, content_focus_love, content_focus_career, content_focus_growth, allow_spiritual_tone',
    )
    .single();

  if (error) throw error;

  return NextResponse.json(data);
});
