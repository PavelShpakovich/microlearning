import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { BackLink } from '@/components/common/back-link';
import { BillingReturnBanner } from '@/components/common/billing-return-banner';
import { UsageCard } from '@/components/common/usage-card';
import { PlansCard } from '@/components/common/plans-card';
import { areSubscriptionsEnabled } from '@/lib/feature-flags';

export const metadata = {
  title: 'Usage & Plans',
  description: 'View your current usage and plan availability.',
};

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const canShowBilling = areSubscriptionsEnabled();

  return (
    <main className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <BackLink />
      {canShowBilling && <BillingReturnBanner />}
      <UsageCard />
      {canShowBilling && <PlansCard />}
    </main>
  );
}
