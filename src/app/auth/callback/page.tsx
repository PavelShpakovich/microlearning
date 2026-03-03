'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

function Spinner() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="text-sm text-gray-500">Completing sign-in…</p>
    </main>
  );
}

/**
 * Landing page for Supabase magic-link emails.
 * Supabase appends ?token_hash=...&type=email to the redirect URL.
 * We exchange it for a session, then redirect to /dashboard.
 */
function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    async function exchange() {
      const tokenHash = params.get('token_hash');
      const type = params.get('type') as 'email' | 'recovery' | null;

      if (tokenHash && type) {
        const supabase = createSupabaseClient();
        await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
      }

      // Whether or not OTP exchange worked, send the user to dashboard.
      // Dashboard will redirect to /login if not authenticated.
      router.replace('/dashboard');
    }

    void exchange();
  }, [router, params]);

  return <Spinner />;
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <CallbackHandler />
    </Suspense>
  );
}
