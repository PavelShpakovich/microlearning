'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';

export function LoginForm() {
  const t = useTranslations('auth');
  const validation = useTranslations('validation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes('@')) {
      toast.error(validation('invalidEmail'));
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await signIn('password', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result?.ok) {
        toast.error(t('invalidCredentials'));
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

  return (
    <AuthShell
      title={t('loginTitle')}
      description={t('loginDescription')}
      footer={
        <div className="space-y-2 text-center text-sm text-muted-foreground">
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
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
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
        <div className="space-y-2">
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
      </form>
    </AuthShell>
  );
}
