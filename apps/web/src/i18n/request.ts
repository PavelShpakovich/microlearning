import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { allMessages, type SupportedLocale } from '@clario/i18n';

export default getRequestConfig(async () => {
  // 1. Try user's saved cookie preference
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;

  // 2. Fallback: detect from Accept-Language header
  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') ?? '';
  const headerLocale = acceptLang.toLowerCase().startsWith('en') ? 'en' : 'ru';

  const locale: SupportedLocale =
    cookieLocale && cookieLocale in allMessages ? (cookieLocale as SupportedLocale) : headerLocale;

  return {
    locale,
    messages: allMessages[locale],
  };
});
