import { createNavigation } from 'next-intl/navigation';
import { routing } from './i18n/routing';

// Locale-aware navigation helpers for public pages.
// Use these instead of next/navigation in components rendered under [locale]/.
export const { Link, redirect, useRouter, usePathname, getPathname } = createNavigation(routing);
