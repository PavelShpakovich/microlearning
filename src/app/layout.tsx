import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Suspense } from 'react';
import { Analytics } from '@vercel/analytics/next';
import { getLocale, getMessages } from 'next-intl/server';
import { RootProviders } from '@/components/root-providers';
import { Header } from '@/components/layout/header';
import { LandingFooter } from '@/components/layout/landing-footer';
import { auth } from '@/auth';
import './globals.css';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://tryclario.by';

export const viewport: Viewport = {
  viewportFit: 'cover',
  width: 'device-width',
  initialScale: 1,
  themeColor: '#132238',
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const isRu = locale === 'ru';

  const title = isRu ? 'Clario — AI-астрологические разборы' : 'Clario — AI Astrology Readings';
  const description = isRu
    ? 'Создавайте натальные карты, получайте структурированные AI-разборы и возвращайтесь к сохранённым инсайтам в одном астрологическом пространстве.'
    : 'Create natal charts, generate structured AI readings, and return to saved insights inside one astrology workspace.';

  return {
    metadataBase: new URL(APP_URL),
    title: {
      default: title,
      template: '%s | Clario',
    },
    description,
    keywords: [
      'AI astrology',
      'natal chart',
      'astrology reading',
      'birth data interpretation',
      'birth chart',
      'structured astrology insights',
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
    alternates: {
      canonical: APP_URL,
    },
    icons: {
      icon: [
        { url: '/favicon.ico' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: { url: '/apple-touch-icon.png', type: 'image/png' },
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
  const locale = await getLocale();
  const messages = await getMessages();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const now = new Date();
  const session = await auth();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
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
        <Suspense fallback={<div className="min-h-screen bg-background" />}>
          <RootProviders
            locale={locale}
            messages={messages}
            timeZone={timeZone}
            now={now}
            session={session}
          >
            <Header />
            <div className="flex-1 flex flex-col min-h-0">{children}</div>
            {!session ? <LandingFooter /> : null}
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
