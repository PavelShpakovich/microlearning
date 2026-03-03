import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import Script from 'next/script';
import { RootProviders } from '@/components/root-providers';
import { Header } from '@/components/layout/header';
import './globals.css';

const geist = Geist({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Microlearning',
  description: 'Learn anything, one card at a time',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Must load before any JS so window.Telegram is available immediately */}
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      </head>
      <body className={`${geist.className} min-h-screen bg-gray-50 text-gray-900 antialiased`}>
        <RootProviders>
          <Header />
          {children}
        </RootProviders>
      </body>
    </html>
  );
}
