import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ChartsOverview } from '@/components/astrology/charts-overview';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const metadata = {
  title: 'Рабочее пространство',
  description: 'Астрологическое рабочее пространство для карт и AI-разборов.',
};

export const dynamic = 'force-dynamic';

const db = supabaseAdmin;

export default async function DashboardPage() {
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
