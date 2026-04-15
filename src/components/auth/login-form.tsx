'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { authApi } from '@/services/auth-api';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Field = 'email' | 'password';
type Errors = Partial<Record<Field, string>>;

export function LoginForm() {
  const t = useTranslations('auth');
  const v = useTranslations('validation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const verifiedParam = searchParams.get('verified');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (field: Field, value: string): string | undefined => {
    if (field === 'email') {
      const trimmed = value.trim();
      if (!trimmed) return v('emailRequired');
      if (!EMAIL_RE.test(trimmed)) return v('invalidEmail');
    }
    if (field === 'password' && !value) return v('passwordRequired');
    return undefined;
  };

  const touch = (field: Field, value: string) =>
    setErrors((prev) => ({ ...prev, [field]: validate(field, value) }));

  const change = (field: Field, value: string, set: (v: string) => void) => {
    set(value);
    if (errors[field]) touch(field, value);
  };

  const inputClass = (field: Field) =>
    cn(errors[field] && 'border-destructive/50 focus-visible:ring-destructive');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Errors = {
      email: validate('email', email),
      password: validate('password', password),
    };
    setErrors(next);
    if (Object.values(next).some(Boolean)) return;

    try {
      setIsSubmitting(true);
      setShowResend(false);
      await signOut({ redirect: false });

      const result = await signIn('password', {
        email: email.trim(),
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
    const emailError = validate('email', email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }
    try {
      setIsResending(true);
      await authApi.resendVerificationEmail(email.trim());
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
        </div>
      }
    >
      {verifiedParam === 'true' && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
          {t('emailVerified')}
        </p>
      )}
      {verifiedParam === 'error' && (
        <p className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t('emailVerificationError')}
        </p>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
        <FormField id="login-email" label={t('email')} error={errors.email}>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => change('email', e.target.value, setEmail)}
            onBlur={() => touch('email', email)}
            placeholder={t('emailPlaceholder')}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="login-email-error"
            className={inputClass('email')}
            required
          />
        </FormField>
        <FormField id="login-password" label={t('password')} error={errors.password}>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => change('password', e.target.value, setPassword)}
            onBlur={() => touch('password', password)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="login-password-error"
            className={inputClass('password')}
            required
          />
        </FormField>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('signingIn') : t('signIn')}
        </Button>
        {showResend && (
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => void onResend()}
            disabled={isResending}
          >
            {isResending ? t('sending') : t('resendVerification')}
          </Button>
        )}
      </form>
    </AuthShell>
  );
}
