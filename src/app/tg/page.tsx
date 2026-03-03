'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { signIn } from 'next-auth/react';
import { authApi } from '@/services/auth-api';

type Phase = 'detecting' | 'authenticating' | 'error';

/**
 * Telegram Mini App entry point — /tg
 *
 * Flow:
 *  1. Detect window.Telegram.WebApp (SDK must be loaded via layout Script tag).
 *  2. POST initData to /api/auth/telegram → validate HMAC server-side.
 *  3. Exchange the returned hashed_token for a Supabase session.
 *  4. Redirect to callbackUrl (default: /dashboard).
 *
 * If the page is opened outside Telegram, redirect to the regular /login page
 * (preserving callbackUrl so the user lands on the right page after login).
 */
export default function TelegramEntryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations();
  const [phase, setPhase] = useState<Phase>('detecting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

    async function authenticate() {
      // Wait one tick so the Telegram SDK (loaded beforeInteractive) is ready.
      await new Promise((r) => setTimeout(r, 50));

      const initData = window.Telegram?.WebApp?.initData;

      if (!initData) {
        // Not inside Telegram (or SDK not ready) — send to regular login.
        const loginUrl = `/login${callbackUrl !== '/dashboard' ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ''}`;
        router.replace(loginUrl);
        return;
      }

      const tg = window.Telegram!.WebApp;
      tg.ready();
      tg.expand();

      setPhase('authenticating');

      try {
        // 1. Validate initData on the server — server verifies the Telegram
        //    HMAC and returns a short-lived signed token.
        const { sessionToken } = await authApi.exchangeTelegramInitData(initData);

        // 2. Exchange for a NextAuth session (same cookie as email users).
        //    This eliminates the Supabase browser-client race condition.
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
    }

    void authenticate();
  }, [router, searchParams, t]);

  if (phase === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <AlertCircle className="mb-4 h-12 w-12 text-red-600" />
        <h1 className="mb-2 text-lg font-semibold text-gray-900">{t('telegram.signinFailed')}</h1>
        <p className="mb-6 text-sm text-gray-500">{errorMsg}</p>
        <button
          onClick={() => router.replace('/login')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {t('telegram.useEmailLogin')}
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="text-sm text-gray-500">
        {phase === 'detecting' ? t('telegram.starting') : t('telegram.signingYouIn')}
      </p>
    </main>
  );
}
