'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { locales } from '@/i18n/config';
import { useLocaleSwitch } from '@/components/root-providers';

type Locale = (typeof locales)[number];

const PUBLIC_PAGE_BASES = ['/', '/privacy', '/terms'];

export function useUiLanguage() {
  // Read locale from NextIntlClientProvider context — the single source of truth.
  // This stays in sync whether the locale was set by the URL segment or by switchLocale.
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const { switchLocale } = useLocaleSwitch();

  const setLanguage = async (newLocale: Locale) => {
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // Always update NextIntlClientProvider immediately so all client components
    // (Header, etc.) re-render with the correct locale without waiting for
    // navigation — this fixes partial-translation on the root layout which
    // is a shared segment and does not re-run during client-side navigation.
    await switchLocale(newLocale);

    // On public pages, also navigate to the locale-prefixed URL so the URL
    // reflects the language and Google can crawl both versions.
    const stripped = pathname.replace(/^\/ru\b/, '') || '/';
    const isPublicPage = PUBLIC_PAGE_BASES.includes(stripped);

    if (isPublicPage) {
      const newPath = newLocale === 'ru' ? `/ru${stripped === '/' ? '' : stripped}` : stripped;
      router.push(newPath || '/');
    }
  };

  return {
    locale,
    setLanguage,
    isLoading: false,
  };
}
