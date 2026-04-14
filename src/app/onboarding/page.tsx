import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { ChartIntakeForm } from '@/components/astrology/chart-intake-form';

export async function generateMetadata() {
  const t = await getTranslations('chartForm');
  return { title: t('pageTitle'), description: t('pageDescription') };
}

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return <ChartIntakeForm />;
}
