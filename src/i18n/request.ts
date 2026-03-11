import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  // For [locale] routes: locale comes from the URL segment via middleware/setRequestLocale.
  // For authenticated routes (no [locale] prefix): fall back to the NEXT_LOCALE cookie.
  let locale = await requestLocale;

  if (!locale || !(routing.locales as readonly string[]).includes(locale)) {
    // Dynamic import cookies() only when actually needed (non-locale routes)
    // to avoid pulling the dynamic API into static [locale] builds.
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    if (localeCookie && (routing.locales as readonly string[]).includes(localeCookie)) {
      locale = localeCookie as (typeof routing.locales)[number];
    } else {
      locale = routing.defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
