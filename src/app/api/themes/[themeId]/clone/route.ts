import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getUserPlan } from '@/lib/subscription-utils';
import { NotFoundError, PlanLimitError, ValidationError } from '@/lib/errors';

export const POST = withApiHandler(async (_req: Request, ctx?: unknown) => {
  const { user, supabase } = await requireAuth();
  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { themeId } = (await params) || {};

  if (!themeId || typeof themeId !== 'string') {
    throw new ValidationError({ message: 'themeId is required' });
  }

  const plan = await getUserPlan(user.id);
  if (!plan.communityThemes) {
    throw new PlanLimitError({
      message: 'Community themes are currently unavailable for this account.',
    });
  }

  if (plan.maxThemes !== null) {
    const { count } = await supabase
      .from('themes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count ?? 0) >= plan.maxThemes) {
      throw new PlanLimitError({
        message: `Theme limit reached — your current limit is ${plan.maxThemes} theme${plan.maxThemes === 1 ? '' : 's'}.`,
      });
    }
  }

  const { data: sourceTheme } = await supabaseAdmin
    .from('themes')
    .select('id, name, description, language')
    .eq('id', themeId)
    .eq('is_public', true)
    .maybeSingle();

  if (!sourceTheme) {
    throw new NotFoundError({ message: 'Theme not found' });
  }

  const { data: clonedTheme, error: themeInsertError } = await supabase
    .from('themes')
    .insert({
      user_id: user.id,
      name: sourceTheme.name,
      description: sourceTheme.description,
      language: sourceTheme.language,
      is_public: false,
    })
    .select('id')
    .single();

  if (themeInsertError || !clonedTheme) {
    throw themeInsertError ?? new Error('Failed to clone theme');
  }

  const { data: sourceCards, error: sourceCardsError } = await supabaseAdmin
    .from('cards')
    .select('title, body, topic, created_at')
    .eq('theme_id', themeId)
    .order('created_at', { ascending: true });

  if (sourceCardsError) {
    throw sourceCardsError;
  }

  if (sourceCards && sourceCards.length > 0) {
    const { error: cardsInsertError } = await supabase.from('cards').insert(
      sourceCards.map((card) => ({
        user_id: user.id,
        theme_id: clonedTheme.id,
        source_id: null,
        title: card.title,
        body: card.body,
        topic: card.topic,
        is_public: false,
        created_at: card.created_at,
      })),
    );

    if (cardsInsertError) {
      throw cardsInsertError;
    }
  }

  return NextResponse.json({ themeId: clonedTheme.id }, { status: 201 });
});
