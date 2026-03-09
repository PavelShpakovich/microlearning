'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CheckCircle, AlertCircle, Mail, Lock, Globe } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { useUiLanguage } from '@/hooks/use-ui-language';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { profileApi } from '@/services/profile-api';

type Screen = 'loading' | 'form' | 'verifying' | 'merged' | 'error';

export default function TelegramUpgradePage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const [screen, setScreen] = useState<Screen>('loading');
  const [initData, setInitData] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [overLimit, setOverLimit] = useState(false);

  const isRequired = searchParams.get('required') === '1';
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const { locale, setLanguage } = useUiLanguage();

  const upgradeSchema = z.object({
    email: z.string().email(t('validation.invalidEmail')),
    password: z
      .string()
      .refine((v) => !showPassword || v.length >= 6, t('validation.passwordTooShort'))
      .optional(),
  });

  type UpgradeFormValues = z.infer<typeof upgradeSchema>;

  const form = useForm<UpgradeFormValues>({
    resolver: zodResolver(upgradeSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    async function init() {
      await new Promise((r) => setTimeout(r, 50));

      const data = window.Telegram?.WebApp?.initData;
      if (!data) {
        setErrorMsg(t('telegram.noInitData'));
        setScreen('error');
        return;
      }

      window.Telegram!.WebApp.ready();
      window.Telegram!.WebApp.expand();
      setInitData(data);
      setScreen('form');
    }
    void init();
  }, [t]);

  async function onSubmit(values: UpgradeFormValues) {
    try {
      setIsSubmitting(true);
      const result = await profileApi.upgradeStub(initData, values.email, values.password);

      if ('sessionToken' in result) {
        // Merge complete — sign in immediately.
        setOverLimit(result.overLimit);
        const signInResult = await signIn('telegram', {
          sessionToken: result.sessionToken,
          redirect: false,
        });
        if (!signInResult?.ok) throw new Error(signInResult?.error ?? 'Sign-in failed');
        setScreen('merged');
      } else if ('conflict' in result && result.conflict) {
        // Email taken — reveal password field so user can prove ownership.
        setShowPassword(true);
        form.setError('email', {
          message: t('telegramUpgrade.conflictHint'),
        });
        form.trigger('email');
      } else {
        // Magic link sent — ask user to check inbox.
        setScreen('verifying');
      }
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : t('telegramUpgrade.submitError'),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (screen === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </main>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (screen === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-500" />
        <h1 className="mb-2 text-lg font-semibold">{t('telegramUpgrade.errorTitle')}</h1>
        <p className="mb-6 text-sm text-muted-foreground">{errorMsg}</p>
        <Button
          className="w-full max-w-xs"
          onClick={() => {
            window.location.href = '/dashboard';
          }}
        >
          {t('telegramUpgrade.goToDashboard')}
        </Button>
      </main>
    );
  }

  // ── Verifying email ───────────────────────────────────────────────────────
  if (screen === 'verifying') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <Mail className="mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-2 text-lg font-semibold">{t('telegramUpgrade.checkEmail')}</h1>
        <p className="mb-6 max-w-xs text-sm text-muted-foreground">
          {t('telegramUpgrade.checkEmailDescription')}
        </p>
        <Button
          variant="outline"
          className="w-full max-w-xs"
          onClick={() => {
            window.location.href = callbackUrl;
          }}
        >
          {t('telegramUpgrade.continueInApp')}
        </Button>
      </main>
    );
  }

  // ── Merged ────────────────────────────────────────────────────────────────
  if (screen === 'merged') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
        <h1 className="mb-2 text-lg font-semibold">{t('telegramUpgrade.mergedTitle')}</h1>
        <p className="text-sm text-muted-foreground">{t('telegramUpgrade.mergedDescription')}</p>
        {overLimit && (
          <p className="mt-3 max-w-xs text-sm text-amber-600 dark:text-amber-400">
            {t('telegramUpgrade.mergedOverLimitWarning')}
          </p>
        )}
        <Button
          className="mt-6"
          onClick={() => {
            window.location.href = callbackUrl;
          }}
        >
          {t('telegramUpgrade.goToDashboard')}
        </Button>
      </main>
    );
  }

  // ── Language toggle ─────────────────────────────────────────────────────
  const LangToggle = () => (
    <div className="flex items-center gap-1 self-end">
      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
      {(['en', 'ru'] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => void setLanguage(l)}
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors ${
            locale === l
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-screen flex-col justify-center px-6 py-10">
      <div className="mx-auto w-full max-w-sm space-y-6">
        <LangToggle />
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {isRequired ? t('telegramUpgrade.requiredTitle') : t('telegramUpgrade.title')}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isRequired
              ? t('telegramUpgrade.requiredDescription')
              : t('telegramUpgrade.description')}
          </p>
        </div>

        {!isRequired && (
          <button
            type="button"
            onClick={() => {
              window.location.href = callbackUrl;
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline transition-colors"
          >
            {t('buttons.cancel')}
          </button>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.email')}</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password field — only shown when the email is already taken */}
            {showPassword && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="password"
                          placeholder="••••••"
                          autoComplete="current-password"
                          className="pl-9"
                          {...field}
                          value={field.value ?? ''}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {form.formState.errors.root && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t('telegramUpgrade.submitting') : t('telegramUpgrade.submit')}
            </Button>
          </form>
        </Form>
      </div>
    </main>
  );
}
