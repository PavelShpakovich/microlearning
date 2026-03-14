import type { Database } from '@/lib/supabase/types';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getTelegramIdForUser } from '@/lib/auth/account-identities';

type Theme = Database['public']['Tables']['themes']['Row'];

export async function fetchUserProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const [{ data: profiles }, telegramId] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('display_name, telegram_id')
      .eq('id', session.user.id)
      .limit(1),
    getTelegramIdForUser(session.user.id),
  ]);

  if (!profiles?.[0]) return null;

  return {
    ...profiles[0],
    telegram_id: telegramId ?? profiles[0].telegram_id,
  };
}

/**
 * Fetch user's private themes and public shared themes with card counts.
 * Invalidated via revalidatePath('/dashboard') from server actions.
 */
export async function getUserThemes(userId: string) {
  const [themesResult, publicThemesResult] = await Promise.all([
    // My Themes (owned by me)
    supabaseAdmin
      .from('themes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }),
    // Community Themes (public & not owned by me)
    supabaseAdmin.from('themes').select('*').eq('is_public', true).neq('user_id', userId).limit(50),
  ]);

  if (themesResult.error || publicThemesResult.error) {
    throw new Error('Failed to fetch themes');
  }

  // Collect every theme ID we care about, then fetch card counts in one query.
  const allThemeIds = [
    ...(themesResult.data ?? []).map((t) => t.id),
    ...(publicThemesResult.data ?? []).map((t) => t.id),
  ];

  const cardCountsResult =
    allThemeIds.length > 0
      ? await supabaseAdmin.from('cards').select('theme_id').in('theme_id', allThemeIds)
      : { data: [] };

  const themes = (themesResult.data ?? []) as Theme[];
  const publicThemes = (publicThemesResult.data ?? []) as Theme[];

  const cardCountMap = (cardCountsResult.data ?? []).reduce<Record<string, number>>((acc, c) => {
    if (c.theme_id) acc[c.theme_id] = (acc[c.theme_id] ?? 0) + 1;
    return acc;
  }, {});

  return {
    themes,
    publicThemes,
    cardCounts: cardCountMap,
  };
}

export async function fetchTheme(themeId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { data: themes } = await supabaseAdmin
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .or(`user_id.eq.${session.user.id},is_public.eq.true`)
    .limit(1);
  return themes?.[0] || null;
}
