import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function fetchUserProfile() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('display_name, streak_count, telegram_id')
    .eq('id', session.user.id)
    .limit(1);
  return profiles?.[0] || null;
}

export async function fetchStudySession(themeId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { data: sessions } = await supabaseAdmin
    .from('sessions')
    .select('*')
    .eq('theme_id', themeId)
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(1);
  return sessions?.[0] || null;
}

export async function fetchStudyCards(sessionId: string) {
  const { data } = await supabaseAdmin
    .from('cards')
    .select('*')
    .eq('study_session_id', sessionId)
    .order('created_at', { ascending: true })
    .limit(50);
  return data || [];
}

export async function fetchTheme(themeId: string) {
  const session = await auth();
  if (!session?.user?.id) return null;
  const { data: themes } = await supabaseAdmin
    .from('themes')
    .select('*')
    .eq('id', themeId)
    .eq('user_id', session.user.id)
    .limit(1);
  return themes?.[0] || null;
}
