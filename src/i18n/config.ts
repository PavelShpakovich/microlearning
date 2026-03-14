export const locales = ['en', 'ru'] as const;
export const defaultLocale = 'ru' as const;

export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: 'English',
  ru: 'Русский',
};
