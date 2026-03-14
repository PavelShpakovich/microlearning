'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Link } from '@/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthShell } from '@/components/auth/auth-shell';

interface ForgotPasswordFormProps {
  locale: 'en' | 'ru';
}

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const t = useTranslations('auth');
  const validation = useTranslations('validation');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.includes('@')) {
      toast.error(validation('invalidEmail'));
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, locale }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string; message?: string };
        throw new Error(data.error || data.message || t('error'));
      }

      setIsSent(true);
      toast.success(t('forgotPasswordSentTitle'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell
      title={isSent ? t('forgotPasswordSentTitle') : t('forgotPasswordTitle')}
      description={isSent ? t('forgotPasswordSentDescription') : t('forgotPasswordDescription')}
      footer={
        <div className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="text-primary hover:underline">
            {t('backToLogin')}
          </Link>
        </div>
      }
    >
      {!isSent && (
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
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? t('sending') : t('sendResetLink')}
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
