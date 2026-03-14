'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';

export function SetPasswordForm() {
  const t = useTranslations('auth');
  const validation = useTranslations('validation');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const supabase = useMemo(() => createSupabaseClient(), []);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadRecoverySession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setEmail(session?.user?.email ?? null);
      setIsReady(true);
    }

    void loadRecoverySession();
  }, [supabase]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error(validation('passwordTooShort'));
      return;
    }

    if (password !== confirmPassword) {
      toast.error(validation('passwordsDoNotMatch'));
      return;
    }

    if (!email) {
      toast.error(t('error'));
      return;
    }

    try {
      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        throw error;
      }

      const result = await signIn('password', {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (!result?.ok) {
        throw new Error(result?.error || t('invalidCredentials'));
      }

      toast.success(t('passwordUpdated'));
      window.location.href = result.url || callbackUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isReady && !email) {
    return (
      <AuthShell
        title={t('setPasswordTitle')}
        description={t('error')}
        footer={
          <div className="text-center text-sm text-muted-foreground">
            <Link href="/forgot-password" className="text-primary hover:underline">
              {t('sendResetLink')}
            </Link>
          </div>
        }
      >
        <p className="text-sm text-muted-foreground">{t('forgotPasswordDescription')}</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('setPasswordTitle')} description={t('setPasswordDescription')}>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{t('newPassword')}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t('passwordPlaceholder')}
            disabled={isSubmitting || !isReady}
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
            disabled={isSubmitting || !isReady}
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={isSubmitting || !isReady}>
          {isSubmitting ? t('saving') : t('setPassword')}
        </Button>
      </form>
    </AuthShell>
  );
}
