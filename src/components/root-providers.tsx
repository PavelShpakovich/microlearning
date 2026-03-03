'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { TelegramLoader } from '@/components/telegram-loader';

export function RootProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TelegramLoader>{children}</TelegramLoader>
        <Toaster position="bottom-right" />
      </ThemeProvider>
    </SessionProvider>
  );
}
