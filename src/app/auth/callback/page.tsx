'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { createSupabaseClient } from '@/lib/supabase/client';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;

function Spinner({ text }: { text?: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      {text && <p className="text-sm text-gray-500">{text}</p>}
    </main>
  );
}

function EmailVerifiedScreen() {
  const t = useTranslations('telegramUpgrade');
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4">
      <div className="flex flex-col items-center gap-4 max-w-sm text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t('emailVerifiedTitle')}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {t('emailVerifiedDescription')}
        </p>
        <Button asChild className="w-full mt-2">
          <a href={BOT_URL}>{t('backToTelegram')}</a>
        </Button>
      </div>
    </main>
  );
}

/**
 * Landing page for Supabase magic-link and recovery emails.
 * Supabase appends ?token_hash=...&type=email|recovery to the redirect URL.
 *
 * Flow:
 *  1. Verify the OTP → Supabase sets its own session cookies.
 *  2. Call /api/auth/session-from-supabase → reads those cookies → issues NextAuth token.
 *  3. signIn('telegram', { sessionToken }) → NextAuth sets its session cookie.
 *  4. Redirect: recovery → /auth/set-password, email → show "go back to Telegram" screen.
 */
function CallbackHandler() {
  const params = useSearchParams();
  const t = useTranslations('telegramUpgrade');
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    async function exchange() {
      const tokenHash = params.get('token_hash');
      const type = params.get('type') as 'email' | 'recovery' | null;
      const callbackUrl = params.get('callbackUrl') || '/dashboard';

      if (tokenHash && type) {
        const supabase = createSupabaseClient();
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

        if (!error) {
          // Exchange Supabase session for a NextAuth session token.
          const res = await fetch('/api/auth/session-from-supabase', { method: 'POST' });
          if (res.ok) {
            const { sessionToken } = (await res.json()) as { sessionToken: string };
            await signIn('telegram', { sessionToken, redirect: false });
          }

          if (type === 'recovery') {
            window.location.href = '/auth/set-password';
            return;
          }

          // Email magic link — show "go back to Telegram" confirmation screen
          setEmailVerified(true);
          return;
        }
      }

      // Hard navigate so all session cookies are committed before the next request.
      window.location.href = callbackUrl;
    }

    void exchange();
  }, [params]);

  if (emailVerified) return <EmailVerifiedScreen />;
  return <Spinner text={t('completingSignIn')} />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
