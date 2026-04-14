'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/services/auth-api';
import { AuthShell } from '@/components/auth/auth-shell';

export function LoginForm() {
  const t = useTranslations('auth');
  const validation = useTranslations('validation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const verifiedParam = searchParams.get('verified');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes('@')) {
      toast.error(validation('invalidEmail'));
      return;
    }

    try {
      setIsSubmitting(true);
      setShowResend(false);

      await signOut({ redirect: false });

      const result = await signIn('password', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result?.ok) {
        if (result?.error === 'email_not_verified') {
          setShowResend(true);
          toast.error(t('emailNotVerified'));
        } else {
          toast.error(t('invalidCredentials'));
        }
        return;
      }

      toast.success(t('loginSuccess'));
      window.location.href = result.url || callbackUrl;
    } catch {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!email.includes('@')) {
      toast.error(validation('invalidEmail'));
      return;
    }
    try {
      setIsResending(true);
      await authApi.resendVerificationEmail(email);
      toast.success(t('resendVerificationSuccess'));
    } catch {
      toast.error(t('error'));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthShell
      title={t('loginTitle')}
      description={t('loginDescription')}
      footer={
        <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
          <p>
            {t('noAccount')}{' '}
            <Link href="/register" className="text-primary hover:underline">
              {t('signUpLink')}
            </Link>
          </p>
          <p>
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t('forgotPassword')}
            </Link>
          </p>
          <p>{t('telegramHint')}</p>
        </div>
      }
    >
      {verifiedParam === 'true' ? (
        <p className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 dark:bg-green-950/30 dark:border-green-800 dark:text-green-400">
          {t('emailVerified')}
        </p>
      ) : null}
      {verifiedParam === 'error' ? (
        <p className="rounded-md bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {t('emailVerificationError')}
        </p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t('emailPlaceholder')}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('signingIn') : t('signIn')}
        </Button>
        {showResend ? (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void onResend()}
            disabled={isResending}
          >
            {isResending ? t('sending') : t('resendVerification')}
          </Button>
        ) : null}
      </form>
    </AuthShell>
  );
}
