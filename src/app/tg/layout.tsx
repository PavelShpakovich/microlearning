import Script from 'next/script';

/**
 * Layout for the /tg route — loads the Telegram Web App SDK before the page
 * renders so that window.Telegram.WebApp and initData are available immediately.
 * Keeping this script here (rather than the root layout) avoids injecting the
 * SDK on every page of the regular web app.
 */
export default function TelegramLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}
