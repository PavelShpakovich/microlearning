import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { RegisterForm } from '@/components/auth/register-form';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Регистрация' : 'Create Account',
    description: isRu
      ? 'Создайте аккаунт в Clario Astrology — бесплатный доступ к натальным картам и персональным AI-разборам.'
      : 'Create a free Clario Astrology account to get natal charts and personalised AI astrology readings.',
    robots: { index: false, follow: false },
  };
}

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');
  return <RegisterForm />;
}
