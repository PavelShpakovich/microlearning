import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { RootProviders } from '@/components/root-providers';
import { Header } from '@/components/layout/header';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://clario.app';

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: 'Clario — AI Flashcard Generator',
    template: '%s | Clario',
  },
  description:
    'Clario turns any topic, document, or URL into AI-generated flashcards in seconds. Study smarter on the web or in Telegram.',
  keywords: [
    'AI flashcards',
    'flashcard generator',
    'microlearning',
    'study app',
    'spaced learning',
    'Telegram study bot',
    'AI learning',
    'knowledge cards',
  ],
  authors: [{ name: 'Clario' }],
  creator: 'Clario',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_URL,
    siteName: 'Clario',
    title: 'Clario — AI Flashcard Generator',
    description:
      'Clario turns any topic, document, or URL into AI-generated flashcards in seconds. Study smarter on the web or in Telegram.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clario — AI Flashcard Generator',
    description:
      'Clario turns any topic, document, or URL into AI-generated flashcards in seconds. Study smarter on the web or in Telegram.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
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
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
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
