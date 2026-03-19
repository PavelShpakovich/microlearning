'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/services/auth-api';
import { AuthShell } from '@/components/auth/auth-shell';

export function RegisterForm() {
  const t = useTranslations('auth');
  const validation = useTranslations('validation');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes('@')) {
      toast.error(validation('invalidEmail'));
      return;
    }

    if (password.length < 6) {
      toast.error(validation('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(validation('passwordsDoNotMatch'));
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string; message?: string };
        const msg = data.error || data.message || '';
        if (msg.toLowerCase().includes('already exists')) {
          toast.error(t('emailAlreadyExists'));
        } else {
          toast.error(t('error'));
        }
        return;
      }

      // Account created — the user must verify their email before they can log in.
      setNeedsVerification(true);
    } catch {
      toast.error(t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
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

  if (needsVerification) {
    return (
      <AuthShell
        title={t('verifyEmailTitle')}
        description={t('verifyEmailDescription', { email })}
        footer={
          <div className="text-center text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link href="/login" className="text-primary hover:underline">
              {t('signInLink')}
            </Link>
          </div>
        }
      >
        <Button
          className="w-full"
          variant="outline"
          onClick={() => void onResend()}
          disabled={isResending}
        >
          {isResending ? t('sending') : t('resendVerification')}
        </Button>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={t('registerTitle')}
      description={t('registerDescription')}
      footer={
        <div className="text-center text-sm text-muted-foreground">
          {t('haveAccount')}{' '}
          <Link href="/login" className="text-primary hover:underline">
            {t('signInLink')}
          </Link>
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
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
          <Input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('signingUp') : t('signUp')}
        </Button>
      </form>
    </AuthShell>
  );
}
