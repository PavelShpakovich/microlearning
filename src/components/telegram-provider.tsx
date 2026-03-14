'use client';

import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface TelegramProviderProps {
  children: ReactNode;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        MainButton: { text: string; show: () => void; onClick: (fn: () => void) => void };
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            language_code?: string;
          };
          /** Passed via ?startapp= deep-link parameter */
          start_param?: string;
        };
        HapticFeedback: { impactOccurred: (style: string) => void };
        openLink: (url: string) => void;
        close: () => void;
      };
    };
  }
}

export function isTelegramWebApp(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.Telegram?.WebApp &&
    !!window.Telegram?.WebApp?.initData
  );
}

export function getTelegramWebApp() {
  if (typeof window === 'undefined') return null;
  return window.Telegram?.WebApp || null;
}

/**
 * Initialises the Telegram WebApp SDK when running inside Telegram.
 * Safe to render in any environment — detects Telegram at runtime.
 * Must be wrapped with next/dynamic { ssr: false } at the usage site.
 */
export function TelegramProvider({ children }: TelegramProviderProps) {
  useEffect(() => {
    if (isTelegramWebApp()) {
      window.Telegram!.WebApp.ready();
      window.Telegram!.WebApp.expand();
    }
  }, []);

  return <>{children}</>;
}
