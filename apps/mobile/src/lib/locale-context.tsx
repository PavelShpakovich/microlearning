import React, { createContext, useContext, useState, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { type SupportedLocale, allMessages } from '@clario/i18n';
import { setLocale, getLocale } from '@/lib/i18n';

interface LocaleContextValue {
  locale: SupportedLocale;
  setLocalePreference: (locale: SupportedLocale) => Promise<void>;
}

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

const LOCALE_STORAGE_KEY = 'clario_locale';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getLocale());

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

/**
 * Load saved locale preference from storage and apply it.
 * Call this during app initialization.
 */
export async function initializeLocaleFromStorage() {
  try {
    const savedLocale = await SecureStore.getItemAsync(LOCALE_STORAGE_KEY);
    if (savedLocale && savedLocale in allMessages) {
      setLocale(savedLocale as SupportedLocale);
    }
  } catch (e) {
    console.error('Failed to load locale preference:', e);
  }
}
