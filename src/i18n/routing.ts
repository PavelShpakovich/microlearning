import { defineRouting } from 'next-intl/routing';
import { locales, defaultLocale } from './config';

export const routing = defineRouting({
  locales,
  defaultLocale,
  // English at /, Russian at /ru/ — clean URLs for the default locale
  localePrefix: 'as-needed',
});
