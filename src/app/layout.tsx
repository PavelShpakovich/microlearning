import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { headers, cookies } from 'next/headers';
import { RootProviders } from '@/components/root-providers';
import { Header } from '@/components/layout/header';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

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
    'Clario turns any topic, document, or URL into AI-generated study cards in seconds. Learn smarter inside Telegram.',
  keywords: [
    'AI flashcards',
    'flashcard generator',
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
      'Clario turns any topic, document, or URL into AI-generated study cards in seconds. Learn smarter inside Telegram.',
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Clario' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Clario — AI Flashcard Generator',
    description:
      'Clario turns any topic, document, or URL into AI-generated study cards in seconds. Learn smarter inside Telegram.',
    images: ['/opengraph-image'],
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Determine locale: URL-based (set by i18n middleware for public pages) takes
  // priority, then cookie fallback (for authenticated TG-only routes).
  const headersList = await headers();
  const cookieStore = await cookies();
  const { defaultLocale, locales } = await import('@/i18n/config');

  const fromHeader = headersList.get('x-next-intl-locale');
  const fromCookie = cookieStore.get('NEXT_LOCALE')?.value;
  const raw = fromHeader ?? fromCookie ?? defaultLocale;
  const locale = (locales as readonly string[]).includes(raw) ? raw : defaultLocale;

  let messages = {};
  try {
    messages = (await import(`@/i18n/messages/${locale}.json`)).default;
  } catch {
    messages = (await import('@/i18n/messages/en.json')).default;
  }

  return (
    <html lang={locale} suppressHydrationWarning>
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
          <RootProviders locale={locale} messages={messages}>
            <Header />
            {children}
          </RootProviders>
        </Suspense>
      </body>
    </html>
  );
}
