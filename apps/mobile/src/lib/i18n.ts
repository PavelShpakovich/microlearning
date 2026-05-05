import { allMessages, type Messages, type Namespace, type SupportedLocale } from '@clario/i18n';
import { getLocales } from 'expo-localization';

// Global locale state (hydrate from AsyncStorage in app initialization)
let currentLocale: SupportedLocale = 'en';

export function setLocale(locale: SupportedLocale) {
  currentLocale = locale;
}

export function getLocale(): SupportedLocale {
  return currentLocale;
}

export function initializeLocale() {
  try {
    const deviceLang = getLocales()[0]?.languageCode ?? 'ru';
    const normalized = deviceLang === 'ru' ? 'ru' : 'en';
    currentLocale = normalized as SupportedLocale;
  } catch {
    currentLocale = 'en';
  }
}

export function useTranslations<N extends Namespace>(namespace: N) {
  return function t(
    key: keyof Messages[N] & string,
    params?: Record<string, string | number>,
  ): string {
    const messages = allMessages[currentLocale];
    const ns = messages[namespace] as Record<string, unknown>;

    // Flat lookup first; fall back to dot-notation traversal for nested keys
    let raw: unknown = ns[key];
    if (typeof raw !== 'string' && key.includes('.')) {
      raw = ns;
      for (const part of key.split('.')) {
        if (raw !== null && typeof raw === 'object') {
          raw = (raw as Record<string, unknown>)[part];
        } else {
          raw = undefined;
          break;
        }
      }
    }

    // Fallback to ru if key missing in current locale
    if (typeof raw !== 'string' && currentLocale !== 'ru') {
      const ruMessages = allMessages.ru;
      const ruNs = ruMessages[namespace] as Record<string, unknown>;
      raw = ruNs[key];
      if (typeof raw === 'string' && key.includes('.')) {
        raw = ruNs;
        for (const part of key.split('.')) {
          if (raw !== null && typeof raw === 'object') {
            raw = (raw as Record<string, unknown>)[part];
          } else {
            raw = undefined;
            break;
          }
        }
      }
    }

    const value = typeof raw === 'string' ? raw : key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (_, name: string) =>
      params[name] !== undefined ? String(params[name]) : `{${name}}`,
    );
  };
}
