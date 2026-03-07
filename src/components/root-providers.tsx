'use client';

import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TelegramLoader } from '@/components/telegram-loader';
import { TelegramConnectPrompt } from '@/components/providers/telegram-connect-prompt';

interface RootProvidersProps {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}

export function RootProviders({ children, locale, messages }: RootProvidersProps) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <TelegramLoader>{children}</TelegramLoader>
          <TelegramConnectPrompt />
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
