import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BackLink } from '@/components/common/back-link';
import { UsageCard } from '@/components/common/usage-card';
import { PlansCard } from '@/components/common/plans-card';

export const metadata = {
  title: 'Plan & Billing',
  description: 'View your current usage and manage your subscription plan.',
};

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/tg');
  }

  return (
    <main className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <BackLink />
      <UsageCard />
      <PlansCard />
    </main>
  );
}
