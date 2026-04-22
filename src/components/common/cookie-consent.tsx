'use client';

import { useCallback, useSyncExternalStore } from 'react';
import Script from 'next/script';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

const COOKIE_CONSENT_KEY = 'clario-cookie-consent';
const YM_ID = 107270131;

type ConsentState = 'pending' | 'accepted' | 'rejected';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getSnapshot(): ConsentState {
  const value = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (value === 'accepted' || value === 'rejected') return value;
  return 'pending';
}

function getServerSnapshot(): ConsentState {
  return 'pending';
}

export function CookieConsent() {
  const t = useTranslations('cookies');
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const accept = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    // Dispatch storage event so useSyncExternalStore re-reads
    window.dispatchEvent(new StorageEvent('storage', { key: COOKIE_CONSENT_KEY }));
  }, []);

  const reject = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    window.dispatchEvent(new StorageEvent('storage', { key: COOKIE_CONSENT_KEY }));
  }, []);

  // During SSR / before hydration, getServerSnapshot returns 'pending'
  // so the banner renders consistently on both server and client first pass.

  return (
    <>
      {/* Analytics scripts — only when accepted */}
      {consent === 'accepted' && (
        <>
          <Script id="yandex-metrica" strategy="afterInteractive">{`
            (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
            m[i].l=1*new Date();
            for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
            k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
            (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
            ym(${YM_ID}, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
          `}</Script>
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://mc.yandex.ru/watch/${YM_ID}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        </>
      )}

      {/* Banner — only when pending */}
      {consent === 'pending' && (
        <div
          role="dialog"
          aria-label={t('title')}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        >
          <div className="mx-auto max-w-2xl rounded-xl border bg-background/95 backdrop-blur-sm shadow-lg p-4 sm:p-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.rich('message', {
                privacy: (chunks) => (
                  <Link
                    href="/privacy"
                    className="underline underline-offset-4 hover:text-foreground transition-colors"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
            <div className="mt-4 flex items-center gap-3 justify-end">
              <Button variant="ghost" size="sm" onClick={reject}>
                {t('reject')}
              </Button>
              <Button size="sm" onClick={accept}>
                {t('accept')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
