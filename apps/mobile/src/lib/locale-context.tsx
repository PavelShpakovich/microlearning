import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { type SupportedLocale, allMessages } from '@clario/i18n';
import { setLocale, getLocale } from '@/lib/i18n';
import { profileApi } from '@clario/api-client';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocalePreference: (locale: SupportedLocale) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'clario_locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getLocale());

  // Hydrate from SecureStore on mount — overrides the device-language default
  // and keeps both the global variable and React state in sync.
  useEffect(() => {
    SecureStore.getItemAsync(LOCALE_STORAGE_KEY)
      .then((saved) => {
        if (saved && saved in allMessages) {
          setLocale(saved as SupportedLocale);
          setLocaleState(saved as SupportedLocale);
        }
      })
      .catch(() => {});
  }, []);

  const setLocalePreference = async (newLocale: SupportedLocale) => {
    if (!(newLocale in allMessages)) {
      console.warn(`Unsupported locale: ${newLocale}, fallback to 'ru'`);
      newLocale = 'ru';
    }
    setLocale(newLocale);
    setLocaleState(newLocale);
    try {
      await SecureStore.setItemAsync(LOCALE_STORAGE_KEY, newLocale);
    } catch (e) {
      console.error('Failed to save locale preference:', e);
    }
    // Sync locale to server profile (fire-and-forget)
    profileApi.updateProfile({ locale: newLocale }).catch(() => {});
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocalePreference }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
