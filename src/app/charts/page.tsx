import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { ChartsOverview } from '@/components/astrology/charts-overview';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function generateMetadata() {
  const t = await getTranslations('workspace');
  return { title: t('chartsPageTitle'), description: t('chartsPageDescription') };
}

const db = supabaseAdmin;

export default async function ChartsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const [{ data: charts }, { data: profile }] = await Promise.all([
    db
      .from('charts')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false }),
    db.from('profiles').select('onboarding_completed_at').eq('id', session.user.id).maybeSingle(),
  ]);

  const needsOnboarding = !profile?.onboarding_completed_at;

  return <ChartsOverview charts={charts ?? []} needsOnboarding={needsOnboarding} />;
}
