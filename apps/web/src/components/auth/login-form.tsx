'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ApiClientError, authApi } from '@clario/api-client';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RE = /^\d{6}$/;

type Field = 'email' | 'password' | 'otp';
type Errors = Partial<Record<Field, string>>;

export function LoginForm() {
  const t = useTranslations('auth');
  const v = useTranslations('validation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const verifiedParam = searchParams.get('verified');
  const resetParam = searchParams.get('reset');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResend, setShowResend] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (field: Field, value: string): string | undefined => {
    if (field === 'email') {
      const trimmed = value.trim();
      if (!trimmed) return v('emailRequired');
      if (!EMAIL_RE.test(trimmed)) return v('invalidEmail');
    }
    if (field === 'password' && !value) return v('passwordRequired');
    if (field === 'otp') {
      if (!value) return t('otpInvalid');
      if (!OTP_RE.test(value)) return t('otpInvalid');
    }
    return undefined;
  };

  const normalizeOtp = (value: string) => value.replace(/\D/g, '').slice(0, 6);

  const getOtpErrorMessage = (error: ApiClientError) => {
    if (error.status === 400) {
      return error.message.toLowerCase().includes('expired') ? t('otpExpired') : t('otpInvalid');
    }

    if (error.status === 429) {
      return t('tooManyRequests');
    }

    return t('error');
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

  const onVerify = async () => {
    const next: Errors = {
      email: validate('email', email),
      password: validate('password', password),
      otp: validate('otp', otp),
    };
    setErrors((prev) => ({ ...prev, ...next }));
    if (Object.values(next).some(Boolean)) return;

    try {
      setIsVerifying(true);
      await authApi.verifyOtp(email.trim(), otp);
      await signOut({ redirect: false });

      const result = await signIn('password', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result?.ok) {
        setShowResend(false);
        setOtp('');
        toast.success(t('emailVerified'));
        return;
      }

      toast.success(t('loginSuccess'));
      window.location.href = result.url || callbackUrl;
    } catch (error) {
      if (error instanceof ApiClientError) {
        const otpError = getOtpErrorMessage(error);
        if (error.status === 400) {
          setErrors((prev) => ({ ...prev, otp: otpError }));
        } else {
          toast.error(otpError);
        }
        return;
      }

      toast.error(t('error'));
    } finally {
      setIsVerifying(false);
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
      {resetParam === 'success' && (
        <p className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400">
          {t('passwordUpdated')}
        </p>
      )}
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
          <>
            <p className="rounded-md border border-border/60 bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              {t('verifyEmailDescription', { email: email.trim() })}
            </p>
            <FormField id="login-otp" label={t('otpLabel')} error={errors.otp}>
              <Input
                id="login-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => change('otp', normalizeOtp(e.target.value), setOtp)}
                onBlur={() => touch('otp', otp)}
                placeholder={t('otpPlaceholder')}
                disabled={isSubmitting || isVerifying}
                aria-invalid={Boolean(errors.otp)}
                aria-describedby="login-otp-error"
                className={inputClass('otp')}
                maxLength={6}
                required
              />
            </FormField>
            <Button
              type="button"
              className="w-full"
              onClick={() => void onVerify()}
              disabled={isSubmitting || isVerifying}
            >
              {isVerifying ? t('verifying') : t('verifyButton')}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => void onResend()}
              disabled={isResending || isSubmitting || isVerifying}
            >
              {isResending ? t('sending') : t('resendVerification')}
            </Button>
          </>
        )}
      </form>
    </AuthShell>
  );
}
