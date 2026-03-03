'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

type Phase = 'detecting' | 'authenticating' | 'error';

/**
 * Telegram Mini App entry point — /tg
 *
 * Flow:
 *  1. Detect window.Telegram.WebApp (SDK must be loaded via layout Script tag).
 *  2. POST initData to /api/auth/telegram → validate HMAC server-side.
 *  3. Exchange the returned hashed_token for a Supabase session.
 *  4. Redirect to /dashboard.
 *
 * If the page is opened outside Telegram, redirect to the regular /login page.
 */
export default function TelegramEntryPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('detecting');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function authenticate() {
      // Wait one tick so the Telegram SDK (loaded beforeInteractive) is ready.
      await new Promise((r) => setTimeout(r, 50));

      if (!window.Telegram?.WebApp) {
        // Not inside Telegram — send to regular login.
        router.replace('/login');
        return;
      }

      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      const initData = tg.initData;
      if (!initData) {
        setErrorMsg('No initData from Telegram. Please open via the bot.');
        setPhase('error');
        return;
      }

      setPhase('authenticating');

      try {
        // 1. Validate initData on the server and get a hashed magic-link token.
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        });

        if (!res.ok) {
          const { error } = (await res.json()) as { error: string };
          throw new Error(error ?? `Server error ${res.status}`);
        }

        const { hashedToken } = (await res.json()) as { hashedToken: string };

        // 2. Exchange the token for a live Supabase session.
        const supabase = createSupabaseClient();
        const { error: authError } = await supabase.auth.verifyOtp({
          token_hash: hashedToken,
          type: 'email',
        });

        if (authError) throw authError;

        // 3. Authenticated — go to the app.
        router.replace('/dashboard');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        setErrorMsg(msg);
        setPhase('error');
      }
    }

    void authenticate();
  }, [router]);

  if (phase === 'error') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-4 text-4xl">⚠️</div>
        <h1 className="mb-2 text-lg font-semibold text-gray-900">Sign-in failed</h1>
        <p className="mb-6 text-sm text-gray-500">{errorMsg}</p>
        <button
          onClick={() => router.replace('/login')}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Use email login instead
        </button>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="text-sm text-gray-500">
        {phase === 'detecting' ? 'Starting…' : 'Signing you in…'}
      </p>
    </main>
  );
}
