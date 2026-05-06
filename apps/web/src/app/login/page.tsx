import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { LoginForm } from '@/components/auth/login-form';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale === 'ru';
  return {
    title: isRu ? 'Войти' : 'Sign In',
    description: isRu
      ? 'Войдите в Clario Astrology, чтобы получить доступ к своим натальным картам и AI-разборам.'
      : 'Sign in to Clario Astrology to access your natal charts and AI astrology readings.',
    robots: { index: false, follow: false },
  };
}

export default async function LoginPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');
  return <LoginForm />;
}
