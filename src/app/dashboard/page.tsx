import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { DashboardSkeleton } from '@/components/skeletons';

type Theme = Database['public']['Tables']['themes']['Row'];

export const metadata = {
  title: 'Dashboard | Microlearning',
  description: 'Manage your learning themes',
};

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch private themes and public shared themes
  const [themesResult, publicThemesResult, cardCountsResult] = await Promise.all([
    // My Themes (owned by me)
    supabaseAdmin
      .from('themes')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    // Community Themes (public & not owned by me)
    supabaseAdmin
      .from('themes')
      .select('*')
      .eq('is_public', true)
      .neq('user_id', session.user.id)
      .limit(50),
    // Card counts (owned only for now, can expand later)
    supabaseAdmin
      .from('cards')
      .select('theme_id, user_id')
      .or(`user_id.eq.${session.user.id},is_public.eq.true`)
      .not('theme_id', 'is', null),
  ]);

  if (themesResult.error || publicThemesResult.error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="rounded-lg bg-red-50 dark:bg-red-950 p-4 text-red-600 dark:text-red-400">
          Failed to load themes. Please try again.
        </div>
      </div>
    );
  }

  const themes = (themesResult.data ?? []) as Theme[];
  const publicThemes = (publicThemesResult.data ?? []) as Theme[];

  const cardCountMap = (cardCountsResult.data ?? []).reduce<Record<string, number>>((acc, c) => {
    if (c.theme_id) acc[c.theme_id] = (acc[c.theme_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient
        initialThemes={themes}
        publicThemes={publicThemes}
        cardCounts={cardCountMap}
      />
    </Suspense>
  );
}
