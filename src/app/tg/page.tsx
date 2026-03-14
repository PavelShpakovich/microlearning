'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { authApi } from '@/services/auth-api';
import { Button } from '@/components/ui/button';

type Phase = 'detecting' | 'confirming' | 'authenticating' | 'error';

/**
 * Telegram Mini App entry point — /tg
 *
 * Flow:
 *  1. Detect window.Telegram.WebApp (SDK must be loaded via layout Script tag).
 *  2. If a link_<token> startParam is present, show a confirmation screen with
 *     the email of the web account being linked (security check).
 *  3. POST initData to /api/auth/telegram → validate HMAC server-side.
 *  4. Exchange the returned hashed_token for a NextAuth session.
 *  5. Redirect to callbackUrl (default: /dashboard).
 *
 * If the page is opened outside Telegram, redirect to the landing page.
 */
export default function TelegramEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [phase, setPhase] = useState<Phase>('detecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLinkingFlow, setIsLinkingFlow] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');

  // Stored across the confirmation pause so runAuth can use them.
  const pendingInitData = useRef('');
  const pendingStartParam = useRef<string | undefined>(undefined);

  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard';

  const runAuth = useCallback(async () => {
    setPhase('authenticating');
    try {
      // 1. Validate initData on the server — server verifies the Telegram
      //    HMAC and returns a short-lived signed token.
      const { sessionToken } = await authApi.exchangeTelegramInitData(
        pendingInitData.current,
        pendingStartParam.current,
      );

      // 2. Exchange for a NextAuth session (same cookie as email users).
      const result = await signIn('telegram', { sessionToken, redirect: false });
      if (!result?.ok) throw new Error(result?.error ?? 'Sign-in failed');

      // 3. Hard navigate — NextAuth has already set the session cookie so
      //    the middleware will see it on the very next request.
      window.location.href = callbackUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('telegram.authenticationFailed');
      setErrorMsg(msg);
      setPhase('error');
    }
  }, [callbackUrl, t]);

  useEffect(() => {
    async function init() {
      // Poll for the Telegram SDK to populate initData (up to 3 s).
      let initData = '';
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 100));
        initData = window.Telegram?.WebApp?.initData ?? '';
        if (initData) break;
      }

      if (!initData) {
        // Not inside Telegram after 3 s — send to landing page.
        router.replace('/');
        return;
      }

      const tg = window.Telegram!.WebApp;
      tg.ready();
      tg.expand();

      const supportedLocales: Record<string, string> = { ru: 'ru', en: 'en' };
      const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;

      // Determine locale: prefer the one encoded in the startParam (from the web app),
      // then fall back to the Telegram user's language_code.
      let resolvedLocale: string;
      let tokenForLookup: string | null = null;
      if (startParam) {
        const rest = startParam.replace(/^link_/, '');
        const localeMatch = rest.match(/_([a-z]{2})$/);
        const paramLocale = localeMatch?.[1] ?? null;
        if (paramLocale && supportedLocales[paramLocale]) {
          resolvedLocale = paramLocale;
          tokenForLookup = rest.slice(0, -(paramLocale.length + 1));
        } else {
          resolvedLocale =
            supportedLocales[window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code ?? ''] ??
            'en';
          tokenForLookup = rest;
        }
      } else {
        resolvedLocale =
          supportedLocales[window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code ?? ''] ??
          'en';
      }
      document.cookie = `NEXT_LOCALE=${resolvedLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;

      // If the locale just changed we need a hard reload so next-intl picks it
      // up from the new cookie (it's bound server-side and won't change mid-render).
      const currentLocale = document.documentElement.lang || 'en';
      if (currentLocale !== resolvedLocale) {
        window.location.reload();
        return;
      }

      pendingInitData.current = initData;
      pendingStartParam.current = startParam;

      if (startParam) {
        // Link flow — fetch the email tied to this token and ask for confirmation.
        setIsLinkingFlow(true);
        try {
          const res = await fetch(
            `/api/profile/link-telegram?token=${encodeURIComponent(tokenForLookup!)}`,
          );
          const json = (await res.json()) as { email?: string; error?: string };
          if (!res.ok) throw new Error(json.error ?? t('telegram.authenticationFailed'));
          setConfirmEmail(json.email ?? '');
          setPhase('confirming');
        } catch (err) {
          const msg = err instanceof Error ? err.message : t('telegram.authenticationFailed');
          setErrorMsg(msg);
          setPhase('error');
        }
        return;
      }

      // Normal auth — no confirmation needed.
      void runAuth();
    }

    void init();
  }, [router, t, runAuth]);

  if (phase === 'confirming') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center gap-6">
        <h1 className="text-lg font-semibold">{t('telegram.confirmLinkTitle')}</h1>
        <p className="text-sm text-muted-foreground max-w-xs">
          {t('telegram.confirmLinkBody', { email: confirmEmail })}
        </p>
        <div className="flex gap-3">
          <Button onClick={() => void runAuth()}>{t('telegram.confirmLinkConfirm')}</Button>
          <Button variant="outline" onClick={() => router.replace('/')}>
            {t('telegram.confirmLinkCancel')}
          </Button>
        </div>
      </main>
    );
  }

  if (phase === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-600" />
        <h1 className="mb-2 text-lg font-semibold text-gray-900">{t('telegram.signinFailed')}</h1>
        <p className="mb-6 text-sm text-gray-500">{errorMsg}</p>
        <Button onClick={() => router.replace('/')}>{t('telegram.useEmailLogin')}</Button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-gray-500">
        {phase === 'detecting'
          ? t('telegram.starting')
          : isLinkingFlow
            ? t('telegram.linking')
            : t('telegram.signingYouIn')}
      </p>
    </main>
  );
}
