'use client';

import dynamic from 'next/dynamic';
import type { ReactNode } from 'react';

// ssr: false is only legal inside a Client Component
const TelegramProvider = dynamic(
  () => import('@/components/telegram-provider').then((m) => m.TelegramProvider),
  { ssr: false },
);

export function TelegramLoader({ children }: { children: ReactNode }) {
  return <TelegramProvider>{children}</TelegramProvider>;
}
