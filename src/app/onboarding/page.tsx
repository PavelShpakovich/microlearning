import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { ChartIntakeForm } from '@/components/astrology/chart-intake-form';

export const metadata = {
  title: 'Onboarding',
  description: 'Укажите данные рождения, чтобы создать первую астрологическую карту.',
};

export default async function OnboardingPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  return <ChartIntakeForm />;
}
