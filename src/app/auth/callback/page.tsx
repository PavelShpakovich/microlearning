'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { createSupabaseClient } from '@/lib/supabase/client';

function Spinner() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <p className="text-sm text-gray-500">Completing sign-in…</p>
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
 *  4. Redirect: recovery → /auth/set-password, email → callbackUrl or /dashboard.
 */
function CallbackHandler() {
  const params = useSearchParams();

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
        }
      }

      // Hard navigate so all session cookies are committed before the next request.
      window.location.href = callbackUrl;
    }

    void exchange();
  }, [params]);

  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
