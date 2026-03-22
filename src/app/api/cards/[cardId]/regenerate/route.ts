import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api/handler';
import { requireAuth } from '@/lib/api/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateWithSourceChunking } from '@/services/generation.service';
import { getSubscriptionStatus, incrementCardCount } from '@/lib/subscription-utils';
import { NotFoundError, PlanLimitError, ValidationError } from '@/lib/errors';

export const POST = withApiHandler(async (_req: Request, ctx?: unknown) => {
  const { user, supabase } = await requireAuth();
  const { params } = (ctx as { params: Promise<Record<string, string>> } | undefined) || {};
  const { cardId } = (await params) || {};

  if (!cardId || typeof cardId !== 'string') {
    throw new ValidationError({ message: 'cardId is required' });
  }

  const { data: existingCard } = await supabaseAdmin
    .from('cards')
    .select('id, title, body, theme_id, source_id, is_public, created_at')
    .eq('id', cardId)
    .maybeSingle();

  if (!existingCard?.theme_id) {
    throw new NotFoundError({ message: 'Card not found' });
  }

  const { data: theme } = await supabase
    .from('themes')
    .select('id, user_id, name, description, language')
    .eq('id', existingCard.theme_id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!theme) {
    throw new NotFoundError({ message: 'Theme not found' });
  }

  const subscription = await getSubscriptionStatus(user.id);
  if (!subscription.canGenerate) {
    throw new PlanLimitError({ message: 'GENERATION_LIMIT_REACHED' });
  }

  const [{ data: sources }, { data: siblingCards }, { data: existingBookmark }] = await Promise.all(
    [
      supabaseAdmin
        .from('data_sources')
        .select('id, extracted_text')
        .eq('theme_id', theme.id)
        .eq('status', 'ready'),
      supabaseAdmin
        .from('cards')
        .select('title')
        .eq('theme_id', theme.id)
        .neq('id', existingCard.id),
      supabase
        .from('bookmarked_cards')
        .select('id')
        .eq('user_id', user.id)
        .eq('card_id', existingCard.id)
        .maybeSingle(),
    ],
  );

  const mergedText = sources
    ?.map((source) => source.extracted_text ?? '')
    .filter((text) => text.length > 0)
    .join('\n\n---\n\n');
  const sourceText = mergedText?.length ? mergedText : undefined;
  const topicsToAvoid = siblingCards?.map((card) => card.title) ?? [];

  const generated = await generateWithSourceChunking(
    {
      theme: theme.name,
      description: theme.description ?? undefined,
      sourceText,
      count: 1,
      topicsToAvoid: topicsToAvoid.length > 0 ? topicsToAvoid : undefined,
      language: theme.language as 'en' | 'ru' | undefined,
    },
    topicsToAvoid,
  );

  const replacement = generated[0];
  if (!replacement) {
    throw new Error('Failed to regenerate card');
  }

  const { data: insertedCard, error: insertError } = await supabaseAdmin
    .from('cards')
    .insert({
      user_id: user.id,
      theme_id: theme.id,
      source_id: existingCard.source_id,
      title: replacement.title,
      body: replacement.body,
      topic: theme.name,
      is_public: existingCard.is_public,
      created_at: existingCard.created_at,
    })
    .select()
    .single();

  if (insertError || !insertedCard) {
    throw insertError ?? new Error('Failed to save regenerated card');
  }

  if (existingBookmark) {
    const { error: bookmarkError } = await supabase
      .from('bookmarked_cards')
      .insert({ user_id: user.id, card_id: insertedCard.id });
    if (bookmarkError && bookmarkError.code !== '23505') {
      throw bookmarkError;
    }
  }

  const { error: deleteError } = await supabaseAdmin
    .from('cards')
    .delete()
    .eq('id', existingCard.id);
  if (deleteError) {
    throw deleteError;
  }

  await incrementCardCount(user.id, 1);

  return NextResponse.json({
    card: insertedCard,
    cardsRemaining: Math.max(0, subscription.cardsRemaining - 1),
  });
});
