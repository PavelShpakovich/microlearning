'use client';

import { useState } from 'react';
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

type Field = 'email' | 'password' | 'confirmPassword';
type Errors = Partial<Record<Field, string>>;

export function RegisterForm() {
  const t = useTranslations('auth');
  const v = useTranslations('validation');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
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
    return undefined;
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
    if (Object.values(next).some(Boolean)) return;

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string; message?: string };
        const msg = (data.error || data.message || '').toLowerCase();
        if (msg.includes('already exists')) {
          toast.error(t('emailAlreadyExists'));
        } else if (msg.includes('password')) {
          setErrors((prev) => ({ ...prev, password: v('passwordTooShort') }));
        } else if (msg.includes('email')) {
          setErrors((prev) => ({ ...prev, email: v('invalidEmail') }));
        } else {
          toast.error(t('error'));
        }
        return;
      }

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
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? t('signingUp') : t('signUp')}
        </Button>
      </form>
    </AuthShell>
  );
}
