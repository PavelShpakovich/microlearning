'use client';

import { useState, useCallback, createContext, useContext } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TelegramLoader } from '@/components/telegram-loader';
import { TOAST_DURATION_MS } from '@/lib/constants';

interface RootProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
  timeZone: string;
  now: Date;
}

interface LocaleSwitchContextType {
  switchLocale: (newLocale: string) => Promise<void>;
}

const LocaleSwitchContext = createContext<LocaleSwitchContextType>({
  switchLocale: async () => {},
});

export function useLocaleSwitch() {
  return useContext(LocaleSwitchContext);
}

export function RootProviders({
  children,
  locale: initialLocale,
  messages: initialMessages,
  timeZone,
  now,
}: RootProvidersProps) {
  const [locale, setLocale] = useState(initialLocale);
  const [messages, setMessages] = useState(initialMessages);

  const switchLocale = useCallback(async (newLocale: string) => {
    const newMessages = (await import(`@/i18n/messages/${newLocale}.json`)) as {
      default: AbstractIntlMessages;
    };
    setLocale(newLocale);
    setMessages(newMessages.default);
  }, []);

  return (
    <SessionProvider>
      <LocaleSwitchContext.Provider value={{ switchLocale }}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone} now={now}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <div className="flex flex-col flex-1">
              <TelegramLoader>{children}</TelegramLoader>
              <Toaster position="bottom-right" duration={TOAST_DURATION_MS} />
            </div>
          </ThemeProvider>
        </NextIntlClientProvider>
      </LocaleSwitchContext.Provider>
    </SessionProvider>
  );
}
