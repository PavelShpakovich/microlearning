'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { locales } from '@/i18n/config';
import { profileApi } from '@/services/profile-api';

type Locale = (typeof locales)[number];

export function useUiLanguage() {
  const [locale, setLocale] = useState<Locale>('en');
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const { status } = useSession();

  // Load initial locale from cookie
  useEffect(() => {
    const getInitialLocale = () => {
      const cookie = document.cookie.split('; ').find((row) => row.startsWith('NEXT_LOCALE='));
      const saved = cookie?.split('=')[1] as Locale | undefined;
      return (locales as readonly string[]).includes(saved || '') ? saved! : 'en';
    };

    setLocale(getInitialLocale());
    setIsLoading(false);
  }, []);

  const setLanguage = async (newLocale: Locale) => {
    setIsLoading(true);

    // Always update cookie + local state + page locale — even for stub users.
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocale(newLocale);

    // Best-effort DB update — will be blocked with 403 for stub accounts
    // (they haven't set an email yet), which is fine; the cookie is enough.
    if (status === 'authenticated') {
      try {
        await profileApi.updateUiLanguage(newLocale);
      } catch (error) {
        console.warn('Language DB update skipped (stub or unauthenticated):', error);
      }
    }

    setIsLoading(false);
    router.refresh();
  };

  return {
    locale,
    setLanguage,
    isLoading,
  };
}
