import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const cookie = cookieStore.get('NEXT_LOCALE')?.value;
  const locale = cookie === 'en' || cookie === 'ru' ? cookie : 'ru';

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  };
});
