'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { locales } from '@/i18n/config';

type Locale = (typeof locales)[number];

function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return 'en';
  const cookie = document.cookie.split('; ').find((row) => row.startsWith('NEXT_LOCALE='));
  const saved = cookie?.split('=')[1] as Locale | undefined;
  return (locales as readonly string[]).includes(saved || '') ? saved! : 'en';
}

export function useUiLanguage() {
  const [locale, setLocale] = useState<Locale>(readLocaleCookie);
  const router = useRouter();

  const setLanguage = (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocale(newLocale);
    router.refresh();
  };

  return {
    locale,
    setLanguage,
    isLoading: false,
  };
}
