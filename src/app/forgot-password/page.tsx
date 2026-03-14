import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user?.id) redirect('/dashboard');
  const locale = await getLocale();
  return <ForgotPasswordForm locale={locale as 'en' | 'ru'} />;
}
