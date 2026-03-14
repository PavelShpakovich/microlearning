import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { getLocale, getMessages } from 'next-intl/server';
import { RootProviders } from '@/components/root-providers';
import { Header } from '@/components/layout/header';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale === 'ru';

  const title = isRu
    ? 'Clario — ИИ-генератор карточек для обучения'
    : 'Clario — AI Flashcard Generator';
  const description = isRu
    ? 'Превратите любую тему, документ или URL в карточки для обучения за секунды. Учитесь умнее в Telegram.'
    : 'Clario turns any topic, document, or URL into AI-generated study cards in seconds. Learn smarter inside Telegram.';

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: title,
      template: '%s | Clario',
    },
    description,
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
      locale: isRu ? 'ru_RU' : 'en_US',
      url: APP_URL,
      siteName: 'Clario',
      title,
      description,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'Clario' }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/opengraph-image'],
    },
    icons: {
      icon: [{ url: '/favicon.ico' }, { url: '/logo-dark.png', type: 'image/png' }],
      apple: { url: '/logo-dark.png', type: 'image/png' },
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
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // next-intl resolves locale from the URL segment (static [locale] routes)
  // or falls back to the NEXT_LOCALE cookie (dynamic authenticated routes).
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();

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
        <Script id="yandex-metrica" strategy="afterInteractive">{`
          (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
          m[i].l=1*new Date();
          for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
          k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
          (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
          ym(107270131, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
        `}</Script>
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased">
        <Suspense fallback={<div />}>
          <RootProviders locale={locale} messages={messages} timeZone={timeZone} now={now}>
            <Header />
            {children}
          </RootProviders>
        </Suspense>
        <Analytics />
        <noscript>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://mc.yandex.ru/watch/107270131"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
      </body>
    </html>
  );
}
