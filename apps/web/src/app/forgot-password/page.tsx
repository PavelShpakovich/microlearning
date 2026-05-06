import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Сброс пароля' : 'Reset Password',
    description: isRu
      ? 'Восстановите доступ к своему аккаунту Clario Astrology.'
      : 'Recover access to your Clario Astrology account.',
    robots: { index: false, follow: false },
  };
}

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');
  return <ForgotPasswordForm />;
}
