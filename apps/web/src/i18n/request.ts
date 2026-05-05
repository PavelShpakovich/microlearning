import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { allMessages, type SupportedLocale } from '@clario/i18n';

export default getRequestConfig(async () => {
  const headerStore = await headers();

  // 1. Explicit lang param forwarded by middleware from ?lang= (e.g. mobile app deep-links)
  const xLang = headerStore.get('x-lang');

  // 2. User's saved cookie preference
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  // 3. Fallback: detect from Accept-Language header
  const acceptLang = headerStore.get('accept-language') ?? '';
  const headerLocale = acceptLang.toLowerCase().startsWith('en') ? 'en' : 'ru';

  const locale: SupportedLocale =
    (xLang && xLang in allMessages ? (xLang as SupportedLocale) : null) ??
    (cookieLocale && cookieLocale in allMessages ? (cookieLocale as SupportedLocale) : null) ??
    headerLocale;

  return {
    locale,
    messages: allMessages[locale],
  };
});
