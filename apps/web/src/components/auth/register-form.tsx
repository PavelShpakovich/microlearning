'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { ApiClientError, authApi } from '@clario/api-client';

import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { Checkbox } from '@/components/ui/checkbox';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_RE = /^\d{6}$/;

type Field = 'email' | 'password' | 'confirmPassword' | 'otp';
type Errors = Partial<Record<Field, string>>;

export function RegisterForm() {
  const t = useTranslations('auth');
  const v = useTranslations('validation');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const validate = (field: Field, value: string, refPassword?: string): string | undefined => {
    if (field === 'email') {
      const trimmed = value.trim();
      if (!trimmed) return v('emailRequired');
      if (!EMAIL_RE.test(trimmed)) return v('invalidEmail');
    }
    if (field === 'password') {
      if (!value) return v('passwordRequired');
      if (value.length < 8) return v('passwordTooShort');
    }
    if (field === 'confirmPassword') {
      if (!value) return v('confirmPasswordRequired');
      if (value !== (refPassword ?? password)) return v('passwordsDoNotMatch');
    }
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

  const onPasswordChange = (value: string) => {
    setPassword(value);
    setErrors((prev) => ({
      ...prev,
      password: prev.password ? validate('password', value) : undefined,
      confirmPassword:
        prev.confirmPassword && confirmPassword
          ? validate('confirmPassword', confirmPassword, value)
          : prev.confirmPassword,
    }));
  };

  const inputClass = (field: Field) =>
    cn(errors[field] && 'border-destructive/50 focus-visible:ring-destructive');

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const next: Errors = {
      email: validate('email', email),
      password: validate('password', password),
      confirmPassword: validate('confirmPassword', confirmPassword),
    };
    setErrors(next);

    if (!consentChecked) {
      setConsentError(v('consentRequired'));
    }

    if (Object.values(next).some(Boolean) || !consentChecked) return;

    try {
      setIsSubmitting(true);

      await authApi.register(email.trim(), password);
      setNeedsVerification(true);
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 429) {
          toast.error(t('tooManyRequests'));
          return;
        }

        const msg = error.message.toLowerCase();
        if (msg.includes('password')) {
          setErrors((prev) => ({ ...prev, password: v('passwordTooShort') }));
        } else if (msg.includes('email')) {
          setErrors((prev) => ({ ...prev, email: v('invalidEmail') }));
        } else {
          toast.error(t('error'));
        }
      } else {
        toast.error(t('error'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
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
    const otpError = validate('otp', otp);
    setErrors((prev) => ({ ...prev, otp: otpError }));
    if (otpError) return;

    try {
      setIsVerifying(true);
      await authApi.verifyOtp(email.trim(), otp);
      toast.success(t('emailVerified'));
      window.location.href = '/login?verified=true';
    } catch (error) {
      if (error instanceof ApiClientError) {
        const message = getOtpErrorMessage(error);
        if (error.status === 400) {
          setErrors((prev) => ({ ...prev, otp: message }));
        } else {
          toast.error(message);
        }
        return;
      }

      toast.error(t('error'));
    } finally {
      setIsVerifying(false);
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
        <FormField id="register-otp" label={t('otpLabel')} error={errors.otp}>
          <Input
            id="register-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => change('otp', normalizeOtp(e.target.value), setOtp)}
            onBlur={() => touch('otp', otp)}
            placeholder={t('otpPlaceholder')}
            disabled={isVerifying || isResending}
            aria-invalid={Boolean(errors.otp)}
            aria-describedby="register-otp-error"
            className={inputClass('otp')}
            maxLength={6}
            required
          />
        </FormField>
        <Button
          className="w-full"
          onClick={() => void onVerify()}
          disabled={isVerifying || isResending}
        >
          {isVerifying ? t('verifying') : t('verifyButton')}
        </Button>
        <Button
          className="w-full"
          variant="outline"
          onClick={() => void onResend()}
          disabled={isResending || isVerifying}
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
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-2">
        <FormField id="register-email" label={t('email')} error={errors.email}>
          <Input
            id="register-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => change('email', e.target.value, setEmail)}
            onBlur={() => touch('email', email)}
            placeholder={t('emailPlaceholder')}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="register-email-error"
            className={inputClass('email')}
            required
          />
        </FormField>
        <FormField id="register-password" label={t('password')} error={errors.password}>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onBlur={() => touch('password', password)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting}
            minLength={8}
            aria-invalid={Boolean(errors.password)}
            aria-describedby="register-password-error"
            className={inputClass('password')}
            required
          />
        </FormField>
        <FormField
          id="register-confirm-password"
          label={t('confirmPassword')}
          error={errors.confirmPassword}
        >
          <Input
            id="register-confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => change('confirmPassword', e.target.value, setConfirmPassword)}
            onBlur={() => touch('confirmPassword', confirmPassword)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.confirmPassword)}
            aria-describedby="register-confirm-password-error"
            className={inputClass('confirmPassword')}
            required
          />
        </FormField>
        <div
          className={cn(
            'rounded-xl border px-4 py-3 transition-colors',
            consentChecked
              ? 'border-primary/40 bg-primary/5'
              : consentError
                ? 'border-destructive/50 bg-destructive/5'
                : 'border-border bg-muted/30',
          )}
        >
          <label
            htmlFor="register-consent"
            className="flex items-start gap-3 cursor-pointer select-none"
          >
            <Checkbox
              id="register-consent"
              checked={consentChecked}
              onCheckedChange={(checked) => {
                const val = checked === true;
                setConsentChecked(val);
                if (val) setConsentError(undefined);
              }}
              disabled={isSubmitting}
              aria-describedby="register-consent-error"
              className={cn(
                'mt-0.5 h-5 w-5 shrink-0 rounded-md',
                consentError && !consentChecked && 'border-destructive/70',
              )}
            />
            <span className="text-sm text-muted-foreground leading-snug">
              {t.rich('consentLabel', {
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    className="text-primary underline-offset-2 hover:underline font-medium"
                  >
                    {chunks}
                  </Link>
                ),
                terms: (chunks) => (
                  <Link
                    href="/terms"
                    className="text-primary underline-offset-2 hover:underline font-medium"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </span>
          </label>
          {consentError && (
            <p id="register-consent-error" className="text-xs text-destructive mt-2 pl-8">
              {consentError}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('signingUp') : t('signUp')}
        </Button>
      </form>
    </AuthShell>
  );
}
