'use client';

import { useLocale } from 'next-intl';
import { locales } from '@/i18n/config';
import { useLocaleSwitch } from '@/components/root-providers';

type Locale = (typeof locales)[number];

export function useUiLanguage() {
  const locale = useLocale() as Locale;
  const { switchLocale } = useLocaleSwitch();

  const setLanguage = async (newLocale: Locale) => {
    // Persist preference and swap messages client-side — no navigation needed
    // since all routes are locale-agnostic flat paths.
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    await switchLocale(newLocale);
  };

  return { locale, setLanguage, isLoading: false };
}
