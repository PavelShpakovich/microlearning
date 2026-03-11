'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales } from '@/i18n/config';
import { useLocaleSwitch } from '@/components/root-providers';

type Locale = (typeof locales)[number];

const PUBLIC_PAGE_BASES = ['/', '/privacy', '/terms'];

function readLocaleCookie(): Locale {
  if (typeof document === 'undefined') return 'en';
  const cookie = document.cookie.split('; ').find((row) => row.startsWith('NEXT_LOCALE='));
  const saved = cookie?.split('=')[1] as Locale | undefined;
  return (locales as readonly string[]).includes(saved || '') ? saved! : 'en';
}

export function useUiLanguage() {
  const [locale, setLocale] = useState<Locale>(readLocaleCookie);
  const router = useRouter();
  const pathname = usePathname();
  const { switchLocale } = useLocaleSwitch();

  const setLanguage = async (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    setLocale(newLocale);

    // On public pages, navigate to the locale-prefixed URL so the URL reflects
    // the language and Google can crawl both versions.
    const stripped = pathname.replace(/^\/ru\b/, '') || '/';
    const isPublicPage = PUBLIC_PAGE_BASES.includes(stripped);

    if (isPublicPage) {
      const newPath = newLocale === 'ru' ? `/ru${stripped === '/' ? '' : stripped}` : stripped;
      router.push(newPath || '/');
    } else {
      // Update messages client-side immediately — no server round-trip needed.
      await switchLocale(newLocale);
    }
  };

  return {
    locale,
    setLanguage,
    isLoading: false,
  };
}
