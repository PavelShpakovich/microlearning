import type { Metadata } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { RootProviders } from '@/components/root-providers';
import { Header } from '@/components/layout/header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Microlearning',
  description: 'Learn anything, one card at a time',
};

async function RootProvidersWrapper({ children }: { children: React.ReactNode }) {
  const { cookies } = await import('next/headers');
  const { defaultLocale, locales } = await import('@/i18n/config');

  const cookieStore = await cookies();
  const locale = cookieStore.get('NEXT_LOCALE')?.value || defaultLocale;

  // Load messages for the locale
  let messages = {};
  try {
    const validLocale = (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
    messages = await import(`@/i18n/messages/${validLocale}.json`).then((m) => m.default);
  } catch (error) {
    console.error('Failed to load messages:', error);
    messages = await import('@/i18n/messages/en.json').then((m) => m.default);
  }

  return (
    <RootProviders locale={locale} messages={messages}>
      {children}
    </RootProviders>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Load the Telegram Mini App SDK before hydration so that
         * window.Telegram.WebApp.initData is available when /tg mounts.
         * beforeInteractive only works in the root layout — not nested layouts.
         * On non-Telegram pages initData is an empty string, which /tg treats
         * as "not inside Telegram" and redirects to /login.
         */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased">
        <Suspense fallback={<div />}>
          <RootProvidersWrapper>
            <Header />
            {children}
          </RootProvidersWrapper>
        </Suspense>
      </body>
    </html>
  );
}
