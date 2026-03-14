import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { auth } from '@/auth';
import { getUserThemes } from '@/lib/data-fetchers';
import { DashboardClient } from '@/components/dashboard/dashboard-client';
import { DashboardSkeleton } from '@/components/skeletons';

export const metadata = {
  title: 'Dashboard',
  description: 'Manage your learning themes and generate AI flashcards.',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const { themes, publicThemes, cardCounts } = await getUserThemes(session.user.id);

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardClient initialThemes={themes} publicThemes={publicThemes} cardCounts={cardCounts} />
    </Suspense>
  );
}
